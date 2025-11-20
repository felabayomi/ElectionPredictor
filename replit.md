# ElectionPredict - AI-Powered Political Election Analysis

## Overview
ElectionPredict is a data-driven political analytics platform that provides FiveThirtyEight-style predictions for Presidential, Senate, House, and Governor races. It leverages statistical modeling of various data points (polling, fundraising, demographics, historical trends) combined with AI-powered analysis to offer election outcome predictions and candidate comparisons. The platform aims to provide comprehensive, data-driven insights into political elections.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses React 18+ with TypeScript, Vite, Wouter for routing, and TanStack Query for state management. UI is built with shadcn/ui on Radix UI primitives, styled with Tailwind CSS, and follows a Carbon Design System-inspired layout for data clarity and partisan neutrality. It uses IBM Plex Sans and IBM Plex Mono fonts and features responsive grid layouts. Public routes include `/`, `/race/:id`, and specific comparison pages, while protected admin routes like `/admin/felixdgreat` and `/natural-language` handle management and AI prediction tools.

#### Candidate Management
Candidate management is handled entirely within the RaceCard component using react-hook-form + Zod validation. The "Manage Candidates" dialog displays existing candidates in a ScrollArea with Avatar components (photo or initials fallback), party badges, and edit/delete buttons. All CRUD operations use TanStack Query mutations with proper cache invalidation and toast notifications.

### Backend Architecture
The backend is built with Express.js and TypeScript, using ESM. It employs a RESTful API design. Data is persisted in a PostgreSQL database (Neon serverless for production) using Drizzle ORM for type-safe queries. Schema definitions are shared, and all primary keys are UUID-based VARCHARs. Key API endpoints include fetching races and candidates, generating AI-powered comparisons and custom predictions, processing natural language queries, and managing featured matchups and admin tasks.

### Prediction Model
The application uses a comprehensive **8-factor weighted prediction model**:
- **Partisan Lean/Demographics** (25%): District PVI, historical voting patterns
- **Polling** (20%): Average polling performance, voter sentiment trends
- **Candidate Experience** (15%): Incumbent advantage, years in office, prior positions held
- **Fundraising** (15%): Campaign resources, total funds raised
- **Name Recognition** (10%): Media coverage, Google Trends, social media presence
- **Endorsements** (10%): Party support, official backing, union endorsements
- **Issue Alignment** (5%): Match with district ideology and key issues
- **Momentum** (5%): Volunteer activity, event attendance, grassroots engagement

The model leverages **OpenAI GPT-4.1-mini** for intelligent analysis when available, with a deterministic fallback that incorporates actual candidate data (polling, fundraising, incumbent status, experience, endorsements) when AI is unavailable. All predictions include unique win probabilities and confidence intervals.

## External Dependencies

### AI Integration
- **OpenAI GPT-4.1-mini API**: Utilized via Replit AI Integrations for natural language comparative analysis, political commentary, and data-driven predictions. Includes intelligent fallback to deterministic predictions using actual candidate metrics when AI unavailable.

### Database (Production)
- **PostgreSQL via Neon serverless database**: For persistent data storage.
- **Drizzle ORM**: For type-safe database interactions.
- **`@neondatabase/serverless`**: For connection pooling.

### Session Management
- **`connect-pg-simple`**: For PostgreSQL-backed session storage in production.

### UI Component Libraries
- **Radix UI**: Primitives for accessible UI components.
- **React Hook Form with Zod**: For form validation.
- **Embla Carousel**: For interactive UI elements.
- **Lucide React**: For consistent iconography.

### Styling & Theming
- **PostCSS with Tailwind CSS**: For styling.
- **Class Variance Authority**: For component variant management.