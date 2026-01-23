/**
 * Jest Setup for Apex Core
 */

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Global mocks if necessary
jest.setTimeout(10000); // 10s timeout for tests

// Suppress loggers during tests unless needed
if (process.env.SILENT_TESTS === 'true') {
    global.console.log = jest.fn();
    global.console.info = jest.fn();
    global.console.warn = jest.fn();
    // Keep error for debugging
}
