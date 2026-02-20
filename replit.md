# Consistency System

## Overview

Consistency System is a premium SaaS web application for personal productivity and habit tracking. It has two main parts:

1. **Public Website** — A modern SaaS landing page with hero section, features overview, pricing (₹3999 one-time), and Razorpay payment integration.
2. **Logged-in Web App** — A dashboard with 5 core sections: Goals (yearly/monthly), Daily Tasks, Good Habits tracker, Bad Habits tracker, and Hourly time tracker.

The app uses a full-stack TypeScript architecture with React on the frontend and Express on the backend, backed by PostgreSQL via Drizzle ORM. Authentication is handled through Replit Auth (OpenID Connect).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (dark theme by default)
- **Animations**: Framer Motion for page transitions and interactions
- **Charts**: Recharts for dashboard analytics
- **Build Tool**: Vite with HMR support
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

The frontend lives in `client/src/` with pages under `client/src/pages/`, reusable hooks in `client/src/hooks/`, and UI components in `client/src/components/ui/`. Dashboard pages are wrapped in a `DashboardLayout` component that includes an `AppSidebar` for navigation.

### Backend Architecture
- **Framework**: Express.js running on Node.js
- **Language**: TypeScript, executed via `tsx`
- **API Design**: RESTful API endpoints under `/api/` prefix, with route definitions and Zod validation schemas centralized in `shared/routes.ts`
- **Authentication**: Replit Auth using OpenID Connect (passport + express-session), stored in PostgreSQL via `connect-pg-simple`. Auth logic lives in `server/replit_integrations/auth/`.
- **Storage Layer**: Database operations abstracted through a storage interface (`IStorage`) in `server/storage.ts` using Drizzle ORM queries.

### Data Storage
- **Database**: PostgreSQL (required — `DATABASE_URL` environment variable must be set)
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files)
- **Key Tables**:
  - `users` — User profiles (required for Replit Auth)
  - `sessions` — Session storage (required for Replit Auth)
  - `payments` — Razorpay payment records
  - `yearly_goals` — Annual goal tracking with ratings
  - `monthly_overview_goals` — Monthly goal overview with ratings
  - `monthly_dynamic_goals` — Current month goals with status tracking
  - `tasks` — Daily task management
  - `task_bank_items` — Quick-capture task ideas (unscheduled, assignable to dates)
  - `good_habits` / `good_habit_entries` — Good habit tracking with daily entries
  - `bad_habits` / `bad_habit_entries` — Bad habit tracking with daily entries
  - `hourly_entries` — Hourly time tracking

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `shared/schema.ts` — Database table definitions and Zod insert schemas (via `drizzle-zod`)
- `shared/routes.ts` — API route definitions with paths, HTTP methods, input validation schemas, and response types
- `shared/models/auth.ts` — User and session table definitions for Replit Auth

### Build System
- **Development**: `tsx server/index.ts` runs the server with Vite dev middleware for HMR
- **Production Build**: Custom build script (`script/build.ts`) that runs Vite for the client and esbuild for the server, outputting to `dist/`
- **Server Build**: esbuild bundles server code into `dist/index.cjs`, with select dependencies bundled and others externalized

### Authentication Flow
- Replit Auth via OpenID Connect (`openid-client` + Passport.js)
- Sessions stored in PostgreSQL using `connect-pg-simple`
- `isAuthenticated` middleware protects all `/api/` routes except auth endpoints
- User data synced to `users` table on login via `upsertUser`
- Frontend checks auth state via `/api/auth/user` endpoint

## External Dependencies

### Required Services
- **PostgreSQL Database**: Required. Connection via `DATABASE_URL` environment variable. Used for all data storage including sessions.
- **Replit Auth**: OpenID Connect provider for authentication. Requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables.

### Payment Integration
- **Razorpay**: Payment gateway for the ₹3999 one-time pricing. Backend endpoints exist for payment processing. Frontend integration is partially simulated for prototype.

### Key npm Packages
- `drizzle-orm` + `drizzle-kit` — Database ORM and schema management
- `express` + `express-session` — HTTP server and session management
- `passport` + `openid-client` — Authentication
- `@tanstack/react-query` — Server state management
- `zod` + `drizzle-zod` — Runtime validation and schema generation
- `recharts` — Dashboard charts and graphs
- `framer-motion` — Animations
- `wouter` — Client-side routing
- `shadcn/ui` (Radix UI + Tailwind) — Component library