// Basic import tests to verify components are properly structured
describe('UI Components', () => {
  it('should export Button component', () => {
    const Button = require('../Button/Button').default;
    expect(Button).toBeDefined();
    expect(typeof Button).toBe('function');
  });

  it('should export Input component', () => {
    const Input = require('../Input/Input').default;
    expect(Input).toBeDefined();
    expect(typeof Input).toBe('function');
  });

  it('should export Card component', () => {
    const Card = require('../Card/Card').default;
    expect(Card).toBeDefined();
    expect(typeof Card).toBe('function');
  });

  it('should export Text component', () => {
    const Text = require('../Text/Text').default;
    expect(Text).toBeDefined();
    expect(typeof Text).toBe('function');
  });

  it('should export Switch component', () => {
    const Switch = require('../Switch/Switch').default;
    expect(Switch).toBeDefined();
    expect(typeof Switch).toBe('function');
  });

  it('should export Loading component', () => {
    const Loading = require('../Loading/Loading').default;
    expect(Loading).toBeDefined();
    expect(typeof Loading).toBe('function');
  });

  it('should export all components from index', () => {
    const components = require('../index');
    
    expect(components.Button).toBeDefined();
    expect(components.Input).toBeDefined();
    expect(components.Card).toBeDefined();
    expect(components.Text).toBeDefined();
    expect(components.Switch).toBeDefined();
    expect(components.Loading).toBeDefined();
  });
});