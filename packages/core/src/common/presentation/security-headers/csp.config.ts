import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
* 🏰 Digital Fortress: CSP Configuration (S8)
* - سياسة أمان محتوى موحدة وآمنة
* - يدعم البيئات المختلفة (تطوير، إنتاج)
* - يوفر تقارير الانتهاكات للتحليل
*/
@Injectable()
export class CSPConfig {
  private readonly logger = new Logger(CSPConfig.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly nonceCache = new Map<string, { nonce: string, timestamp: number }>();
  private readonly nonceExpiry = 10 * 60 * 1000; // 10 دقائق

  constructor() {
    this.cleanupNonceCache();
  }

  private cleanupNonceCache(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.nonceCache.entries()) {
        if (now - value.timestamp > this.nonceExpiry) {
          this.nonceCache.delete(key);
        }
      }
    }, 60000); // تنظيف كل دقيقة
  }

  /**
  * 🛡️ S8: توليد nonce آمن للمصادر الداخلية
  */
  generateNonce(requestId: string): string {
    const nonce = Buffer.from(crypto.randomBytes(16)).toString('base64');
    this.nonceCache.set(requestId, { nonce, timestamp: Date.now() });
    return nonce;
  }

  /**
  * 🛡️ S8: التحقق من صحة nonce
  */
  validateNonce(requestId: string, nonce: string): boolean {
    const cached = this.nonceCache.get(requestId);
    if (!cached || Date.now() - cached.timestamp > this.nonceExpiry) {
      return false;
    }

    const cachedBuffer = Buffer.from(cached.nonce);
    const nonceBuffer = Buffer.from(nonce);

    // 🛡️ S8: crypto.timingSafeEqual requires same length buffers
    if (cachedBuffer.length !== nonceBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(cachedBuffer, nonceBuffer);
  }

  /**
  * 🛡️ S8: الحصول على توجيهات CSP المناسبة للبيئة
  */
  getCSPDirectives(tenantId?: string, environment: string = process.env.NODE_ENV || 'development'): Record<string, string[]> {
    const baseDirectives: Record<string, string[]> = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'none'"],
      manifestSrc: ["'self'"],
      mediaSrc: ["'none'"],
      prefetchSrc: ["'self'"],
      upgradeInsecureRequests: [],
    };

    // التعديلات حسب البيئة
    if (environment === 'development') {
      baseDirectives.scriptSrc.push('http://localhost:*', 'ws://localhost:*');
      baseDirectives.connectSrc.push('http://localhost:*', 'ws://localhost:*');
      baseDirectives.imgSrc.push('http://localhost:*');
    } else {
      baseDirectives.connectSrc.push('https://api.stripe.com', 'https://checkout.stripe.com');
      baseDirectives.imgSrc.push('https://*.stripe.com');
      baseDirectives.frameSrc.push('https://js.stripe.com', 'https://checkout.stripe.com');

      if (environment === 'production') {
        baseDirectives.connectSrc.push('https://api.apex-platform.com');
        baseDirectives.reportUri = ['https://api.apex-platform.com/report/csp-violation'];
      }
    }

    // التعديلات حسب نوع المستأجر
    if (tenantId) {
      const tenantSpecific = this.getTenantSpecificDirectives(tenantId, environment);
      for (const [directive, values] of Object.entries(tenantSpecific)) {
        if (baseDirectives[directive]) {
          baseDirectives[directive] = [...new Set([...baseDirectives[directive], ...values])];
        } else {
          baseDirectives[directive] = values;
        }
      }
    }

    return baseDirectives;
  }

  private getTenantSpecificDirectives(tenantId: string, environment: string): Record<string, string[]> {
    const tenantDirectives: Record<string, string[]> = {};

    // التحقق من نوع المستأجر للسماح بمصادر محددة
    if (this.isPaymentFocusedTenant(tenantId)) {
      tenantDirectives.scriptSrc = ['https://js.stripe.com', 'https://checkout.razorpay.com'];
      tenantDirectives.frameSrc = ['https://js.stripe.com', 'https://checkout.razorpay.com'];
      tenantDirectives.connectSrc = ['https://api.stripe.com', 'https://api.razorpay.com'];
    }

    if (this.isSocialCommerceTenant(tenantId)) {
      tenantDirectives.scriptSrc = ['https://connect.facebook.net', 'https://platform.twitter.com'];
      tenantDirectives.frameSrc = ['https://www.facebook.com', 'https://platform.twitter.com'];
      tenantDirectives.connectSrc = ['https://graph.facebook.com', 'https://api.twitter.com'];
      tenantDirectives.imgSrc = ['https://*.fbcdn.net', 'https://pbs.twimg.com'];
    }

    return tenantDirectives;
  }

  private isPaymentFocusedTenant(tenantId: string): boolean {
    // هنا يمكن وضع منطق للتحقق من نوع المستأجر
    // للتبسيط، نستخدم قائمة بيضاء للمستأجرين
    const paymentTenants = ['payment-tenant-1', 'enterprise-store'];
    return paymentTenants.includes(tenantId);
  }

  private isSocialCommerceTenant(tenantId: string): boolean {
    const socialTenants = ['social-store-1', 'influencer-shop'];
    return socialTenants.includes(tenantId);
  }

  /**
  * 🛡️ S8: توليد رأس CSP من التوجيهات
  */
  generateCSPHeader(directives: Record<string, string[]>): string {
    return Object.entries(directives)
      .map(([directive, values]) => {
        const kebabKey = directive.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        if (kebabKey === 'report-uri' && values.length > 0) {
          return `report-uri ${values.join(' ')}`;
        }
        return `${kebabKey} ${values.join(' ')}`;
      })
      .join('; ');
  }

  /**
  * 🛡️ S8: معالجة تقارير انتهاكات CSP
  */
  async processViolationReport(report: any, tenantId?: string, requestId?: string): Promise<void> {
    this.logger.warn('CSP Violation Detected', {
      tenantId,
      requestId,
      blockedUri: report['blocked-uri'],
      violatedDirective: report['violated-directive'],
      documentUri: report['document-uri']
    });

    // هنا يمكن إضافة منطق لتحليل النمط واتخاذ إجراءات
    if (tenantId && requestId) {
      // تسجيل الحدث في نظام التدقيق
      // ... منطق التسجيل
    }
  }
}