# Project & Tech Stack Standards

## Project Context
- **App Name:** Path to Yes
- **Domain:** Digital banking pre-qualification and credit-decisioning simulator built for community banks and credit unions (designed for platforms like Nymbus).
- **Target Scope:** Lean, high-polish MVP runnable locally with zero backend database dependencies.

## Approved Tech Stack
- **Framework:** React 18+ with Vite and strict TypeScript (`strict: true`).
- **Styling:** Tailwind CSS (v3 or v4) with clean, accessible fintech UI patterns (high-contrast typography, clear status badges, responsive grid).
- **Icons:** `lucide-react` for clean, consistent UI iconography.
- **Testing:** Vitest for unit testing the pure TypeScript underwriting engine.
- **State Management:** React `useState` / `useMemo` (keep state local and deterministic; do not add Redux or heavy state libraries).

## Directory Structure
- `src/engine/` - Pure, framework-agnostic TypeScript underwriting rules, amortization math, and "Path to Yes" solver logic. Zero React imports allowed here.
- `src/services/` - External API clients (FRED API integration, local caching, and fallback rate providers).
- `src/components/` - Modular UI components (ApplicantInputs, DecisionBanner, PathToYesChecklist, RateBenchmarkBadge, AdverseActionModal).
- `docs/collaboration-log.md` - Real-time log of prompts, product decisions, and spec iterations.