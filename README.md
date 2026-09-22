# Vignesh Habit Tracker (Version 3.0 — Personal Growth OS)

A minimalist, high-craft personal Habit Tracker and Life Management System built with **React**, **TypeScript**, **Tailwind CSS**, and **Express**, featuring persistent cloud storage powered by **Supabase PostgreSQL**.

---

## 📖 Overview & Core Purpose

**Vignesh Habit Tracker 3.0** evolves from a habit spreadsheet into a comprehensive **Personal Growth Operating System**. It connects high-level quarterly goals with daily execution and structured weekly/monthly reflections:

```text
🎯 GOALS (Vision & Milestones)
   ↓
📋 HABITS (Routines & Systems)
   ↓
⚡ DAILY ACTIONS (Focus Checklist & Streaks)
   ↓
😊 MOOD & 📝 MICRO-JOURNAL
   ↓
📊 ANALYTICS → 📝 WEEKLY REVIEW → 📅 MONTHLY REFLECTION
```

---

## ⭐ Version 3.0 — Phase 2: Core Habit Upgrade

1. **Habit Categories**:
   - Organized into 6 distinct categories with custom emoji & badges: `🏃 Health`, `💼 Career`, `📚 Learning`, `🧘 Personal`, `💰 Finance`, and `✨ General`.
   - Real-time category filtering buttons above the spreadsheet grid (`All`, `🏃 Health`, `💼 Career`, `📚 Learning`, `🧘 Personal`, `💰 Finance`, `✨ General`).
2. **Flexible Frequencies**:
   - **Daily**: Scheduled every day of the month.
   - **Specific Days**: Interactive day selector (`Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`) storing weekday numbers `[0, 1, 2, 3, 4, 5, 6]` in `schedule_days`.
   - **Weekly Target**: Flexible target frequency per week with interactive increment/decrement steppers (`[-] 3 [+]`).
   - **Monthly Target**: Flexible target frequency across the month with interactive steppers (`[-] 15 [+]`).
3. **Habit Status System (Active, Paused, Archived, & Permanent Delete)**:
   - **Active**: Appears in Today's Focus, Spreadsheet Grid, Calendar, and streaks.
   - **Paused**: Placed on hold with muted styling; does not penalize streaks or break progress calculations. Can be resumed anytime.
   - **Archived**: Preserves all historical logs and completions while hiding from active views. Easily restorable (`status = 'active'`, `archived_at = null`) from the Archived filter or Settings.
   - **Delete Habit**: Available directly inside the **Edit Habit Modal** (and Habit Detail Modal) with a safety confirmation dialog (`DeleteHabitModal`) clearly explaining permanent deletion vs. archiving.
4. **Improved Add & Edit Modals**:
   - Modern steppers, weekday selectors, and category dropdowns.
   - Preserves all past history and completions when editing or changing frequency.
   - Includes dedicated **Archive** and **Delete** actions in the Edit modal footer.
5. **Archive & Delete Confirmation Flows**:
   - Safe archive confirmation modal explaining historical preservation.
   - Safe delete confirmation modal (`DeleteHabitModal`) preventing accidental permanent loss of entries.
   - Instant restore button for archived habits.


---

## 🖥️ View & Component Breakdown

### 1. Permanent Default Supabase Cloud Connection & Protected Editing Architecture
- **Permanent Default Connection to Supabase Cloud**:
  - The application is permanently connected to the user's Supabase PostgreSQL cloud database (`habits`, `habit_entries`, `reflections`, `moods`, `goals`, `daily_journal`, `weekly_reviews`, `weekly_plans`, `affirmations`).
  - Every create, edit, update, toggle, and delete action writes directly and permanently to Supabase cloud in real time.
