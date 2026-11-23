# Color Palette Reference - Path to Yes

## Complete Before/After Color Mapping

### Neutral Colors (Structure & Text)

#### Background Colors
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Page background | `bg-gray-50` | `bg-slate-50` | More sophisticated, fintech-appropriate neutral |
| Card background | `bg-white` | `bg-white` | Unchanged (pure white for contrast) |
| Input background | `bg-white` | `bg-white` | Unchanged |
| Footer background | `bg-white` | `bg-white` | Unchanged |

#### Border Colors
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Card borders | `border-gray-200` | `border-slate-200` | Cooler tone, more professional |
| Emphasis borders | N/A | `border-slate-300` | New: Added for interactive states |
| Header border | None | `border-slate-200` | New: Separates header from content |
| Footer border | `border-gray-200` | `border-slate-200` | Consistency |

#### Text Colors
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Primary headings | `text-gray-900` | `text-slate-900` | Cooler, more professional |
| Secondary text | `text-gray-700` | `text-slate-700` | (Used in presets) |
| Body text | `text-gray-600` | `text-slate-600` | Consistent with neutral palette |
| Tertiary/helper | `text-gray-500` | `text-slate-500` | Muted secondary info |
| Placeholder text | `text-gray-400` | `text-slate-400` | Removed (we deleted the placeholders) |

### Status Colors (Semantic)

#### Success/Approval State
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Background | `bg-green-50` | `bg-emerald-50` | More vibrant, professional fintech green |
| Border | `border-green-200` | `border-emerald-200` | Matches background |
| Icon color | `text-green-600` | `text-emerald-600` | Consistent with theme |
| Heading text | `text-green-900` | `text-emerald-900` | High contrast on light background |
| Body text | `text-green-700` | `text-emerald-700` | Readable secondary text |
| Badge background | `bg-green-100` | `bg-emerald-100` | Pill badges in lever cards |
| Badge text | `text-green-800` | `text-emerald-800` | High contrast for readability |
| Button background | `bg-green-600` | `bg-emerald-600` | Primary action in approval levers |
| Button hover | `hover:bg-green-700` | `hover:bg-emerald-700` | Hover state |

#### Warning/Counter-Offer State
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Background | `bg-amber-50` | `bg-amber-50` | Unchanged (amber is universally recognized) |
| Border | `border-amber-200` | `border-amber-200` | Unchanged |
| Icon color | `text-amber-600` | `text-amber-600` | Unchanged |
| Heading text | `text-amber-900` | `text-amber-900` | Unchanged |
| Body text | `text-amber-700` | `text-amber-700` | Unchanged |
| Badge background | `bg-amber-100` | `bg-amber-100` | Unchanged |
| Badge text | `text-amber-800` | `text-amber-800` | Unchanged |
| Button background | `bg-amber-600` | `bg-amber-600` | Unchanged |
| Button hover | `hover:bg-amber-700` | `hover:bg-amber-700` | Unchanged |

#### Danger/Declined State
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Background | `bg-red-50` | `bg-rose-50` | Rose is softer, less alarming than red |
| Border | `border-red-200` | `border-rose-200` | Matches background |
| Icon color | `text-red-600` | `text-rose-600` | Consistent with theme |
| Heading text | `text-red-900` | `text-rose-900` | High contrast |
| Body text | `text-red-700` | `text-rose-700` | Readable secondary text |
| Button text | `text-red-700` | `text-rose-700` | Secondary button (view details) |
| Button border | `border-red-300` | `border-rose-300` | Secondary button border |
| Button hover border | `hover:border-red-400` | `hover:border-rose-400` | Hover state |
| Error input bg | `bg-red-50` | `bg-rose-50` | Input validation errors |
| Error input border | `border-red-300` | `border-rose-300` | Input validation errors |

