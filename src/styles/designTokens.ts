/**
 * Design System Tokens for Path to Yes
 * 
 * These tokens define the visual design system including colors, typography,
 * spacing, and component patterns. All values are anchored to Tailwind CSS
 * utility classes for consistency across the application.
 * 
 * Requirements: 14.7
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Primary canvas and typography colors
 */
export const colors = {
  canvas: {
    primary: 'stone-50',      // Warm off-white background (NOT white or gray-50)
  },
  text: {
    primary: 'slate-900',     // Near-black for main content
    secondary: 'slate-700',   // Secondary text
    tertiary: 'slate-600',    // Help text, labels
    muted: 'slate-500',       // Fine print, metadata
  },
  interactive: {
    ctaPrimary: 'indigo-600',       // Primary CTA background
    ctaPrimaryHover: 'indigo-700',  // Primary CTA hover state
    ctaText: 'white',               // CTA text color
    link: 'indigo-600',             // Text links
    focusRing: 'indigo-500',        // Focus ring color
  },
  structural: {
    cardBg: 'white',          // Card backgrounds
    border: 'slate-200',      // Default borders, dividers
    inputBorder: 'slate-300', // Input field borders
    inputFocus: 'indigo-500', // Input focus border
  },
} as const;

/**
 * Status indicator colors (for small badges and pills only)
 * 
 * Note: These should ONLY be used for small status indicators,
 * NOT for large colored banners.
 */
export const statusColors = {
  approval: {
    bg: 'emerald-100',
    text: 'emerald-800',
  },
  counterOffer: {
    bg: 'amber-100',
    text: 'amber-800',
  },
  declined: {
    bg: 'rose-100',
    text: 'rose-800',
  },
  info: {
    bg: 'blue-50',
    text: 'blue-700',
  },
} as const;

// =============================================================================
// TYPOGRAPHY SCALE
// =============================================================================

/**
 * Typography scale with semantic naming
 */
export const typography = {
  display: {
    paymentLarge: 'text-7xl font-bold',      // 72px - Monthly payment (Step 3)
    amountLarge: 'text-6xl font-bold',       // 60px - Loan amount (Step 1)
    comparison: 'text-4xl font-bold',        // 36px - Comparison payment
  },
  heading: {
    page: 'text-3xl font-bold',              // 30px - Page titles
    section: 'text-2xl font-bold',           // 24px - Section headings
    subsection: 'text-xl font-semibold',     // 20px - Subsections
    label: 'text-sm font-medium',            // 14px - Labels
  },
  body: {
    base: 'text-base',                       // 16px - Base body text
    small: 'text-sm',                        // 14px - Small text
    finePrint: 'text-xs',                    // 12px - Fine print
  },
} as const;

// =============================================================================
// SPACING AND LAYOUT
// =============================================================================

/**
 * Vertical rhythm spacing constants
 */
export const spacing = {
  section: {
    major: 'mb-8',           // 32px - Major section margin
    majorLarge: 'mb-10',     // 40px - Large section margin
  },
  stack: {
    section: 'space-y-6',    // 24px - Section internal spacing
    form: 'space-y-4',       // 16px - Form field spacing
    inline: 'space-y-2',     // 8px - Inline element spacing
  },
} as const;

/**
 * Container width constraints
 */
export const containers = {
  mobile: 'px-4',                   // Mobile padding
  wizardSmall: 'max-w-2xl',         // Small wizard container (672px)
  wizardMedium: 'max-w-3xl',        // Medium wizard container (768px)
  comparisonColumn: 'max-w-sm',     // Comparison column (384px)
} as const;

/**
 * Button sizing patterns
 */
export const buttonSizing = {
  mobilePrimary: 'w-full min-h-12',    // 48px minimum height for mobile CTAs
  desktopPrimary: 'px-8 py-4',         // Desktop primary padding
  secondary: 'px-4 py-2',              // Secondary action padding
} as const;

// =============================================================================
// COMPONENT PATTERNS
// =============================================================================

/**
 * Reusable component style patterns
 */
export const components = {
  button: {
    primary: 'rounded-md bg-indigo-600 text-white shadow-sm hover:shadow-md hover:bg-indigo-700 transition-all duration-150',
    secondary: 'rounded-md border-2 border-slate-300 bg-white hover:border-slate-400 transition-colors duration-150',
    textLink: 'text-sm text-indigo-600 underline-offset-2 hover:underline',
  },
  badge: {
    base: 'rounded-full px-3 py-1.5 text-sm font-semibold',
    approval: 'bg-emerald-100 text-emerald-800',
    counterOffer: 'bg-amber-100 text-amber-800',
    declined: 'bg-rose-100 text-rose-800',
    info: 'bg-blue-50 text-blue-700',
  },
  card: {
    base: 'bg-white border border-slate-200 shadow-sm',
    emphasis: 'bg-white border-2 border-slate-200 shadow-sm',
    nested: 'bg-slate-50 border border-slate-200',
    interactive: 'bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-150',
    padding: {
      compact: 'p-6',
      spacious: 'p-8',
    },
  },
  input: {
    base: 'border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150',
    minHeight: 'min-h-12', // 48px for mobile accessibility
  },
  slider: {
    track: 'h-2 bg-slate-200 rounded-full',
    fill: 'bg-indigo-600',
    thumb: 'w-6 h-6 bg-white border-2 border-indigo-600 rounded-full shadow-md',
  },
  radioPill: {
    base: 'rounded-full px-4 py-2 border-2 border-slate-300 hover:border-slate-400 transition-colors duration-150',
    active: 'rounded-full px-4 py-2 bg-indigo-600 text-white border-2 border-indigo-600',
  },
} as const;

// =============================================================================
// ACCESSIBILITY
// =============================================================================

/**
 * Accessibility standards and requirements
 */
export const accessibility = {
  touchTarget: {
    minimum: 'min-w-11 min-h-11', // 44×44px minimum touch target
  },
  focus: {
    ring: 'ring-2 ring-indigo-500',
  },
  readableLineLength: {
    wizard: 'max-w-2xl',  // 65-75 characters per line
  },
} as const;

// =============================================================================
// LAYOUT PATTERNS
// =============================================================================

/**
 * Common layout patterns for responsive design
 */
export const layouts = {
  comparison: {
    desktop: 'grid grid-cols-2 gap-6',
    mobile: 'space-y-4',
  },
  wizard: {
    container: 'max-w-2xl mx-auto px-4 py-8',
  },
  mobileBottomCTA: {
    container: 'fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg',
  },
} as const;

// =============================================================================
// ANTI-PATTERNS
// =============================================================================

/**
 * Anti-patterns to avoid (documented for reference)
 * 
 * ❌ White (bg-white) or gray-50 (bg-gray-50) as primary canvas → use stone-50
 * ❌ Large colored banners for status → use small pill badges
 * ❌ Nested borders (cards within bordered containers)
 * ❌ Gray-on-gray text below slate-600 → insufficient contrast
 * ❌ Em dashes (—) in UI copy → use hyphens or colons
 * ❌ Multiple competing CTAs on one screen → single primary CTA per step
 */