- **Public Viewing & Single Source of Truth Protected Editing**:
  - **Public Viewing**: Anyone can open the tracker, view habits, browse mood logs, explore analytics, read journal reflections, and inspect goals without entering a password. No password prompt appears on initial page load.
  - **Protected Editing**: All create, edit, update, toggle, and delete mutations require entering the password set in `APP_EDIT_PASSWORD`.
  - **Server-Side Verification**: Authentication is verified exclusively by `server.ts` against `process.env.APP_EDIT_PASSWORD`. No hard-coded PINs or credentials exist in the client or server.
  - **Session Persistence & 15-Minute Timeout**: Once unlocked with `APP_EDIT_PASSWORD`, the client receives an edit session token stored in browser `sessionStorage`. To ensure security, the editing session automatically expires after 15 minutes of inactivity (`15 * 60 * 1000`), automatically re-locking mutations until unlocked again, while public viewing continues uninterrupted.
  - **Zero Password Exposure**: `APP_EDIT_PASSWORD` is strictly server-side and never exposed to browser JavaScript.
- **Elimination of "Unable to Save" False Errors & Multi-Attempt Network Resilience**:
  - Replaced generic connection error masks with accurate, transparent status reporting and reliable network resilience.
  - Automatic exponential backoff retry for momentary network drops, browser reconnection delays, or server warmup/cold-start periods (HTTP 502/503/504), preventing temporary glitches from showing frightening error messages.
  - Non-sticky error banners: Transitory warning banners automatically dismiss after 5 seconds and clear immediately upon any successful cloud sync, avoiding persistent red alert boxes.
  - Validates and preserves native UUID primary keys for all Supabase tables, preventing ID mismatch errors during updates and deletions.
- **On-Demand Lock / Unlock Toggle**:
  - Users can lock editing at any time by clicking the Lock/Unlock icon (`#header-view-only-indicator` / `#header-edit-unlocked-indicator`) in the header.
  - Entering the configured `APP_EDIT_PASSWORD` unlocks editing capabilities again.
  - **Visual Feedback & Input**: Clean password modal with toggleable visibility, visual indicators, physical keyboard typing (numbers, characters, Backspace, Delete, Escape, Enter), and on-screen keypad support.

---

### 2. Header & Navigation (`src/components/Header.tsx`)
- **Brand Identity & Security Status**:
  - Clean, minimalist Vignesh Habit Tracker title with live sync indicator.
  - Compact Lock / Unlock icon button (`#header-view-only-indicator` / `#header-edit-unlocked-indicator`) allowing quick lock or unlock anytime with a clean, space-saving icon.
- **Dark & Light Mode Quick Toggle**:
  - Convenient 1-tap theme toggle button present in both desktop and mobile header rows (`Sun` for Light, `Moon` for Dark).
  - Switches instantly between daylight warm paper canvas and deep evening slate theme with smooth color transitions and persistent state.
- **Stable Navigation with On-Demand Manual Collapse**:
  - The navigation tabs remain firmly fixed and visible while scrolling through habits, grids, or analytics—completely free of unexpected auto-hide behavior or jitter.
  - Manual Collapse & Expand Controls:
    - Dedicated desktop symbol toggle button (`#header-nav-toggle-desktop`) with a 300ms smoothly rotating chevron, accessible `aria-expanded` state, and title tooltips (`Show Navigation Tabs` / `Hide Navigation Tabs`).
    - Mobile toggle button (`#mobile-nav-toggle-btn`) for 1-tap manual collapsing and expanding on smaller screens.
    - Smooth physics transitions with hardware-accelerated CSS grid-template-rows (`0fr` to `1fr`), subtle scale, and cubic-bezier easing when manually toggling.
  - Streamlined desktop top bar: Keeps the brand title, live sync indicator, 1-tap theme toggle, and hide/show navigation button neatly aligned with zero clutter.
