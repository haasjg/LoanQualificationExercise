// src/services/fredClient.ts
/**
 * FRED API client for fetching the 24-month personal loan benchmark rate.
 * Implements fallback to offline benchmark (11.50%), sessionStorage caching,
 * and 3-second timeout using AbortController.
 */

import type { BenchmarkRateResult, FredApiResponse, SessionCacheEntry } from '../engine/types';
import { RateSource } from '../engine/types';

// ============================================================================
// Configuration
// ============================================================================

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_SERIES_ID = 'TERMCBPER24NS';
const FRED_TIMEOUT_MS = 3000;
const OFFLINE_BENCHMARK = 11.50;
const OFFLINE_LABEL = 'Reference period: Nov 2023';
const SESSION_CACHE_KEY = 'path_to_yes_fred_rate';
const RATE_MIN = 0.01;
const RATE_MAX = 40.00;

// ============================================================================
// Cache Helpers
// ============================================================================

const CACHE_VALID_HOURS = 24;

/**
 * Read cached FRED rate from sessionStorage.
 * Validates that the value is a finite number in the range [0.01, 40.00]
 * and that the fetchedAt timestamp is within the last 24 hours.
 * Returns BenchmarkRateResult with source: RateSource.CACHED if valid, or null if expired/invalid.
 */
export function readCachedRate(): BenchmarkRateResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;

    const entry: SessionCacheEntry = JSON.parse(raw);

    // Validate value is finite and within acceptable range [0.01, 40.00]
    if (!Number.isFinite(entry.value) || entry.value < RATE_MIN || entry.value > RATE_MAX) {
      return null;
    }

    // Validate required fields exist
    if (!entry.fetchedAt || !entry.referenceLabel) {
      return null;
    }

    // Validate fetchedAt is within last 24 hours
    const fetchedTime = new Date(entry.fetchedAt).getTime();
    const now = Date.now();
    const maxAgeMs = CACHE_VALID_HOURS * 60 * 60 * 1000;
    if (now - fetchedTime > maxAgeMs) {
      return null;
    }

    return {
      value: entry.value,
      source: RateSource.CACHED,
      referenceLabel: entry.referenceLabel,
      fetchedAt: entry.fetchedAt,
    };
  } catch {
    // JSON.parse error or other exception
    return null;
  }
}

/**
 * Return offline benchmark result with reference label.
 * Used when API is unavailable, rate is invalid, or no API key provided.
 */
export function offlineResult(): BenchmarkRateResult {
  return {
    value: OFFLINE_BENCHMARK,
    source: RateSource.OFFLINE,
    referenceLabel: OFFLINE_LABEL,
    fetchedAt: null,
  };
}

// ============================================================================
// Main Fetch Function
// ============================================================================

/**
 * Fetch the current FRED benchmark rate.
 * 
 * Fallback chain:
 * 1. No API key -> return offline result immediately
 * 2. Valid cache found -> return cached value
 * 3. API fetch -> parse, validate, cache, return
 * 4. Any error/timeout/invalid response -> return offline result
 * 
 * @param apiKey FRED API key (optional)
 * @param fetchOverride Optional override for testing (defaults to global fetch)
 * @returns BenchmarkRateResult with value, source, referenceLabel, and fetchedAt
 */
export async function fetchBenchmarkRate(
  apiKey: string,
  fetchOverride?: typeof fetch,
): Promise<BenchmarkRateResult> {
  // No API key -> immediate offline fallback
  if (!apiKey || apiKey.trim() === '') {
    return offlineResult();
  }

  // Check sessionStorage cache first
  const cached = readCachedRate();
  if (cached !== null) {
    return {
      value: cached.value,
      source: RateSource.CACHED,
      referenceLabel: cached.referenceLabel,
      fetchedAt: cached.fetchedAt,
    };
  }

  // Perform API fetch with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FRED_TIMEOUT_MS);

    const fetchFn = fetchOverride ?? fetch;

    const url = new URL(FRED_BASE_URL);
    url.searchParams.set('series_id', FRED_SERIES_ID);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('limit', '1');

    const response = await fetchFn(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    // Non-2xx response -> offline fallback
    if (!response.ok) {
      return offlineResult();
    }

    // Parse JSON response
    const data: FredApiResponse = await response.json();

    // Validate observations array
    const observation = data.observations?.[0];
    if (!observation) {
      return offlineResult();
    }

    // Parse and validate observation value
    const value = parseFloat(observation.value);
    if (!Number.isFinite(value) || value < RATE_MIN || value > RATE_MAX) {
      return offlineResult();
    }

    // Cache valid response in sessionStorage
    const fetchedAt = new Date().toISOString();
    const entry: SessionCacheEntry = {
      value,
      fetchedAt,
      referenceLabel: observation.date,
    };

    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // sessionStorage may be unavailable (e.g., private browsing)
      // Continue with the result anyway
    }

    return {
      value,
      source: RateSource.LIVE,
      referenceLabel: observation.date,
      fetchedAt,
    };
  } catch {
    // Any error (timeout, network, CORS, parse) -> offline fallback
    return offlineResult();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a human-readable label for the rate source.
 * Used for UI display purposes.
 */
export function getRateSourceLabel(source: RateSource): string {
  switch (source) {
    case RateSource.LIVE:
      return 'Live FRED Rate';
    case RateSource.CACHED:
      return 'Cached Benchmark';
    case RateSource.OFFLINE:
      return 'Offline Benchmark';
    default:
      return 'Unknown';
  }
}

/**
 * Get a reference label for the benchmark rate.
 * For LIVE: returns the observation date
 * For CACHED: returns the original date from cache
 * For OFFLINE: returns the fallback reference period
 */
export function getReferenceLabel(source: RateSource): string {
  switch (source) {
    case RateSource.LIVE:
    case RateSource.CACHED:
      return 'Updated recently';
    case RateSource.OFFLINE:
      return OFFLINE_LABEL;
    default:
      return 'Default benchmark';
  }
}