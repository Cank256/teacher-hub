/**
 * Simple test to verify Jest setup
 */

describe('Simple Test', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle basic JavaScript operations', () => {
    const obj = { a: 1, b: 2 };
    expect(obj.a).toBe(1);
    expect(Object.keys(obj)).toEqual(['a', 'b']);
  });

  it('should work with async operations', async () => {
    const promise = Promise.resolve(42);
    const result = await promise;
    expect(result).toBe(42);
  });
});