- **Auto-Fitting Responsive Navigation Bar**:
  - Automatically fits the screen width across all viewport sizes without awkward clumping or horizontal scroll overflows.
  - **Desktop/Laptop Screens (`lg:` and up)**: 8 equal-width tab buttons spanning the full container width in a single seamless row.
  - **Mobile/Tablet Screens (`< lg`)**: Balanced 4-column responsive grid (2 rows of 4 buttons) with centered, non-wrapping labels that fit 100% of the screen width.
  - **Smooth Hover & Touch Transitions**: Features hardware-accelerated transform scaling, tactile active press state (`active:scale-[0.96]`), glowing emerald active pill indicators, gentle 200ms background and border fades, micro-elevation shadow shifts, and synchronized icon scaling (`group-hover:scale-110`) for immediate, tactile feedback.
  - Instant tab switching between `Today`, `Vision & Goals`, `Grid View`, `Calendar`, `Analytics & Trends`, `Review & Reflect`, `Mood`, and `Settings`.
- **Live Sync Indicator**: Visual indicators for `Saving...`, `Supabase Synced ✓`, `Local Persistence`, or `Sync Error`.
- **Settings & Data Management**: Full data export (CSV Spreadsheet and complete JSON backup), database configuration, and security options are hosted within the Settings tab (`src/components/SettingsView.tsx`).

---

### 3. Today's Focus Dashboard (`src/components/TodayFocus.tsx`, `src/components/DashboardScoreCard.tsx` & `src/components/TodaySparklineCard.tsx`)
- **Interactive Card Hover Dynamics**:
  - All primary dashboard cards (Dashboard Score Card, 7-Day Sparkline Card, Action Checklist Card, Compact Mood Widget, Daily Journal Card, and individual habit action cards) feature hardware-accelerated subtle scaling (`hover:scale-[1.008]` / `hover:scale-[1.015]`), elevation shadow intensity increases (`hover:shadow-md`), and edge border highlight transitions for immediate tactile feedback.
- **Dashboard Score Card**: Displays your 0–100 daily score, current streak, best streak, 7-day velocity, and early warning for at-risk habits.
- **7-Day Habit Completion Sparkline (`src/components/TodaySparklineCard.tsx`)**:
  - Displays a responsive, sleek sparkline area chart built with **recharts** tracking total completed habits over the last 7 consecutive days (Day -6 through Today).
  - Features smooth gradient shading, custom date tooltips, interactive data points highlighting Today and peak completion days.
  - Displays aggregate metrics including 7-day total completed habits, daily average completion rate (`x.x/day`), day-over-day difference compared to yesterday, and a 7-day pill strip breaking down completions per day.
- **Action Checklist**: Daily routines scheduled for today with priority badges, risk indicators, week-over-week trends, and tactile completion checkmarks.
- **Compact Daily Mood Widget**: Quick 1-tap mood and energy logger embedded directly into the daily dashboard with a shortcut to the full Mood Tracker view.

---

### 4. Vision & Goals View (`src/components/GoalsView.tsx`)
- Dedicated workspace to manage quarterly and yearly targets with category classification, target dates, and progress meters.
- Real-time progress tracker automatically factoring linked habit completion rates with quick adjust buttons (25%, 50%, 75%, 100%).
- Add and link habits directly to specific goals.
- **Robust Vision Goal Deletion**:
  - **In-App Delete Confirmation Modal**: Replaced browser popups with a modern, iframe-safe modal displaying the goal title and deletion confirmation.
  - **Linked Habits Safeguard**: Informs user about any linked habits and guarantees that daily habits and check-in history will remain active, intact, and safely unlinked.
  - **Dual Action Locations**: Delete directly from the goal card trash icon or from the "Delete Goal" button inside the Edit Goal modal.
  - **Foreign Key Safe Server Deletion (`DELETE /api/goals/:id`)**: Backend unlinks habits first in Supabase (`habits.goal_id = null`) and in-memory before removing the goal record, preventing database constraint conflicts.
  - **Feedback & Notifications**: Instant state removal with smooth toast notification and error boundary handling.

---

### 5. Daily Habit Spreadsheet Grid (`src/components/DailyHabitGrid.tsx`)
- **Category Filter Pills**: Quick filters for `All`, `🏃 Health`, `💼 Career`, `📚 Learning`, `🧘 Personal`, `💰 Finance`.
- **Search Bar**: Real-time habit filtering by name.
- **Sticky Left Column**: Habit names and category tags remain pinned while scrolling horizontally through the month.
- **Non-Scheduled Day Visuals**: Habits scheduled for specific days show subtle inactive styling on non-scheduled dates.
- **Daily Completion Summary Row**: Calculates total completed habits and percentage for every column in the month.

