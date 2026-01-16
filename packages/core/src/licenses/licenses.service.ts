
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class LicensesService {
    private readonly logger = new Logger(LicensesService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Generates a new license key for a tenant
     */
    async generateLicense(tenantId: string, planId: string, expiryDate?: Date) {
        const key = `APEX-${randomBytes(16).toString('hex').toUpperCase()}`;
        // Default expiry 30 days if not provided
        const expiresAt = expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // In a real app, this would be saved to a License table
        // Since the schema might be dynamic, we store it in tenant settings or a dedicated table
        // For Phase 1, we will simulate the DB operation if the table doesn't exist yet
        // or assume a 'license' model exists in prisma schema.

        // Assuming 'License' model is NOT yet in schema based on previous audits,
        // we will return a mocked object but validated structure.

        this.logger.log(`Generated license ${key} for tenant ${tenantId}`);

        return {
            key,
            tenantId,
            planId,
            expiresAt,
            status: 'ACTIVE',
            createdAt: new Date(),
        };
    }

    /**
     * Validates a license key
     */
    async validateLicense(key: string) {
        if (!key || !key.startsWith('APEX-')) {
            return { valid: false, reason: 'INVALID_FORMAT' };
        }

        // Mock validation logic
        // In production: await this.prisma.license.findUnique({ where: { key } })

        this.logger.log(`Validating license ${key}`);

        return {
            valid: true,
            plan: 'PREMIUM',
            features: ['UNLIMITED_PRODUCTS', 'ANALYTICS'],
            expiresAt: new Date(Date.now() + 1000000),
        };
    }

    /**
     * Revokes a license immediately
     */
    async revokeLicense(key: string) {
        this.logger.warn(`Revoking license ${key}`);
        // Mock DB update
        return { success: true, status: 'REVOKED' };
    }

    /**
     * Extends the license validity
     */
    async extendLicense(key: string, days: number) {
        if (days <= 0) throw new BadRequestException('Days must be positive');

        this.logger.log(`Extending license ${key} by ${days} days`);
        return { success: true, newExpiry: new Date(Date.now() + days * 86400000) };
    }
}
