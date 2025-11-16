# ElectionPredict - AI-Powered Political Election Analysis

## Overview

ElectionPredict is a data-driven political analytics platform that predicts election outcomes for Presidential, Senate, House, and Governor races. The application combines statistical modeling of polling data, fundraising, demographics, and historical trends with AI-powered analysis to provide FiveThirtyEight-style election predictions and candidate comparisons.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**November 16, 2025** - Progressive Web App (PWA) Support (COMPLETED ✅):
- **Mobile Installation**: App can now be installed on mobile home screens
  - PWA manifest configured with fullscreen display mode for immersive experience
  - App icons in multiple sizes (180x180, 192x192, 512x512) for different devices
  - Theme color (#1e40af navy blue) integrated with mobile UI
  
- **Cross-Platform Support**:
  - Android: Uses Web Manifest and "Add to Home Screen" functionality
  - iOS: Apple-specific meta tags for home screen installation
  - Works fullscreen without browser chrome when launched from home screen
  
- **Assets**:
  - Custom app icon generated and optimized for mobile devices
  - Favicon set for browser tab identification
  - All assets served from `/client/public/` directory

**November 16, 2025** - PostgreSQL Database Migration & Clean Deployment (COMPLETED ✅):
- **Database Migration**: Migrated from in-memory storage to PostgreSQL for production deployment
  - Created Drizzle ORM schema with tables: `races`, `candidates`, `predictions`, `race_candidates`, `featured_matchups`
  - Implemented `DbStorage` class using Neon PostgreSQL serverless database
  - All data now persists across server restarts and deployments
  - Database schema uses VARCHAR primary keys with UUID generation for collision-free IDs
  
- **Seed Data Removal**: Removed all mock/seed data for clean production deployment
  - App starts completely empty - no hypothetical races or fictional politicians
  - Admin interface ready for creating real races, candidates, and predictions
  - Public dashboard filters out incomplete races (must have candidates AND predictions to display)
  
- **Data Integrity**:
  - Foreign key relationships enforce data consistency (cascade deletes)
  - Junction table `race_candidates` properly links candidates to races
  - Predictions table uses composite primary key (raceId, candidateId)
  - Dashboard filtering ensures only complete races with candidates and predictions are shown publicly

**November 16, 2025** - Social Media Sharing Feature (COMPLETED ✅):
- **Share Buttons**: Added social sharing functionality throughout the app
  - Uses Web Share API (native mobile sharing) when available on mobile devices
  - Fallback to platform-specific share links (X/Twitter, Facebook, LinkedIn, Copy Link) on desktop
  - ShareButton component at `client/src/components/ShareButton.tsx`
  - Fixed Twitter icon import (changed from SiTwitter to SiX due to rebrand)
  
- **Share Text Templates**:
  - Race cards: "🗳️ [Race Title]: [Candidate] leads with [X]% win probability. See the full AI-powered analysis!"
  - Race details: Same format with leading candidate data in header
  - Featured matchups: "⚖️ [Matchup Title]: [Description] Check out this AI-powered election analysis!"
  - Comparisons: "⚖️ [Candidate 1] vs [Candidate 2] in [Race Title]: [X]% vs [Y]%. Check out this AI-powered election analysis!"
  
- **Locations**:
  - Dashboard race cards: Share button next to "View Analysis"
  - Featured matchup cards: Share button next to "View Analysis" button
  - Race detail pages: Share button in header (top right)
  - Comparison panels: Share button in "Head-to-Head Comparison" header

**November 16, 2025** - Natural Language Analysis - Save to Database & Dashboard Integration (COMPLETED ✅):
- **Database Persistence**: Natural Language Analysis results now save permanently to PostgreSQL
  - Creates new race record with AI-generated title and description
  - Saves all extracted candidates and links them to the race
  - Stores predictions with win probabilities and confidence intervals
  - Results persist across server restarts and appear on public Dashboard
  
- **User Workflow**: Seamless experience from query to shareable race
  - User enters election question on `/natural-language` page
  - After AI analysis completes, results save to database
  - User redirects automatically to `/race/{id}` detail page
  - Race appears as a card on Dashboard with "View Analysis" and share buttons
  - Same functionality as admin-created races (view, share, candidate cards)
  
- **Frontend Fix**: Fixed critical bug where `apiRequest` function returned raw Response object instead of parsed JSON
  - Changed return type from `Promise<Response>` to generic `Promise<T>`
  - Added `await res.json()` to properly parse responses
  
- **Fallback Extraction Improvements**:
  - Smart candidate section detection: extracts only text AFTER keywords like "consider", "candidates", "contenders"
  - Retiring politician filter: excludes names mentioned BEFORE "retires/retiring/steps down" keywords
  - Example: "Chuck Schumer retires? Consider: AOC, Letitia James..." correctly excludes "Chuck Schumer" and includes only the 5 listed candidates

**November 16, 2025** - Race Creation and AI-Powered Intelligent Suggestions:
- **Custom Race Creation**: Admins can now create new races beyond default seed data
  - POST `/api/admin/races` endpoint with UUID-based IDs (prevents collisions)
  - Collapsible form in AdminManage with fields: race type, title, election date, state, district, description
  - Form provides guidance that races need candidates added before appearing in suggestions
  - Newly created races immediately appear in race selection dropdown
  
- **AI-Powered Intelligent Suggestions**: Replaced basic suggestions with GPT-5 analysis
  - GET `/api/admin/suggested-matchups` returns top 3 most compelling matchups
  - AI analyzes competitiveness, current events relevance, timing, and viewer interest
  - Each suggestion includes detailed reason (1-2 sentences) explaining appeal
  - Fallback scoring system when AI is unavailable or slow
  - Only suggests races with 2+ candidates and predictions (data quality filter)
  - Response format: `{suggestions: [...], currentEventsContext: "..."}`
  
- **Earlier: Featured Matchup Creation Improvements**:
  - Replaced manual URL entry with race selection dropdown to prevent invalid URL errors
  - System now auto-generates URLs in correct format (`/race/{race-id}`)
  - Auto-fills title and description based on selected race
  - Improved UI to display featured matchups as cards with descriptions on both public and admin dashboards

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18+ with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and data fetching

**UI Framework:**
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with a custom design system
- Carbon Design System-inspired layout emphasizing data clarity and partisan neutrality
- IBM Plex Sans and IBM Plex Mono fonts for professional, data-focused typography

**Design Principles:**
- Information-dense analytics with clear visual hierarchy
- Partisan neutrality through equal visual treatment of all parties
- Data-first presentation with emphasis on methodology transparency
- Responsive grid layouts optimized for comparison views

**Component Organization:**
- Reusable components for candidates, races, predictions, and comparisons
- Dedicated pages for dashboard, race details, and head-to-head comparisons
- Custom UI components in `/client/src/components/ui/` following shadcn patterns
- Feature components in `/client/src/components/` for domain-specific functionality

**Routing Structure:**
- **Public Routes:**
  - `/` - Public dashboard showing race results and featured matchups (read-only)
  - `/race/:id` - Individual race detail pages
  - `/compare/presidential-primary` - Specific presidential primary comparison
  - `/compare/ny-senate` - NY Senate race comparison

- **Admin Routes (Protected):**
  - `/admin/felixdgreat` - Admin dashboard with prediction creation tools
  - `/admin/felixdgreat/manage` - Featured matchup management interface
  - `/custom-prediction` - Create custom head-to-head predictions
  - `/natural-language` - Natural language query interface for AI predictions

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for type-safe API endpoints
- ESM (ES Modules) throughout the codebase
- RESTful API design for race, candidate, and prediction data

**Data Layer:**
- PostgreSQL database using Neon serverless database (production)
- Drizzle ORM for type-safe database queries and schema management
- DbStorage class implements IStorage interface using async Drizzle operations
- Schema definitions in `/shared/schema.ts` with pgTable definitions
- Database tables: races, candidates, predictions, race_candidates (junction), featured_matchups
- All primary keys use VARCHAR with UUID generation for collision-free distributed IDs
- Shared TypeScript types between frontend and backend for consistency

**API Endpoints:**
- `GET /api/races` - Fetch all races with candidates and predictions
- `GET /api/races/:id` - Fetch specific race details
- `POST /api/races/:id/view` - Track view count for a race
- `GET /api/candidates` - Fetch all candidates
- `POST /api/compare` - Generate AI-powered candidate comparisons
- `POST /api/custom-prediction` - Generate custom head-to-head predictions
- `POST /api/natural-language-analysis` - Process natural language queries for predictions
- `GET /api/featured-matchups` - Fetch all featured matchups (sorted by display order)
- `POST /api/admin/featured-matchups` - Create a new featured matchup
- `DELETE /api/admin/featured-matchups/:id` - Delete a featured matchup
- `PUT /api/admin/featured-matchups/:id/order` - Update matchup display order
- `GET /api/admin/suggested-matchups` - AI-powered suggestions with GPT-5 analysis (returns `{suggestions, currentEventsContext}`)
- `POST /api/admin/races` - Create custom races (returns Race with UUID-based ID)
- `POST /api/admin/races/:raceId/candidates` - Add candidates to a race (for future implementation)

**Prediction Model:**
The application uses an early-cycle weighted factor system requiring NO polling or fundraising data:
- Partisan Lean / Demographics (30% weight) - PVI, district makeup, past results
- Candidate Experience / Incumbency (20% weight) - Incumbent advantage, offices held
- Name Recognition / Public Visibility (15% weight) - Media coverage, Google Trends, social media
- Endorsements / Party Support (15% weight) - Party backing, officials, unions
- Issue Alignment / Ideology Fit (10% weight) - Match with district ideology/issues
- Momentum / Public Engagement (10% weight) - Volunteer activity, event attendance, organic growth

Each candidate receives a composite win probability score (0-100) with confidence intervals based entirely on publicly available data.

### External Dependencies

**AI Integration:**
- OpenAI GPT-5 API via Replit AI Integrations service
- Used for generating natural language comparative analysis between candidates
- Provides FiveThirtyEight-style political commentary on race dynamics
- Fallback to statistical-only predictions when AI service is unavailable

**Database (Production):**
- Configured for PostgreSQL via Neon serverless database
- Drizzle ORM for type-safe database queries
- Connection pooling through `@neondatabase/serverless`
- Migration management via Drizzle Kit

**Session Management:**
- `connect-pg-simple` for PostgreSQL-backed session storage
- Designed for production deployment with persistent sessions

**Development Tools:**
- Replit-specific plugins for development experience (cartographer, dev-banner, runtime error overlay)
- Hot module replacement via Vite in development mode

**UI Component Libraries:**
- Radix UI primitives for accessible, unstyled components
- React Hook Form with Zod for form validation
- Embla Carousel for interactive UI elements
- Recharts for data visualization (configured but not actively used)

**Styling & Theming:**
- PostCSS with Tailwind CSS
- Custom CSS variables for light/dark mode support
- Class Variance Authority for component variant management
- Lucide React for consistent iconography