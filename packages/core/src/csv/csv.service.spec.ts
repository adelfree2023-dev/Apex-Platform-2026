/**
 * CSV Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CsvService } from './csv.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CsvService', () => {
    let service: CsvService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CsvService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<CsvService>(CsvService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('exportProducts', () => {
        it('should export products to CSV format', async () => {
            const mockProducts = [
                { id: 1, name: 'Product A', slug: 'product-a', price: 10000, stock: 50 },
                { id: 2, name: 'Product B', slug: 'product-b', price: 20000, stock: 30 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.exportProducts('tenant_test');

            expect(result).toContain('name');
            expect(result).toContain('Product A');
        });
    });

    describe('exportOrders', () => {
        it('should export orders to CSV format', async () => {
            const mockOrders = [
                { id: 1, customer_name: 'John', total: 50000, status: 'completed' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrders);

            const result = await service.exportOrders('tenant_test');

            expect(result).toContain('customer_name');
        });
    });

    describe('exportCustomers', () => {
        it('should export customers to CSV format', async () => {
            const mockCustomers = [
                { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCustomers);

            const result = await service.exportCustomers('tenant_test');

            expect(result).toContain('email');
        });
    });

    describe('importProducts', () => {
        it('should import products from CSV', async () => {
            const csvData = 'name,slug,price,stock\nNew Product,new-product,15000,100';

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.importProducts('tenant_test', csvData);

            expect(result.imported).toBeGreaterThan(0);
        });
    });

    describe('parseCsv', () => {
        it('should parse CSV string to array', () => {
            const csv = 'name,price\nProduct A,100\nProduct B,200';

            const result = service.parseCsv(csv);

            expect(result.length).toBe(2);
            expect(result[0].name).toBe('Product A');
        });
    });
});
