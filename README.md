# Path to Yes - Personal Loan Pre-Qualification Simulator

A borrower-focused loan qualification simulator that transforms the traditional pre-qualification experience into a guided, transparent journey. Built for community banks and credit unions, Path to Yes replaces opaque "maybe" answers with clear comparisons, actionable alternatives, and explicit trade-offs.

## What Makes This Different

**For Borrowers:**
- **Progressive disclosure**: Start with what matters (how much you need), not what's intimidating (your credit score)
- **Side-by-side comparison**: See your options with real numbers, not vague suggestions
- **Explicit trade-offs**: Understand exactly what you gain and what you give up with each choice
- **No jargon**: Plain language throughout, giant payment numbers, warm design

**For Banking Product Teams:**
- **Deterministic underwriting**: Same inputs always produce the same decision
- **Live market rates**: APR tiers anchored to FRED benchmark data with graceful fallback
- **Full auditability**: Every calculation is derivable from documented formulas
- **Zero backend**: Fully client-side React app, embeddable anywhere

---

## Key Features

### 🧭 5-Step Guided Wizard

1. **Loan Amount** - Choose your loan amount and term without distraction
2. **Financial Details** - Enter income, debt, and credit score with inline help
3. **Estimate** - See your monthly payment front and center with a single comparison option
4. **Compare** - Side-by-side view with dollar-by-dollar trade-offs (monthly savings vs. total cost)
5. **Summary** - Review your selected terms with a clear path forward

### 📊 Smart Comparison Engine

- Computes the single most favorable alternative automatically
- Shows explicit trade-offs: "Save $62/month but pay $1,260 more total"
- One-click application of alternatives with instant re-evaluation
- Undo support to revert changes and try different options

### 🎨 Borrower-First Design

- Warm stone-50 canvas (not sterile white)
- Giant payment numbers (text-7xl) you can't miss
- Status indicators as small quiet badges, not alarm banners
- Mobile-first with 44px minimum tap targets
- Accessible contrast ratios throughout

### 🔗 Live Rate Anchoring

- Fetches FRED 24-month personal loan benchmark (TERMCBPER24NS) on load
- 3-second timeout with graceful degradation to 11.50% baseline
- Session caching to avoid repeat network calls
- Clear visual indicator of rate source (live, cached, or offline)

### ♿ Accessibility & Performance

- WCAG AA contrast ratios for all text and interactive elements
- Keyboard navigation throughout
- Focus indicators on all interactive elements
- Sub-100ms decision recomputation (pure in-memory functions)
- Mobile-responsive with single-column stacking below 640px

---

## User Experience Flow

### Step 1: How much would you like to borrow?

Borrowers start with a clean, focused screen: a large loan amount slider ($2,000 - $25,000) and term selector (12-60 months). No credit score stress, no information overload. Just the core question: how much do you need?

A "View example scenarios" link provides context (debt consolidation, home improvement) without leaving the page.

### Step 2: Tell us about your finances

Three inputs, clearly labeled with inline help:
- **Monthly income** - "Include take-home pay from all jobs"
- **Monthly debt payments** - "Include credit cards, car loans, student loans"
- **Estimated credit score** - Slider with live value display

The loan request stays visible in a compact summary card at the top.

### Step 3: Your estimated monthly payment

The payment number dominates the screen in giant bold type (72px+). Loan details (amount, term, APR) are shown in a compact single row beneath it—visible but secondary.

If the initial estimate doesn't qualify for full approval, a **single comparison button** appears: "Compare a 36-month term - Save $62/month". No checklist overwhelm. Just one clear next step.

If approved, a small success badge appears with a "Continue to summary" option.

### Step 4: Compare your options

Two columns (or stacked cards on mobile) show the original estimate and the suggested alternative side-by-side.

The trade-off summary is explicit:
- **Monthly savings**: $62 less per month
- **Total cost**: $1,260 more in interest

Borrowers choose with their eyes open:
- **"Use 36 months"** - Apply the alternative and return to Step 3
- **"Keep original"** - Return to Step 3 without changes
- **"Edit details"** - Go back to Step 2 to adjust inputs

### Step 5: Your loan summary

A clean vertical summary card shows the selected loan terms. A "What changed" section explains any adjustments (e.g., "Extended term from 24 to 36 months to lower monthly payment").

Prominent disclaimer: "Simulated estimate - not a final offer"

