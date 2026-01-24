/**
 * Jest Setup for Apex Core
 */
import * as crypto from 'crypto';

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// 🛡️ Mock crypto globally for NestJS ModuleTokenFactory and other internals
// We polyfill it carefully to avoid breaking other things
if (typeof crypto.createHash !== 'function') {
    (crypto as any).createHash = (algorithm: string) => ({
        update: () => ({
            digest: () => 'mocked-hash'
        })
    });
}

// Global mocks if necessary
jest.setTimeout(15000);

// Suppress loggers during tests unless needed
if (process.env.SILENT_TESTS === 'true') {
    global.console.log = jest.fn();
    global.console.info = jest.fn();
    global.console.warn = jest.fn();
}
