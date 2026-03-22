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
-   **AI-Driven Platform (Prompts 1-6 DONE)**:
    -   Workspaces, Teams, Members management
    -   Projects, Tasks, Subtasks, Dependencies
    -   6 Task Views: Board (drag-and-drop), List, Timeline, Calendar, Table, Dashboard
    -   Channels & Messaging (real-time polling, team + project channels)
    -   Task Comments (threaded, per-task)
    -   Wiki/Document Editor (TipTap rich text, hierarchical pages)
    -   Time Tracking: floating TimeTracker widget, time_entries CRUD, weekly Timesheets grid (click-to-edit cells, submit flow), Time Report with date range + bar charts
    -   AI Productivity Engine: 7-factor weighted scoring (productivityCalculator.ts), ProductivityScore ring chart, ComparisonCards, TeamHealthDashboard, PerformanceProfile with heatmap + trend chart, PerformerIdentification (top/at-risk), productivity_snapshots + timesheets DB tables
    -   Workload Management: WorkloadView with drag-drop task reassignment (@hello-pangea/dnd), utilization capacity bars, CapacityPlanner 4-week timeline with PTO/holiday/sick management, member_availability table
    -   Reporting Suite: ExecutiveDashboard (6 KPI cards + dept BarChart + at-risk projects table), ReportBuilder (data sources, chart types, filters, group-by, save config), ReportLibrary (10 templates), saved_reports table
    -   Goals/OKRs: OKR Goals page (/dashboard/okr-goals), cascading OKRTree (4 levels, expand/collapse framer-motion), GoalCard (confidence badge dropdown, progress bar, inline value editing), CreateGoalModal; okr_goals + goal_task_links tables
    -   Automations: Automations page (/dashboard/automations), AutomationBuilder (WHEN→IF→THEN visual flow, max 5 actions, test run); automations + automation_logs tables
    -   AI Features: AICommandBar (Ctrl+K, real OpenAI gpt-4o-mini, action parsing), AICoach (slide-in 320px panel, today's plan, focus recs, insights, chat — all OpenAI), SmartSearch (Ctrl+Shift+F, category tabs, workspace-wide search)
    -   Notifications: NotificationCenter (bell in SidebarHeader, unread badge, mark-all-read, 30s polling); notifications table
    -   Keyboard shortcuts in layout.tsx; Command + Search + AI Coach buttons in SidebarFooter
    -   **Prompt 6 — Full API Layer**: Autopilot events/rules/executions/patterns/settings; Predictions (with inline task-completion hook + confidence feedback loop on sequences); Time Machine sessions/coaching/settings; Delegation suggest/assign/rules; Project Contexts CRUD (AI catch-up on 2h+ away); Workflows CRUD (real task+note creation on run); Daily Planner generate/save; Document Templates CRUD + `/api/documents/generate` (real OpenAI for ai_generated sections)
    -   **8 node-cron jobs**: pattern detection (6h), sequence learning (2AM), weekly coaching (Sunday 8PM), monthly summary (1st midnight), end-of-day summary (6PM), daily plan auto-gen (7AM), skill detection (Sunday midnight), expired predictions cleanup (midnight)
    -   **In-memory rate-limit cache** for autopilot executions; module-level `callAI()` helper
    -   **Seed file**: `server/seed.ts` — seeds autopilot rules/patterns/settings, task sequences, work patterns, coaching messages, team profiles, delegation rules, project contexts, workflows, daily plans, and 5 built-in document templates
-   **Connect Messaging System (Sprints 1–2 DONE)**:
    -   REST-only messaging (React Query polling, 3s interval) — no Socket.IO
    -   15 messaging tables (connect_ prefix): connect_channels, connect_channel_members, connect_messages, connect_message_reactions, connect_message_attachments, connect_pinned_messages, connect_conversations, connect_conversation_members, connect_direct_messages, connect_dm_attachments, connect_dm_reactions, connect_user_presence, connect_huddles, connect_message_bookmarks, connect_custom_emoji, connect_slash_commands
    -   Presence service, typing service (in-memory) in `server/services/`
    -   REST routes: GET /api/channels/my, POST /api/channels, POST /api/channels/:id/join, POST /api/channels/:id/leave, GET/POST /api/conversations, GET /api/messages/:channelId, POST /api/messages, PATCH /api/messages/:id, DELETE /api/messages/:id, POST /api/messages/pin, POST /api/messages/bookmark, GET /api/typing/:channelId
    -   UI components: ChannelSidebar, MessageList, MessageComposer, ChannelView — all in `client/src/components/connect/`
    -   Route: /dashboard/connect → ConnectPage

-   **Notes System (Prompts 1–4 DONE)**:
    -   12 UI shell components in `client/src/components/notes/`
    -   Central state via `NotesContext.tsx` (NotesProvider, useNotes hook): pages[], selectedPageId, UI state flags
    -   Sidebar: tab switching (Pages/Recent/Favorites/Tags), page tree with expand/collapse/drag-drop/right-click context menu, quick capture inbox, Ctrl+K global shortcut
    -   PageView: contentEditable title, cover picker (6 gradients), emoji icon picker, status dropdown, reading stats (word count/read time), settings panel trigger, lock toggle
    -   PageSettingsPanel: font selector, small text/full width/lock toggles, status pills, page info, export as Markdown, import .md, share modal, duplicate, delete
    -   BlockEditor: 20+ block types (text, heading1-3, bullet_list, numbered_list, todo, toggle, quote, callout, divider, code, table, image, video, file, bookmark, embed), contentEditable per block, Enter/Backspace/Tab behavior, 50-step undo/redo, drag-drop reordering with grip handles, markdown shortcuts (#/##/###/- /1. /[ ] /> /---), keyboard shortcuts (Ctrl+Z/Y/B/I/U/E/D/Delete/Up/Down/Shift+0-6), block context menu, inline slash command grid
    -   SlashCommandGrid: searchable, keyboard-navigable, all block types with categories
    -   BlockToolbar: floating on text selection, execCommand formatting (bold/italic/underline/strike/code/link), color picker, copy
    -   FocusMode + ContentMap + SplitView: context-connected overlays with Esc to close
    -   DatabaseView: 6 views (Table/Board/Calendar/Timeline/Gallery/List) with filter/sort/group, inline cell editing, board drag-drop, row detail modal
    -   CollaborationPanel: threaded comments with replies/resolve/unresolve/activity log, toggle via Page menu
    -   BlockToolbar: AI assistance menu (12 actions: improve/grammar/tone/translate/etc.), Turn into dropdown
    -   SearchCommandPalette: capture mode, template gallery, page content snippets, keyboard nav
    -   NotesContext: templates (6 built-in), createFromTemplate, saveAsTemplate, collaborationPanelOpen, pageVersions (auto-save every 10 min, keep last 50), saveVersion, restoreVersion, scheduleVersionSave
    -   PageSettingsPanel: version history section, save-as-template action, save-version-now action
    -   Page: `client/src/pages/dashboard/notes.tsx` — wraps everything in NotesProvider

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