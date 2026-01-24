/**
 * Jest Setup for Apex Core
 */
import * as crypto from 'crypto';

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// 🛡️ S8: Global crypto polyfill for environments where it might be shadowed or missing
// We explicitly define it on the object to ensure named imports work.
if (typeof crypto.createHash !== 'function') {
    const mockCreateHash = (algorithm: string) => ({
        update: function () { return this; },
        digest: function () { return 'mocked-hash'; }
    });

    // Set on the imported object (works for commonjs require)
    (crypto as any).createHash = mockCreateHash;

    // Also try to set on the module itself if possible
    try {
        const nodeCrypto = require('node:crypto');
        nodeCrypto.createHash = mockCreateHash;
    } catch (e) { }
}

// Global mocks if necessary
jest.setTimeout(15000);

// Suppress loggers during tests unless needed
if (process.env.SILENT_TESTS === 'true') {
    global.console.log = jest.fn();
    global.console.info = jest.fn();
    global.console.warn = jest.fn();
}