#### Info/Rate Badge State
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Live rate bg | `bg-green-100` | `bg-emerald-50` | Semantic success = live data |
| Live rate text | `text-green-800` | `text-emerald-800` | Readable on light bg |
| Live rate border | `border-green-200` | `border-emerald-200` | Pill shape emphasis |
| Cached rate bg | `bg-blue-100` | `bg-blue-50` | Info state = cached |
| Cached rate text | `text-blue-800` | `text-blue-800` | Unchanged |
| Cached rate border | N/A | `border-blue-200` | New: Pill border |
| Offline rate bg | `bg-gray-100` | `bg-slate-100` | Neutral = no live data |
| Offline rate text | `text-gray-800` | `text-slate-700` | Softer, less attention-grabbing |
| Offline rate border | N/A | `border-slate-200` | New: Pill border |

#### Brand/Primary Action
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Primary button bg | `bg-indigo-600` | `bg-indigo-600` | Unchanged (brand color) |
| Primary button hover | `hover:bg-indigo-700` | `hover:bg-indigo-700` | Unchanged |
| Icon background | `bg-indigo-100` | `bg-indigo-50` | Lighter tint (50 vs 100) |
| Icon color | `text-indigo-600` | `text-indigo-600` | Unchanged |
| Focus ring | `ring-indigo-500` | `ring-indigo-500` | Unchanged |
| Slider active fill | `#6366f1` (indigo-500) | `#4f46e5` (indigo-600) | Darker, more visible |
| Slider inactive fill | `#c7d2fe` (indigo-200) | `#e0e7ff` (indigo-100) | Lighter contrast |

### Secondary/Inactive States

#### Preset Buttons (Inactive)
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Background | `bg-gray-100` | `bg-white` | Cleaner, card-like appearance |
| Border | None | `border-2 border-slate-200` | Defined edge, pill shape |
| Text | `text-gray-700` | `text-slate-700` | Consistent neutral |
| Hover bg | `hover:bg-gray-200` | Removed | Relies on border change |
| Hover border | N/A | `hover:border-slate-300` | Subtle feedback |

#### Preset Buttons (Active)
| Element | Before | After | Reason |
|---------|--------|-------|--------|
| Background | `bg-indigo-600` | `bg-indigo-600` | Unchanged |
| Text | `text-white` | `text-white` | Unchanged |
| Shadow | None | `shadow-sm` | Elevation at rest |
| Hover shadow | N/A | `hover:shadow-md` | Hover lift |

## Tailwind CSS Class Reference

### Complete Palette (Tailwind Built-in)

#### Slate (Neutral - Our Choice)
- `slate-50`: #f8fafc (page background)
- `slate-100`: #f1f5f9 (offline badge)
- `slate-200`: #e2e8f0 (borders)
- `slate-300`: #cbd5e1 (emphasis borders, inactive inputs)
- `slate-500`: #64748b (tertiary text)
- `slate-600`: #475569 (secondary text, rate badge value)
- `slate-700`: #334155 (preset text, offline text)
- `slate-900`: #0f172a (primary headings)

#### Emerald (Success)
- `emerald-50`: #ecfdf5 (approval banner bg, live rate badge)
- `emerald-100`: #d1fae5 (approval lever icon bg, approval badge)
- `emerald-200`: #a7f3d0 (borders)
- `emerald-600`: #059669 (icons, buttons)
- `emerald-700`: #047857 (button hover, text)
- `emerald-800`: #065f46 (badge text)
- `emerald-900`: #064e3b (headings)

#### Rose (Danger)
- `rose-50`: #fff1f2 (declined banner bg, error input bg)
- `rose-100`: #ffe4e6 (error icon bg)
- `rose-200`: #fecdd3 (borders)
- `rose-300`: #fda4af (input error borders)
- `rose-600`: #e11d48 (icons)
- `rose-700`: #be123c (text, button text)
- `rose-800`: #9f1239 (unused)
- `rose-900`: #881337 (headings)

#### Amber (Warning)
- `amber-50`: #fffbeb (counter-offer banner bg)
- `amber-100`: #fef3c7 (counter-offer lever icon bg, badge)
- `amber-200`: #fde68a (borders)
- `amber-600`: #d97706 (icons, buttons)
- `amber-700`: #b45309 (button hover, text)
- `amber-800`: #92400e (badge text)
- `amber-900`: #78350f (headings)

