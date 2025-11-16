# ElectionPredict - AI-Powered Political Election Analysis

## Overview

ElectionPredict is a data-driven political analytics platform that predicts election outcomes for Presidential, Senate, House, and Governor races. The application combines statistical modeling of polling data, fundraising, demographics, and historical trends with AI-powered analysis to provide FiveThirtyEight-style election predictions and candidate comparisons.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for type-safe API endpoints
- ESM (ES Modules) throughout the codebase
- RESTful API design for race, candidate, and prediction data

**Data Layer:**
- In-memory storage implementation (MemStorage class) for development
- Schema definitions in `/shared/schema.ts` using Drizzle ORM types
- Drizzle Kit configured for PostgreSQL migration support (production-ready)
- Shared TypeScript types between frontend and backend for consistency

**API Endpoints:**
- `GET /api/races` - Fetch all races with candidates and predictions
- `GET /api/races/:id` - Fetch specific race details
- `GET /api/candidates` - Fetch all candidates
- `POST /api/compare` - Generate AI-powered candidate comparisons

**Prediction Model:**
The application uses a weighted factor system combining:
- Polling data (35% weight)
- Fundraising totals (20% weight)
- Name recognition (15% weight)
- Demographics alignment (15% weight)
- Endorsements (10% weight)
- Historical trends (5% weight)

Each candidate receives a composite win probability score with confidence intervals.

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