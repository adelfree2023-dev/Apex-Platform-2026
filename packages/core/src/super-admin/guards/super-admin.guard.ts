import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { HQAuthService } from '../../auth/hq-auth.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
    constructor(private readonly hqAuthService: HQAuthService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid authorization header');
        }

        const token = authHeader.split(' ')[1];
        const payload = this.hqAuthService.verifyToken(token);

        if (!payload) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        // Check if user is a super admin
        if (payload.role !== 'super_admin') {
            throw new UnauthorizedException('Access restricted to Super Admins only');
        }

        // Attach user to request
        request.user = payload;

        return true;
    }
}
