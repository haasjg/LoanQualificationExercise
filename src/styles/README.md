# Design System Usage Guide

This directory contains the design system tokens for Path to Yes.

## Files

- `designTokens.ts` - Design system constants (colors, typography, spacing, components)

## Usage Examples

### Importing Design Tokens

```typescript
import { colors, typography, components, statusColors } from './styles/designTokens';
```

### Using Color Tokens

```tsx
// Canvas background
<div className={`bg-${colors.canvas.primary}`}>

// Text colors
<h1 className={`text-${colors.text.primary}`}>Primary Heading</h1>
<p className={`text-${colors.text.secondary}`}>Secondary text</p>

// Status badges
<span className={components.badge.approval}>Approved</span>
<span className={components.badge.counterOffer}>Counter-Offer</span>
```

### Using Typography Scale

```tsx
// Large payment display (Step 3)
<div className={typography.display.paymentLarge}>
  $425
</div>

// Page heading
<h1 className={typography.heading.page}>
  How much would you like to borrow?
</h1>

// Label
<label className={typography.heading.label}>
  Monthly Income
</label>
```

### Using Component Patterns

```tsx
// Primary CTA button
<button className={components.button.primary}>
  Continue
</button>

// Card with standard styling
<div className={`${components.card.base} ${components.card.padding.spacious}`}>
  Card content
</div>

// Status badge
<span className={`${components.badge.base} ${components.badge.info}`}>
  Live FRED Rate
</span>
```

### Using Spacing Tokens

```tsx
// Section with major vertical spacing
<section className={spacing.section.major}>
  <div className={spacing.stack.form}>
    <input />
    <input />
  </div>
</section>
```

## Design Principles

1. **Warm, Accessible Visual Hierarchy**
   - Use `stone-50` for canvas (not white or gray-50)
   - Use `slate-900` for primary text (high contrast)
   - Reserve colored badges for status indicators only

2. **Mobile-First Responsive**
   - All touch targets minimum 44×44px
   - Full-width CTAs on mobile
   - Single-column stacking below 640px

3. **Consistent Spacing**
   - Use spacing tokens for vertical rhythm
   - Maintain consistent padding/margins across components

4. **Typography Scale**
   - Large numerals (text-7xl) for key payment values
   - Clear hierarchy with semantic headings
   - Readable line lengths (max-w-2xl for wizard)

## Anti-Patterns to Avoid

❌ Using `bg-white` or `bg-gray-50` for primary canvas
❌ Large colored banners for status (use small badges)
❌ Text below `slate-600` (insufficient contrast)
❌ Multiple competing CTAs on one screen
❌ Em dashes (—) in UI copy

## Accessibility

All design tokens meet WCAG AA standards:
- Body text contrast: 4.5:1 minimum
- Touch targets: 44×44px minimum
- Focus indicators: visible `ring-2` on all interactive elements