Primary action: "Start your application" (if approved) or "Explore other options" (if declined).

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | React 18 + TypeScript (strict mode) | Type safety, modern hooks, concurrent features |
| Build Tool | Vite | Fast HMR, optimal production bundles |
| Styling | Tailwind CSS v3/v4 | Utility-first, easy theming, purges unused CSS |
| Icons | lucide-react | Consistent, tree-shakeable, accessible |
| Testing | Vitest | Fast, Vite-native, runs pure TS without DOM overhead |
| State | React useState / useMemo | Simple, local, deterministic—no Redux needed |
| External API | FRED API (optional) | Live benchmark rate anchoring |

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd LoanQualificationExercise

# Install dependencies
npm install
```

### Configuration (Optional)

The app works out-of-the-box with a fallback rate of 11.50%. To enable live FRED rate fetching:

1. Get a free API key from [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html)
2. Create a `.env` file in the project root:

```env
VITE_FRED_API_KEY=your_api_key_here
```

**Security Note**: The FRED API key is embedded in the client-side bundle and visible in page source. FRED's TERMCBPER24NS series is public economic data with no PII or financial risk. For production, restrict the key by HTTP referrer in the FRED dashboard.

### Development

```bash
# Start development server (with HMR)
npm run dev

# App runs at http://localhost:5173
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

Build output: `dist/` directory, ready for static hosting.

---

## Architecture

### Directory Structure

```
src/
  engine/                 # Pure TypeScript underwriting logic (zero React imports)
    types.ts              # Shared TypeScript types and enums
    apr.ts                # APR tier computation
    amortization.ts       # Payment and DTI formulas
    underwriting.ts       # Decision engine (APPROVED/COUNTER_OFFER/DECLINED)
    solver.ts             # Path to Yes lever computation
    productMapper.ts      # Decline-to-product recommendation mapping
    milestones.ts         # Progress tracker milestone catalogs
    index.ts              # Public API exports
  
  services/               # External API clients
    fredClient.ts         # FRED API integration with timeout and caching
  
  components/             # React UI components
    wizard/               # 5-step wizard flow components
      LoanAmountStep.tsx
      FinancialDetailsStep.tsx
      EstimateStep.tsx
      ComparisonStep.tsx
      SummaryStep.tsx
      ExampleScenariosModal.tsx
    
    # Reusable UI components
    EstimateDisplay.tsx
    ComparisonColumn.tsx
    TradeOffSummary.tsx
    QuietStatusBadge.tsx
    RateBenchmarkBadge.tsx
    ConversionView.tsx
    ProductOfferCard.tsx
    ProgressTracker.tsx
    MilestoneChecklist.tsx
    MetricProgressCard.tsx
  
  App.tsx                 # Main app component with wizard state orchestration
  main.tsx                # Vite entry point
```

### Core Principles

**Pure Engine Functions**: All underwriting logic lives in `src/engine/` as pure TypeScript functions with zero React imports. This enables:
- Full Vitest coverage without a DOM
- Deterministic testing (same inputs → same outputs)
- Potential server-side reuse in future

**Synchronous Decision Recomputation**: The underwriting engine runs entirely in-memory with no I/O. Decision updates complete in <1ms on modern hardware, meeting the <100ms requirement with room to spare.

**Progressive Enhancement**: The app works immediately with the 11.50% fallback rate. The FRED fetch runs async on mount and updates the rate when it resolves, without blocking initial render.

---

## Underwriting Rules

### APR Tiers (Anchored to FRED Benchmark)

Let `B` = FRED 24-month personal loan rate (default: 11.50%)

- **Prime (720+)**: max(B - 1.50%, 6.99%)
- **Near-Prime (660-719)**: max(B + 1.50%, 6.99%)
- **Subprime (600-659)**: max(B + 5.00%, 6.99%)
- **High Risk (<600)**: Ineligible for standard unsecured loans

### Decision Thresholds

Monthly payment `P` is computed via standard amortization:

```
P = L × [r(1 + r)^n] / [(1 + r)^n - 1]
```

where `L` = loan amount, `r` = (APR / 100) / 12, `n` = term months

Post-loan debt-to-income (DTI):

```
postLoanDTI = (monthlyDebt + P) / monthlyIncome
```

**Decision Logic:**

| Condition | Decision |
|-----------|----------|
| Credit score < 600 | DECLINED (HIGH_RISK_SCORE) |
| Monthly income < $1,800 | DECLINED (INSUFFICIENT_INCOME) |
| monthlyDebt ≥ monthlyIncome | DECLINED (EXCESSIVE_DEBT) |
| postLoanDTI > 0.45 | DECLINED (HIGH_DTI) |
| postLoanDTI > 0.36 and ≤ 0.45 | COUNTER_OFFER |
| Score 600-659 and loan > $15,000 and postLoanDTI ≤ 0.36 | COUNTER_OFFER (LOAN_CAP_EXCEEDED) |
| postLoanDTI ≤ 0.36 and all other conditions met | APPROVED |

