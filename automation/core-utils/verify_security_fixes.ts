
import { Test, TestingModule } from '@nestjs/testing';
import { VendureService } from '../../packages/core/src/vendors/vendure.service';
import { WishlistService } from '../../packages/core/src/wishlists/wishlist.service';
import { TenantsService } from '../../packages/core/src/tenants/tenants.service';
import { PrismaService } from '../../packages/core/src/prisma/prisma.service';
import { EventService } from '../../packages/core/src/events/event.service';
import { NotFoundException } from '@nestjs/common';

// Mock Prisma
const mockPrisma = {
    $executeRawUnsafe: () => Promise.resolve(),
    $queryRawUnsafe: () => Promise.resolve([]),
};

// Mock Events
const mockEvents = {
    record: () => Promise.resolve(),
};

// Mock Tenants
const mockTenantsService = {
    findById: (id: string) => {
        if (id === 'valid-tenant') {
            return Promise.resolve({ id, status: 'active', subdomain: 'valid' });
        }
        if (id === 'suspended-tenant') {
            return Promise.resolve({ id, status: 'suspended', subdomain: 'suspended' });
        }
        return Promise.resolve(null);
    },
};

async function verify() {
    console.log('🔒 Verifying Security Fixes...');

    const module: TestingModule = await Test.createTestingModule({
        providers: [
            VendureService,
            WishlistService,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: EventService, useValue: mockEvents },
            { provide: TenantsService, useValue: mockTenantsService },
        ],
    }).compile();

    const vendureService = module.get<VendureService>(VendureService);
    const wishlistService = module.get<WishlistService>(WishlistService);

    console.log('✅ Dependency Injection Successful');

    // Test 1: VendureService with valid tenant
    try {
        await vendureService.getProducts('valid-tenant');
        console.log('✅ VendureService: valid tenant accepted');
    } catch (e) {
        console.error('❌ VendureService: Unexpected validation failure for valid tenant', e);
    }

    // Test 2: VendureService with invalid tenant
    try {
        await vendureService.getProducts('invalid-tenant');
        console.error('❌ VendureService: Failed to block invalid tenant');
    } catch (e: any) {
        if (e instanceof NotFoundException) {
            console.log('✅ VendureService: invalid tenant blocked (NotFoundException)');
        } else {
            console.error('❌ VendureService: Unexpected error type:', e);
        }
    }

    // Test 3: VendureService with suspended tenant
    try {
        await vendureService.getProducts('suspended-tenant');
        console.error('❌ VendureService: Failed to block suspended tenant');
    } catch (e: any) {
        if (e && e.message && e.message.includes('suspended')) {
            console.log('✅ VendureService: suspended tenant blocked (Forbidden)');
        } else {
            console.error('❌ VendureService: Unexpected error type:', e);
        }
    }

    // Test 4: WishlistService with valid tenant
    try {
        await wishlistService.getWishlist('valid-tenant', 1);
        console.log('✅ WishlistService: valid tenant accepted');
    } catch (e) {
        console.error('❌ WishlistService: Unexpected failure for valid tenant', e);
    }

    // Test 5: WishlistService with invalid tenant
    try {
        await wishlistService.getWishlist('invalid-tenant', 1);
        console.error('❌ WishlistService: Failed to block invalid tenant');
    } catch (e: any) {
        if (e instanceof NotFoundException) {
            console.log('✅ WishlistService: invalid tenant blocked (NotFoundException)');
        } else {
            console.error('❌ WishlistService: Unexpected error type:', e);
        }
    }

    console.log('🎉 Verification Complete!');
}

verify().catch(console.error);
