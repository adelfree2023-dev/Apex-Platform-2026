/**
 * Vendure Configuration Factory
 * Creates tenant-specific Vendure configuration
 * 
 * Per APEX_PLATFORM_CONTEXT.md:
 * - Each tenant's Vendure instance operates on its own schema
 * - Complete isolation of products, orders, customers
 */

import { VendureConfig, DefaultSearchPlugin, DefaultJobQueuePlugin, LanguageCode } from '@vendure/core';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import path from 'path';

export interface TenantVendureConfig {
  tenantId: string;
  tenantSchema: string;
  territory: string;
  businessType: string;
}

/**
 * Create Vendure configuration for a specific tenant
 */
export function createVendureConfig(config: TenantVendureConfig): VendureConfig {
  const { tenantId, tenantSchema } = config;

  return {
    apiOptions: {
      port: 3001,
      adminApiPath: `admin-api/${tenantId}`,
      shopApiPath: `shop-api/${tenantId}`,
      adminApiPlayground: process.env.NODE_ENV !== 'production',
      shopApiPlayground: process.env.NODE_ENV !== 'production',
    },
    authOptions: {
      tokenMethod: ['bearer', 'cookie'],
      superadminCredentials: {
        identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
        password: process.env.SUPERADMIN_PASSWORD || 'superadmin123',
      },
      requireVerification: false,
    },
    dbConnectionOptions: {
      type: 'postgres',
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
      database: 'apex_platform',
      schema: tenantSchema,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'apex_user',
      password: process.env.DB_PASSWORD || 'apex_secure_pass_2026',
    },
    paymentOptions: {
      paymentMethodHandlers: [],
    },
    customFields: {
      Product: [
        {
          name: 'cooperativeEligible',
          type: 'boolean',
          defaultValue: false,
          label: [{ languageCode: LanguageCode.en, value: 'Cooperative Eligible' }],
        },
        {
          name: 'qualityScore',
          type: 'float',
          defaultValue: 0,
          label: [{ languageCode: LanguageCode.en, value: 'Quality Score' }],
        },
        {
          name: 'replenishmentLeadTime',
          type: 'int',
          defaultValue: 0,
          label: [{ languageCode: LanguageCode.en, value: 'Replenishment Lead Time (days)' }],
        },
        {
          name: 'specializationTags',
          type: 'string',
          list: true,
          label: [{ languageCode: LanguageCode.en, value: 'Specialization Tags' }],
        },
      ],
      Order: [
        {
          name: 'territory',
          type: 'string',
          label: [{ languageCode: LanguageCode.en, value: 'Territory' }],
        },
        {
          name: 'fulfillmentType',
          type: 'string',
          defaultValue: 'single',
          label: [{ languageCode: LanguageCode.en, value: 'Fulfillment Type' }],
        },
      ],
    },
    plugins: [
      DefaultSearchPlugin,
      DefaultJobQueuePlugin,
      AssetServerPlugin.init({
        route: 'assets',
        assetUploadDir: path.join(__dirname, `../../../assets/${tenantId}`),
      }),
      AdminUiPlugin.init({
        route: 'admin',
        port: 3002,
      }),
    ],
  };
}

/**
 * Get database URL for tenant schema
 */
export function getTenantDatabaseUrl(tenantId: string): string {
  const baseUrl = process.env.DATABASE_URL || 'postgresql://apex_user:apex_secure_pass_2026@localhost:5432/apex_platform';
  const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
  return `${baseUrl}?schema=${schemaName}`;
}
