import { Injectable, Logger } from '@nestjs/common';
import * as xss from 'xss';

/**
 * 🏰 Digital Fortress: Sanitizer Service (S3)
 */
@Injectable()
export class SanitizerService {
  private readonly logger = new Logger(SanitizerService.name);

  /**
   * Cleans string from XSS and malicious characters
   */
  sanitize(content: string): string {
    if (!content || typeof content !== 'string') return content;

    // Use xss library for robust cleaning
    return xss.filterXSS(content, {
      whiteList: {}, // No HTML allowed by default
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
    });
  }

  /**
   * Sanitizes an entire object recursively
   */
  sanitizeObject<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        (obj[key] as any) = this.sanitize(obj[key] as string);
      } else if (typeof obj[key] === 'object') {
        this.sanitizeObject(obj[key]);
      }
    }
    return obj;
  }
}
