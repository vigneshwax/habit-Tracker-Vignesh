# Vignesh Habit Tracker (Version 3.0 — Personal Growth OS)

A minimalist, high-craft personal Habit Tracker and Life Management System built with **React**, **TypeScript**, **Tailwind CSS**, and **Express**, featuring two-way live cloud synchronization powered by **Google Sheets** and high-speed persistent local disk storage.

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

### 1. Primary Google Sheets Cloud Database & Persistent Local Storage Architecture
- **Primary Cloud Database: Google Sheets Live Two-Way Sync**:
  - Google Sheets is the primary cloud database engine for the application, with complete two-way live synchronization (push and pull) using Google Apps Script Web App.
  - Full relational parity across all 11 database tables (`habits`, `habit_entries`, `reflections`, `mood_tracker`, `goals`, `daily_journal`, `weekly_reviews`, `weekly_plans`, `affirmations`, `habit_categories`, `settings`).
  - Auto-Push reflects every change made anywhere on the website into Google Sheets in real time.
  - Auto-Reflect polls Google Sheets and pulls updates on browser tab focus.
- **Persistent Local Disk Engine**:
  - The Express backend permanently persists all records directly to `data/db.json` on disk on every create, edit, toggle, update, and delete action.
  - Instantaneous, sub-millisecond local reads and writes with zero external database latency, zero connection drops, and zero cold-start timeouts.
- **Single Source of Truth Password Gate (9500)**:
  - **Instant Entry & Tab-Switch Protection**: Accessing the tracker requires master password `9500`. Whenever you refresh the page, open a new session, or navigate to another browser tab and return, the app immediately re-locks and prompts for password `9500` to prevent unauthorized viewing or tampering.
  - **Single Accepted Password**: Only `9500` is accepted for unlocking the website. All previous PINs (such as 321 or 0321) are removed.
  - **Application Code Verification**: Authentication is verified directly in application code (`9500`) across both client and server.
  - **Inactivity Timeout**: For additional security while remaining on the active page, the session automatically locks after 15 minutes of inactivity (`15 * 60 * 1000`).
  - **Protected Editing & Mutations**: All create, edit, update, toggle, and delete mutations on tracker data (habits, logs, goals, journal, mood, reviews) require this verified session with password `9500`.
- **Elimination of "Unable to Save" False Errors & Multi-Attempt Network Resilience**:
  - Replaced generic connection error masks with accurate, transparent status reporting and reliable network resilience.
  - Automatic exponential backoff retry for momentary network drops, browser reconnection delays, or server warmup/cold-start periods (HTTP 502/503/504), preventing temporary glitches from showing frightening error messages.
  - Non-sticky error banners: Transitory warning banners automatically dismiss after 5 seconds and clear immediately upon any successful cloud sync, avoiding persistent red alert boxes.
  - Validates and preserves native UUID primary keys for all relational database tables, preventing ID mismatch errors during updates and deletions.
- **On-Demand Lock / Unlock Toggle**:
  - Users can lock editing at any time by clicking the Lock/Unlock icon (`#header-view-only-indicator` / `#header-edit-unlocked-indicator`) in the header.
  - Entering the edit password `9500` unlocks editing capabilities again.
  - **Visual Feedback & Input**: Clean, auto-fit password verification modal with dynamic viewport containment (`max-h-[min(94dvh,560px)]`, `max-w-[330px] sm:max-w-[360px]`), auto-scaling keypad and PIN slots that fit comfortably on all mobile, tablet, and desktop screens without clipping, toggleable visibility, visual indicators, physical keyboard typing (numbers, characters, Backspace, Delete, Escape, Enter), and touch keypad support.

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
  - **Desktop/Laptop Screens (`lg:` and up)**: 9 equal-width tab buttons spanning the full container width in a single seamless row (`Today`, `My Journal`, `Vision & Goals`, `Grid View`, `Calendar`, `Analytics & Trends`, `Review & Reflect`, `Mood Tracker`, and `Settings`).
  - **Mobile/Tablet Screens (`< lg`)**: Balanced 3-column / 5-column responsive grid (3 rows of 3 buttons on mobile) with centered, non-wrapping labels that fit 100% of the screen width.
  - **Smooth Hover & Touch Transitions**: Features hardware-accelerated transform scaling, tactile active press state (`active:scale-[0.96]`), glowing emerald active pill indicators, gentle 200ms background and border fades, micro-elevation shadow shifts, and synchronized icon scaling (`group-hover:scale-110`) for immediate, tactile feedback.
- **Live Background Sync Indicator & Non-Blocking Web View**:
  - The web view renders immediately upon page load with zero full-screen blocking spinners, allowing immediate inspection and interaction.
  - While data syncs in the background, a live animated indicator (`Syncing in background...`) runs smoothly inside the header (`#database-syncing-indicator`), transitioning seamlessly to `Sheet Synced ✓` / `Google Sheet` or `Saved ✓` once synchronization finishes.
  - Visual indicators for `Saving...`, `Sheet Synced ✓`, `Google Sheet`, or `Persistent Storage`.
- **Settings & Data Management**: Full data export (CSV Spreadsheet, Relational Excel, and complete JSON backup), database configuration, and security options are hosted within the Settings tab (`src/components/SettingsView.tsx`).

---

