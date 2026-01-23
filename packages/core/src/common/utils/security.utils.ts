import { Logger } from '@nestjs/common';

const logger = new Logger('SecurityUtils');

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
