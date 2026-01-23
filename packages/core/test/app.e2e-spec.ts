/**
 * E2E API Tests
 * Tests the actual API endpoints using supertest
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Apex Platform E2E Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Health Check', () => {
        it('GET / should return OK', () => {
            return request(app.getHttpServer())
                .get('/')
                .expect(200);
        });
    });

    describe('Loyalty API', () => {
        const tenantId = 'test-tenant';

        it('POST /api/shop/:tenantId/loyalty/migrate-loyalty should create tables', () => {
            return request(app.getHttpServer())
                .post(`/api/shop/${tenantId}/loyalty/migrate-loyalty`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });

        it('GET /api/shop/:tenantId/loyalty/rewards should return rewards', () => {
            return request(app.getHttpServer())
                .get(`/api/shop/${tenantId}/loyalty/rewards`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });
    });

    describe('Booking API', () => {
        const tenantId = 'test-tenant';

        it('POST /api/shop/:tenantId/bookings/migrate-bookings should create tables', () => {
            return request(app.getHttpServer())
                .post(`/api/shop/${tenantId}/bookings/migrate-bookings`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });

        it('GET /api/shop/:tenantId/bookings/services should return services', () => {
            return request(app.getHttpServer())
                .get(`/api/shop/${tenantId}/bookings/services`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });
    });

    describe('Marketplace API', () => {
        const tenantId = 'test-tenant';

        it('POST /api/shop/:tenantId/marketplace/migrate-marketplace should create tables', () => {
            return request(app.getHttpServer())
                .post(`/api/shop/${tenantId}/marketplace/migrate-marketplace`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });

        it('GET /api/shop/:tenantId/marketplace/vendors should return vendors list', () => {
            return request(app.getHttpServer())
                .get(`/api/shop/${tenantId}/marketplace/vendors`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });
    });

    describe('Subscription API', () => {
        const tenantId = 'test-tenant';

        it('POST /api/shop/:tenantId/subscriptions/migrate-subscriptions should create tables', () => {
            return request(app.getHttpServer())
                .post(`/api/shop/${tenantId}/subscriptions/migrate-subscriptions`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });

        it('GET /api/shop/:tenantId/subscriptions/plans should return plans', () => {
            return request(app.getHttpServer())
                .get(`/api/shop/${tenantId}/subscriptions/plans`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });
    });

    describe('Affiliate API', () => {
        const tenantId = 'test-tenant';

        it('POST /api/shop/:tenantId/affiliates/migrate-affiliates should create tables', () => {
            return request(app.getHttpServer())
                .post(`/api/shop/${tenantId}/affiliates/migrate-affiliates`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });
    });

    describe('AI API', () => {
        const tenantId = 'test-tenant';

        it('POST /api/shop/:tenantId/ai/migrate-ai should create tables', () => {
            return request(app.getHttpServer())
                .post(`/api/shop/${tenantId}/ai/migrate-ai`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });

        it('GET /api/shop/:tenantId/ai/trending should return trending products', () => {
            return request(app.getHttpServer())
                .get(`/api/shop/${tenantId}/ai/trending`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });
    });

    describe('Search API', () => {
        const tenantId = 'test-tenant';

        it('GET /api/shop/:tenantId/search should return search results', () => {
            return request(app.getHttpServer())
                .get(`/api/shop/${tenantId}/search?q=honey`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });
    });

    describe('Wishlist API', () => {
        const tenantId = 'test-tenant';

        it('POST /api/shop/:tenantId/wishlists/migrate-wishlists should create tables', () => {
            return request(app.getHttpServer())
                .post(`/api/shop/${tenantId}/wishlists/migrate-wishlists`)
                .expect((res) => {
                    expect([200, 201]).toContain(res.status);
                });
        });
    });
});
