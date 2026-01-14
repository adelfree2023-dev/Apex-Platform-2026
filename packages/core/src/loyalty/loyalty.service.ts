/**
 * Loyalty Program Service
 * Points, Tiers, and Rewards
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RewardData {
    name: string;
    description?: string;
    pointsCost: number;
    type: 'discount' | 'product' | 'shipping' | 'other';
    value: number;  // discount percentage or product ID
}

@Injectable()
export class LoyaltyService {
    private readonly logger = new Logger(LoyaltyService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create loyalty tables
     */
    async createLoyaltyTables(tenantSchema: string): Promise<void> {
        // Customer loyalty accounts
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_loyalty_account" (
        id SERIAL PRIMARY KEY,
        customer_id INT UNIQUE NOT NULL,
        points INT DEFAULT 0,
        lifetime_points INT DEFAULT 0,
        tier VARCHAR(50) DEFAULT 'Bronze',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Points transactions
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_loyalty_transaction" (
        id SERIAL PRIMARY KEY,
        account_id INT REFERENCES "${tenantSchema}"."vendure_loyalty_account"(id),
        type VARCHAR(50) NOT NULL,
        points INT NOT NULL,
        description TEXT,
        order_id INT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Rewards catalog
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_loyalty_reward" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        points_cost INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        value INT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Redeemed rewards
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_loyalty_redemption" (
        id SERIAL PRIMARY KEY,
        account_id INT REFERENCES "${tenantSchema}"."vendure_loyalty_account"(id),
        reward_id INT REFERENCES "${tenantSchema}"."vendure_loyalty_reward"(id),
        points_spent INT NOT NULL,
        code VARCHAR(100),
        used_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Insert default rewards
        const defaultRewards = [
            { name: '5% Off', desc: 'Get 5% off your next order', points: 100, type: 'discount', value: 5 },
            { name: '10% Off', desc: 'Get 10% off your next order', points: 200, type: 'discount', value: 10 },
            { name: '20% Off', desc: 'Get 20% off your next order', points: 500, type: 'discount', value: 20 },
            { name: 'Free Shipping', desc: 'Free shipping on your next order', points: 150, type: 'shipping', value: 0 },
        ];

        for (const r of defaultRewards) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_loyalty_reward" (name, description, points_cost, type, value)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, r.name, r.desc, r.points, r.type, r.value);
        }
    }

    /**
     * Get or create loyalty account
     */
    async getOrCreateAccount(tenantSchema: string, customerId: number): Promise<any> {
        // Try to get existing
        let account = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_loyalty_account"
      WHERE customer_id = $1
    `, customerId);

        if ((account as any[]).length === 0) {
            // Create new account
            account = await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_loyalty_account" (customer_id)
        VALUES ($1)
        RETURNING *
      `, customerId);
        }

        return this.serializeAccount((account as any[])[0]);
    }

    /**
     * Add points to account
     */
    async addPoints(
        tenantSchema: string,
        customerId: number,
        points: number,
        type: string,
        description?: string,
        orderId?: number
    ): Promise<any> {
        const account = await this.getOrCreateAccount(tenantSchema, customerId);

        // Add transaction
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_loyalty_transaction" 
      (account_id, type, points, description, order_id)
      VALUES ($1, $2, $3, $4, $5)
    `, account.id, type, points, description || null, orderId || null);

        // Update account
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_loyalty_account"
      SET points = points + $1, lifetime_points = lifetime_points + $1, updated_at = NOW()
      WHERE id = $2
    `, points, account.id);

        // Update tier based on lifetime points
        const updated = await this.updateTier(tenantSchema, account.id);

        return updated;
    }

    /**
     * Calculate points from order
     */
    calculatePointsFromOrder(orderTotal: number): number {
        // 1 point per 10 EGP spent
        return Math.floor(orderTotal / 1000);
    }

    /**
     * Update tier based on lifetime points
     */
    async updateTier(tenantSchema: string, accountId: number): Promise<any> {
        const account = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_loyalty_account"
      WHERE id = $1
    `, accountId);

        if ((account as any[]).length === 0) return null;

        const lifetimePoints = Number((account as any[])[0].lifetime_points);
        let tier = 'Bronze';

        if (lifetimePoints >= 5000) {
            tier = 'Platinum';
        } else if (lifetimePoints >= 2000) {
            tier = 'Gold';
        } else if (lifetimePoints >= 500) {
            tier = 'Silver';
        }

        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_loyalty_account"
      SET tier = $1, updated_at = NOW()
      WHERE id = $2
    `, tier, accountId);

        return this.getOrCreateAccount(tenantSchema, (account as any[])[0].customer_id);
    }

    /**
     * Get available rewards
     */
    async getRewards(tenantSchema: string): Promise<any[]> {
        try {
            const rewards = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_loyalty_reward"
        WHERE is_active = true
        ORDER BY points_cost ASC
      `);

            return (rewards as any[]).map(r => ({
                id: Number(r.id),
                name: r.name,
                description: r.description,
                pointsCost: Number(r.points_cost),
                type: r.type,
                value: Number(r.value),
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Redeem reward
     */
    async redeemReward(tenantSchema: string, customerId: number, rewardId: number): Promise<any> {
        const account = await this.getOrCreateAccount(tenantSchema, customerId);

        // Get reward
        const reward = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_loyalty_reward"
      WHERE id = $1 AND is_active = true
    `, rewardId);

        if ((reward as any[]).length === 0) {
            throw new Error('Reward not found');
        }

        const r = (reward as any[])[0];
        const pointsCost = Number(r.points_cost);

        if (account.points < pointsCost) {
            throw new Error('Insufficient points');
        }

        // Generate redemption code
        const code = `REWARD-${Date.now().toString(36).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

        // Create redemption
        const redemption = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_loyalty_redemption" 
      (account_id, reward_id, points_spent, code, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, account.id, rewardId, pointsCost, code, expiresAt);

        // Deduct points
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_loyalty_account"
      SET points = points - $1, updated_at = NOW()
      WHERE id = $2
    `, pointsCost, account.id);

        // Add transaction
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_loyalty_transaction" 
      (account_id, type, points, description)
      VALUES ($1, 'redemption', $2, $3)
    `, account.id, -pointsCost, `Redeemed: ${r.name}`);

        return {
            redemptionId: Number((redemption as any[])[0].id),
            code,
            rewardName: r.name,
            rewardType: r.type,
            rewardValue: Number(r.value),
            pointsSpent: pointsCost,
            expiresAt,
        };
    }

    /**
     * Get transaction history
     */
    async getTransactions(tenantSchema: string, customerId: number): Promise<any[]> {
        try {
            const account = await this.getOrCreateAccount(tenantSchema, customerId);

            const transactions = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_loyalty_transaction"
        WHERE account_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, account.id);

            return (transactions as any[]).map(t => ({
                id: Number(t.id),
                type: t.type,
                points: Number(t.points),
                description: t.description,
                orderId: t.order_id ? Number(t.order_id) : null,
                createdAt: t.created_at,
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get customer redemptions
     */
    async getRedemptions(tenantSchema: string, customerId: number): Promise<any[]> {
        try {
            const account = await this.getOrCreateAccount(tenantSchema, customerId);

            const redemptions = await this.prisma.$queryRawUnsafe(`
        SELECT r.*, rw.name as reward_name, rw.type as reward_type, rw.value as reward_value
        FROM "${tenantSchema}"."vendure_loyalty_redemption" r
        JOIN "${tenantSchema}"."vendure_loyalty_reward" rw ON rw.id = r.reward_id
        WHERE r.account_id = $1
        ORDER BY r.created_at DESC
      `, account.id);

            return (redemptions as any[]).map(r => ({
                id: Number(r.id),
                rewardName: r.reward_name,
                rewardType: r.reward_type,
                rewardValue: Number(r.reward_value),
                pointsSpent: Number(r.points_spent),
                code: r.code,
                usedAt: r.used_at,
                expiresAt: r.expires_at,
                isValid: !r.used_at && new Date(r.expires_at) > new Date(),
                createdAt: r.created_at,
            }));
        } catch (error) {
            return [];
        }
    }

    private serializeAccount(a: any): any {
        return {
            id: Number(a.id),
            customerId: Number(a.customer_id),
            points: Number(a.points),
            lifetimePoints: Number(a.lifetime_points),
            tier: a.tier,
            createdAt: a.created_at,
        };
    }
}
