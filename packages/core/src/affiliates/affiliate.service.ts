/**
 * Affiliate Marketing Service
 * Referral links, commissions, and payouts
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AffiliateData {
    userId?: number;
    name: string;
    email: string;
    phone?: string;
    commissionRate: number;
}

@Injectable()
export class AffiliateService {
    private readonly logger = new Logger(AffiliateService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Validate tenant exists
     */
    private async validateTenant(tenantId: string): Promise<void> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            throw new NotFoundException(`Tenant not found: ${tenantId}`);
        }
    }

    /**
     * Create affiliate tables
     */
    async createAffiliateTables(tenantSchema: string): Promise<void> {
        // Affiliates
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_affiliate" (
        id SERIAL PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        referral_code VARCHAR(50) UNIQUE NOT NULL,
        commission_rate INT DEFAULT 10,
        status VARCHAR(50) DEFAULT 'pending',
        total_earnings INT DEFAULT 0,
        total_referrals INT DEFAULT 0,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Referrals
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_affiliate_referral" (
        id SERIAL PRIMARY KEY,
        affiliate_id INT REFERENCES "${tenantSchema}"."vendure_affiliate"(id),
        order_id VARCHAR(255),
        order_total INT NOT NULL DEFAULT 0,
        commission INT NOT NULL DEFAULT 0,
        commission_rate INT NOT NULL DEFAULT 10,
        status VARCHAR(50) DEFAULT 'pending',
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Payouts
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_affiliate_payout" (
        id SERIAL PRIMARY KEY,
        affiliate_id INT REFERENCES "${tenantSchema}"."vendure_affiliate"(id),
        amount INT NOT NULL,
        method VARCHAR(50),
        reference VARCHAR(255),
        status VARCHAR(50) DEFAULT 'processing',
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    }

    /**
     * Generate unique referral code
     */
    private generateReferralCode(): string {
        return `REF-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    /**
     * Register a new affiliate for a tenant
     */
    async applyAffiliate(tenantId: string, data: AffiliateData): Promise<any> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;
        const referralCode = this.generateReferralCode();

        try {
            // Check if affiliate already exists
            const existing = await this.prisma.$queryRawUnsafe(`
        SELECT 1 FROM "${tenantSchema}"."vendure_affiliate" WHERE email = $1
      `, data.email);

            if ((existing as any[]).length > 0) {
                throw new Error('Affiliate with this email already exists');
            }

            // Insert new affiliate
            const result = await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_affiliate" 
        (user_id, name, email, phone, referral_code, commission_rate, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
        RETURNING *
      `, data.userId || null, data.name, data.email, data.phone || null, referralCode, data.commissionRate || 10);

            return this.serializeAffiliate((result as any[])[0]);
        } catch (error) {
            this.logger.error(`Failed to register affiliate for tenant ${tenantId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get affiliate by ID
     */
    async getAffiliate(tenantId: string, affiliateId: number): Promise<any | null> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const affiliate = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_affiliate"
        WHERE id = $1
      `, affiliateId);

            if ((affiliate as any[]).length === 0) return null;
            return this.serializeAffiliate((affiliate as any[])[0]);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get affiliate by referral code
     */
    async getAffiliateByCode(tenantId: string, code: string): Promise<any | null> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const affiliate = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_affiliate"
        WHERE referral_code = $1 AND status = 'approved'
      `, code);

            if ((affiliate as any[]).length === 0) return null;
            return this.serializeAffiliate((affiliate as any[])[0]);
        } catch (error) {
            return null;
        }
    }

    /**
     * Approve an affiliate
     */
    async approveAffiliate(tenantId: string, affiliateId: number): Promise<any> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        const result = await this.prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_affiliate"
      SET status = 'approved', approved_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `, affiliateId);

        if ((result as any[]).length === 0) {
            throw new NotFoundException('Affiliate not found or already approved');
        }

        return this.serializeAffiliate((result as any[])[0]);
    }

    /**
     * Get all affiliates for a tenant
     */
    async getAffiliates(tenantId: string, status?: string): Promise<any[]> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            let whereClause = '1=1';
            if (status) whereClause += ` AND status = '${status}'`;

            const affiliates = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_affiliate"
        WHERE ${whereClause}
        ORDER BY created_at DESC
      `);

            return (affiliates as any[]).map(a => this.serializeAffiliate(a));
        } catch (error) {
            return [];
        }
    }

    /**
     * Track referral from order
     */
    async trackReferral(tenantId: string, affiliateCode: string, orderId: string, orderTotal: number): Promise<any> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        const affiliate = await this.getAffiliateByCode(tenantId, affiliateCode);
        if (!affiliate) throw new Error('Invalid referral code');

        const commission = Math.floor(orderTotal * affiliate.commissionRate / 100);

        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_affiliate_referral" 
      (affiliate_id, order_id, order_total, commission, commission_rate, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
    `, affiliate.id, orderId, orderTotal, commission, affiliate.commissionRate);

        // Update affiliate totals
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_affiliate"
      SET total_referrals = total_referrals + 1, total_earnings = total_earnings + $1, updated_at = NOW()
      WHERE id = $2
    `, commission, affiliate.id);

        return { affiliateId: affiliate.id, commission };
    }

    /**
     * Get referrals for an affiliate
     */
    async getReferrals(tenantId: string, affiliateId: number): Promise<any[]> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const referrals = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_affiliate_referral"
        WHERE affiliate_id = $1
        ORDER BY created_at DESC
      `, affiliateId);

            return (referrals as any[]).map(r => ({
                id: Number(r.id),
                orderId: r.order_id,
                orderTotal: Number(r.order_total),
                commission: Number(r.commission),
                status: r.status,
                paidAt: r.paid_at,
                createdAt: r.created_at,
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get affiliate dashboard stats
     */
    async getAffiliateStats(tenantId: string, affiliateId: number): Promise<any> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const affiliate = await this.getAffiliate(tenantId, affiliateId);
            if (!affiliate) return null;

            const pendingCommission = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(commission), 0) as total
        FROM "${tenantSchema}"."vendure_affiliate_referral"
        WHERE affiliate_id = $1 AND status = 'pending'
      `, affiliateId);

            const paidCommission = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM "${tenantSchema}"."vendure_affiliate_payout"
        WHERE affiliate_id = $1 AND status = 'completed'
      `, affiliateId);

            return {
                affiliate,
                pendingCommission: Number((pendingCommission as any[])[0]?.total || 0),
                paidCommission: Number((paidCommission as any[])[0]?.total || 0),
                referralLink:`https://store.example.com/?ref=${affiliate.referralCode}`,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Process payout for an affiliate
     */
    async requestPayout(tenantId: string, affiliateId: number, amount: number, method: string): Promise<any> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        const affiliate = await this.getAffiliate(tenantId, affiliateId);
        if (!affiliate) throw new Error('Affiliate not found');

        // Check pending balance
        const pending = await this.prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(commission), 0) as total
      FROM "${tenantSchema}"."vendure_affiliate_referral"
      WHERE affiliate_id = $1 AND status = 'pending'
    `, affiliateId);

        const pendingAmount = Number((pending as any[])[0]?.total || 0);
        if (amount > pendingAmount) {
            throw new Error('Insufficient balance');
        }

        const payout = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_affiliate_payout" 
      (affiliate_id, amount, method, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'processing', NOW(), NOW())
      RETURNING *
    `, affiliateId, amount, method);

        return {
            id: Number((payout as any[])[0].id),
            amount,
            method,
            status: 'processing',
        };
    }

    private serializeAffiliate(a: any): any {
        return {
            id: Number(a.id),
            userId: a.user_id ? Number(a.user_id) : null,
            name: a.name,
            email: a.email,
            phone: a.phone,
            referralCode: a.referral_code,
            commissionRate: Number(a.commission_rate),
            status: a.status,
            totalEarnings: Number(a.total_earnings),
            totalReferrals: Number(a.total_referrals),
            approvedAt: a.approved_at,
            createdAt: a.created_at,
            updatedAt: a.updated_at,
        };
    }
}