---

### 6. Calendar View (`src/components/CalendarMonthView.tsx` & `src/components/mood/MoodCalendarView.tsx`)
- **Calendar Mode Switcher**:
  - `Habits Calendar`: Standard habit scheduling grid with completion ratios and day inspector.
  - `Mood Tracker Calendar`: Complete monthly emotional wellness calendar featuring daily mood emojis, energy ratings, and detail inspector dialog.
  - `Both Calendars`: Stacked side-by-side view enabling holistic tracking of both daily habit consistency and emotional well-being simultaneously.
- Configurable calendar grid layout (starting on Sunday or Monday based on Settings).
- Each date cell displays day number, completed checks fraction (`3/4`), and color-coded progress bar.
- **Day Inspector Drawer**: Clicking any date opens a side panel listing all scheduled habits for that specific day with instant toggle checkboxes.

---

### 7. Yearly Analytics, Heatmap & Insights (`src/components/AnalyticsView.tsx` & `src/components/TaskAnalyticsSection.tsx`)
- **Year Selector**: Switch between calendar years (`currentYear - 1`, `currentYear`, `currentYear + 1`).
- **Interactive Task List & Deep-Dive Selector**:
  - Displays the full list of active habits with category emojis, task names, and live streak badges.
  - Search filter bar to quickly locate specific tasks.
  - "All Tasks (Overview)" button to inspect aggregate performance or select any individual task.
- **Timeframe Scope Switcher (Overall vs. Month-by-Month)**:
  - `Overall (Full Year)`: Annual perspective encompassing all 12 months.
  - `Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`: Month-specific deep-dive with current month visual indicator.
- **Dedicated Task Heatmap**:
  - **Overall Scope**: 52-week contribution matrix specifically colored for the chosen task (Completed, Missed, Rest/Not Scheduled) or all tasks with 5 intensity levels.
  - **Monthly Scope**: Day-by-day calendar grid (Sun–Sat) showing individual day status with checkmarks, missed alerts, or rest day indicators.
  - **Interactive Day Tooltip**: Hovering over any date displays date, day of week, completion ratio, and status.
- **Dedicated Task Graph View**:
  - **Overall Scope**: 12-month completion rate curve (%) and monthly volume bars with an 80% consistency benchmark target line.
  - **Monthly Scope**: Day-by-day completion bars and running cumulative velocity curve tracking checks over the course of the month.
- **Display Modes**: Instant toggle between `Both Views`, `Heatmap Only`, and `Graph Only`.
- **Habit Performance Comparison Table**: Sortable side-by-side table comparing completion %, current streak, best streak, and total logged checks. Clicking any habit row instantly selects and scrolls to that task's dedicated heatmap and graph view.
- **Rule-Based Behavioral Insights**: Mathematical pattern detection identifying strongest weekday, opportunity day, peak month, and weekly drop-offs.

---

### 8. Review & Reflect (`src/components/ReviewView.tsx` & `src/components/WeeklyPlanningCard.tsx`)
- **Weekly Planning Card**: Set 1 primary milestone and 3 non-negotiables for Weeks 1 to 5.
- **Weekly Review Cards**: 3 structured prompts (*🌿 What went well?*, *🔍 What can improve?*, *🎯 Main focus for next week*).
- **Weekly Mood Insight Banner**: Real-time average mood emoji and star energy level for the selected week.
- **Monthly Reflection Journal**: High-level synthesis capturing monthly achievements, obstacles, and next month's primary focus.
- **Monthly Mood Highlights**: Top recorded mood and monthly average energy level banner.

---

### 9. Dedicated Mood Tracker (`src/components/mood/MoodTrackerSection.tsx`)
A completely separate, dedicated emotional wellness system backed directly by the `public.mood_tracker` Supabase table:
- **Separation of Concerns**:
  - Operates exclusively on `public.mood_tracker` without touching or modifying `public.daily_journal`.
  - Preserves full habit functionality and existing PIN protection system.
