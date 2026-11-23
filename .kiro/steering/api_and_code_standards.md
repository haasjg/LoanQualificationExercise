# API Resilience & Code Quality Rules

## External API Integration (FRED)
- **Endpoint:** Federal Reserve Economic Data (FRED) series `TERMCBPER24NS` (Finance Rate on Personal Loans at Commercial Banks, 24 Month Loan).
- **Environment Variable:** Support `VITE_FRED_API_KEY`.
- **Resilience & Fallback Pattern:**
  - Never block the UI or crash if `VITE_FRED_API_KEY` is missing, rate-limited, or returns a CORS/network error.
  - Implement a 3-second request timeout using `AbortController`.
  - Cache successful responses in `sessionStorage` with a timestamp.
  - On any failure or missing key, seamlessly fall back to the verified baseline rate (`11.50%`, labeled with its reference period) and display a clear UI status badge: `Live FRED Rate` vs. `Cached / Offline Benchmark`.

## Coding & Formatting Standards
- Write clean, readable TypeScript with explicit return types on all exported functions.
- Never use em dashes (`—`) anywhere in code comments, UI copy, or documentation; use standard hyphens (`-`), colons, or parentheses instead.
- Handle all boundary edge cases gracefully (e.g., `monthlyIncome = 0`, `monthlyDebt >= monthlyIncome`, `APR = 0%`).
- Every UI component must render crisp loading, empty, and error states where applicable.