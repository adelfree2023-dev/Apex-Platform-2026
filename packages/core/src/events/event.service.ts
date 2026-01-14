import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base Event Interface
 * Per APEX_PLATFORM_CONTEXT.md - All events must include:
 * - tenantId
 * - territory
 * - businessType
 * - specializationTags
 */
export interface BaseEvent {
    type: string;
    tenantId: string;
    territory?: string;
    businessType?: string;
    specializationTags?: string[];
    payload: Record<string, unknown>;
    timestamp?: Date;
}

@Injectable()
export class EventService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Record an event with full validation and sanitization
     * Per Lead Architect: strict validation for Cooperative Intelligence readiness
     */
    async record(event: BaseEvent): Promise<void> {
        // Validate payload structure
        if (!event.payload || typeof event.payload !== 'object') {
            throw new Error('Invalid event payload: must be an object');
        }

        // Validate required fields
        if (!event.type || !event.tenantId) {
            throw new Error('Missing required fields: type and tenantId');
        }

        // Sanitize payload (remove private/unsafe fields)
        const sanitizedPayload = this.sanitizePayload(event.payload);

        await this.prisma.event.create({
            data: {
                id: uuidv4(),
                type: event.type,
                tenantId: event.tenantId,
                territory: event.territory || null,
                businessType: event.businessType || null,
                specializationTags: event.specializationTags || [],
                payload: sanitizedPayload,
                timestamp: event.timestamp || new Date(),
            },
        });

        console.log(`📝 Event recorded: ${event.type} for tenant ${event.tenantId}`);
    }

    /**
     * Sanitize payload by removing private fields
     * Per Lead Architect: fields starting with _ are removed
     */
    private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
        const sanitized: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(payload)) {
            // Skip private fields (starting with _)
            if (key.startsWith('_')) continue;

            // Skip potentially dangerous fields
            if (['password', 'secret', 'token', 'apiKey'].includes(key.toLowerCase())) continue;

            // Recursively sanitize nested objects
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                sanitized[key] = this.sanitizePayload(value as Record<string, unknown>);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Query events by type and tenant
     */
    async findByTenant(tenantId: string, type?: string, limit = 100) {
        return this.prisma.event.findMany({
            where: {
                tenantId,
                ...(type && { type }),
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }

    /**
     * Query events by territory (for Cooperative Intelligence)
     */
    async findByTerritory(territory: string, type?: string, limit = 100) {
        return this.prisma.event.findMany({
            where: {
                territory,
                ...(type && { type }),
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }
}
