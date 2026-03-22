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
-   **AI Agents (Sprint 4)**: Build, configure, and chat with custom AI agents. Supports tool-calling (read/write tasks, search workspace, send messages), 6 pre-built templates, and run history tracking.
-   **AI Workflow Recorder (Sprint 4)**: Record, save, and replay multi-step automations with AI-detected variable substitution and run history.
-   **AI Project Manager (Sprint 5)**: Daily standup report, risk detection, executive status report, and natural-language automation builder — all from real task data.
-   **AI Task Intelligence (Sprint 5)**: Natural language task parsing, AI task breakdown, smart prioritization, duration estimation, and assignee suggestions.
-   **AI Database Intelligence (Sprint 5)**: Natural language database queries, AI auto-fill columns, create database structures from descriptions, and formula generation.
-   **AI Meeting Intelligence (Sprint 6)**: Process meeting transcripts to extract summary, key points, decisions, action items, and open questions. One-click task creation from action items.
-   **AI Document Generator (Sprint 6)**: Generate 7 document types (weekly status, meeting agenda, project brief, sprint retro, handoff, client update, onboarding) from real workspace data.
-   **AI Messaging Intelligence (Sprint 7)**: Thread summarizer, channel catch-up, smart reply suggestions, AI message composer, and decision extractor.
-   **AI Email Assistant (Sprint 7)**: Compose/reply/follow-up email writer, thread summarizer, and inbox triage with AI priority labels.
-   **Goal & Habit Tracking**: Yearly/monthly goals, daily tasks, good/bad habit tracking, hourly time tracking, AI-powered habit tracking with streak calculation.
-   **Money Tracking**: Comprehensive module for expenses, budgets, subscriptions, bills, credit cards, and savings goals with user-defined currency settings and categories.
-   **Level/Ranking System**: 7-tier system (Unproductive to Elite) based on productivity metrics, with monthly evaluations and level-gated group messaging.
-   **Grow Together (Social)**: Friend connections, comparison of productivity metrics, group creation and chat (paid feature), and privacy controls.
-   **Know More (Learning)**: Video learning center with YouTube embeds and in-app feedback system.
-   **Team Productivity Intelligence**: Advanced module for team-level insights, scoring, pattern detection, and alerts.
-   **Daily Planner**: AI-generated optimized schedules, task management, and evening reviews.
-   **Focus Coach**: Live timer, productivity scoring, AI coaching, and integration with time entries.
-   **AI System Foundation**: Central AI service for text generation, streaming, tool use, embeddings, knowledge indexing, and usage logging. Universal AI stream endpoint.
-   **Productivity Engine**: 7-factor weighted scoring, performance profiles, team health dashboards, and performer identification.
-   **Workload Management**: Workload views, capacity planning, and member availability management.
-   **Reporting Suite**: Executive dashboard, customizable report builder, and report library.
-   **Goals/OKRs**: Cascading OKR tree, goal tracking with confidence and progress, and task linking.
-   **Automations**: Visual automation builder with WHEN→IF→THEN flows.
-   **AI Features**: AI Command Bar, AI Coach, Smart Search with workspace-wide capabilities.
-   **Notifications**: Centralized notification center with polling.
-   **Messaging System**: REST-only messaging for channels, direct messages, reactions, and presence.
-   **Notes System**: Rich text editor with various block types, contentEditable features, version history, collaboration, and AI assistance.

### Shared Code
-   `shared/` directory contains common types, API route definitions with validation schemas (`shared/routes.ts`), and database schemas (`shared/schema.ts`).

### Build System
-   **Development**: `tsx server/index.ts` with Vite HMR.
-   **Production**: Custom script using Vite for client and esbuild for server, outputting to `dist/`.

## External Dependencies

### Required Services
-   **PostgreSQL Database**: For all data storage.
-   **Replit Auth**: OpenID Connect for user authentication.

### Payment Integration
-   **Razorpay**: Payment gateway for one-time purchases.

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