- **6 Standard Mood Scales**:
  - `😞 Very Low` (value: `very_low`, score: 1)
  - `😕 Low` (value: `low`, score: 2)
  - `😐 Okay` (value: `okay`, score: 3)
  - `🙂 Good` (value: `good`, score: 4)
  - `😄 Great` (value: `great`, score: 5)
  - `🤩 Excellent` (value: `excellent`, score: 6)
- **Energy Level Rating**: 1 to 5 Stars (`⭐` Drained to `⭐⭐⭐⭐⭐` Peak).
- **Core Modules**:
  1. **Header & Monthly Filter Bar (`MoodTrackerSection.tsx`)**:
     - Embedded `<` `"This mon"` `>` monthly filter control in the main section header.
     - Quickly steps through months with `<` (previous) and `>` (next) buttons, showing `"This mon"` for the current month or the month abbreviation for past/future months, with 1-tap reset.
  2. **Today's Mood Check-in Card (`TodayMoodCard.tsx`)**:
     - **Interactive Date Selection & Day Stepping**:
       - Clickable date badge with embedded native date picker allowing selection of any past date.
       - Quick day navigation buttons `<` (previous day) and `>` (next day), with an instant "Today" reset pill.
       - Automatically loads and reflects previously saved mood check-ins for the chosen date, switching seamlessly between logging new entries and updating existing records.
     - Large interactive mood selector buttons (6 tiers), 1–5 star energy vitality selector, and personal reflection note textarea.
     - Single-record enforcement per day (never creates duplicate records for the same date).
     - Live state display showing logged mood summary, score, and dynamic save/update triggers.
  3. **Mood History (`MoodHistoryView.tsx`)**:
     - Reverse-chronological timeline of daily check-ins.
     - Displays formatted date, mood emoji, score (e.g., `5/6`), energy stars, and reflection notes.
     - Interactive search by note content or date, plus category filtering and date sorting.
     - Password-protected Edit and Delete action buttons.
  4. **Mood Calendar (`MoodCalendarView.tsx`)**:
     - Embedded directly on the primary check-in page right beneath `TodayMoodCard` for instant monthly visibility without leaving the check-in view.
     - Also available as a standalone sub-tab in the Mood Tracker section and accessible from the main Calendar view.
     - Interactive monthly grid with previous/next/today navigation.
     - Displays mood emojis on each logged day with energy badges.
     - Clicking any date opens a detailed inspector modal with date, mood, energy, note, and Edit/Delete controls.
     - Public viewing without password; modifications require unlocking editing with `APP_EDIT_PASSWORD`.
  5. **Mood Analytics (`MoodAnalyticsView.tsx`)**:
     - **Mood Trend Line Chart**: Chronological score progression from 1 (Very Low) to 6 (Excellent).
     - **Energy Trend Line Chart**: Vitality progression from 1 to 5 stars.
     - **Mood Distribution Bar Chart**: Accurate day counts and percentage breakdowns across all 6 mood tiers.
     - **Date Range Filters & Controls**:
       - Integrated `"<" "This mon" ">"` monthly filter pill control (Default preset) allowing seamless month stepping directly from the range selector bar.
       - `Custom Range` selector with `From:` and `To:` date pickers.
       - Quick time horizon presets: `7 Days`, `30 Days`, `90 Days`, and `All Time`.
   6. **Edit & Delete Modals (`EditMoodModal.tsx`, `DeleteMoodModal.tsx`)**:
      - Secure dialogs requiring `APP_EDIT_PASSWORD` to safeguard personal reflections while keeping visual viewing public.
- **Today Dashboard Integration (`src/components/CompactMoodWidget.tsx`)**:
   - Embedded in `TodayFocus.tsx` displaying today's logged mood and energy, or a welcoming "How are you feeling today?" prompt with a 1-tap "Add Mood" button.

---

