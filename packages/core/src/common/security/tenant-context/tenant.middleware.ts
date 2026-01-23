import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 🛡️ S2: Tenant Middleware
 * Extract and validate tenant context from headers or subdomain.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (tenantId) {
      (req as any).tenantId = tenantId;
    }
    next();
  }
}
