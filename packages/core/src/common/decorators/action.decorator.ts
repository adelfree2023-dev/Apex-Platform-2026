import { SetMetadata } from '@nestjs/common';

/**
 * 🛡️ ASMP Security: Action Decorator
 * Used for detailed audit logging and permission verification
 */
export const ACTION_KEY = 'action';
export const Action = (action: string) => SetMetadata(ACTION_KEY, action);