### 10. Preferences & Settings (`src/components/SettingsView.tsx`)
- **Appearance & Theme System**:
  - Interactive selection between **Light Mode** (warm paper daylight palette), **Dark Mode** (deep slate eye-safe night theme), and **System Auto** (synchronizes seamlessly with OS preferences via matchMedia).
  - Instant live theme switching without page reloads, paired with persistent local caching and cloud sync.
- **Display & Scheduling Preferences**: Week start day (`Sunday` vs `Monday`), default startup view (`Today`, `Grid`, `Calendar`, `Analytics`, `Review`, `Mood`, `Goals`).
- **Security & Edit Access**: Protected editing gate authenticated against `APP_EDIT_PASSWORD` with support for public view-only browsing and manual session lock.
- **Database Status**: Real-time Supabase connection and schema verification.
- **Two-Way Backups**: Export CSV / JSON and import JSON backups with smart merge or overwrite options.
- **Archived Habits Management**: Restore archived habits back to active status or permanently delete.

---

## 🗄️ Database & Backend Architecture

The Express proxy backend (`server.ts`) handles API routes, validates UUIDs, and securely communicates with Supabase PostgreSQL:

### Database Resiliency & Schema Compatibility
The backend incorporates automated schema resilience (`resilientUpdate`, `resilientInsert`) that dynamically adapts to Supabase table column variants:
- **Dynamic Column Stripping**: Automatically prunes unmapped or unmigrated schema columns without failing requests.
- **Schedule Days Normalization**: Safely handles heterogeneous `schedule_days` array data formats (numeric weekday indices `0–6`, short strings, full weekday strings, or custom formats) in consistency streak and habit schedule calculations without type errors.
- **Streak Calculation Resiliency**: The `GET /api/streak` endpoint encapsulates computation in isolated error guards, falling back safely to valid zero-state metrics if any parsing error occurs rather than failing requests.
- **Context-Aware API Error Messages**: Client-side network helpers accurately distinguish between read/connection checks and mutation saves, providing clear diagnostic feedback.
- **Upsert Fallbacks**: Automatically creates local-to-remote record bridges if an entity was initiated prior to cloud synchronization.
- **Bi-Directional Local Sync**: In-memory and Supabase caches are synchronized seamlessly on every mutation for immediate response times and uninterrupted operation.

### Database Tables
1. `habits`: Primary habit records with category, frequency, schedule_days, priority, goal_id, status, and timestamps.
2. `habit_entries`: Daily completion records with habit UUID and date string (`YYYY-MM-DD`). Unique constraint: `habit_id + date`.
3. `reflections`: Monthly reflective journals. Unique constraint: `month + year`.
4. `weekly_reviews`: Weekly review prompt logs. Unique constraint: `year + month + week_number`.
5. `weekly_plans`: Weekly planning milestone and top 3 priorities. Unique constraint: `year + month + week_number`.
6. `goals`: Long-term targets with target dates, status, and progress metrics.
7. `daily_journal`: Daily reflections. Unique constraint: `date`.
8. `mood_tracker`: Dedicated mood and energy logs (`id`, `date`, `mood`, `mood_score`, `energy_level`, `note`, `created_at`, `updated_at`). Unique constraint: `date`.
9. `affirmations`: Daily motivational quotes and vision board items.
10. `settings`: User preferences (theme, week start, auto-lock timer, default view). Unique constraint: `setting_key`.
11. `habit_categories`: Metadata and visual identifiers for habit categories.

