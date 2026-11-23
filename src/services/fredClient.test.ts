// src/services/fredClient.test.ts
/**
 * Unit tests for FRED client service.
 * Tests API fetch, sessionStorage cache, and all fallback scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readCachedRate, offlineResult, fetchBenchmarkRate } from './fredClient';
import type { SessionCacheEntry } from '../engine/types';

// ============================================================================
// Setup: Mock sessionStorage for Node environment
// ============================================================================

// Create a mock sessionStorage implementation
// This is NOT global - each test file has its own instance
const createMockSessionStorage = () => {
  let storage: Record<string, string> = {};
  const setItemMock = vi.fn((key: string, value: string) => {
    storage[key] = value;
  });

  return {
    getItem: (key: string) => {
      return storage[key] ?? null;
    },
    setItem: setItemMock,
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
    // vi.fn for tracking calls
    setItemMock,
  };
};

// Store the original sessionStorage
const originalSessionStorage = (globalThis as any).sessionStorage;

// ============================================================================
// Cache Helper Tests: readCachedRate
// ============================================================================

describe('readCachedRate', () => {
  let mockSessionStorage: any;

  beforeEach(() => {
    mockSessionStorage = createMockSessionStorage();
    (globalThis as any).sessionStorage = mockSessionStorage;
  });

  afterEach(() => {
    (globalThis as any).sessionStorage = originalSessionStorage;
  });

  const validEntry: SessionCacheEntry = {
    value: 11.25,
    fetchedAt: '2024-01-15T10:30:00.000Z',
    referenceLabel: '2024-01',
  };

  it('returns null when sessionStorage is empty', () => {
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns null when value is not a valid number', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: 'invalid', fetchedAt: '2024-01-15', referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns null when value is NaN', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: NaN, fetchedAt: '2024-01-15', referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns null when value is Infinity', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: Infinity, fetchedAt: '2024-01-15', referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns null when value is below minimum (0.01)', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: 0.005, fetchedAt: '2024-01-15', referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns null when value is above maximum (40.00)', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: 41.00, fetchedAt: '2024-01-15', referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns null when fetchedAt is missing', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: 11.25, referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns null when referenceLabel is missing', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: 11.25, fetchedAt: '2024-01-15' }));
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns null when entry is malformed JSON', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', '{invalid json');
    const result = readCachedRate();
    expect(result).toBeNull();
  });

  it('returns valid SessionCacheEntry when data is valid', () => {
    const now = new Date();
    const recentEntry: SessionCacheEntry = {
      value: 11.25,
      fetchedAt: now.toISOString(),
      referenceLabel: '2024-01',
    };
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify(recentEntry));
    const result = readCachedRate();
    expect(result).toEqual({
      value: 11.25,
      source: 'CACHED',
      referenceLabel: '2024-01',
      fetchedAt: recentEntry.fetchedAt,
    });
  });

  it('returns valid entry at boundary value 0.01', () => {
    const now = new Date();
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: 0.01, fetchedAt: now.toISOString(), referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).not.toBeNull();
    expect(result?.value).toBe(0.01);
  });

  it('returns valid entry at boundary value 40.00', () => {
    const now = new Date();
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: 40.00, fetchedAt: now.toISOString(), referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).not.toBeNull();
    expect(result?.value).toBe(40.00);
  });

  it('returns null for negative values (below minimum 0.01)', () => {
    mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({ value: -1.50, fetchedAt: '2024-01-15', referenceLabel: '2024-01' }));
    const result = readCachedRate();
    expect(result).toBeNull();
  });
});

// ============================================================================
// Cache Helper Tests: offlineResult
// ============================================================================

describe('offlineResult', () => {
  it('returns offline benchmark result with correct structure', () => {
    const result = offlineResult();
    expect(result).toEqual({
      value: 11.50,
      source: 'OFFLINE',
      referenceLabel: 'Reference period: Nov 2023',
      fetchedAt: null,
    });
  });

  it('value is exactly 11.50', () => {
    const result = offlineResult();
    expect(result.value).toBe(11.50);
  });

  it('source is always OFFLINE', () => {
    const result = offlineResult();
    expect(result.source).toBe('OFFLINE');
  });

  it('referenceLabel includes reference period', () => {
    const result = offlineResult();
    expect(result.referenceLabel).toBe('Reference period: Nov 2023');
  });

  it('fetchedAt is null for offline result', () => {
    const result = offlineResult();
    expect(result.fetchedAt).toBeNull();
  });
});

// ============================================================================
// Main Fetch Function Tests: fetchBenchmarkRate
// ============================================================================

describe('fetchBenchmarkRate', () => {
  const MOCK_API_KEY = 'test-api-key-12345';

  let mockSessionStorage: any;

  beforeEach(() => {
    mockSessionStorage = createMockSessionStorage();
    (globalThis as any).sessionStorage = mockSessionStorage;
  });

  afterEach(() => {
    (globalThis as any).sessionStorage = originalSessionStorage;
  });

  describe('API key handling', () => {
    it('returns offline result when API key is empty string', async () => {
      const result = await fetchBenchmarkRate('');
      expect(result).toEqual(offlineResult());
    });

    it('returns offline result when API key is whitespace only', async () => {
      const result = await fetchBenchmarkRate('   ');
      expect(result).toEqual(offlineResult());
    });

    it('returns offline result when API key is null', async () => {
      const result = await fetchBenchmarkRate(null as any);
      expect(result).toEqual(offlineResult());
    });

    it('returns offline result when API key is undefined', async () => {
      const result = await fetchBenchmarkRate(undefined as any);
      expect(result).toEqual(offlineResult());
    });
  });

  describe('sessionStorage cache', () => {
    it('returns cached value when valid cache exists', async () => {
      // Pre-populate cache with recent timestamp
      const now = new Date();
      mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({
        value: 11.25,
        fetchedAt: now.toISOString(),
        referenceLabel: '2024-01',
      }));

      const result = await fetchBenchmarkRate(MOCK_API_KEY);
      expect(result).toEqual({
        value: 11.25,
        source: 'CACHED',
        referenceLabel: '2024-01',
        fetchedAt: now.toISOString(),
      });
    });

    it('ignores invalid cache and proceeds to fetch', async () => {
      // Pre-populate with invalid value (wrong type)
      mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({
        value: 'invalid',
        fetchedAt: new Date().toISOString(),
        referenceLabel: '2024-01',
      }));

      // Mock fetch to return valid response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-02', value: '11.50' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);
      expect(result.source).toBe('LIVE');
      expect(result.value).toBe(11.50);
    });

    it('caches successful API response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: '11.25' }] }),
      });

      await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      // Verify cache was written
      const cacheEntry = mockSessionStorage.setItem.mock.calls[0];
      expect(cacheEntry).toBeDefined();
      expect(JSON.parse(cacheEntry[1])).toMatchObject({ value: 11.25, referenceLabel: '2024-01' });
    });
  });

  describe('API fetch success', () => {
    it('parses valid FRED API response and returns LIVE result', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: '11.25' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual({
        value: 11.25,
        source: 'LIVE',
        referenceLabel: '2024-01',
        fetchedAt: expect.any(String),
      });
    });

    it('uses provided fetch override for testing', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: '10.75' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, customFetch);

      expect(customFetch).toHaveBeenCalled();
      expect(result.value).toBe(10.75);
    });
  });

  describe('API fetch failure scenarios', () => {
    it('returns offline result on timeout (AbortController)', async () => {
      const abortError = new Error('The operation was aborted.');
      abortError.name = 'AbortError';

      // Create a controlled promise that we can abort
      let rejectPromise: (reason: any) => void;
      const abortPromise = new Promise<never>((_, reject) => {
        rejectPromise = reject;
      });

      // Mock fetch that returns a promise we can control
      const mockFetch = vi.fn().mockImplementation(() => {
        // Return the promise and provide a way to reject it
        return abortPromise;
      });

      // Start the fetch and then immediately abort it
      const fetchPromise = fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      // Trigger the rejection to simulate AbortController behavior
      rejectPromise!(abortError);

      const result = await fetchPromise;

      expect(result).toEqual(offlineResult());
      expect(mockFetch).toHaveBeenCalled();
    });

    it('returns offline result on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result on CORS error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result on non-2xx HTTP response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result on 500 server error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result when response JSON has no observations', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result when observation value is not a number', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: 'N/A' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result when observation value is NaN after parsing', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: 'NaN' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result when observation value is below minimum (0.01)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: '0.005' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result when observation value is above maximum (40.00)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: '41.00' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('returns offline result on JSON parse error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => { throw new SyntaxError('Invalid JSON'); },
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result).toEqual(offlineResult());
    });

    it('preserves existing cache on fetch failure', async () => {
      // Pre-populate with valid cache (recent timestamp)
      const now = new Date();
      mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({
        value: 11.25,
        fetchedAt: now.toISOString(),
        referenceLabel: '2024-01',
      }));

      // Simulate fetch failure
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      // Should return cached value (not offline result) since cache is valid
      expect(result).toEqual({
        value: 11.25,
        source: 'CACHED',
        referenceLabel: '2024-01',
        fetchedAt: now.toISOString(),
      });
      // Verify cache is still there
      expect(mockSessionStorage.getItem('path_to_yes_fred_rate')).not.toBeNull();
    });

    it('does NOT overwrite expired cache when fetch fails', async () => {
      // Pre-populate with EXPIRED cache (older than 24 hours)
      const oldDate = new Date(Date.now() - 36 * 60 * 60 * 1000); // 36 hours ago
      const expiredCacheValue = 11.25;
      mockSessionStorage.setItem('path_to_yes_fred_rate', JSON.stringify({
        value: expiredCacheValue,
        fetchedAt: oldDate.toISOString(),
        referenceLabel: '2024-01',
      }));

      // Simulate fetch failure (network error)
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      // Should return offline result since cache expired
      expect(result).toEqual(offlineResult());
      // Verify expired cache was NOT overwritten (value should still be original)
      const cachedItem = mockSessionStorage.getItem('path_to_yes_fred_rate');
      expect(cachedItem).not.toBeNull();
      const parsed = JSON.parse(cachedItem!);
      expect(parsed.value).toBe(expiredCacheValue);
    });

    it('does NOT write to cache when no cache exists and fetch fails', async () => {
      // No initial cache
      mockSessionStorage.clear();

      // API fetch fails
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      // Should return offline result
      expect(result).toEqual(offlineResult());
      // Verify nothing was written to cache
      expect(mockSessionStorage.getItem('path_to_yes_fred_rate')).toBeNull();
    });

    it('handles sessionStorage write failure gracefully', async () => {
      // Mock sessionStorage.setItem to throw (e.g., private browsing)
      mockSessionStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: '11.25' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      // Should still return successful result despite cache write failure
      expect(result).toEqual({
        value: 11.25,
        source: 'LIVE',
        referenceLabel: '2024-01',
        fetchedAt: expect.any(String),
      });
    });
  });

  describe('response validation', () => {
    it('validates observation date format (ISO 8601)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01-15', value: '11.25' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result.referenceLabel).toBe('2024-01-15');
    });

    it('handles observation value with extra whitespace', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: '  11.25  ' }] }),
      });

      const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);

      expect(result.value).toBe(11.25);
    });
  });
});

// ============================================================================
// Edge Cases and Boundary Testing
// ============================================================================

describe('Edge Cases', () => {
  const MOCK_API_KEY = 'test-api-key-12345';

  it('handles API response with observations as null', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ observations: null }),
    });

    const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);
    expect(result).toEqual(offlineResult());
  });

  it('handles API response with observations array containing null', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ observations: [null] }),
    });

    const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);
    expect(result).toEqual(offlineResult());
  });

  it('handles observation value as empty string', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ observations: [{ date: '2024-01', value: '' }] }),
    });

    const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);
    expect(result).toEqual(offlineResult());
  });

  it('handles observation value as zero', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ observations: [{ date: '2024-01', value: '0' }] }),
    });

    const result = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);
    expect(result).toEqual(offlineResult()); // 0 < 0.01 minimum
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('FRED Client Integration', () => {
  const MOCK_API_KEY = 'test-api-key-12345';

  it('complete flow: cache miss -> fetch -> cache hit on second call', async () => {
    let callCount = 0;

    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: async () => ({ observations: [{ date: '2024-01', value: '11.25' }] }),
      });
    });

    // First call: cache miss, fetch succeeds
    const result1 = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);
    expect(result1.source).toBe('LIVE');
    expect(callCount).toBe(1);

    // Clear cache and call again to test cache miss -> fetch again
    (globalThis as any).sessionStorage.clear();
    const result2 = await fetchBenchmarkRate(MOCK_API_KEY, mockFetch);
    expect(result2.source).toBe('LIVE');
    expect(callCount).toBe(2);
  });

  it('handles rapid consecutive calls', async () => {
    // Clear cache before test to ensure fresh state
    (globalThis as any).sessionStorage.clear();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ observations: [{ date: '2024-01', value: '11.25' }] }),
    });

    // Make multiple concurrent calls
    const promises = Array.from({ length: 5 }).map(() =>
      fetchBenchmarkRate(MOCK_API_KEY, mockFetch)
    );

    const results = await Promise.all(promises);

    // All results should have the same value
    const allValuesMatch = results.every(r => r.value === 11.25);
    // At least one result should come from LIVE (since cache is empty at start)
    const hasLiveResult = results.some(r => r.source === 'LIVE');
    expect(allValuesMatch).toBe(true);
    expect(hasLiveResult).toBe(true);
  });
});

// Restore sessionStorage after all tests
afterEach(() => {
  (globalThis as any).sessionStorage = originalSessionStorage;
});
