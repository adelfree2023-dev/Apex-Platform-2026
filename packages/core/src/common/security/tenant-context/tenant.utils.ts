import { PrismaService } from '../../../prisma/prisma.service';
import { BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Request } from 'express';

export class TenantUtils {
  // ✅ S2: التحقق من الوصول للمستأجر
  static validateTenantAccess(tenantId: string, requestTenantId: string): boolean {
    if (!tenantId || !requestTenantId) {
      throw new ForbiddenException('معرف المستأجر مفقود في الطلب');
    }

    if (tenantId !== requestTenantId) {
      // سجل محاولة وصول غير مصرح بها
      Logger.warn(`محاولة وصول غير مصرح به: المستأجر ${requestTenantId} يحاول الوصول إلى بيانات المستأجر ${tenantId}`);
      return false;
    }
    return true;
  }

  // ✅ S2: الحصول على معرف المستأجر من الطلب
  static getTenantIdFromRequest(request: Request): string {
    const tenantId = request.headers['x-tenant-id'] ||
      request.query.tenantId ||
      request.body.tenantId;

    if (!tenantId) {
      throw new BadRequestException('معرف المستأجر مطلوب في كل طلب');
    }

    // التحقق من صحة معرف المستأجر
    if (typeof tenantId !== 'string' || tenantId.length < 10) {
      throw new BadRequestException('معرف المستأجر غير صالح');
    }

    return tenantId as string;
  }
}

/**
 * ✅ S2: الحصول على اسم مخطط قاعدة البيانات
 * - التنسيق الموحد: tenant_xxx_yyy
 * - التحقق من الصحة
 */
export function getTenantSchemaName(tenantId: string): string {
  // 🛡️ التحقق الأساسي من القيمة
  if (!tenantId || typeof tenantId !== 'string' || tenantId.length < 5) {
    throw new BadRequestException('معرف المستأجر غير صالح');
  }

  // تطبيق التنسيق الموحد
  const normalizedId = tenantId.trim()
    .replace(/[^a-z0-9-]/gi, '_')
    .replace(/-+/g, '_')
    .toLowerCase();

  return `tenant_${normalizedId}`;
}

/**
 * ✅ S2: التحقق من صحة معرف المستأجر
 * - التنسيق: UUID
 * - الطول الأدنى
 */
export function ensureValidTenantId(tenantId: any): string {
  // 🛡️ التحقق الأساسي والحذف المبكر للمسافات
  if (!tenantId || typeof tenantId !== 'string') {
    throw new BadRequestException(`معرف المستأجر غير صالح: ${tenantId}`);
  }

  const trimmedId = tenantId.trim();

  if (trimmedId.length < 5) {
    throw new BadRequestException(`معرف المستأجر قصير جداً: ${trimmedId}`);
  }

  // 🛡️ التحقق من تنسيق UUID الموحد
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmedId)) {
    throw new BadRequestException('معرف المستأجر يجب أن يكون بصيغة UUID صالحة');
  }

  return trimmedId;
}

/**
 * ✅ S2: التحقق من استعداد مخطط قاعدة البيانات
 * - التحقق من وجود المخطط في قاعدة البيانات
 * - التحقق من وجود الجداول الأساسية
 */
export async function isTenantSchemaReady(prisma: PrismaService, tenantId: string): Promise<boolean> {
  try {
    const schemaName = getTenantSchemaName(tenantId);

    // 🛡️ التحقق من وجود المخطط
    const schemaExists = await prisma.$queryRaw<any[]>`
      SELECT EXISTS(
        SELECT 1 
        FROM information_schema.schemata 
        WHERE schema_name = ${schemaName}
      ) as exists
    `;

    if (!schemaExists[0]?.exists) {
      return false;
    }

    // 🛡️ التحقق من وجود الجداول الأساسية
    const tablesCheck = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = ${schemaName} 
        AND table_name IN ('vendure_product', 'vendure_customer', 'vendure_order')
    `;

    return Number(tablesCheck[0]?.table_count || 0) >= 3;
  } catch (error) {
    console.error(`Error checking schema readiness for tenant ${tenantId}:`, error.message);
    return false;
  }
}
