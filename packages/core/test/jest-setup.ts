/**
 * Jest Setup for Apex Core
 */

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// 🛡️ Mock crypto globally for NestJS ModuleTokenFactory and other internals
// Using jest.mock ensures all imports of 'crypto' pick up the mock.
jest.mock('crypto', () => {
    const actual = jest.requireActual('crypto');
    return {
        ...actual,
        createHash: (algorithm: string) => ({
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('mocked-hash'),
        }),
    };
}, { virtual: true });

// Global mocks if necessary
jest.setTimeout(15000); // Increased timeout for heavy tests

// Suppress loggers during tests unless needed
if (process.env.SILENT_TESTS === 'true') {
    global.console.log = jest.fn();
    global.console.info = jest.fn();
    global.console.warn = jest.fn();
}
