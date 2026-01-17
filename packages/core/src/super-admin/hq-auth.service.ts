/**
 * HQ Admin Authentication Service
 * Handles Super Admin login, registration, and session management
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'apex-hq-super-secret-key-2026';

export interface HQUser {
    id: number;
    email: string;
    name: string;
    role: 'super_admin' | 'admin' | 'support';
    status: 'active' | 'inactive';
    createdAt: Date;
    lastLoginAt?: Date;
}

@Injectable()
export class HQAuthService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.createHQUsersTable();
        await this.seedDefaultAdmin();
    }

    /**
     * Create HQ Users table in public schema
     */
    async createHQUsersTable() {
        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS public.hq_users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                status VARCHAR(50) DEFAULT 'active',
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await this.prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_hq_users_email ON public.hq_users(email)
        `);
    }

    /**
     * Seed default super admin user
     */
    async seedDefaultAdmin() {
        const existingAdmin = await this.findByEmail('admin@apex.com');
        if (!existingAdmin) {
            const passwordHash = await bcrypt.hash('ApexAdmin2026!', 10);
            await this.prisma.$executeRaw`
                INSERT INTO public.hq_users (email, password_hash, name, role, status)
                VALUES ('admin@apex.com', ${passwordHash}, 'Super Admin', 'super_admin', 'active')
                ON CONFLICT (email) DO NOTHING
            `;
            console.log('✅ Default Super Admin created: admin@apex.com');
        }
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<{ user: HQUser; accessToken: string } | null> {
        const user = await this.findByEmail(email);
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // Update last login
        await this.prisma.$executeRaw`
            UPDATE public.hq_users SET last_login_at = NOW() WHERE id = ${user.id} 
        `;

        // Generate JWT
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt,
                lastLoginAt: new Date(),
            },
            accessToken,
        };
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<any | null> {
        const result = await this.prisma.$queryRaw`
            SELECT id, email, password_hash as "passwordHash", name, role, status, 
                   created_at as "createdAt", last_login_at as "lastLoginAt"
            FROM public.hq_users WHERE email = ${email} LIMIT 1
        ` as any[];
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Get all HQ users
     */
    async getAllUsers(): Promise<HQUser[]> {
        return await this.prisma.$queryRaw`
            SELECT id, email, name, role, status, 
                   created_at as "createdAt", last_login_at as "lastLoginAt"
            FROM public.hq_users ORDER BY created_at DESC
        ` as HQUser[];
    }

    /**
     * Create new HQ user
     */
    async createUser(data: { email: string; password: string; name: string; role: string }): Promise<HQUser> {
        const passwordHash = await bcrypt.hash(data.password, 10);
        await this.prisma.$executeRaw`
            INSERT INTO public.hq_users (email, password_hash, name, role, status)
            VALUES (${data.email}, ${passwordHash}, ${data.name}, ${data.role}, 'active')
        `;
        return (await this.findByEmail(data.email)) as HQUser;
    }

    /**
     * Verify JWT token
     */
    verifyToken(token: string): any {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch {
            return null;
        }
    }
}