### 3. Personal Journal & Knowledge Management System (`src/components/JournalView.tsx` & `src/components/journal/*`)
- **Top-Level Navigation Tab**: Dedicated **My Journal** view accessible directly from the primary header navigation (`activeTab === 'journal'`).
- **Obsidian-Inspired Digital Second Brain**:
  Upgraded from a basic journal into a premium, minimalist personal knowledge management and journaling platform inspired by **Obsidian** and **Notion**:

  1. **Second Brain Dashboard (`src/components/journal/JournalDashboard.tsx`)**:
     - **Greeting & Live Context**: Date formatted in elegant serif typography with quick-actions toolbar (`Today's Journal`, `+ New Note`, `Knowledge Graph`).
     - **Daily Writing Streak**: Real-time streak tracking consecutive days of journaling, calculated dynamically from database records.
     - **Knowledge Metrics Grid**: Displays total journal entries, total knowledge notes, and total active graph connections (`edges`).
     - **Today's Journal Entry Widget**: 1-click preview of today's reflections, logged mood emoji, energy ratings, and highlights.
     - **Habit Completion Integration**: Live habit completion summary for today displaying percentage and progress bar without separate tracking systems.
     - **Weekly Journaling Heatstrip**: 7-day sparkline indicating days with journal entries and word counts.
     - **Pinned & Favorite Notes**: Instant access cards to key knowledge notes.
     - **Recently Updated Notes**: Live list of recently modified knowledge documents.

  2. **Daily Journaling Module (`src/components/journal/DailyJournalModule.tsx`)**:
     - **Date Ribbon Navigation**: Day-by-day navigation (`< Previous`, `Date Picker`, `Next >`, `Jump to Today`).
     - **Rich Markdown Editor**: Write free-flowing thoughts with support for headers, lists, code, quotes, and Obsidian wikilinks.
     - **Autosave Status Indicator**: Real-time feedback (`Saving...`, `Saved`, `Draft`, `Error`) with debounced auto-persisting.
     - **Draft Recovery Protection**: Automatically preserves uncommitted drafts in `localStorage` across refreshes or navigation changes.
     - **Handcrafted Journal Templates**: 1-click starter templates:
       - *🌅 Daily Reflection* (Wins, Insights, Improvements)
       - *☀️ Morning Priming* (Top 3 Outcomes, Anchor Affirmation, Energy Ritual)
       - *🌱 Gratitude Journal* (3 specific appreciations and why they matter)
       - *🌙 Evening Review* (Physical/mental scorecard and tomorrow's priorities)
       - *📖 Free-Writing (Zen Mode)* (Clean, distraction-free canvas)
     - **Integrated Daily Metrics**:
       - Daily Mood logger (1–6 rating matching app mood tracker).
       - Energy Level rating (1–5).
       - Productivity rating (1–5).
       - Today's Highlights & Wins input.
       - Gratitude & Appreciation input.
       - Challenges & Lessons Learned input.
       - Tomorrow's Priorities checklist.
     - **Distraction-Free Zen Writing Mode**: Full-screen modal overlay toggleable with `Esc` for deep focus writing.

  3. **Obsidian-Style Linked Notes & Editor (`src/components/journal/NoteEditor.tsx`)**:
     - **Bi-Directional Wiki Syntax (`[[Note Title]]`)**:
       - Automatically detects `[[Note Title]]`, `[[Note Title|Alias]]`, `[[Note Title#Heading]]`, and `[[Note Title#Heading|Alias]]` links in note content.
       - **Live Autocomplete Dropdown**: Typing `[[` immediately opens a responsive suggestions dropdown displaying matching notes with category badges, folders, and tags.
       - **Full Keyboard Navigation**: Navigate suggestions with `ArrowUp` and `ArrowDown`, press `Enter` or `Tab` to insert, and press `Escape` to dismiss.
       - **On-The-Fly Note Creation**: If the entered note title doesn't exist, the dropdown offers a `+ Create [[title]]` option right from the keyboard.
       - **Visual Distinction for Broken Links**: Notes that do not exist yet in the system are rendered in preview mode with an eye-catching amber/rose dashed indicator and a `new` badge, clearly identifying broken links without crashing.
       - **Zero Page-Reload Navigation**: Clicking any internal link opens the target note smoothly inside the single-page application without reloading the page.
       - **Heading Anchors**: Links to specific headings (`[[Note#Heading]]`) jump directly to the target anchor section in the rendered note.
     - **Automatic Backlinks Engine**: Inspects all notes and daily journal entries to compute live bi-directional backlinks with context snippets.
     - **Outgoing Links Panel**: Lists all notes referenced by the current document.
     - **Related Knowledge Recommendations**: Analyzes shared `#tags` to surface relevant notes.
     - **Cascade Note Renaming**: Renaming a note triggers an automated cascade that updates all occurrences of `[[Old Title]]`, `[[Old Title|Alias]]`, and `[[Old Title#Heading]]` to `[[New Title]]` across all notes and daily journal entries.
     - **Live Split-View & Markdown Toolbar**: Seamlessly toggle between raw editing, split-screen with live preview, and reading view.
     - **Note Metadata**: Category dropdown, `#tag` manager with autocomplete, accent color picker, reading time and word count statistics.

  4. **Markdown Table Support & Interactive Table Editor (`src/components/journal/TableEditorModal.tsx` & `MarkdownRenderer.tsx`)**:
     - **Native Markdown Table Syntax**: Full support for standard Markdown table syntax (`| Col 1 | Col 2 |` followed by delimiter row `|:---|:---:|---:|`).
     - **Full Column Alignment**: Supports left (`:---`), center (`:---:`), and right (`---:`) alignments for each column.
     - **Interactive Table Editor Modal**: Dedicated visual table designer featuring:
       - Interactive editable grid with keyboard navigation.
       - Add / remove rows and columns dynamically.
       - Per-column alignment toggle buttons (Left, Center, Right).
       - Preset templates: *Employee Directory* (from prompt: Employee, Department, Status), *Weekly Habit Matrix*, *Project Milestones*, and *Pros & Cons*.
       - Real-time Markdown syntax preview with 1-click clipboard copy.
     - **Excel & Google Sheets Direct Paste**:
       - Copy tabular cells from Excel or Google Sheets (Ctrl+C / Cmd+C) and paste either directly into the note editor or into the Table Editor paste import tab.
       - Automatically detects tab-delimited (TSV) clipboard rows and columns and converts them into pristine Markdown tables.
     - **Responsive Mobile & Tablet Viewport**: Table containers feature styled scroll wrappers (`overflow-x-auto`) with subtle borders, alternating row hover colors, and sticky headers so tables never break mobile or tablet layouts.
     - **Table Insertion in Daily Journal**: Available in both Knowledge Notes and the Daily Journal module.

  5. **Interactive Knowledge Graph (`src/components/journal/KnowledgeGraph.tsx`)**:
     - **Interactive Physics Engine**: SVG canvas layout with force simulation, repulsion, and edge springs.
     - **Visual Node Distinction**: Category-based node coloring (`Daily Journal`, `Learning`, `Ideas`, `Projects`, `Books`, `Goals`, `Personal`).
     - **Node Dragging & Repositioning**: Click and drag nodes with real-time physics settling.
     - **Pan & Zoom Controls**: Zoom in/out buttons, mouse drag panning, and reset view button.
     - **Interactive Inspection**: Hovering on a node reveals a glassmorphic tooltip with title, category, tags, and connection count.
     - **1-Click Open**: Clicking a node immediately opens the corresponding note in the editor.
     - **Connection Highlighting**: Selecting a node highlights its direct 1-hop connections and dims unrelated nodes.
     - **Graph Filtering**: Search bar to highlight notes, plus category and tag filter dropdowns.

  6. **Notes Explorer & Workspace (`src/components/journal/NotesExplorer.tsx`)**:
     - **Folder Tree & Categories**: Filter notes by `All Notes`, `Favorites`, `Pinned`, `Archived`, or specific categories (`Daily Journal`, `Learning`, `Ideas`, `Projects`, `Books`, `Personal`, `Career`, `Goals`, `Checklists`, `Meeting Notes`, `References`).
     - **Tags Browser**: Real-time list of all `#tags` across notes with live note counts.
     - **Search & Sort**: Instant filtering across titles, content, and tags; sorting by recently modified, creation date, and A–Z.
     - **Layout Toggle**: Seamless switch between responsive Grid Cards and high-density List View.
     - **Note Operations**: Create, duplicate, pin/unpin, favorite, archive/unarchive, and delete with confirmation dialog.

  7. **Global Search & Command Palette (`src/components/journal/CommandPalette.tsx`)**:
     - **Global Shortcut**: Press `Ctrl+K` or `Cmd+K` anywhere in the app to open the floating command palette.
     - **Multi-Entity Search**: Instant fuzzy search across note titles, body text, tags, and journal dates with matching excerpts.
     - **Quick Command Actions**: 1-press shortcuts to create notes, jump to today's journal, or switch to the graph view.
     - **Full Keyboard Navigation**: Navigate results with Up/Down arrow keys, Enter to open, and Escape to close.

  8. **Structured Personal Knowledge Templates (`src/components/journal/TemplateModal.tsx`)**:
     - Pre-configured templates with standard Obsidian headings, wikilinks, and metadata tags:
       - *Personal Goals 2026* (Strategic vision, habit anchors, milestone dimensions)
       - *Career Development Blueprint* (Competencies, timeline, initiatives)
       - *Learning & Technology Deep-Dive* (Principles, code snippets, mental models)
       - *Book Notes & Synthesis* (Big ideas, favorite quotes, behavioral shifts)
       - *Breakthrough Ideas & Innovations* (Core problem, unique mechanism, MVE)
       - *Project Architecture & Specs* (Objectives, checklists, stack blueprints)
       - *Meeting Notes* (Agenda, decisions, action item owners)
       - *HR Management & Team Directory* (Employee status table, recruitment, payroll, employee relations)

  9. **Backend Persistence & API Endpoints (`server.ts`)**:
     - `GET /api/notes`: Lists notes with optional query filters (`search`, `category`, `tag`, `archived`).
     - `POST /api/notes`: Creates note with unique UUID, created/updated timestamps, and tags.
     - `PUT /api/notes/:id`: Updates note fields and persists to disk.
     - `DELETE /api/notes/:id`: Permanently removes note with disk sync.
     - `POST /api/notes/:id/duplicate`: Clones note with `(Copy)` suffix.
     - `PATCH /api/notes/rename`: Cascades note title change across all internal `[[wikilinks]]`.
     - `POST /api/journal`: Saves extended daily journal records (`id`, `title`, `highlights`, `gratitude`, `wins`, `challenges`, `priorities`, `mood`, `energy_level`, `productivity`, `tags`, `linked_notes`).
     - `DELETE /api/journal/:id`: Removes journal entry by ID or date.
     - Integrated with atomic disk persistence (`data/db.json`), Excel export, and offline-first LocalStorage fallback.

---

### 4. Tasks Management & Comprehensive Data Persistence Architecture
- **Dedicated Top-Level Navigation Tab**: Primary **Tasks** view accessible directly from the header (`activeTab === 'tasks'`).
- **Triple-View Workflow Engine**:
  1. **Table View (`src/components/TasksTableView.tsx`)**:
     - High-density tabular layout with search filter across task titles and descriptions.
     - Category filters (`Recruitment`, `Payroll`, `Employee Relations`, `Training & Dev`, `Compliance`, `Operations`, `Performance`, `General`).
     - Priority filtering (`High`, `Medium`, `Low`) and Status filtering (`Pending`, `In Progress`, `Completed`, `Deferred`).
     - Interactive column sorting by Date, Priority, Status, and Title.
     - Quick 1-click status toggle, inline edit modal launcher, and delete action guarded by password verification (`9500`).
  2. **Kanban Board View (`src/components/KanbanBoardView.tsx`)**:
     - Visual 3-column board: `Pending`, `In Progress`, and `Completed`.
     - 1-click column transition buttons (`ArrowLeft` / `ArrowRight`) to advance or rewind task status with immediate auto-save.
     - Priority badges, assignee tags, and due date indicators with past-due color coding.
  3. **Tasks Calendar View (`src/components/CalendarTasksView.tsx`)**:
     - Monthly grid mapping tasks to their scheduled dates.
     - 1-click day selection to filter tasks scheduled for any chosen day.
     - Quick `+` button on any day cell to create a new task pre-filled with that specific date.
- **Interactive Task Modal (`src/components/TaskModal.tsx`)**:
  - Modal designer to create or edit tasks with Title, Date, Time, Category, Priority, Status, Assignee, Description, Notes, and Follow-up Date.
  - Full preservation of UUIDs, timestamps (`created_at`, `updated_at`), and status flags.
- **End-to-End Data Persistence Pipeline (Tasks & Journal)**:
  - **Client-to-Server Real-Time Flow**: UI edits update React state, commit to `localStorageService`, and invoke `api.ts` REST endpoints.
  - **Atomic Disk Storage**: `server.ts` guarantees writes to `data/db.json` on disk with backup safeguards, preventing data loss on page refresh or browser restart.
  - **Two-Way Live Cloud Sync**: Tasks and journals are incorporated into the central schema (`src/utils/dataSchema.ts`), Google Sheets auto-push payload (`fullExportData`), and Google Sheets auto-reflect poll.
  - **Relational Excel Backup**: Multi-sheet export and import (`src/utils/excel.ts`) incorporates complete `tasks` and `daily_journal` sheets with schema validation.
- **Root Causes Fixed**:
  - **Tasks Loss on Refresh/Sync**: Resolved missing backend `/api/tasks` endpoints, missing `tasks` collection in `server.ts`, and lack of task sync in `fullExportData`.
  - **Journal Field Truncation**: Resolved stripping of `id`, `title`, and multiline/Unicode characters in `api.saveJournal` and `POST /api/journal`.
  - **Entity Boundary Separation**: Enforced distinct schemas and storage keys for Daily Journal (`daily_journal`), Notes/Knowledge Graph (`notes`), Keep Notes, and Monthly Reflections (`reflections`).
- **Automated Test Suite (`npm test`)**:
  - `test/tasksAndJournal.test.ts`: 10 automated test cases verifying task creation, editing, completion toggling, deletion, date isolation, journal multiline text, Unicode characters (emojis, Tamil, Japanese, accents), wiki-link extraction, tag parsing, and entity separation.
  - `test/excel.test.ts`: 10 test cases verifying relational multi-table Excel import/export integrity.
  - `test/googleSheets.test.ts`: 7 test cases verifying two-way live Google Sheets parity and schema validations.
  - **Overall Test Results**: 27 tests passing, 0 failing, 0 TypeScript lint errors (`tsc --noEmit`).

---

### 4. Today's Focus Dashboard (`src/components/TodayFocus.tsx`, `src/components/DashboardScoreCard.tsx` & `src/components/TodaySparklineCard.tsx`)
- **Interactive Card Hover Dynamics**:
  - All primary dashboard cards (Dashboard Score Card, 7-Day Sparkline Card, Action Checklist Card, Compact Mood Widget, My Journal Card, and individual habit action cards) feature hardware-accelerated subtle scaling (`hover:scale-[1.008]` / `hover:scale-[1.015]`), elevation shadow intensity increases (`hover:shadow-md`), and edge border highlight transitions for immediate tactile feedback.
- **Dashboard Score Card**: Displays your 0–100 daily score, current streak, best streak, 7-day velocity, and early warning for at-risk habits.
- **7-Day Habit Completion Sparkline (`src/components/TodaySparklineCard.tsx`)**:
  - Displays a responsive, sleek sparkline area chart built with **recharts** tracking total completed habits over the last 7 consecutive days (Day -6 through Today).
  - Features smooth gradient shading, custom date tooltips, interactive data points highlighting Today and peak completion days.
  - Displays aggregate metrics including 7-day total completed habits, daily average completion rate (`x.x/day`), day-over-day difference compared to yesterday, and a 7-day pill strip breaking down completions per day.
- **Action Checklist**: Daily routines scheduled for today with priority badges, risk indicators, week-over-week trends, and tactile completion checkmarks.
- **Compact Daily Mood Widget**: Quick 1-tap mood and energy logger embedded directly into the daily dashboard with a shortcut to the full Mood Tracker view.
- **My Journal Card**: Inline access to create, browse, and check off journal entries with a direct "Full Journal" link to the dedicated tab.

---

### 5. Vision & Goals View (`src/components/GoalsView.tsx`)
- Dedicated workspace to manage quarterly and yearly targets with category classification, target dates, and progress meters.
- Real-time progress tracker automatically factoring linked habit completion rates with quick adjust buttons (25%, 50%, 75%, 100%).
- Add and link habits directly to specific goals.
- **Robust Vision Goal Deletion**:
  - **In-App Delete Confirmation Modal**: Replaced browser popups with a modern, iframe-safe modal displaying the goal title and deletion confirmation.
  - **Linked Habits Safeguard**: Informs user about any linked habits and guarantees that daily habits and check-in history will remain active, intact, and safely unlinked.
  - **Dual Action Locations**: Delete directly from the goal card trash icon or from the "Delete Goal" button inside the Edit Goal modal.
  - **Foreign Key Safe Server Deletion (`DELETE /api/goals/:id`)**: Backend unlinks habits first in memory and storage (`habits.goal_id = null`) before removing the goal record, preventing constraint conflicts.
  - **Feedback & Notifications**: Instant state removal with smooth toast notification and error boundary handling.

---

### 6. Daily Habit Spreadsheet Grid (`src/components/DailyHabitGrid.tsx`)
- **Category Filter Pills**: Quick filters for `All`, `🏃 Health`, `💼 Career`, `📚 Learning`, `🧘 Personal`, `💰 Finance`.
- **Search Bar**: Real-time habit filtering by name.
- **Sticky Left Column**: Habit names and category tags remain pinned while scrolling horizontally through the month.
- **Non-Scheduled Day Visuals**: Habits scheduled for specific days show subtle inactive styling on non-scheduled dates.
- **Daily Completion Summary Row**: Calculates total completed habits and percentage for every column in the month.

---

### 7. Calendar View (`src/components/CalendarMonthView.tsx` & `src/components/mood/MoodCalendarView.tsx`)
- **Calendar Mode Switcher**:
  - `Habits Calendar`: Standard habit scheduling grid with completion ratios and day inspector.
  - `Mood Tracker Calendar`: Complete monthly emotional wellness calendar featuring daily mood emojis, energy ratings, and detail inspector dialog.
  - `Both Calendars`: Stacked side-by-side view enabling holistic tracking of both daily habit consistency and emotional well-being simultaneously.
- Configurable calendar grid layout (starting on Sunday or Monday based on Settings).
- Each date cell displays day number, completed checks fraction (`3/4`), and color-coded progress bar.
- **Day Inspector Drawer**: Clicking any date opens a side panel listing all scheduled habits for that specific day with instant toggle checkboxes.

---

### 8. Yearly Analytics, Heatmap & Insights (`src/components/AnalyticsView.tsx` & `src/components/TaskAnalyticsSection.tsx`)
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

### 9. Review & Reflect (`src/components/ReviewView.tsx` & `src/components/WeeklyPlanningCard.tsx`)
- **Weekly Planning Card**: Set 1 primary milestone and 3 non-negotiables for Weeks 1 to 5.
- **Weekly Review Cards**: 3 structured prompts (*🌿 What went well?*, *🔍 What can improve?*, *🎯 Main focus for next week*).
- **Weekly Mood Insight Banner**: Real-time average mood emoji and star energy level for the selected week.
- **Monthly Reflection Journal**: High-level synthesis capturing monthly achievements, obstacles, and next month's primary focus.
- **Monthly Mood Highlights**: Top recorded mood and monthly average energy level banner.

---

### 10. Dedicated Mood Tracker (`src/components/mood/MoodTrackerSection.tsx`)
A completely separate, dedicated emotional wellness system backed directly by the `mood_tracker` database table:
- **Separation of Concerns**:
  - Operates exclusively on `mood_tracker` without touching or modifying `daily_journal`.
  - Preserves full habit functionality and password protection system.
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
     - Public viewing without password; modifications require unlocking editing with password `9500`.
  5. **Mood Analytics (`MoodAnalyticsView.tsx`)**:
     - **Mood Trend Line Chart**: Chronological score progression from 1 (Very Low) to 6 (Excellent).
     - **Energy Trend Line Chart**: Vitality progression from 1 to 5 stars.
     - **Mood Distribution Bar Chart**: Accurate day counts and percentage breakdowns across all 6 mood tiers.
     - **Date Range Filters & Controls**:
       - Integrated `"<" "This mon" ">"` monthly filter pill control (Default preset) allowing seamless month stepping directly from the range selector bar.
       - `Custom Range` selector with `From:` and `To:` date pickers.
       - Quick time horizon presets: `7 Days`, `30 Days`, `90 Days`, and `All Time`.
   6. **Edit & Delete Modals (`EditMoodModal.tsx`, `DeleteMoodModal.tsx`)**:
      - Secure dialogs requiring edit password `9500` to safeguard personal reflections while keeping visual viewing public.
- **Today Dashboard Integration (`src/components/CompactMoodWidget.tsx`)**:
   - Embedded in `TodayFocus.tsx` displaying today's logged mood and energy, or a welcoming "How are you feeling today?" prompt with a 1-tap "Add Mood" button.

---

### 11. Preferences & Settings (`src/components/SettingsView.tsx`)
- **Appearance & Theme System**:
  - Interactive selection between **Light Mode** (warm paper daylight palette), **Dark Mode** (deep slate eye-safe night theme), and **System Auto** (synchronizes seamlessly with OS preferences via matchMedia).
  - Instant live theme switching without page reloads, paired with persistent local caching and cloud sync.
- **Display & Scheduling Preferences**: Week start day (`Sunday` vs `Monday`), default startup view (`Today`, `Grid`, `Calendar`, `Analytics`, `Review`, `Mood`, `Goals`).
- **Security & Edit Access**: Protected editing gate authenticated against edit password `9500` directly in code with support for public view-only browsing and manual session lock.
- **Database Status**: Real-time Google Sheet cloud sync and persistent local disk storage verification.
- **Comprehensive Relational Excel Suite (`src/components/ExcelExportModal.tsx`, `src/components/ExcelImportModal.tsx`, `src/utils/excel.ts`)**:
  - **Relational Database Workbook Architecture**: Redesigned so that every exported `.xlsx` workbook resembles a strict relational database schema matching the application state:
    1. **`README`**: Schema documentation worksheet containing table definitions, primary keys, foreign keys, record counts, supported formats, and import guidelines.
    2. **`habits`**: Core habit records (PK: `id`, FK: `goal_id -> goals.id`, `name`, `category`, `frequency`, `priority`, `target_count`, `schedule_days`, `status`, timestamps).
    3. **`habit_entries`**: Daily check-in completions (PK: `id`, FK: `habit_id -> habits.id`, `date` [YYYY-MM-DD], `completed` [TRUE/FALSE], timestamps).
    4. **`categories`**: Habit categories with visual emoji icons (PK: `id`, `name`, `icon`, timestamps).
    5. **`goals`**: Quarterly and annual vision goals (PK: `id`, `title`, `category`, `description`, `target_date`, `progress` [0-100], `status`, timestamps).
    6. **`mood_tracker`**: Daily emotional wellness logs (PK: `id`, `date` [YYYY-MM-DD], `mood`, `mood_score` [1-6], `energy_level` [1-5], `note`, timestamps).
    7. **`daily_journal`**: Micro-journaling reflections (PK: `id`, `date` [YYYY-MM-DD], `content`, `mood`, `energy_level`, timestamps).
    8. **`weekly_plans`**: Weekly milestones and top 3 priorities (PK: `id`, `year`, `month`, `week_number`, `main_goal`, `priority_1`, `priority_2`, `priority_3`, `target_percentage`, timestamps).
    9. **`weekly_reviews`**: End-of-week reflection retrospectives (PK: `id`, `year`, `month`, `week_number`, `went_well`, `improve`, `next_focus`, timestamps).
    10. **`monthly_reflections`**: Deep retrospective monthly reviews (PK: `id`, `year`, `month`, `content`, timestamps).
    11. **`settings`**: User configuration parameters and preferences (PK: `setting_key`, `setting_value`, `description`, `updated_at`).
- **Centralized Relational Schema & 100% Parity (`src/utils/dataSchema.ts`)**:
  - **Single Source of Truth (v3.0.0)**: Central schema definition governing both **Excel (.xlsx)** and **Google Sheets** import, export, synchronization, and validation.
  - **10 Logical Database Tables + README Sheet**:
    1. `README`: Complete schema metadata, table purposes, column definitions, primary keys, foreign keys, and synchronization guide.
    2. `habits`: Routines, categories, cadence, priorities, goal links, target counts, and status (`id`, `name`, `category`, `frequency`, `priority`, `goal_id`, `target_count`, `schedule_days`, `status`, `archived_at`, `created_at`, `updated_at`).
    3. `habit_entries`: Daily completion check-ins with foreign key to `habits.id` (`id`, `habit_id`, `date`, `completed`, `created_at`, `updated_at`).
    4. `categories`: Habit classifications with visual emoji icons (`id`, `name`, `icon`, `created_at`).
    5. `goals`: Vision milestones with progress percentages (`id`, `title`, `category`, `description`, `target_date`, `progress`, `status`, `created_at`, `updated_at`).
    6. `mood_tracker`: Emotional wellness logs and energy ratings (`id`, `date`, `mood`, `mood_score`, `energy_level`, `note`, `created_at`, `updated_at`).
    7. `daily_journal`: Micro-journaling notes per date (`id`, `date`, `content`, `mood`, `energy_level`, `created_at`, `updated_at`).
    8. `weekly_plans`: Sprint targets and top 3 priorities (`id`, `year`, `month`, `week_number`, `main_goal`, `priority_1`, `priority_2`, `priority_3`, `target_percentage`, `created_at`, `updated_at`).
    9. `weekly_reviews`: Retrospectives on wins, improvements, and focus (`id`, `year`, `month`, `week_number`, `went_well`, `improve`, `next_focus`, `created_at`, `updated_at`).
    10. `monthly_reflections`: Deep monthly retro summaries (`id`, `year`, `month`, `content`, `created_at`, `updated_at`).
    11. `settings`: Application configuration and preferences (`setting_key`, `setting_value`, `description`, `updated_at`).
  - **Relational Data Integrity Rules**:
    - **Header Row 1**: Strictly database column names matching schema with zero decorative or merged rows.
    - **Primary Key Preservation**: Stable UUIDs preserved during round-trip export and import without re-generating IDs.
    - **Foreign Key Integrity**: Automatic validation ensuring `habit_entries.habit_id` references valid habits and `habits.goal_id` references valid goals.
    - **Standardized Formats**: Dates formatted as `YYYY-MM-DD`, booleans as uppercase `TRUE`/`FALSE`, timestamps as ISO-8601 strings.
    - **Native Excel & Sheet Controls**: Row 1 freeze panes, navy blue header background (`#0F172A`), bold white text, and AutoFilter ranges enabled on all data tables.
  - **Dedicated Relational Export Dialog (`src/components/ExcelExportModal.tsx`)**:
    - **Export All Tables**: 1-click generation of the complete relational database backup.
    - **Custom Table Selection**: Choose specific tables (`habits`, `habit_entries`, `goals`, `mood_tracker`, etc.) with live record counters.
    - **Direct Download**: Client-side generation via SheetJS (`xlsx`) with fallback server streaming route.
  - **Advanced Relational Importer (`src/components/ExcelImportModal.tsx`)**:
    - **Schema & Foreign Key Validation**: Pre-validates required columns, duplicate primary keys, valid date formats, and foreign key references.
    - **Row-Level Diagnostics**: Displays row-by-row error and warning badges with precise row numbers and field names.
    - **Interactive Pre-Import Inspector**: Tabbed preview allowing inspection of parsed records per table before committing.
    - **3 Flexible Import Modes**:
      1. **Merge & Update (Recommended)**: Preserves existing data, inserts new records, and updates existing records by matching IDs.
      2. **Replace All**: Replaces application data with workbook records with high-visibility warning protection.
      3. **Import Selected Tables**: Checkbox selection of specific tables with dependency validation (e.g. alerts if child `habit_entries` are selected without parent `habits`).
    - **Protected Write Action**: Guarded by edit password `9500`.
  - **Automated Test Suite (`test/excel.test.ts`, `npm test`)**: 10 comprehensive tests covering workbook generation, round-trip serialization/deserialization, primary/foreign key preservation, duplicate ID rejection, invalid date detection, broken foreign key reporting, optional sheet omission, and empty workbook handling.
  - **1-Click Relational Template**: `vignesh_habit_tracker_relational_template.xlsx` download with sample linked rows and complete schema guide.
  - **CSV & JSON Portability**: Retains instant CSV spreadsheet downloads and complete JSON export/import.
- **Google Sheet Database Center (Two-Way Live Database via Apps Script)** (`src/components/GoogleSheetsSyncModal.tsx`, `src/utils/googleAppsScript.ts`):
  - **Two-Way Live Database**: Store and retrieve your habits, check-ins, mood tracker logs, vision goals, daily journal notes, reflections, affirmations, categories, settings, weekly plans, and weekly reviews directly using your Google Sheet as a live standalone database with zero OAuth complexity.
  - **100% Relational Parity with PostgreSQL & Excel**: Generates and parses the exact 11 relational tables (`affirmations`, `daily_journal`, `goals`, `habit_categories`, `habit_entries`, `habits`, `mood_tracker`, `reflections`, `settings`, `weekly_plans`, `weekly_reviews`) plus `README` data dictionary sheet with dark navy headers (`#0F172A`), bold white text, frozen row 1, auto-resized columns, and active filters.
  - **Standalone Operation**: Allows the application to work directly and solely with your Google Sheet as the primary database storage layer.
  - **Non-Blocking Background Database Sync & Header Indicator**:
    - Initial and monthly database synchronizations run completely in the background without stopping, freezing, or blocking the web view.
    - An unobtrusive animated background indicator (`Syncing with database...` with `RefreshCw` spin) displays directly in the top header action area (`div#root > div > header > div > div > div:nth-of-type(2)` on desktop and mobile action bar), while all tabs, habit checks, and features remain instantly interactive with local/cached fallback data.
    - Defensive null-safety and error guards prevent unhandled promise rejections or disruptive error alerts during background synchronization.
  - **4-Tab Control Interface**:
    1. **Sync & Actions**:
       - Connection Status card: Status indicator (Connected / Disconnected), schema version badge (`v3.0.0 Relational Engine`), 1-click **Demo Cloud Sheet** loader, `sheets.new` quick-launcher, and Disconnect option.
       - Web App URL input with test connection diagnostics.
       - Top status indicators (`✓ Auto-download on refresh: ON/OFF · Auto-sync: ON/OFF · Auto-reflect: ON/OFF`).
       - Action Cards: **Push to Google Sheet (Export All Data)** and **Inspect & Pull Data from Sheet (Interactive Preview)**.
       - **Direct Excel for Google Sheets**: Launch Google Sheets and download matching `.xlsx` workbook.
    2. **Import Preview & Modes**:
       - Pre-import validation engine checks live sheet data before altering database.
       - Displays total detected tables and row counts per worksheet across all 11 tables.
       - Schema validation report: detects duplicate primary keys, broken foreign keys (`habit_entries.habit_id -> habits.id`), and missing required fields with precise row numbers.
       - Interactive Worksheet Data Table Viewer: browse rows across all 11 tables with monospace cell values.
       - 3 Import Modes:
         1. **Mode 1: Merge & Update (Recommended)**: Adds new records, updates matched IDs, preserves other existing records.
         2. **Mode 2: Replace All**: Replaces current workspace data with Google Sheet records with confirmation safeguards.
         3. **Mode 3: Selected Tables**: Choose individual worksheets to import with foreign key dependency warnings (e.g. alerts if `habit_entries` is selected without `habits`).
       - Password gate (`9500`) and confirmation commit button with progress indicator.
    3. **Sheet Format & Schema**: Complete schema inspection showing the 100% parity across all 11 relational sheet tables (`README`, `affirmations`, `daily_journal`, `goals`, `habit_categories`, `habit_entries`, `habits`, `mood_tracker`, `reflections`, `settings`, `weekly_plans`, and `weekly_reviews`) with column definitions, data types, primary keys, and foreign keys.
    4. **Setup & Code Guide**: Visual 5-step setup walkthrough with 1-click copy for the latest `Code.gs` Google Apps Script code with complete `doGet` and `doPost` handlers.
  - **Real-Time Auto-Reflection to Google Sheets**:
    - **Instant Bi-Directional Reflection**: Any update made anywhere on the website (checking off habit entries, creating/editing/archiving/restoring habits, adding goals, updating mood/energy scores, micro-journaling, writing weekly reviews/plans, updating vision affirmations, or changing preferences) immediately reflects in the linked Google Sheet workbook in real time.
    - **Centralized Mutation Event Bus (`src/api.ts`)**: Built on an observable `api.onDataMutated` event listener bus that monitors every successful state modification across all components and automatically dispatches a debounced (1.2s) push to the user's Google Sheet Web App.
    - **Harmonized Auto-Sync Configuration**: Full interoperability between `google_sheets_auto_sync` ↔ `google_sheets_auto_push` and `google_sheets_auto_pull` ↔ `google_sheets_auto_reflect`, ensuring auto-reflection is enabled by default upon connecting a Google Sheet unless explicitly toggled off.
    - **Live Header Reflection Badge**: Desktop header displays a real-time sync pill (`Reflecting to Sheet...`, `Reflected in Sheet ✓`, and `Sheet Linked`) giving clear visual confirmation of live sheet updates with direct modal launcher on click.
    - **Auto-Reflect Changes (Google Sheet → App)**: Polls every 30 seconds and listens to browser tab focus (`visibilitychange`) to reflect external sheet edits back into the workspace.
    - **Auto-Download Excel on Page Refresh / Reload**: Automatically downloads a timestamped multi-sheet `.xlsx` file upon startup when activated.
  - **Server-Side Proxy & Integration Permissiveness**: Uses backend routes (`/api/google-sheets/sync`, `/api/google-sheets/test`, `/api/google-sheets/pull`) in `server.ts` to seamlessly handle Google's HTTP 302 redirects with zero browser CORS errors, while ensuring background sync operations are never interrupted by session timeouts.
- **Archived Habits Management**: Restore archived habits back to active status or permanently delete.

---

## 🗄️ Database & Backend Architecture

The Express backend (`server.ts`) handles API routes, validates UUIDs and edit access, securely persists all application state to disk (`data/db.json`), and coordinates live two-way synchronization with Google Sheets:

### Storage Resiliency & Performance
The backend is built for zero-latency execution, complete reliability, and offline/online continuity:
- **Persistent Disk Engine**: Every mutation (create, edit, delete, toggle) writes synchronously and atomically to `data/db.json`, guaranteeing data survival across server restarts and deployments.
- **In-Process Cache**: Serves all reads (`habits`, `habit-entries`, `goals`, `moods`, `journal`, etc.) in sub-millisecond (<1ms) response times with zero network overhead.
- **Two-Way Google Sheets Engine**: Connects seamlessly with Google Apps Script Web App for real-time live synchronization (Push & Pull) without CORS or session expiration hurdles.
- **Schedule Days Normalization**: Safely handles heterogeneous `schedule_days` array data formats (numeric weekday indices `0–6`, short strings, full weekday strings, or custom formats) in consistency streak and habit schedule calculations without type errors.
- **Streak Calculation Resiliency**: The `GET /api/streak` endpoint encapsulates computation in isolated error guards, falling back safely to valid zero-state metrics if any parsing error occurs rather than failing requests.
- **Context-Aware API Error Messages**: Client-side network helpers accurately distinguish between read/connection checks and mutation saves, providing clear diagnostic feedback.

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
- `POST /api/auth/verify-password`: Password verification against edit password `9500` returning an edit session token (`token`, `expiresIn`, 15-minute sliding session window).
- `POST /api/auth/lock`: Revokes active edit session token and re-locks editing.
- `GET /api/moods` & `POST /api/moods`: Dedicated `mood_tracker` endpoints with strict date validation (YYYY-MM-DD), unique daily record enforcement (auto-updates existing entry on duplicate date), protected write access, and instant disk persistence.
- `PUT /api/moods/:id` & `DELETE /api/moods/:id`: Update and delete individual mood entries (protected by edit session token).
- `GET /api/habits` & `POST /api/habits`: Fetch and create habits.
- `PUT /api/habits/:id` & `DELETE /api/habits/:id`: Update, pause, archive, and delete habits.
- `GET /api/goals` & `POST /api/goals` & `PUT /api/goals/:id` & `DELETE /api/goals/:id`: Goal CRUD endpoints.
- `GET /api/journal` & `POST /api/journal`: Daily mood and journal reflections endpoint with schema matching.
- `GET /api/weekly-plans` & `POST /api/weekly-plans`: Weekly planning endpoints.
- `GET /api/habit-entries` & `POST /api/habit-entries/toggle`: Create or toggle a habit check entry.
- `GET /api/reflections` & `POST /api/reflections`: Fetch and save monthly reflections.
- `GET /api/weekly-reviews` & `POST /api/weekly-reviews`: Fetch and save weekly reviews.
- `GET /api/affirmation` & `POST /api/affirmation`: Fetch and save affirmations.
- `GET /api/settings` & `POST /api/settings`: Fetch and save user settings.
- `GET /api/streak`: Calculates current streak, best streak, and per-habit streak metrics.
- `GET /api/export`: Generates downloadable Excel workbook (`format=xlsx` / `format=excel`), CSV spreadsheet (`format=csv`), or complete JSON backup (`format=json`).
- `POST /api/import`: Restores data from Excel or JSON with atomic updates, supporting merge and replace strategies protected by edit session token.
- `POST /api/google-sheets/test`: Tests connection to the user's deployed Google Apps Script Web App.
- `POST /api/google-sheets/sync`: Proxies complete data payload to Google Apps Script Web App, automatically creating and formatting sheets for Habits, Check-ins, Goals, Mood, and Journal with zero CORS errors.
- `POST /api/google-sheets/pull`: Retrieves full data from Google Sheets via the Apps Script Web App for importing into the tracker.

---

## ⚙️ Cloud Database & Multi-User Architecture

### Active Cloud Database
- **Primary Cloud Provider**: **Google Sheets (Two-Way Live Relational Engine via Google Apps Script)**
- **Local Persistent Engine**: **Atomic Disk Persistence (`data/db.json`)**
- **Schema Parity**: 100% Relational Schema Parity across Google Sheets, Excel (.xlsx), and JSON.
- **Tables Synchronized**:
### Complete Relational Database Structure (All 11 Tables)
The application architecture is strictly organized into 11 relational tables matching the native database structure:

```text
                    ┌──────────────────┐
                    │      goals       │
                    │──────────────────│
                    │ id (PK: UUID)    │
                    │ title (TEXT)     │
                    │ progress (NUMERIC│
                    │ status (TEXT)    │
                    └────────┬─────────┘
                             │
                             │ goal_id
                             ▼
                    ┌──────────────────┐
                    │      habits      │
                    │──────────────────│
                    │ id (PK: UUID)    │
                    │ name (TEXT)      │
                    │ goal_id (FK:UUID)│
                    │ frequency (TEXT) │
                    │ schedule_days    │
                    └────────┬─────────┘
                             │
                             │ habit_id
                             ▼
                    ┌──────────────────┐
                    │   habit_entries  │
                    │──────────────────│
                    │ id (PK: UUID)    │
                    │ habit_id (FK:UUID│
                    │ date (DATE)      │
                    │ completed (BOOL) │
                    └──────────────────┘

    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  daily_journal   │  │   mood_tracker   │  │ weekly_plans     │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │ weekly_reviews   │  │   reflections    │  │    settings      │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
    ┌──────────────────┐  ┌──────────────────┐
    │   affirmations   │  │ habit_categories │
    └──────────────────┘  └──────────────────┘
```

#### Table Schema Specifications:
1. **`affirmations`** (7 columns): Stores motivational quotes and dashboard banners.
   - `id`: UUID (PK, NOT NULL)
   - `quote`: TEXT (NOT NULL)
   - `author`: TEXT (NULLABLE)
   - `image_url`: TEXT (NULLABLE)
   - `active`: BOOLEAN (NOT NULL)
   - `created_at`: TIMESTAMPTZ (NOT NULL)
   - `updated_at`: TIMESTAMPTZ (NOT NULL)

2. **`daily_journal`** (7 columns): Stores daily journal entries, moods, and energy levels.
   - `id`: UUID (PK, NOT NULL)
   - `date`: DATE (NOT NULL)
   - `content`: TEXT (NULLABLE)
   - `mood`: TEXT (NULLABLE)
   - `energy_level`: INTEGER (NULLABLE)
   - `created_at`: TIMESTAMPTZ (NOT NULL)
   - `updated_at`: TIMESTAMPTZ (NOT NULL)

3. **`goals`** (9 columns): Tracks personal goals and their progress.
   - `id`: UUID (PK, NOT NULL)
   - `title`: TEXT (NOT NULL)
   - `description`: TEXT (NULLABLE)
   - `category`: TEXT (NULLABLE)
   - `target_date`: DATE (NULLABLE)
   - `progress`: NUMERIC (NULLABLE)
   - `status`: TEXT (NOT NULL)
   - `created_at`: TIMESTAMPTZ (NOT NULL)
   - `updated_at`: TIMESTAMPTZ (NOT NULL)

4. **`habit_categories`** (4 columns): Organizes habits into categories.
   - `id`: UUID (PK, NOT NULL)
   - `name`: TEXT (NOT NULL)
   - `icon`: TEXT (NULLABLE)
   - `created_at`: TIMESTAMPTZ (NOT NULL)

5. **`habit_entries`** (6 columns): Records daily habit check-in completions.
   - `id`: UUID (PK, NOT NULL)
   - `habit_id`: UUID (NOT NULL, FK -> `habits.id`)
   - `date`: DATE (NOT NULL)
   - `completed`: BOOLEAN (NOT NULL)
   - `created_at`: TIMESTAMPTZ (NOT NULL)
   - `updated_at`: TIMESTAMPTZ (NOT NULL)

6. **`habits`** (12 columns): Stores habit details, schedules, priorities, and statuses.
   - `id`: UUID (PK, NOT NULL)
   - `name`: TEXT (NOT NULL)
   - `category`: TEXT (NULLABLE)
   - `frequency`: TEXT (NOT NULL)
   - `priority`: TEXT (NULLABLE)
   - `goal_id`: UUID (NULLABLE, FK -> `goals.id`)
   - `target_count`: INTEGER (NULLABLE)
   - `schedule_days`: ARRAY (NULLABLE)
   - `status`: TEXT (NOT NULL)
   - `archived_at`: TIMESTAMPTZ (NULLABLE)
   - `created_at`: TIMESTAMPTZ (NOT NULL)
   - `updated_at`: TIMESTAMPTZ (NOT NULL)

7. **`mood_tracker`** (8 columns): Tracks daily moods, mood scores, and energy levels.
   - `id`: UUID (PK, NOT NULL)
   - `date`: DATE (NOT NULL)
   - `mood`: TEXT (NOT NULL)
   - `mood_score`: INTEGER (NOT NULL)
   - `energy_level`: INTEGER (NOT NULL)
   - `note`: TEXT (NULLABLE)
   - `created_at`: TIMESTAMPTZ (NOT NULL)
   - `updated_at`: TIMESTAMPTZ (NOT NULL)

8. **`reflections`** (6 columns): Stores monthly reflections.
   - `id`: UUID (PK, NOT NULL)
   - `month`: INTEGER (NOT NULL)
   - `year`: INTEGER (NOT NULL)
   - `content`: TEXT (NULLABLE)
   - `created_at`: TIMESTAMPTZ (NOT NULL)
   - `updated_at`: TIMESTAMPTZ (NOT NULL)

9. **`settings`** (4 columns): Stores application preferences and configuration.
   - `id`: UUID (PK, NOT NULL)
   - `setting_key`: TEXT (NOT NULL)
   - `setting_value`: JSONB (NULLABLE)
   - `updated_at`: TIMESTAMPTZ (NOT NULL)

10. **`weekly_plans`** (11 columns): Stores weekly goals, top 3 priorities, and target completion percentages.
    - `id`: UUID (PK, NOT NULL)
    - `year`: INTEGER (NOT NULL)
    - `month`: INTEGER (NOT NULL)
    - `week_number`: INTEGER (NOT NULL)
    - `main_goal`: TEXT (NULLABLE)
    - `priority_1`: TEXT (NULLABLE)
    - `priority_2`: TEXT (NULLABLE)
    - `priority_3`: TEXT (NULLABLE)
    - `target_percentage`: NUMERIC (NULLABLE)
    - `created_at`: TIMESTAMPTZ (NOT NULL)
    - `updated_at`: TIMESTAMPTZ (NOT NULL)

11. **`weekly_reviews`** (10 columns): Stores weekly review retrospectives and improvement plans.
    - `id`: UUID (PK, NOT NULL)
    - `year`: INTEGER (NOT NULL)
    - `month`: INTEGER (NOT NULL)
    - `week_number`: INTEGER (NOT NULL)
    - `went_well`: TEXT (NULLABLE)
    - `improve`: TEXT (NULLABLE)
    - `could_improve`: TEXT (NULLABLE)
    - `next_focus`: TEXT (NULLABLE)
    - `created_at`: TIMESTAMPTZ (NOT NULL)
    - `updated_at`: TIMESTAMPTZ (NOT NULL)

---

### 📊 Relational Excel Export System (`.xlsx`)
- **Full Relational Backup**:
  - The application provides a complete relational multi-sheet Excel workbook export via client-side generation (`ExcelExportModal`) and backend `/api/export?format=xlsx`.
  - **Worksheet 1 (`README`)**: System metadata, schema version, table index with record counts and primary/foreign key mappings.
  - **Worksheet 2 (`DATABASE_SCHEMA`)**: Complete PostgreSQL data dictionary listing all 11 tables, column names, PostgreSQL data types (UUID, TEXT, DATE, TIMESTAMPTZ, NUMERIC, INTEGER, BOOLEAN, ARRAY, JSONB), nullability, primary/foreign keys, and field descriptions.
  - **Worksheets 3–13**: 11 individual tables (`affirmations`, `daily_journal`, `goals`, `habit_categories`, `habit_entries`, `habits`, `mood_tracker`, `reflections`, `settings`, `weekly_plans`, `weekly_reviews`) formatted strictly with:
    - Row 1: Strict column names matching the PostgreSQL database schema.
    - Rows 2+: Real data records.
    - Frozen header rows pinned during scrolling.
    - Excel AutoFilter enabled across all columns.
    - Automatic column width padding.
- **Interactive Export Modal (`ExcelExportModal.tsx`)**:
  - **All Tables Mode**: Exports all 11 database tables in a single click.
  - **Custom Select Mode**: Allows users to pick specific tables with live record count indicators.
  - **PostgreSQL Schema Reference Tab**: Built-in searchable interactive dictionary table allowing users to review all 71+ database columns and types directly inside the tracker before exporting.
  - **Download Blank Template**: Generates an empty relational template with sample UUIDs, valid foreign key references, and schema guidelines.

---

### 🔄 Real-Time Google Sheets Reflection & 11-Table Relational Sync
- **100% PostgreSQL Schema Parity in Google Sheets**:
  - The Google Sheets integration mirrors the exact 11 PostgreSQL tables structure:
    1. `affirmations` (`id`, `quote`, `author`, `image_url`, `active`, `created_at`, `updated_at`)
    2. `daily_journal` (`id`, `date`, `content`, `mood`, `energy_level`, `created_at`, `updated_at`)
    3. `goals` (`id`, `title`, `description`, `category`, `target_date`, `progress`, `status`, `created_at`, `updated_at`)
    4. `habit_categories` (`id`, `name`, `icon`, `created_at` — 4 columns strictly, with `categories` alias support)
    5. `habit_entries` (`id`, `habit_id`, `date`, `completed`, `created_at`, `updated_at`)
    6. `habits` (`id`, `name`, `category`, `frequency`, `priority`, `goal_id`, `target_count`, `schedule_days`, `status`, `archived_at`, `created_at`, `updated_at`)
    7. `mood_tracker` (`id`, `date`, `mood`, `mood_score`, `energy_level`, `note`, `created_at`, `updated_at` — 8 columns strictly)
    8. `reflections` (`id`, `month`, `year`, `content`, `created_at`, `updated_at` — with `monthly_reflections` alias support)
    9. `settings` (`id`, `setting_key`, `setting_value`, `updated_at` — 4 columns strictly)
    10. `weekly_plans` (`id`, `year`, `month`, `week_number`, `main_goal`, `priority_1`, `priority_2`, `priority_3`, `target_percentage`, `created_at`, `updated_at` — 11 columns strictly)
    11. `weekly_reviews` (`id`, `year`, `month`, `week_number`, `went_well`, `improve`, `could_improve`, `next_focus`, `created_at`, `updated_at`)
  - Plus dedicated `README` and `DATABASE_SCHEMA` data dictionary worksheets with dark navy header styling (`#0F172A`), frozen header row, active data filters, and auto-resized columns.
- **Live Reflection on Every Mutation**:
  - Whenever any data is added, checked off, updated, or deleted anywhere on the website (habits, check-in entries, goals, micro-journal entries, mood logs, weekly reviews, weekly plans, affirmations, or categories), the update is **automatically reflected into the user's linked Google Sheet**.
  - Powered by a debounced background sync (`queueAutoPush`) subscribed to global data mutation events (`api.onDataMutated`), preventing rate limiting while ensuring the Google Sheet stays 100% current.
- **Header Background Sync Indicator & Non-Blocking Web View (`Header.tsx`, `App.tsx`)**:
  - The database synchronization runs completely non-blocking in the background, keeping the web view and all UI components 100% interactive at all times.
  - The desktop action area (`div#root > div > header > div > div > div:nth-of-type(2)`) features:
    - `↻ Syncing in background...`: Refined emerald badge with spinning loader and animated ping indicator showing quiet background sync without page freeze.
    - `✓ Sheet Synced` / `Saved ✓`: Live confirmation of persistent storage and cloud sync.
    - `Google Sheet Live Database Button`: One-click access with live status indicator (`Reflecting to Sheet...`, `Sheet Synced ✓`, or `Sheet Linked`).
  - All local mutations and database operations respond instantaneously in sub-millisecond time.
- **Bi-Directional Auto-Reflect & Full Current Data Preservation**:
  - Automatically pulls changes from the linked Google Sheet every 30 seconds and whenever the browser tab gains focus, applying updates directly into local state and database.
  - Automatic push (`queueAutoPush`) and manual push pass the entire current client dataset (`fullExportData`), ensuring all active habits, check-ins, mood logs, and vision goals are preserved in both Google Sheets and the website database simultaneously.
- **Zero False-Lock Authentication**:
  - Google Sheets configuration (`google_sheets_script_url`, `google_sheets_auto_sync`, `google_sheets_auto_push`, `google_sheets_auto_reflect`) and connection test/sync endpoints bypass the edit password lock, allowing users to configure and test their Google Sheet connection smoothly without entering the editing password `9500`.

---

## 🖋️ Obsidian-Inspired Markdown Editor & Personal Knowledge System

The platform includes a dedicated, rich **Obsidian-Style Markdown Editor** (`src/components/journal/ObsidianMarkdownEditor.tsx`) integrated across both the **Daily Journal** (`DailyJournalModule.tsx`) and **Second Brain Knowledge Notes** (`NoteEditor.tsx`):

### 1. Automatic Real-Time Heading Formatting
- **Instant Shortcuts**:
  - Typing `# ` (hash + space) converts line to **Heading 1**.
  - Typing `# Hi` and pressing <kbd>Space</kbd> immediately transforms the block into **Heading 1** containing `Hi`.
  - Typing `## ` or `## Work` + <kbd>Space</kbd> converts to **Heading 2**.
  - Typing `### ` or `### Tasks` + <kbd>Space</kbd> converts to **Heading 3**.
  - Full support for **H1 through H6** levels with distinct Obsidian typographic styles (sizes, weights, borders).
- **Instant Live Styling**: Headings appear larger and bolder immediately in the live editing canvas without requiring the user to switch to preview mode.
- **Smart Paragraph Exit**: Pressing <kbd>Enter</kbd> on a heading moves the cursor to a fresh paragraph block.
- **Heading Backspace Reset**: Pressing <kbd>Backspace</kbd> on an empty heading gracefully resets the block to a normal paragraph.
- **Tag Disambiguation**: Typing `#work` or `#fitness` is recognized as an inline hashtag/chip and is never falsely converted into a heading.

### 2. Comprehensive Markdown Shortcuts
| Shortcut | Resulting Block / Mark |
| :--- | :--- |
| `# ` or `# Text ` | Heading 1 (`<h1>`) |
| `## ` or `## Text ` | Heading 2 (`<h2>`) |
| `### ` or `### Text ` | Heading 3 (`<h3>`) |
| `- ` or `* ` | Interactive Bullet List (`<ul>`) |
| `1. ` | Numbered Ordered List (`<ol>`) |
| `- [ ] ` | Interactive Checklist / Task item (`[ ]`) |
| `- [x] ` | Completed Checklist / Task item (`[x]`) |
| `> ` | Styled Blockquote with emerald accent border |
| `---` followed by Enter | Horizontal Divider rule |
| `**text**` | **Bold** formatting |
| `*text*` | *Italic* formatting |
| `` `text` `` | `Inline code` chip |
| `~~text~~` | ~~Strikethrough~~ formatting |
| `[[Note Title]]` | Obsidian Internal Wikilink with autocomplete |

### 3. Native Keyboard Shortcuts & Navigation
- <kbd>Ctrl</kbd>+<kbd>B</kbd> / <kbd>Cmd</kbd>+<kbd>B</kbd>: Toggle Bold.
- <kbd>Ctrl</kbd>+<kbd>I</kbd> / <kbd>Cmd</kbd>+<kbd>I</kbd>: Toggle Italic.
- <kbd>Ctrl</kbd>+<kbd>K</kbd> / <kbd>Cmd</kbd>+<kbd>K</kbd>: Open Internal Note Wikilink picker dialog.
- <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Cmd</kbd>+<kbd>Z</kbd>: Undo.
- <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> / <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd>: Redo.
- <kbd>Enter</kbd>: Continues current list item; pressing <kbd>Enter</kbd> on an empty list item exits the list to a normal paragraph.
- <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>: Indents and outdents list items; navigates across table cells.

### 4. Interactive Markdown Tables
- **In-Editor Native Tables**: Insert 3x3 tables, add rows above/below, add columns left/right, and delete rows/columns.
- **Visual Table & Excel Import Modal (`TableEditorModal.tsx`)**: Import tabular data directly copied from Microsoft Excel or Google Sheets by pasting tab-delimited text.
- **Alignment Controls**: Left, Center, and Right column alignments with Markdown delimiter syntax (`:---`, `:---:`, `---:`).

### 5. Multi-Mode Writing Experience
- **Live Formatted Mode (Obsidian Live Preview)**: Real-time formatted editing where headings, bold text, checkboxes, quotes, and tables are visually styled and interactive while typing.
- **Raw Markdown Source Mode**: Clean monospaced writing environment with syntax shortcuts for pure Markdown drafting.
- **Split View**: Side-by-side editing on the left and rendered reading output preview on the right.
- **Preview Mode**: Clean, distraction-free reading view.
- **Live Statistics**: Real-time word count and character count indicators.
- **Autosave Status Indicator**: Shows `Draft`, `Saving...`, `All changes synced [time]`, or `Error`.
- **Draft Recovery**: Automatic local draft caching prevents loss of work during accidental refreshes or network drops.

### 6. Interactive Obsidian Knowledge Graph View (`KnowledgeGraph.tsx`)
- **Visual Design & Dark Charcoal Canvas**: Full-screen dark charcoal `#202020` canvas interface modeled directly on Obsidian's desktop Graph View. Powered by high-performance HTML5 Canvas with HiDPI devicePixelRatio scaling, supporting hundreds to thousands of notes and wikilinks with fluid 60fps zooming, panning, and force-directed clustering.
- **Floating Right-Side Filter Panel (Collapsible)**: Matches the Obsidian reference layout with a dark frosted sidebar containing:
  - **Search Files**: Instant real-time search with partial matching and focus spotlight.
  - **Filter Toggles**: Obsidian-style pill switches for **Tags** (show/hide tag nodes), **Attachments** (show/hide media attachment nodes), **Existing files only** (toggle unresolved link placeholders), and **Orphans** (toggle notes with 0 connections).
  - **Groups & Color Coding**: User-configurable group rules supporting Obsidian query syntax (`path:journal`, `path:habits`, `path:goals`, `path:ideas`, `path:learning`, `tag:important`, etc.) with customizable palette color pickers, remove buttons, and a "+ New group" button. Rules are evaluated top-to-bottom and persisted in `localStorage`.
  - **Display Settings**: Adjustable sliders for Node Size (0.5x to 2.5x), Link Thickness (0.5px to 3px), Link Opacity, Text Label Visibility (All / Hover / Connected / None), Text Size, and Directional Arrows.
  - **Forces & Physics**: Interactive sliders for Node Repulsion, Link Distance, and Centering Gravity force, alongside simulation Pause/Resume and Restart controls.
- **Wikilink Graph Generator**: Uses actual journal note content and `[[wikilinks]]` as the single source of truth. Handles `[[Note Title]]`, `[[Note Title|Display Alias]]`, and `[[Note Title#Heading]]`. Gracefully handles unresolved links with dedicated placeholder nodes that can be clicked to create the note or filtered out via "Existing files only".
- **Obsidian Local Graph Mode**: Select any note to enter focused Local Graph exploration with Depth 1 (direct neighbors), Depth 2 (second-degree connections), and Depth 3 (extended neighborhood) depth controls, with a 1-tap "Global Graph" return button.
- **Node Interactions & Context Menu**:
  - **Hover**: Floating tooltip displaying note title, type/category badge, tag chips, link count, and markdown excerpt snippet.
  - **Single Click**: Spotlights the selected note and its 1-hop connected web while dimming unrelated nodes, displaying a floating bottom action pill.
  - **Double Click**: Directly opens the corresponding note or daily journal in the editor.
  - **Unlinked Notes Separation & Dynamic Magnetic Repulsion**:
    - **Separate Outer Orbit for Unlinked Notes**: Notes without incoming or outgoing links (orphans) are naturally segregated from connected clusters into a dedicated outer orbital halo (`r ≈ 0.42 × min(w, h)`), preventing isolated thoughts from mingling inside interconnected clusters. On the canvas, unlinked notes feature a delicate dashed outer aura.
    - **Active Proximity & Cross-Cluster Repulsion**: When dragging any note (especially moving an unlinked note towards linked notes or nearby notes), surrounding notes actively and smoothly REPEL (`repale`) away in real time. The repulsion field scales dynamically with proximity ($r < 180\text{px}$) with an amplified $2.2\times$ cross-cluster push, plus an elastic hard collision barrier ($r_1 + r_2 + 16\text{px}$) that completely prevents overlapping and causes notes to part like fluid. When released, repelled notes gently settle into equilibrium with spring damping ($0.88$).
  - **Zero-Lag 60/120 FPS Direct-Canvas Drag Architecture**:
    - **Zero React Re-Render Thrashing During Motion**: Mouse and touch movements directly update simulation coordinates without triggering React `setState` on every raw pointer event. Physics calculations and canvas repaints execute synchronously inside a native `requestAnimationFrame` loop, guaranteeing true 60 FPS / 120 FPS buttery-smooth tactile dragging with zero latency, zero stutter, and zero glitches.
    - **Global Window Pointer Tracking**: Pointer move and up handlers listen at the window level, ensuring lightning-fast movements across edges, panels, or browser borders never drop the dragged note or interrupt the interaction.
    - **Velocity Clamping & Physical Stability**: Node speeds are clamped to a stable ceiling to prevent physics explosions or glitchy jumps, ensuring an intensely satisfying, organic Obsidian graph experience.
  - **Proper Fullscreen Viewport & High-DPI Canvas**:
  - Fullscreen toggle supporting native HTML5 Fullscreen API (`requestFullscreen` / `exitFullscreen`) with seamless CSS fixed viewport overlay (`fixed inset-0 z-[9999] w-screen h-screen rounded-none border-0`) fallback for iframe/embedded environments.
  - Automatic body scroll lock (`document.body.style.overflow = 'hidden'`) while in fullscreen mode to prevent background document shifting.
  - Automatic canvas re-scaling, devicePixelRatio high-DPI handling, and auto-centering (`handleFitToScreen`) on fullscreen toggle.
  - Prominent "Exit Fullscreen" header button with <kbd>Esc</kbd> shortcut tag and floating top indicator pill with 1-click Exit link.
  - Full keyboard shortcuts: <kbd>Esc</kbd> to exit fullscreen or clear selection, <kbd>F</kbd> to toggle fullscreen, cursor-centered mouse wheel zoom, and double-click to open notes.
  - Multi-touch gesture engine: single-touch canvas panning and node dragging, two-finger pinch-to-zoom on mobile and tablet displays with `touch-none` protection.

---

## ⚙️ Environment Variables & Configuration

The application uses built-in persistent disk storage (`data/db.json`) and Google Sheets as its primary cloud database.

```env
# Single source of truth password for edit protection (configured in application code: 9500)
EDIT_PASSWORD=9500
```

---

## 🛠️ Build & Development Commands

- `npm run dev`: Starts the TypeScript Express backend + Vite dev server on port 3000.
- `npm run build`: Compiles Vite static assets and bundles `server.ts` into `dist/server.cjs` via `esbuild`.
- `npm run start`: Runs the compiled CommonJS server (`node dist/server.cjs`).
- `npm run lint`: Runs TypeScript and ESLint validation.

---

## 🚀 Production & Vercel Deployment Architecture

The application supports both containerized environments (Node.js standalone / Cloud Run) and serverless cloud hosting (Vercel):

- **Dedicated Password Verification Function (`api/auth/verify-password.ts`)**:
  - Standalone Vercel Serverless Function deployed directly to `/api/auth/verify-password`.
  - Validates edit password `9500` with zero cold-start delay using native Node HTTP and crypto primitives.
  - Automatically handles preflight OPTIONS CORS requests and issues a secure 15-minute `edit_session_` token.
  - Alias provided at `api/auth/verify-pin.ts` for backward compatibility.
- **Express Serverless Adapters (`api/[...all].ts` & `api/index.ts`)**:
  - Catch-all serverless function routing `/api/*` requests to the unified Express application in `server.ts`.
  - Normalizes `req.url` paths so Express receives standard `/api/...` endpoints.
- **Vercel Routing Configuration (`vercel.json`)**:
  - Direct routes for `/api/auth/verify-password` and `/auth/verify-password`.
  - Subpath-preserving rewrite for all other API calls: `{"source": "/api/(.*)", "destination": "/api/$1"}`.
  - Client-side SPA fallback for non-API routes: `{"source": "/((?!api/|api$|auth/).*)", "destination": "/index.html"}`.
  - Static asset serving (`/assets/*`, `/favicon.ico`, `/icon.png`) directly from `dist/` with optimal caching.
- **Dynamic Serverless Environment Resolution**:
  - The website edit password `9500` is defined directly in application code, removing dependency on environment variables for edit unlocking on Vercel.
  - Standalone `app.listen()` and dev Vite middlewares are automatically skipped in Vercel (`process.env.VERCEL = 1`), preventing port binding conflicts.

---

## 🛠️ AI Studio Build & GitHub Import Migration Verification

The repository was migrated and verified for Google AI Studio Build:
- **Runtime**: Node.js 22, npm-native execution.
- **Port & Host**: Express + Vite configured on `http://0.0.0.0:3000`.
- **Relational Schema Type Parity**: `SupportedTableName` (all 15 canonical tables and aliases including `notes` and `tasks`) verified across `dataSchema.ts`, `excel.ts`, `googleAppsScript.ts`, and `ExcelExportModal.tsx`.
- **Compilation & Linting**: `tsc --noEmit` and Vite build execute with 0 errors. All 17 automated relational export/sync tests pass.
