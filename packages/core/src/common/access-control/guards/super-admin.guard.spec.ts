import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminGuard } from './super-admin.guard';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('SuperAdminGuard', () => {
    let guard: SuperAdminGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SuperAdminGuard],
        }).compile();

        guard = module.get<SuperAdminGuard>(SuperAdminGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    const createMockContext = (user?: { role: string }): ExecutionContext => {
        return {
            switchToHttp: () => ({
                getRequest: () => ({
                    user,
                }),
            }),
        } as any;
    };

    it('should allow access for SUPER_ADMIN role', async () => {
        const context = createMockContext({ role: 'SUPER_ADMIN' });
        expect(await guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException for non-SUPER_ADMIN role', async () => {
        const context = createMockContext({ role: 'USER' });
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is missing', async () => {
        const context = createMockContext(undefined);
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
});
