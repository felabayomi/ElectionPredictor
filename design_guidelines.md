# Political Election Predictability App - Design Guidelines

## Design Approach: Data-Driven Analytics Platform

**Selected System:** Carbon Design System with FiveThirtyEight-inspired data visualization
**Rationale:** Information-dense political analytics require clear hierarchy, trustworthy presentation, and efficient data comparison. Carbon's data-focused patterns combined with political journalism best practices create credible, professional interfaces.

**Key Design Principles:**
- Clarity over decoration - every element serves data comprehension
- Partisan neutrality in visual treatment - equal prominence for all parties
- Confidence through precision - show methodology and uncertainty ranges
- Scannable information architecture - quick comparisons at a glance

---

## Core Design Elements

### A. Typography

**Font Families:**
- Primary: IBM Plex Sans (via Google Fonts CDN)
- Data/Numbers: IBM Plex Mono for statistics and percentages

**Hierarchy:**
- Page titles: text-4xl font-bold (40px)
- Section headers: text-2xl font-semibold (24px)
- Card titles/Candidate names: text-xl font-semibold (20px)
- Body text: text-base (16px)
- Data labels: text-sm font-medium (14px)
- Metadata: text-xs text-gray-600 (12px)

### B. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-6
- Card spacing: gap-4 or gap-6
- Section margins: mb-8 or mb-12
- Tight groupings: space-y-2
- Related elements: space-y-4

**Grid System:**
- Dashboard: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Comparison view: grid-cols-1 lg:grid-cols-2
- Candidate cards: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Max width: max-w-7xl mx-auto

---

## C. Component Library

### Navigation
- Sticky top navigation with app logo, election type selector (dropdown), and quick filters
- Secondary tabs for race levels: Presidential | Senate | House | Governor | Local
- Breadcrumb navigation for deep comparisons

### Dashboard Components

**1. Prediction Cards**
Each candidate/race gets a card with:
- Candidate photo (circular, 80px diameter)
- Name and party affiliation badge
- Win probability (large, bold percentage)
- Confidence interval bar visualization
- Key metrics grid (4 columns): Polling Average | Fundraising | Endorsements | Demographics Score
- "View Details" link

**2. Head-to-Head Comparison Panel**
- Split-screen layout with vs. divider
- Mirrored candidate cards on each side
- Factor-by-factor comparison table below
- Prediction methodology explanation (collapsible)

**3. Race Overview Cards**
For each election level (Senate, House, etc.):
- Race title with district/state
- Current leader with probability
- Top 3-5 candidates in ranked list
- Historical comparison indicator
- "Analyze Race" CTA

**4. Prediction Factors Display**
Visual breakdown showing methodology:
- Icon + label for each factor (polls, fundraising, name recognition, demographics, endorsements)
- Weight percentage for each factor
- Data freshness timestamp

**5. Data Visualization**
- Probability trend lines (line charts)
- Demographic breakdown (stacked bar charts)
- Electoral map (SVG with state/district colors)
- Confidence intervals (range displays)

### Forms & Inputs

**Comparison Builder:**
- Multi-select dropdowns for candidate selection
- Race type radio buttons
- Date range picker for historical analysis
- "Generate Prediction" primary button

**Filters Panel:**
- Checkbox groups for party affiliation
- Slider for probability threshold
- Toggle switches for including/excluding factors

### Data Displays

**Statistics Grid:**
Each metric displayed as:
- Label (text-sm, gray)
- Value (text-2xl, bold)
- Trend indicator (arrow icon + percentage change)
- Source attribution (text-xs)

**Probability Bars:**
- Horizontal bar with gradient fill
- Percentage label overlaid
- Uncertainty range shown with lighter shade
- Party color coding on bar end

### Overlays & Modals

**Methodology Explainer Modal:**
- Full-screen overlay with dark backdrop
- Centered card (max-w-2xl)
- Section-by-section methodology breakdown
- Sources and disclaimers
- Close icon (top-right)

**Candidate Detail Slideout:**
- Right-side panel (w-96)
- Comprehensive candidate profile
- Full prediction factors breakdown
- Historical performance graphs
- External links to sources

---

## D. Animations

**Minimal, purposeful motion only:**
- Number counter animation on initial load (prediction percentages count up)
- Smooth chart transitions when filtering data (0.3s ease)
- Hover state transitions on cards (0.2s)
- Modal/slideout enter/exit (slide + fade, 0.3s)

**No scroll-triggered animations** - keep focus on data clarity

---

## Images

### Candidate Photos
- Circular headshots (80px cards, 120px detail views)
- Professional, neutral backgrounds
- Consistent cropping and sizing
- Placeholder avatar for candidates without photos

### Visual Elements
- Electoral map SVG as centerpiece on Presidential prediction page
- Small party logos/icons (16px) next to affiliation badges
- Data visualization charts (generated programmatically, not static images)

**No hero image** - Dashboard leads immediately with prediction cards and data

---

## Icons

**Library:** Heroicons (via CDN)
**Usage:**
- Navigation: chart-bar, map, users icons
- Factors: trending-up, currency-dollar, megaphone, users-group
- Actions: chevron-down, x-mark, arrow-right
- Status: check-circle, exclamation-triangle
- Trend: arrow-up, arrow-down

---

## Key Page Structures

**Main Dashboard:**
- Top navigation + election type selector
- Tab navigation for race levels
- 3-column grid of prediction cards (top races)
- "Compare Candidates" CTA section
- Methodology footer link

**Comparison View:**
- Breadcrumb: Dashboard > Compare > [Candidate A] vs [Candidate B]
- Split-screen candidate panels
- Factor comparison table (7-8 rows)
- Prediction confidence display
- Related race recommendations

**Race Detail Page:**
- Race header (title, state/district, election date)
- Leading candidate highlight card
- Full candidate list with probability bars
- Historical trend chart
- District demographics panel
- Prediction factors breakdown

This data-focused design prioritizes credibility, clarity, and efficient comparison - essential for political analytics platforms.