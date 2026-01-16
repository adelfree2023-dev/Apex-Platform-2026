/**
 * Event Service Unit Tests
 * Root-analyzed: Uses PrismaService event.create and event.findMany
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EventService', () => {
    let service: EventService;

    const mockPrismaService = {
        event: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<EventService>(EventService);
        jest.clearAllMocks();
        // Silence console.log
        jest.spyOn(console, 'log').mockImplementation();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== RECORD ====================

    describe('record', () => {
        it('should record event with valid data', async () => {
            mockPrismaService.event.create.mockResolvedValue({ id: 'event-123' });

            await service.record({
                type: 'ORDER_CREATED',
                tenantId: 'tenant-1',
                payload: { orderId: 1001, total: 500 },
            });

            expect(mockPrismaService.event.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'ORDER_CREATED',
                    tenantId: 'tenant-1',
                }),
            });
        });

        it('should throw error for invalid payload', async () => {
            await expect(service.record({
                type: 'TEST',
                tenantId: 'tenant-1',
                payload: null as any,
            })).rejects.toThrow('Invalid event payload');
        });

        it('should throw error for missing type', async () => {
            await expect(service.record({
                type: '',
                tenantId: 'tenant-1',
                payload: {},
            })).rejects.toThrow('Missing required fields');
        });

        it('should throw error for missing tenantId', async () => {
            await expect(service.record({
                type: 'TEST',
                tenantId: '',
                payload: {},
            })).rejects.toThrow('Missing required fields');
        });

        it('should sanitize payload by removing private fields', async () => {
            mockPrismaService.event.create.mockResolvedValue({ id: 'event-123' });

            await service.record({
                type: 'USER_ACTION',
                tenantId: 'tenant-1',
                payload: {
                    userId: 100,
                    _privateField: 'secret',
                    password: 'hidden',
                    name: 'visible',
                },
            });

            const createCall = mockPrismaService.event.create.mock.calls[0][0];
            expect(createCall.data.payload).toHaveProperty('userId');
            expect(createCall.data.payload).toHaveProperty('name');
            expect(createCall.data.payload).not.toHaveProperty('_privateField');
            expect(createCall.data.payload).not.toHaveProperty('password');
        });

        it('should include territory and businessType if provided', async () => {
            mockPrismaService.event.create.mockResolvedValue({ id: 'event-123' });

            await service.record({
                type: 'SALE',
                tenantId: 'tenant-1',
                territory: 'Egypt',
                businessType: 'electronics',
                specializationTags: ['mobile', 'laptops'],
                payload: {},
            });

            const createCall = mockPrismaService.event.create.mock.calls[0][0];
            expect(createCall.data.territory).toBe('Egypt');
            expect(createCall.data.businessType).toBe('electronics');
            expect(createCall.data.specializationTags).toEqual(['mobile', 'laptops']);
        });
    });

    // ==================== FIND BY TENANT ====================

    describe('findByTenant', () => {
        it('should return events for tenant', async () => {
            const mockEvents = [
                { id: '1', type: 'ORDER_CREATED', tenantId: 'tenant-1' },
                { id: '2', type: 'ORDER_SHIPPED', tenantId: 'tenant-1' },
            ];
            mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

            const result = await service.findByTenant('tenant-1');

            expect(result).toEqual(mockEvents);
            expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-1' },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });
        });

        it('should filter by type if provided', async () => {
            mockPrismaService.event.findMany.mockResolvedValue([]);

            await service.findByTenant('tenant-1', 'ORDER_CREATED');

            expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-1', type: 'ORDER_CREATED' },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });
        });

        it('should use custom limit', async () => {
            mockPrismaService.event.findMany.mockResolvedValue([]);

            await service.findByTenant('tenant-1', undefined, 50);

            expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-1' },
                orderBy: { timestamp: 'desc' },
                take: 50,
            });
        });
    });

    // ==================== FIND BY TERRITORY ====================

    describe('findByTerritory', () => {
        it('should return events for territory', async () => {
            const mockEvents = [
                { id: '1', type: 'SALE', territory: 'Egypt' },
            ];
            mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

            const result = await service.findByTerritory('Egypt');

            expect(result).toEqual(mockEvents);
            expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
                where: { territory: 'Egypt' },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });
        });

        it('should filter by type if provided', async () => {
            mockPrismaService.event.findMany.mockResolvedValue([]);

            await service.findByTerritory('UAE', 'PROMOTION_CREATED');

            expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
                where: { territory: 'UAE', type: 'PROMOTION_CREATED' },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });
        });
    });
});
