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
  - `daily_reasons` — Daily reflection/reason notes per date
  - `good_habits` / `good_habit_entries` — Good habit tracking with daily entries
  - `bad_habits` / `bad_habit_entries` — Bad habit tracking with daily entries
  - `hourly_entries` — Hourly time tracking
  - `notes` — Notion-like notes/pages with title, content, and emoji icons
  - `user_levels` — User ranking level with consecutive month tracking
  - `monthly_evaluations` — Monthly evaluation results per user
  - `group_messages` — Group chat messages per level
  - `admin_inbox` — User-to-admin contact messages
  - `journal_entries` — Daily journal with day types, text, images, OCR
  - `custom_day_types` / `day_type_usage` — Custom journal day types and usage tracking
  - `user_streaks` — Consecutive productive day streak tracking
  - `successful_fundamentals` — Business/success foundation notes (32 predefined topics)
  - `money_settings` — Per-user Money Tracking preferences (currency, income, notifications)
  - `expense_categories` — Customizable expense categories with emoji, color, sort order
  - `expenses` — Individual expense entries with amount (paise), date, category, merchant, payment method, tags
  - `budgets` — Per-category monthly budget limits with enabled/disabled toggle
  - `subscriptions` — Recurring subscription tracking (Netflix, Spotify, etc.) with billing cycles
  - `bills` — Bill tracking with due dates, frequencies, and mark-as-paid flow
  - `credit_cards` — Credit card management with limits, balances, statement/due dates
  - `savings_goals` — Savings goals with target amounts, progress tracking, and monthly contributions
  - `videos` — YouTube video entries for the Know More section (title, description, category, youtube_url, duration, provider, sort_order, is_published)
  - `video_feedback` — User feedback on videos (video_id, user_id, feedback_type, message, status)
  - `friends` — Friend connections with requesterId/addresseeId and status (pending/accepted/rejected/blocked)
  - `friend_invites` — Shareable invite link tokens for adding friends
  - `comparison_privacy` — Per-user privacy toggles for what data friends can see
  - `daily_stats_cache` — Cached daily productivity metrics for comparison features
  - `grow_groups` — Paid-only groups with name, description, public/private toggle
  - `grow_group_members` — Group membership with roles (owner/admin/member)
  - `grow_group_messages` — Group chat messages with soft-delete and reply support

### Grow Together Section
- **Route**: `/dashboard/grow-together` — Two tabs: Compare With Friends + Groups
- **Compare With Friends**: Friend invite links, friend list, high-level comparison (daily/weekly/monthly averages, streaks, levels), deep daily comparison (per-metric breakdown with table), leaderboard (today/week/month), privacy controls
- **Groups (Paid Only)**: Create/join public groups, group chat with real-time polling (5s), member list with roles, leave/delete group. Requires completed payment (₹3999) to create, join, or send messages
- **Privacy Controls**: 6 toggles (daily score, weekly avg, monthly avg, streak, habit details, daily breakdown) controlling what friends can see
- **Comparison Data Flow**: computeDailyMetrics() from level-engine.ts → upsertDailyStats cache → comparison endpoints
- **API**: All endpoints under `/api/grow/` prefix (friends, privacy, stats, compare, leaderboard, membership, groups)

### Know More Section
- **Route**: `/dashboard/know-more` — Video learning center with YouTube embedding
- **Video Hosting**: Videos stored on YouTube (unlisted), only URLs stored in database
- **Embedding**: YouTube iframe embeds with `rel=0&modestbranding=1` for clean player; lazy-loads thumbnail first, loads iframe on play click
- **Fallback**: If embedding fails, opens YouTube link in new tab
- **Feedback System**: In-app private feedback (Ask a Doubt, Suggest Improvement, Report Issue, Request Feature); users see only their own feedback
- **Admin Management**: Admin can add/edit/delete videos, toggle publish status, view all user feedback with status management (pending/reviewed/resolved)
- **Categories**: general, getting-started, features, tips, updates — filterable with search
- **Provider-based Design**: video_provider field supports future migration to Vimeo/CDN/self-hosted
- **API**: `/api/videos` for user access, `/api/admin/videos` and `/api/admin/video-feedback` for admin CRUD

### Money Tracking Module
- **Route**: `/dashboard/money` — 8 sub-tabs: Dashboard, Expenses, Budget, Subscriptions, Bills & Cards, Reports, Goals, Settings
- **Currency**: All monetary values stored as integers (paise/cents) to avoid floating-point errors
- **Formatting**: Respects user settings (currency symbol, position, decimal places)
- **Dashboard**: Summary cards, category pie chart, daily spending trend, budget progress, upcoming payments, recent transactions, savings rate gauge
- **Expenses**: CRUD with filters (search, category, payment method), multiple payment methods (Cash, UPI, Credit Card, etc.)
- **Budget**: Per-category monthly limits with progress bars and smart suggestions
- **Subscriptions**: Track recurring services with billing cycles, pause/cancel, monthly/yearly projections
- **Bills & Cards**: Bill tracking with mark-as-paid (auto-creates expense), credit card visual cards with utilization tracking
- **Reports**: Monthly analytics with category breakdowns and daily bar charts
- **Goals**: Savings goals with add-funds inline, progress tracking, completion
- **Settings**: Currency selection (INR/USD/EUR/GBP/AED), monthly income, notification preferences, CSV/JSON data export
- **API**: All endpoints under `/api/money/` prefix, protected by `isAuthenticated` middleware
- **Default Categories**: 21 categories auto-initialized on first access (food, transport, shopping, etc.)

### Level/Ranking System
- **7 Levels**: Unproductive (default) → Bronze → Silver → Gold → Platinum → Diamond → Elite
- **Level Engine**: `server/level-engine.ts` computes daily metrics from tasks/habits/hourly data, counts qualifying days per level, runs monthly evaluations
- **Elite Qualification**: All days 95%+ all metrics OR 26+ days of 100% all metrics, 0% bad habits
- **Consecutive Months**: Required for Silver+ (Silver=2, Gold=3, Platinum=4, Diamond=5, Elite=6)
- **Group Messaging**: Each level has a group. Read-only for Unproductive-Gold. Chat enabled for Platinum/Diamond/Elite
- **Admin**: ADMIN_USER_ID env var identifies admin. Admin can post to any group, view user inbox, delete messages
- **Frontend Pages**: `/dashboard/community` (level status, group, progress, contact admin), `/dashboard/admin` (admin panel)

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