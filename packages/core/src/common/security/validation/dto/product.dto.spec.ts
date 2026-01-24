import { ProductSchema, UpdateProductSchema, ProductSearchSchema, ProductVariantSchema } from './product.dto';

describe('ProductDTO Validation', () => {
    const validProduct = {
        name: 'Test Product',
        price: 100,
        stock: 50,
        slug: 'test-product',
        sku: 'SKU-001',
        isActive: true
    };

    describe('ProductSchema', () => {
        it('should validate a correct product', () => {
            expect(ProductSchema.parse(validProduct)).toMatchObject(validProduct);
        });

        it('should require name and positive price', () => {
            expect(() => ProductSchema.parse({ ...validProduct, name: '' })).toThrow();
            expect(() => ProductSchema.parse({ ...validProduct, price: -10 })).toThrow();
        });

        it('should enforce compareAtPrice > price', () => {
            const invalid = { ...validProduct, price: 100, compareAtPrice: 90 };
            expect(() => ProductSchema.parse(invalid)).toThrow('سعر المقارنة يجب أن يكون أكبر من السعر الأساسي');

            const valid = { ...validProduct, price: 100, compareAtPrice: 150 };
            expect(ProductSchema.parse(valid)).toMatchObject(valid);
        });

        it('should validate slug regex', () => {
            expect(() => ProductSchema.parse({ ...validProduct, slug: 'Invalid Slug!' })).toThrow();
            expect(ProductSchema.parse({ ...validProduct, slug: 'valid-slug-123' })).toBeDefined();
        });
    });

    describe('UpdateProductSchema', () => {
        it('should require ID for updates', () => {
            expect(() => UpdateProductSchema.parse({ name: 'Update' })).toThrow();
            expect(UpdateProductSchema.parse({ id: 1, name: 'Update' })).toBeDefined();
        });

        it('should allow partial updates', () => {
            const result = UpdateProductSchema.parse({ id: 1 });
            expect(result.id).toBe(1);
            expect(result.name).toBeUndefined();
        });
    });

    describe('ProductSearchSchema', () => {
        it('should apply defaults for page and limit', () => {
            const result = ProductSearchSchema.parse({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
            expect(result.sortBy).toBe('createdAt');
            expect(result.sortOrder).toBe('desc');
        });

        it('should validate numeric ranges for price and limit', () => {
            expect(() => ProductSearchSchema.parse({ minPrice: -1 })).toThrow();
            expect(() => ProductSearchSchema.parse({ limit: 500 })).toThrow(); // Max 100
        });
    });

    describe('ProductVariantSchema', () => {
        it('should enforce compareAtPrice > price for variants', () => {
            const invalid = { productId: 1, price: 100, compareAtPrice: 50 };
            expect(() => ProductVariantSchema.parse(invalid)).toThrow('سعر المقارنة يجب أن يكون أكبر من السعر الأساسي');
        });
    });
});
