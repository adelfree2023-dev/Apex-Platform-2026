import { SecurityContext } from './security.context';

describe('SecurityContext', () => {
  let ctx: SecurityContext;

  beforeEach(() => {
    ctx = new SecurityContext();
  });

  it('logs security events without throwing', () => {
    expect(() => ctx.logSecurityEvent('TEST_EVENT', { foo: 'bar' })).not.toThrow();
    expect(() => ctx.logCriticalSecurityEvent('CRIT', { baz: 1 })).not.toThrow();
  });
});
