import { Injectable, Logger } from '@nestjs/common';

/**
 * 🏰 Digital Fortress: CSP Configuration (S8)
 * - S8: Comprehensive Content Security Policy Management
 * - S8: Tenant-specific CSP rules
 * - S8: CSP violation reporting and analysis
 * - S8: Dynamic CSP generation for third-party integrations
 */
@Injectable()
export class CSPConfig {
  private readonly logger = new Logger(CSPConfig.name);

  // 🛡️ S8: Base CSP directives
  private readonly baseDirectives: Record<string, string[]> = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    workerSrc: ["'none'"],
    manifestSrc: ["'self'"],
    mediaSrc: ["'none'"],
    prefetchSrc: ["'self'"],
  };

  // 🛡️ S8: Environment-specific overrides
  private readonly environmentOverrides: Record<string, any> = {
    development: {
      scriptSrc: ["'self'", "'unsafe-inline'", 'http://localhost:*', 'ws://localhost:*'],
      connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
      imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:*'],
    },
    staging: {
      reportOnly: true,
      reportUri: '/api/report/csp-violation',
    },
    production: {
      scriptSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
      ],
      connectSrc: [
        "'self'",
        'https://api.apex-platform.com',
        'https://checkout.stripe.com',
        'https://api.mapbox.com',
      ],
      reportUri: 'https://api.apex-platform.com/report/csp-violation',
    },
  };

  // 🛡️ S8: Tenant-specific CSP overrides
  private tenantOverrides: Record<string, Record<string, string[]>> = {
    'social-commerce-tenant': {
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://connect.facebook.net', 'https://platform.twitter.com'],
      frameSrc: ["'self'", 'https://www.facebook.com', 'https://platform.twitter.com'],
      connectSrc: ["'self'", 'https://graph.facebook.com', 'https://api.twitter.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'https://*.fbcdn.net', 'https://pbs.twimg.com'],
    },
    'payment-focused-tenant': {
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com', 'https://checkout.razorpay.com'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://checkout.razorpay.com'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://api.razorpay.com'],
    },
  };

  /**
   * 🛡️ S8: Get CSP directives for a specific tenant and environment
   */
  getCSPDirectives(tenantId?: string, environment: string = process.env.NODE_ENV || 'development'): any {
    try {
      let directives = { ...this.baseDirectives } as Record<string, any>;
      const envConfig = this.environmentOverrides[environment] || {};

      if (envConfig.reportOnly || envConfig.reportUri) {
        directives.reportOnly = envConfig.reportOnly;
        directives.reportUri = envConfig.reportUri;
      }

      if (tenantId && this.tenantOverrides[tenantId]) {
        const tenantConfig = this.tenantOverrides[tenantId];
        for (const [directive, values] of Object.entries(tenantConfig)) {
          if (directives[directive] && Array.isArray(values)) {
            directives[directive] = [...new Set([...directives[directive], ...values])];
          } else {
            directives[directive] = values;
          }
        }
      }

      for (const [directive, values] of Object.entries(envConfig)) {
        if (directive !== 'reportOnly' && directive !== 'reportUri' && Array.isArray(values)) {
          if (directives[directive]) {
            directives[directive] = [...new Set([...directives[directive], ...values])];
          } else {
            directives[directive] = values;
          }
        }
      }

      if (environment === 'development') {
        directives.scriptSrc = [...(directives.scriptSrc || []), "'nonce-dev'"];
      }
      if (environment === 'production') {
        directives.upgradeInsecureRequests = [];
      }

      return directives;
    } catch (error) {
      this.logger.error(`Failed to generate CSP: ${error.message}`);
      return { ...this.baseDirectives };
    }
  }

  /**
   * 🛡️ S8: Generate CSP header value from directives
   */
  generateCSPHeader(directives: any): string {
    const headerParts = [];
    for (const [directive, values] of Object.entries(directives)) {
      if (directive === 'reportOnly' || directive === 'reportUri') continue;
      if (Array.isArray(values)) {
        headerParts.push(`${directive} ${values.join(' ')}`);
      }
    }
    if (directives.reportUri) headerParts.push(`report-uri ${directives.reportUri}`);
    return headerParts.join('; ');
  }

  /**
   * 🛡️ S8: Violation reporting
   */
  async processViolationReport(report: any, tenantId?: string): Promise<void> {
    this.logger.warn('CSP Violation Detected', { tenantId, report });
    // Pattern analysis logic preserved in audit service
  }

  private extractDomain(url: string): string | null {
    try {
      if (!url || url === 'about:blank') return null;
      const match = url.match(/^(?:https?:)?(?:\/\/)?([^\/]+)/i);
      return match ? match[1].toLowerCase() : null;
    } catch { return null; }
  }

  getAdminCSP(environment: string = process.env.NODE_ENV || 'development'): string {
    const adminDirectives = {
      ...this.getCSPDirectives(undefined, environment),
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      connectSrc: ["'self'", 'https://api.apex-platform.com'],
    };
    return this.generateCSPHeader(adminDirectives);
  }

  getStorefrontCSP(tenantId?: string, environment: string = process.env.NODE_ENV || 'development'): string {
    const storefrontDirectives = {
      ...this.getCSPDirectives(tenantId, environment),
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
    };
    return this.generateCSPHeader(storefrontDirectives);
  }
}