#### Indigo (Brand)
- `indigo-50`: #eef2ff (icon containers)
- `indigo-100`: #e0e7ff (slider inactive fill)
- `indigo-200`: #c7d2fe (unused after refactor)
- `indigo-500`: #6366f1 (focus rings)
- `indigo-600`: #4f46e5 (buttons, slider active fill)
- `indigo-700`: #4338ca (button hover)

#### Blue (Info)
- `blue-50`: #eff6ff (cached rate badge bg)
- `blue-200`: #bfdbfe (cached rate border)
- `blue-700`: #1d4ed8 (unused)
- `blue-800`: #1e40af (cached rate text)

## WCAG Contrast Ratios (Estimated)

### Text on Light Backgrounds
| Combination | Ratio | WCAG Level | Notes |
|-------------|-------|------------|-------|
| `slate-900` on `slate-50` | ~18:1 | AAA | Primary headings - excellent |
| `slate-700` on `slate-50` | ~11:1 | AAA | Secondary text - excellent |
| `slate-600` on `white` | ~8:1 | AAA | Body text - excellent |
| `emerald-900` on `emerald-50` | ~16:1 | AAA | Approval headings |
| `amber-900` on `amber-50` | ~15:1 | AAA | Warning headings |
| `rose-900` on `rose-50` | ~16:1 | AAA | Declined headings |
| `indigo-600` on `white` (button) | ~8:1 | AAA | Primary buttons |

### Interactive Element Contrast
| Element | Contrast | Notes |
|---------|----------|-------|
| Slider track (indigo-600 vs indigo-100) | ~6:1 | Adequate for large component |
| Button text (white on indigo-600) | ~8:1 | Excellent for interactive |
| Focus ring (indigo-500 on white) | ~7:1 | Visible for accessibility |

## Color Psychology & Fintech Context

### Why Emerald over Green
- **Professional**: Emerald reads more "financial institution" than bright green
- **Trust**: Deeper hue conveys stability over excitement
- **Market Standard**: Used by Stripe, Plaid, and other fintech brands

### Why Rose over Red
- **Less Alarming**: Red can trigger stress; rose is gentler
- **Approachability**: Bank customers prefer empathetic UI over punitive
- **Contrast**: Rose-900 on rose-50 is still high contrast but less aggressive

### Why Slate over Gray
- **Temperature**: Slate has blue undertones (cooler, more digital)
- **Sophistication**: Gray can read "dull"; slate reads "refined"
- **Market Positioning**: SaaS/fintech products favor cool neutrals

## Implementation Notes

### Tailwind JIT Compilation
- All color classes are purged/tree-shaken in production
- No custom color definitions needed (all use Tailwind defaults)
- Final CSS bundle: 17.77 kB (includes only used classes)

### CSS Custom Properties (Not Used)
We use Tailwind's built-in palette instead of CSS variables because:
1. Tailwind JIT already optimizes for size
2. No dark mode requirement (yet)
3. Color system is stable (no runtime theme switching)

### Browser Compatibility
- All colors use standard hex values
- No CSS color functions (hsl, oklch) that require polyfills
- Works in IE11+ (though project targets modern browsers)

## Quick Reference Table

| Use Case | Light BG | Border | Icon | Text | Dark Text |
|----------|----------|--------|------|------|-----------|
| **Approval** | emerald-50 | emerald-200 | emerald-600 | emerald-700 | emerald-900 |
| **Counter** | amber-50 | amber-200 | amber-600 | amber-700 | amber-900 |
| **Declined** | rose-50 | rose-200 | rose-600 | rose-700 | rose-900 |
| **Info** | blue-50 | blue-200 | blue-600 | blue-700 | blue-900 |
| **Neutral** | slate-50 | slate-200 | slate-600 | slate-600 | slate-900 |
| **Brand** | indigo-50 | N/A | indigo-600 | indigo-700 | N/A |