---

## Design System

### Color Palette

**Canvas & Typography:**
- Background: `stone-50` (warm off-white, not clinical white)
- Primary text: `slate-900` (near-black)
- Secondary text: `slate-700`, tertiary `slate-600`

**Interactive Elements:**
- Primary buttons: `indigo-600` → `indigo-700` on hover
- Secondary buttons: white with `slate-300` border
- Text links: `indigo-600` with underline on hover

**Status Indicators (Small Badges Only):**
- Approval: `emerald-100` background, `emerald-800` text
- Counter-offer: `amber-100` background, `amber-800` text
- Declined: `rose-100` background, `rose-800` text

### Typography Scale

- **Giant payment number (Step 3)**: `text-7xl` (72px) bold
- **Loan amount (Step 1)**: `text-6xl` (60px) bold
- **Page titles**: `text-3xl` (30px) bold
- **Section headings**: `text-2xl` (24px) bold
- **Body text**: `text-base` (16px)

### Mobile-First Guidelines

- All primary CTAs: full-width on mobile, min-height 48px
- Touch targets: minimum 44×44px
- Single-column stacking below 640px
- Bottom-pinned actions with safe-area padding
- Comparison columns stack vertically on mobile

---

## Testing Strategy

### Unit Tests

All engine boundary conditions are covered:
- **Credit score boundaries**: 599, 600, 639, 640, 659, 660, 719, 720
- **Income boundaries**: 1799, 1800, 1999, 2000
- **DTI boundaries**: 0.3599, 0.36, 0.3601, 0.4499, 0.45, 0.4501

### Property-Based Tests

Using fast-check for randomized testing (100+ iterations per property):
- **Determinism**: Same inputs always produce same decision
- **APR floor invariant**: All computed APRs ≥ 6.99%
- **Finite outputs**: No NaN, Infinity, or null in valid cases
- **Lever outcome verification**: Applying a lever produces the promised decision

### Component Tests

Using @testing-library/react:
- Decision banner rendering for all three states
- Comparison trade-off calculation accuracy
- Mobile responsive behavior
- Accessibility (focus management, ARIA labels)

---

## Deployment

### Build Output

```bash
npm run build
```

Generates optimized static assets in `dist/`:
- Minified JavaScript with tree-shaking
- Purged CSS (Tailwind removes unused classes)
- Optimized asset loading with code-splitting

### Hosting Options

Deploy to any static hosting provider:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag-and-drop `dist/` folder or connect git repo
- **AWS S3 + CloudFront**: Upload `dist/` to S3 bucket
- **GitHub Pages**: Configure build action to push `dist/` to gh-pages branch

### Environment Variables

If using FRED API, configure `VITE_FRED_API_KEY` in your hosting provider's environment settings. The app will fall back to the 11.50% baseline if the key is missing.

---

## Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Android 90+
- **Polyfills**: None required (uses native ES2020+ features via Vite)

---

## Roadmap

**Phase 2: Post-Denial Conversion** (Designed, not yet implemented)
- Product offer cards for declined applicants (secured credit builder, high-yield savings, micro-loans)
- Personal progress tracker dashboard for accepted Path to Yes plans
- Milestone checklists tied to retention products
- Re-evaluation flow with updated financial inputs

**Phase 3: Integration**
- Embeddable widget version for bank websites
- Server-side API endpoints for loan application submission
- CRM integration for lead nurturing
- Analytics event tracking

---

## Contributing

### Code Style

- **TypeScript strict mode**: All files use explicit return types
- **Pure functions in engine/**: No React imports, no side effects
- **Component composition**: Small, focused components with clear props
- **Accessibility first**: ARIA labels, focus management, semantic HTML

### Git Workflow

1. Create a feature branch from `main`
2. Run tests locally (`npm test`) before pushing
3. Open a pull request with a clear description
4. Ensure CI passes (tests + build)
5. Request review from a maintainer

---

## License

Internal project for [Bank Name]. Not licensed for external use.

---

## Support

For questions, issues, or feature requests:
- **Internal team**: Slack #path-to-yes channel
- **Product team**: Contact [Product Owner Name]
- **Technical issues**: Open an issue in the repository

---

## Acknowledgments

Built with a focus on borrower dignity and transparent decisioning. Inspired by the principle that every "no" should come with a clear path to "yes".

APR tier anchoring powered by [FRED (Federal Reserve Economic Data)](https://fred.stlouisfed.org/).

Design philosophy influenced by community banking values: clarity, fairness, and human-centered service.
