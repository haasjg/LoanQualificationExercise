// src/setupTests.ts
/**
 * Test setup file.
 * Mocks sessionStorage before any module is loaded and imports jest-dom matchers.
 */

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Create a mock sessionStorage implementation
const createMockSessionStorage = () => {
  let storage: Record<string, string> = {};

  return {
    getItem: (key: string) => {
      return storage[key] ?? null;
    },
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
  };
};

// Create and replace with mock sessionStorage
const mockSessionStorage = createMockSessionStorage();

// Replace global sessionStorage
Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
  configurable: true,
});

// Export for use in test files
export { mockSessionStorage };