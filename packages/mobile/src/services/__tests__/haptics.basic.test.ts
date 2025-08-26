// Basic haptics service tests
describe('Haptics Service', () => {
  it('should export HapticService class', () => {
    const { HapticService } = require('../haptics');
    
    expect(HapticService).toBeDefined();
    expect(typeof HapticService).toBe('function');
  });

  it('should have all required static methods', () => {
    const { HapticService } = require('../haptics');
    
    expect(typeof HapticService.setEnabled).toBe('function');
    expect(typeof HapticService.getEnabled).toBe('function');
    expect(typeof HapticService.trigger).toBe('function');
    expect(typeof HapticService.light).toBe('function');
    expect(typeof HapticService.medium).toBe('function');
    expect(typeof HapticService.heavy).toBe('function');
    expect(typeof HapticService.success).toBe('function');
    expect(typeof HapticService.warning).toBe('function');
    expect(typeof HapticService.error).toBe('function');
    expect(typeof HapticService.selection).toBe('function');
    expect(typeof HapticService.buttonPress).toBe('function');
    expect(typeof HapticService.toggle).toBe('function');
    expect(typeof HapticService.longPress).toBe('function');
    expect(typeof HapticService.swipe).toBe('function');
  });

  it('should be enabled by default', () => {
    const { HapticService } = require('../haptics');
    
    expect(HapticService.getEnabled()).toBe(true);
  });

  it('should allow enabling and disabling', () => {
    const { HapticService } = require('../haptics');
    
    HapticService.setEnabled(false);
    expect(HapticService.getEnabled()).toBe(false);
    
    HapticService.setEnabled(true);
    expect(HapticService.getEnabled()).toBe(true);
  });
});