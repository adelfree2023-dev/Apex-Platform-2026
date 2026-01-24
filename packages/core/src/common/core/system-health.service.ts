import { Injectable, Logger } from '@nestjs/common';
import { AnomalyDetectionService } from '../access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../access-control/services/rate-limiter.service';
import { EncryptedFieldService } from '../security/encryption/encrypted-field.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemHealthService {
    private readonly logger = new Logger(SystemHealthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly anomaly: AnomalyDetectionService,
        private readonly rateLimiter: RateLimiterService,
        private readonly encryption: EncryptedFieldService,
    ) { }

    async checkHealth(): Promise<any> {
        const dbStatus = await this.checkDatabase();
        const securityStatus = await this.checkSecurity();

        return {
            status: dbStatus.status === 'up' && securityStatus.status === 'up' ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            components: {
                database: dbStatus,
                security: securityStatus,
            },
        };
    }

    private async checkDatabase(): Promise<any> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'up', latencyMs: 0 };
        } catch (error) {
            return { status: 'down', message: error.message };
        }
    }

    async checkSecurity(): Promise<any> {
        return { status: 'up' };
    }

    /**
     * 🛡️ S6: Circuit Breaker - اكتشاف الضغط العالي على النظام
     */
    isOverloaded(): boolean {
        const memoryUsage = process.memoryUsage();
        const heapUsed = memoryUsage.heapUsed / memoryUsage.heapTotal;

        // إذا زاد استهلاك الـ Heap عن 90%، نعتبر النظام في حالة ضغط
        if (heapUsed > 0.9) {
            this.logger.error(`Critical Memory Pressure: ${(heapUsed * 100).toFixed(2)}%`);
            return true;
        }
        return false;
    }
}
