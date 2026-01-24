import * as crypto from 'crypto';

/**
 * 🔒 S3: Generate a secure, unique request ID
 */
export function generateRequestId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        // Fallback for environments where randomUUID might not be available
        return '00000000-0000-4000-8000-000000000000'.replace(/[08]/g, (c: any) =>
            (c ^ crypto.randomBytes(1).readUInt8(0) & 15 >> c / 4).toString(16)
        );
    }
}

/**
 * 🔒 S2: Extract tenant and user context from request
 */
export function extractContext(req: any) {
    return {
        tenantId: req.tenantId || req.headers?.['x-tenant-id'],
        userId: req.userId || 'anonymous',
        requestId: req.requestId || generateRequestId(),
        ip: req.ip || req.headers?.['x-forwarded-for'] || '0.0.0.0'
    };
}

/**
 * 🔒 S6: Constant-time delay to prevent timing attacks
 * Ensures authentication responses take a consistent amount of time
 */
export async function constantTimeDelay(ms: number = 1000): Promise<void> {
    const variation = Math.random() * 200; // Add slight jitter to prevent fingerprinting
    return new Promise(resolve => setTimeout(resolve, ms + variation));
}

/**
 * 🔒 S5: Safe error redaction
 * Removes sensitive information from error objects before logging or returning to client
 */
export function safeRedactError(error: any): any {
    if (!error) return { message: 'Unknown error' };

    const redacted = {
        name: error.name || 'Error',
        message: error.message || 'Operation failed',
        // Do not include stack trace in production or sensitive contexts
    };

    // Mask sensitive database error patterns (S5)
    if (redacted.message.toLowerCase().includes('relation') ||
        redacted.message.toLowerCase().includes('table') ||
        redacted.message.toLowerCase().includes('column')) {
        redacted.message = 'خطأ في معالجة البيانات';
    }

    if (redacted.message.toLowerCase().includes('postgre') ||
        redacted.message.toLowerCase().includes('prisma')) {
        redacted.message = 'خطأ في خدمة البيانات';
    }

    return redacted;
}