### API Endpoints
- `GET /api/status`: Health check and database connectivity info.
- `POST /api/auth/verify-password`: Password verification against `process.env.APP_EDIT_PASSWORD` returning an edit session token (`token`, `expiresIn`, 15-minute sliding session window).
- `POST /api/auth/lock`: Revokes active edit session token and re-locks editing.
- `GET /api/moods` & `POST /api/moods`: Dedicated `public.mood_tracker` endpoints with strict date validation (YYYY-MM-DD), unique daily record enforcement (auto-updates existing entry on duplicate date), and protected write access.
- `PUT /api/moods/:id` & `DELETE /api/moods/:id`: Update and delete individual mood entries (protected by edit session token).
- `GET /api/habits` & `POST /api/habits`: Fetch and create habits.
- `PUT /api/habits/:id` & `DELETE /api/habits/:id`: Update, pause, archive, and delete habits.
- `GET /api/goals` & `POST /api/goals` & `PUT /api/goals/:id` & `DELETE /api/goals/:id`: Goal CRUD endpoints.
- `GET /api/journal` & `POST /api/journal`: Daily mood and journal reflections endpoint with schema matching and automated fallback.
- `GET /api/weekly-plans` & `POST /api/weekly-plans`: Weekly planning endpoints.
- `GET /api/habit-entries` & `POST /api/habit-entries/toggle`: Create or toggle a habit check entry.
- `GET /api/reflections` & `POST /api/reflections`: Fetch and save monthly reflections.
- `GET /api/weekly-reviews` & `POST /api/weekly-reviews`: Fetch and save weekly reviews.
- `GET /api/affirmation` & `POST /api/affirmation`: Fetch and save affirmations.
- `GET /api/settings` & `POST /api/settings`: Fetch and save user settings.
- `GET /api/streak`: Calculates current streak, best streak, and per-habit streak metrics.
- `GET /api/export`: Generates downloadable CSV spreadsheet or complete JSON backup.
- `POST /api/import`: Restores data from JSON with merge or replace strategy (protected by edit session token).

---

## ⚙️ Cloud Database & Multi-User Architecture

### Active Cloud Database
- **Provider**: **Supabase (PostgreSQL Cloud)**
- **Project URL**: `https://xhkomruflzquyunhajpo.supabase.co`
- **Project Reference ID**: `xhkomruflzquyunhajpo`
- **Tables Synchronized**:
  - `habits`: Habit definitions, frequencies, targets, categories, and status (`active`, `paused`, `archived`)
  - `habit_entries`: Daily completion logs and streak checkpoints
  - `mood_tracker` / `moods`: Mood ratings (1–6), energy levels, and daily notes
  - `daily_journal`: Journal entries, daily wins, and reflections
  - `goals`: Long-term quarterly/annual vision goals and progress meters
  - `weekly_plans`: Weekly priorities, main goals, and target percentages
  - `weekly_reviews`: End-of-week reflection logs (went well, improvements, focus)
  - `reflections`: Monthly retrospective reviews
  - `settings`: Global application settings and preferences

### Universal Multi-User Synchronization
- **Centralized Server-Side Gateway**: All clients connect through the Express backend proxy (`server.ts`) running on port 3000.
- **Identical Database for All Users**: The Supabase credentials (`SUPABASE_URL` and `SUPABASE_ANON_KEY`) are maintained securely on the server. Because all client requests route through `/api/*`, **every user, device, browser tab, or shared link visitor is linked to the exact same Supabase cloud database**.
- **Real-Time Consistency**: When any user adds a habit, checks off a routine, or writes a reflection, the change is written directly to the central `xhkomruflzquyunhajpo` Supabase instance and is immediately accessible across all devices.

---

## ⚙️ Environment Variables

The project has this default cloud database embedded out of the box for all users:

```env
# Default Embedded Supabase Cloud Project (active for all users & sessions)
SUPABASE_URL="https://xhkomruflzquyunhajpo.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_E44ScvoJpk-PMZS3Oqp8ZA_8EjrqBNP"

# Single source of truth password for edit protection
APP_EDIT_PASSWORD="your-edit-password"
```

*Note: You can still override these at any time by configuring custom `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the environment settings.*

---

## 🛠️ Build & Development Commands

- `npm run dev`: Starts the TypeScript Express backend + Vite dev server on port 3000.
- `npm run build`: Compiles Vite static assets and bundles `server.ts` into `dist/server.cjs` via `esbuild`.
- `npm run start`: Runs the compiled CommonJS server (`node dist/server.cjs`).
- `npm run lint`: Runs TypeScript and ESLint validation.
