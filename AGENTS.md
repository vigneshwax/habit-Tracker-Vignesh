# Project Instructions for AI Agents

## Mandatory Rule: Keep README.md Synchronized
Whenever you make any change, feature addition, UI modification, or schema update to this website/codebase, you **MUST** update `README.md` accordingly to reflect the exact current behavior, UI components, and backend/database architecture.

## App Context & Architecture
- **App Name**: Vignesh Habit Tracker
- **Authentication**: Single source of truth password gate validated directly in application code (`9500`) across client and server (editing requires password `9500`, viewing is public).
- **Database**: Supabase PostgreSQL (default linked cloud database with UUID primary keys on `habits`, `habit_entries`, and `reflections`)
- **Backend**: Express + Vite proxy in `server.ts` to keep credentials hidden and validate UUIDs.
