import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SecurityContext } from '../../../common/security/security.context';

/**
 * 🏰 Digital Fortress: Super Admin Guard
 * - Only allows access to users with the 'SUPER_ADMIN' role
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('يتطلب هذا الإجراء صلاحيات المشرف العام');
        }

        return true;
    }
}
