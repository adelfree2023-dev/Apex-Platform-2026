/**
 * CSV Service Unit Tests
 * Tests bulk import/export functionality
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

    describe('parseCsv', () => {
        it('should parse CSV string to array of objects', () => {
            const csv = 'name,price,stock\nProduct A,100,50\nProduct B,200,30';

            const result = service.parseCsv(csv);

            expect(result.length).toBe(2);
            expect(result[0].name).toBe('Product A');
            expect(result[0].price).toBe('100');
            expect(result[1].name).toBe('Product B');
        });

        it('should handle empty CSV', () => {
            const csv = 'name,price';

            const result = service.parseCsv(csv);

            expect(result).toEqual([]);
        });

        it('should handle quoted values', () => {
            const csv = 'name,description\n"Product A","Description, with comma"';

            const result = service.parseCsv(csv);

            expect(result[0].name).toBe('Product A');
            expect(result[0].description).toBe('Description, with comma');
        });
    });

    describe('exportProducts', () => {
        it('should export products to CSV format', async () => {
            const mockProducts = [
                { id: 1, name: 'Product A', slug: 'product-a', sku: 'SKU-001', price: 10000, stock_on_hand: 50, description: 'Desc A' },
                { id: 2, name: 'Product B', slug: 'product-b', sku: 'SKU-002', price: 20000, stock_on_hand: 30, description: 'Desc B' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.exportProducts('tenant_test');

            expect(result).toContain('id,name,slug,sku,price,stock,description');
            expect(result).toContain('Product A');
            expect(result).toContain('SKU-001');
        });

        it('should return empty string on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

            const result = await service.exportProducts('tenant_test');

            expect(result).toBe('');
        });
    });

    describe('exportOrders', () => {
        it('should export orders to CSV format', async () => {
            const mockOrders = [
                {
                    id: 1, code: 'ORD-001', state: 'Completed', total: 50000,
                    created_at: new Date('2026-01-10'), customer_email: 'john@test.com',
                    first_name: 'John', last_name: 'Doe'
                },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrders);

            const result = await service.exportOrders('tenant_test');

            expect(result).toContain('order_id,code,status,total,date,customer_email,customer_name');
            expect(result).toContain('ORD-001');
            expect(result).toContain('john@test.com');
        });

        it('should return empty string on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

            const result = await service.exportOrders('tenant_test');

            expect(result).toBe('');
        });
    });

    describe('exportCustomers', () => {
        it('should export customers to CSV format', async () => {
            const mockCustomers = [
                {
                    id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe',
                    phone_number: '123456', created_at: new Date('2026-01-01'),
                    order_count: 5, total_spent: 150000
                },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCustomers);

            const result = await service.exportCustomers('tenant_test');

            expect(result).toContain('id,email,first_name,last_name,phone,signup_date,order_count,total_spent');
            expect(result).toContain('john@test.com');
            expect(result).toContain('John');
        });

        it('should return empty string on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

            const result = await service.exportCustomers('tenant_test');

            expect(result).toBe('');
        });
    });

    describe('importProducts', () => {
        it('should import new products from CSV', async () => {
            const csvData = 'name,sku,slug,price,stock,description\nNew Product,SKU-NEW,new-product,15000,100,New desc';

            // Mock: no existing product, then return created product ID
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // Check if exists - not found
                .mockResolvedValueOnce([{ id: 1 }]); // Created product
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.importProducts('tenant_test', csvData);

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
            expect(result.failed).toBe(0);
        });

        it('should update existing products', async () => {
            const csvData = 'name,sku,slug,price,stock\nExisting Product,SKU-001,existing-product,20000,50';

            // Mock: product exists
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.importProducts('tenant_test', csvData);

            expect(result.imported).toBe(1);
        });

        it('should track failed imports', async () => {
            const csvData = 'name,sku\n,'; // Missing required fields

            const result = await service.importProducts('tenant_test', csvData);

            expect(result.failed).toBe(1);
            expect(result.errors.length).toBe(1);
        });
    });

    describe('getProductTemplate', () => {
        it('should return CSV template', () => {
            const result = service.getProductTemplate();

            expect(result).toContain('name,slug,sku,price,stock,description');
            expect(result).toContain('Example Product');
        });
    });
});
