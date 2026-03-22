# Consistency System

## Overview

Consistency System is a premium SaaS web application designed to enhance personal productivity and habit tracking. It features a modern public website for marketing and payments, and a comprehensive logged-in web application. The web app includes modules for goal setting (yearly/monthly), daily task management, good and bad habit tracking, hourly time tracking, notes, money management, a video learning center, and a social "Grow Together" section for friend comparisons and group interactions. Future plans include an advanced "Team Productivity Intelligence" section. The system is built with a full-stack TypeScript architecture, utilizing React for the frontend and Express for the backend, with PostgreSQL as the database and Drizzle ORM. Authentication is handled via Replit Auth.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript.
-   **Routing**: Wouter.
-   **State Management**: TanStack React Query for server state, local React for UI.
-   **UI/Styling**: shadcn/ui (new-york style) on Radix UI primitives, styled with Tailwind CSS (dark theme by default).
-   **Animations**: Framer Motion.
-   **Charts**: Recharts.
-   **Build**: Vite.

### Backend
-   **Framework**: Express.js on Node.js with TypeScript.
-   **API**: RESTful, defined in `shared/routes.ts` with Zod validation.
-   **Authentication**: Replit Auth (OpenID Connect) via Passport.js, sessions stored in PostgreSQL.
-   **Storage**: Drizzle ORM for PostgreSQL.

### Data Storage
-   **Database**: PostgreSQL.
-   **ORM**: Drizzle ORM.
-   **Schema**: Defined in `shared/schema.ts`, managed with `drizzle-kit push`.
-   **Key Tables**: Includes users, sessions, payments, various goal and habit trackers, tasks, hourly entries, notes, money management entities (expenses, budgets, subscriptions, bills, credit cards, savings goals), video content, social features (friends, groups, comparison data), and future team productivity metrics.

### Core Features
-   **Goal & Habit Tracking**: Yearly/monthly goals, daily tasks, good/bad habit tracking, hourly time tracking.
-   **Money Tracking**: Comprehensive module for expenses, budgets, subscriptions, bills, credit cards, and savings goals with user-defined currency settings and categories.
-   **Level/Ranking System**: 7-tier system (Unproductive to Elite) based on productivity metrics, with monthly evaluations and level-gated group messaging.
-   **Grow Together (Social)**: Friend connections, comparison of productivity metrics, group creation and chat (paid feature), and privacy controls.
-   **Know More (Learning)**: Video learning center with YouTube embeds and in-app feedback system.
-   **Team Productivity Intelligence**: Advanced module for team-level insights, scoring, pattern detection, and alerts.
-   **AI-Driven Platform (Prompts 1-4 Done)**:
    -   Workspaces, Teams, Members management
    -   Projects, Tasks, Subtasks, Dependencies
    -   6 Task Views: Board (drag-and-drop), List, Timeline, Calendar, Table, Dashboard
    -   Channels & Messaging (real-time polling, team + project channels)
    -   Task Comments (threaded, per-task)
    -   Wiki/Document Editor (TipTap rich text, hierarchical pages)
    -   Time Tracking: floating TimeTracker widget, time_entries CRUD, weekly Timesheets grid (click-to-edit cells, submit flow), Time Report with date range + bar charts
    -   AI Productivity Engine: 7-factor weighted scoring (productivityCalculator.ts), ProductivityScore ring chart, ComparisonCards, TeamHealthDashboard, PerformanceProfile with heatmap + trend chart, PerformerIdentification (top/at-risk), productivity_snapshots + timesheets DB tables

### Shared Code
-   `shared/` directory contains common types, API route definitions with validation schemas (`shared/routes.ts`), and database schemas (`shared/schema.ts`).

### Build System
-   **Development**: `tsx server/index.ts` with Vite HMR.
-   **Production**: Custom script using Vite for client and esbuild for server, outputting to `dist/`.

## External Dependencies

### Required Services
-   **PostgreSQL Database**: For all data storage, configured via `DATABASE_URL`.
-   **Replit Auth**: OpenID Connect for user authentication, requiring `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET` environment variables.

### Payment Integration
-   **Razorpay**: Payment gateway for one-time purchases (₹3999).

### Key npm Packages
-   `drizzle-orm`, `drizzle-kit`
-   `express`, `express-session`
-   `passport`, `openid-client`
-   `@tanstack/react-query`
-   `zod`, `drizzle-zod`
-   `recharts`
-   `framer-motion`
-   `wouter`
-   `shadcn/ui` (Radix UI + Tailwind)