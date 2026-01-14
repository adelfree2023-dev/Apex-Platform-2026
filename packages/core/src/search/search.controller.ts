/**
 * Search Controller
 * API endpoints for advanced product search
 */

import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { SearchService, SearchFilters } from './search.service';

@Controller('api/shop')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    /**
     * Advanced product search with filters
     */
    @Get(':tenantId/search')
    async searchProducts(
        @Param('tenantId') tenantId: string,
        @Query('q') query?: string,
        @Query('category') categorySlug?: string,
        @Query('minPrice') minPrice?: string,
        @Query('maxPrice') maxPrice?: string,
        @Query('inStock') inStock?: string,
        @Query('sortBy') sortBy?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        const filters: SearchFilters = {
            query,
            categorySlug,
            minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
            maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
            inStock: inStock === 'true',
            sortBy: sortBy as any,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        };

        try {
            const result = await this.searchService.searchProducts(tenantSchema, filters);
            return {
                success: true,
                ...result,
            };
        } catch (error) {
            throw new HttpException(
                `Search failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get search suggestions (autocomplete)
     */
    @Get(':tenantId/search/suggestions')
    async getSearchSuggestions(
        @Param('tenantId') tenantId: string,
        @Query('q') query: string,
        @Query('limit') limit?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const suggestions = await this.searchService.getSearchSuggestions(
                tenantSchema,
                query,
                limit ? parseInt(limit, 10) : 5,
            );
            return {
                success: true,
                data: suggestions,
                query,
            };
        } catch (error) {
            return {
                success: true,
                data: [],
                query,
            };
        }
    }

    /**
     * Get available search filters (facets)
     */
    @Get(':tenantId/search/facets')
    async getSearchFacets(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const facets = await this.searchService.getSearchFacets(tenantSchema);
            return {
                success: true,
                data: facets,
            };
        } catch (error) {
            return {
                success: true,
                data: {
                    categories: [],
                    priceRange: { min: 0, max: 0 },
                    stockStatus: { inStock: 0, outOfStock: 0 },
                },
            };
        }
    }
}
