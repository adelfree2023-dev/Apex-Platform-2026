/**
 * CSV Controller Unit Tests
 * Covers: Import/Export Products, Orders, Customers
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { CsvController } from './csv.controller';
import { CsvService } from './csv.service';

describe('CsvController', () => {
    let controller: CsvController;

    const mockCsvService = {
        getProductTemplate: jest.fn(),
        importProducts: jest.fn(),
        exportProducts: jest.fn(),
        exportOrders: jest.fn(),
        exportCustomers: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CsvController],
            providers: [
                { provide: CsvService, useValue: mockCsvService },
            ],
        }).compile();

        controller = module.get<CsvController>(CsvController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== TEMPLATE ====================

    describe('getProductTemplate', () => {
        it('should return CSV template', () => {
            const template = 'sku,name,price,quantity\n';
            mockCsvService.getProductTemplate.mockReturnValue(template);

            const mockRes = {
                set: jest.fn(),
                send: jest.fn(),
            } as any;

            controller.getProductTemplate(mockRes);

            expect(mockRes.set).toHaveBeenCalledWith({
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="products_template.csv"',
            });
            expect(mockRes.send).toHaveBeenCalledWith(template);
        });
    });

    // ==================== IMPORT ====================

    describe('importProducts', () => {
        it('should import products from CSV', async () => {
            mockCsvService.importProducts.mockResolvedValue({
                imported: 10,
                total: 12,
                errors: [{ row: 5, error: 'Invalid price' }],
            });

            const result = await controller.importProducts('test-store', {
                csvContent: 'sku,name,price\nSKU1,Product1,100',
            });

            expect(result.success).toBe(true);
            expect(result.data.imported).toBe(10);
            expect(result.message).toContain('10 of 12');
        });

        it('should throw without CSV content', async () => {
            await expect(controller.importProducts('test-store', {
                csvContent: '',
            })).rejects.toThrow(HttpException);
        });

        it('should handle import errors', async () => {
            mockCsvService.importProducts.mockRejectedValue(new Error('Parse error'));

            await expect(controller.importProducts('test-store', {
                csvContent: 'invalid,csv,content',
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== EXPORT PRODUCTS ====================

    describe('exportProducts', () => {
        it('should export products as download', async () => {
            const csvData = 'sku,name,price\nSKU1,Product1,100';
            mockCsvService.exportProducts.mockResolvedValue(csvData);

            const mockRes = {
                set: jest.fn(),
                send: jest.fn(),
                json: jest.fn(),
            } as any;

            await controller.exportProducts('test-store', 'true', mockRes);

            expect(mockRes.set).toHaveBeenCalled();
            expect(mockRes.send).toHaveBeenCalledWith(csvData);
        });

        it('should export products as JSON', async () => {
            const csvData = 'sku,name,price\nSKU1,Product1,100';
            mockCsvService.exportProducts.mockResolvedValue(csvData);

            const mockRes = {
                set: jest.fn(),
                send: jest.fn(),
                json: jest.fn(),
            } as any;

            await controller.exportProducts('test-store', 'false', mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: csvData,
                lines: 2,
            });
        });

        it('should throw on export error', async () => {
            mockCsvService.exportProducts.mockRejectedValue(new Error('Error'));

            const mockRes = { set: jest.fn(), send: jest.fn() } as any;

            await expect(controller.exportProducts('test-store', 'true', mockRes))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== EXPORT ORDERS ====================

    describe('exportOrders', () => {
        it('should export orders as download', async () => {
            const csvData = 'order_id,customer,total\n1001,Ahmed,500';
            mockCsvService.exportOrders.mockResolvedValue(csvData);

            const mockRes = {
                set: jest.fn(),
                send: jest.fn(),
                json: jest.fn(),
            } as any;

            await controller.exportOrders('test-store', 'true', undefined, undefined, mockRes);

            expect(mockRes.send).toHaveBeenCalledWith(csvData);
        });

        it('should export orders with date range', async () => {
            mockCsvService.exportOrders.mockResolvedValue('');

            const mockRes = { set: jest.fn(), send: jest.fn(), json: jest.fn() } as any;

            await controller.exportOrders('test-store', 'true', '2026-01-01', '2026-01-15', mockRes);

            expect(mockCsvService.exportOrders).toHaveBeenCalledWith(
                'tenant_test_store',
                expect.any(Date),
                expect.any(Date),
            );
        });

        it('should export orders as JSON', async () => {
            const csvData = 'order_id,customer,total\n1,Ahmed,500';
            mockCsvService.exportOrders.mockResolvedValue(csvData);

            const mockRes = { set: jest.fn(), send: jest.fn(), json: jest.fn() } as any;

            await controller.exportOrders('test-store', 'false', undefined, undefined, mockRes);

            expect(mockRes.json).toHaveBeenCalled();
        });
    });

    // ==================== EXPORT CUSTOMERS ====================

    describe('exportCustomers', () => {
        it('should export customers as download', async () => {
            const csvData = 'id,name,email\n1,Ahmed,ahmed@example.com';
            mockCsvService.exportCustomers.mockResolvedValue(csvData);

            const mockRes = {
                set: jest.fn(),
                send: jest.fn(),
                json: jest.fn(),
            } as any;

            await controller.exportCustomers('test-store', 'true', mockRes);

            expect(mockRes.send).toHaveBeenCalledWith(csvData);
        });

        it('should export customers as JSON', async () => {
            const csvData = 'id,name,email\n1,Ahmed,ahmed@example.com';
            mockCsvService.exportCustomers.mockResolvedValue(csvData);

            const mockRes = { set: jest.fn(), send: jest.fn(), json: jest.fn() } as any;

            await controller.exportCustomers('test-store', 'false', mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: csvData,
                lines: 2,
            });
        });

        it('should throw on export error', async () => {
            mockCsvService.exportCustomers.mockRejectedValue(new Error('Error'));

            const mockRes = { set: jest.fn(), send: jest.fn() } as any;

            await expect(controller.exportCustomers('test-store', 'true', mockRes))
                .rejects.toThrow(HttpException);
        });
    });
});
