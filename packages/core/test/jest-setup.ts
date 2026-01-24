/**
 * Jest Setup for Apex Core
 */
import * as crypto from 'crypto';

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// 🛡️ Mock crypto globally for NestJS ModuleTokenFactory and other internals
// We use Object.defineProperty to ensure we can override it if it exists or not
if (typeof (crypto as any).createHash !== 'function') {
    Object.defineProperty(crypto, 'createHash', {
        value: () => ({
            update: () => ({
                digest: () => 'mocked-hash'
            })
        }),
        writable: true,
        configurable: true
    });
}

// Global mocks if necessary
jest.setTimeout(15000); // Increased timeout for heavy tests

// Suppress loggers during tests unless needed
if (process.env.SILENT_TESTS === 'true') {
    global.console.log = jest.fn();
    global.console.info = jest.fn();
    global.console.warn = jest.fn();
}
