# UI Design Standards - Path to Yes

## Visual Hierarchy Principles

### Typography Scale
- **Display (Page Title):** `text-3xl font-bold` with `tracking-tight` - Used for main app title
- **Heading 1 (Section):** `text-xl font-semibold` - Used for card titles
- **Heading 2 (Subsection):** `text-base font-medium` - Used for input labels, metrics
- **Body:** `text-sm` - Used for descriptions, helper text
- **Caption:** `text-xs` - Used for metadata, timestamps

### Color System (Fintech Professional)
- **Background Primary:** `bg-slate-50` (not gray-50 - more sophisticated)
- **Background Secondary:** `bg-white`
- **Border Default:** `border-slate-200`
- **Border Emphasis:** `border-slate-300`
- **Text Primary:** `text-slate-900`
- **Text Secondary:** `text-slate-600`
- **Text Tertiary:** `text-slate-500`

**Status Colors:**
- **Success (Approved):** `bg-emerald-50`, `border-emerald-200`, `text-emerald-700/800/900`
- **Warning (Counter-Offer):** `bg-amber-50`, `border-amber-200`, `text-amber-700/800/900`
- **Danger (Declined):** `bg-rose-50`, `border-rose-200`, `text-rose-700/800/900`
- **Info (Live Rate):** `bg-blue-50`, `border-blue-200`, `text-blue-700/800/900`
- **Brand (Primary Actions):** `bg-indigo-600`, `hover:bg-indigo-700`, `text-white`

### Spacing System
- **Section Margin:** `mb-8` or `mb-10`
- **Card Padding:** `p-8` for large cards, `p-6` for compact cards
- **Stack Spacing:** `space-y-6` for major sections, `space-y-4` for related items
- **Grid Gaps:** `gap-6` for major grids, `gap-4` for compact grids
- **Inline Spacing:** `space-x-3` for icon + text, `space-x-2` for tight groupings

### Border Radius
- **Cards:** `rounded-lg` (8px) - professional, not toy-like
- **Buttons:** `rounded-md` (6px) - clean, clickable
- **Badges:** `rounded-full` - pill shape for status indicators
- **Inputs:** `rounded-md` (6px) - consistent with buttons

### Elevation (Shadow) System
- **Level 0 (Flat):** No shadow - Used for backgrounds
- **Level 1 (Resting):** `shadow-sm` - Used for most cards
- **Level 2 (Hover):** `shadow-md` - Used for interactive card hover states
- **Level 3 (Elevated):** `shadow-lg` - Used for modals, popovers

### Component-Specific Patterns

#### Decision Banner
- **Large, Bold Typography:** `text-2xl font-bold` for status
- **High Contrast Background:** Full 50-weight color backgrounds
- **Prominent Icon:** `w-8 h-8` minimum for status icons
- **Generous Padding:** `p-8` minimum
- **Metrics Display:** Use 3-column grid with clear labels above values

#### Input Controls
- **Label Position:** Always above input with clear `font-medium` weight
- **Icon Treatment:** Contained in `p-2` rounded background, not floating
- **Focus States:** `ring-2 ring-indigo-500` for all interactive elements
- **Slider Tracks:** Use gradient fill to show progress, not solid colors
- **Number Input Below Slider:** Keep as backup for precise entry

#### Buttons
- **Primary (CTA):** `bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md`
- **Secondary:** `bg-white border-2 border-slate-300 hover:border-slate-400`
- **Preset Toggle:** Use pill shape with `rounded-full`, bold active state
- **Action Buttons:** Include icon + text, never icon-only unless space-critical

#### Status Badges
- **Always use pill shape** (`rounded-full`)
- **Semibold text** (`font-semibold`)
- **Dot indicator prefix** for live/cached/offline states
- **Adequate padding** (`px-3 py-1.5`)

#### Cards
- **Clear Visual Weight:** Use `border-2` for emphasis cards (decision banner)
- **Subtle Shadows:** `shadow-sm` at rest, `shadow-md` on hover (if interactive)
- **Internal Hierarchy:** Use `border-t border-slate-200` to separate card sections
- **Icon Treatment:** Icons in colored backgrounds (`bg-indigo-50 text-indigo-600`)

### Accessibility Requirements
- **Minimum Contrast:** 4.5:1 for body text, 3:1 for large text
- **Focus Indicators:** Always visible `ring-2` on interactive elements
- **Touch Targets:** Minimum 44x44px for all buttons and controls
- **Readable Line Length:** Max `max-w-7xl` for content containers

### Animation/Transition Guidelines
- **Duration:** `duration-150` for micro-interactions, `duration-200` for state changes
- **Easing:** Default (`ease-in-out`) for most transitions
- **Properties:** `transition-colors`, `transition-shadow`, never `transition-all`
- **Hover Lift:** Combine shadow increase with subtle `-translate-y-0.5` on cards

## Anti-Patterns to Avoid
- ❌ Using `rounded-xl` or `rounded-2xl` on cards (too playful)
- ❌ Gray-on-gray text below `text-slate-600` (insufficient contrast)
- ❌ Mixing `space-y-*` with manual `mt-*` (inconsistent rhythm)
- ❌ Icons without background containers (looks unfinished)
- ❌ Status text without semantic color coding
- ❌ Buttons without hover states or focus rings
- ❌ Em dashes (`—`) in any UI copy (use hyphens or colons)
