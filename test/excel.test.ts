import * as XLSX from 'xlsx';
import {
  buildExcelWorkbook,
  parseExcelFile,
  FullExportData,
  makeUuid,
  normalizeExcelDate,
  isValidIsoDate,
  RELATIONAL_TABLES,
} from '../src/utils/excel';

// Simple test runner assertion helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Starting Relational Excel Import & Export Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err?.message || err}`);
      failed++;
    }
  }

  // Sample seed data with foreign key relationships
  const sampleGoalId = '44444444-4444-4444-4444-444444444444';
  const sampleHabitId1 = '11111111-1111-1111-1111-111111111111';
  const sampleHabitId2 = '22222222-2222-2222-2222-222222222222';
  const sampleEntryId1 = '33333333-3333-3333-3333-333333333333';

  const baseData: FullExportData = {
    app: 'Vignesh Habit Tracker',
    version: '3.0',
    exported_at: '2026-10-09T10:00:00.000Z',
    goals: [
      {
        id: sampleGoalId,
        title: 'Run 10km Marathon',
        category: 'health',
        description: 'Endurance training',
        target_date: '2026-12-31',
        progress: 50,
        status: 'active',
        created_at: '2026-10-01T00:00:00.000Z',
      },
    ],
    habits: [
      {
        id: sampleHabitId1,
        name: 'Morning Exercise',
        category: 'health',
        frequency: 'daily',
        priority: 'high',
        goal_id: sampleGoalId,
        status: 'active',
        created_at: '2026-10-01T00:00:00.000Z',
      },
      {
        id: sampleHabitId2,
        name: 'Read 20 Pages',
        category: 'learning',
        frequency: 'specific_days',
        schedule_days: ['Mon', 'Wed', 'Fri'],
        priority: 'normal',
        goal_id: null,
        status: 'active',
        created_at: '2026-10-02T00:00:00.000Z',
      },
    ],
    habit_entries: [
      {
        id: sampleEntryId1,
        habit_id: sampleHabitId1,
        date: '2026-10-09',
        completed: true,
        created_at: '2026-10-09T08:00:00.000Z',
      },
    ],
    mood_tracker: [
      {
        id: '55555555-5555-5555-5555-555555555555',
        date: '2026-10-09',
        mood: 'good',
        mood_score: 4,
        energy_level: 4,
        note: 'Focused and productive morning',
        created_at: '2026-10-09T09:00:00.000Z',
      },
    ],
    daily_journal: [
      {
        id: '66666666-6666-6666-6666-666666666666',
        date: '2026-10-09',
        content: 'Small daily steps compound into massive lifelong results.',
        mood: 'good',
        energy_level: 4,
        created_at: '2026-10-09T09:30:00.000Z',
      },
    ],
    weekly_plans: [
      {
        id: '77777777-7777-7777-7777-777777777777',
        year: 2026,
        month: 10,
        week_number: 1,
        main_goal: 'Ship key milestones and stay consistent',
        priority_1: 'Morning workouts',
        priority_2: 'Finish project sprint',
        priority_3: 'Reading daily',
        target_percentage: 85,
        created_at: '2026-10-05T00:00:00.000Z',
      },
    ],
    weekly_reviews: [
      {
        id: '88888888-8888-8888-8888-888888888888',
        year: 2026,
        month: 10,
        week_number: 1,
        went_well: 'Great energy and habit momentum',
        improve: 'Sleep timing',
        next_focus: 'Deep work mornings',
        created_at: '2026-10-07T00:00:00.000Z',
      },
    ],
    reflections: [
      {
        id: '99999999-9999-4999-8999-999999999999',
        year: 2026,
        month: 10,
        content: 'Monthly retrospective on discipline and growth.',
        created_at: '2026-10-08T00:00:00.000Z',
      },
    ],
    habit_categories: [
      { id: 'cat-health', name: 'Health', icon: '🏃' },
      { id: 'cat-learning', name: 'Learning', icon: '📚' },
    ],
    settings: {
      theme: 'light',
      week_start: 'sunday',
      default_view: 'today',
      auto_lock_minutes: 15,
    },
  };

  // Test 1: Relational Workbook Generation & Structure
  await test('1. Export generates workbook with README and all relational worksheets', () => {
    const wb = buildExcelWorkbook(baseData);
    assert(wb.SheetNames.includes('README'), 'Must include README sheet');
    assert(wb.SheetNames.includes('habits'), 'Must include habits sheet');
    assert(wb.SheetNames.includes('habit_entries'), 'Must include habit_entries sheet');
    assert(wb.SheetNames.includes('goals'), 'Must include goals sheet');
    assert(wb.SheetNames.includes('mood_tracker'), 'Must include mood_tracker sheet');
    assert(wb.SheetNames.includes('daily_journal'), 'Must include daily_journal sheet');
    assert(wb.SheetNames.includes('weekly_plans'), 'Must include weekly_plans sheet');
    assert(wb.SheetNames.includes('weekly_reviews'), 'Must include weekly_reviews sheet');
    assert(wb.SheetNames.includes('monthly_reflections'), 'Must include monthly_reflections sheet');
    assert(wb.SheetNames.includes('settings'), 'Must include settings sheet');

    // Verify row 1 is exclusively column headers (no merged cells in data sheets)
    const habitsSheet = wb.Sheets['habits'];
    const habitHeaders = XLSX.utils.sheet_to_json<string[]>(habitsSheet, { header: 1 })[0];
    assert(habitHeaders.includes('id'), 'habits sheet must have id in row 1');
    assert(habitHeaders.includes('name'), 'habits sheet must have name in row 1');
    assert(habitHeaders.includes('goal_id'), 'habits sheet must have goal_id in row 1');
    assert(habitsSheet['!merges'] === undefined || habitsSheet['!merges'].length === 0, 'No merged cells in habits sheet');
  });

  // Test 2: Round-Trip Data Preservation
  await test('2. Export and re-import preserves all IDs, fields, and relationships', async () => {
    const wb = buildExcelWorkbook(baseData);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await parseExcelFile(buf);
    assert(parsed.habitsCount === 2, `Expected 2 habits, got ${parsed.habitsCount}`);
    assert(parsed.entriesCount === 1, `Expected 1 entry, got ${parsed.entriesCount}`);
    assert(parsed.goalsCount === 1, `Expected 1 goal, got ${parsed.goalsCount}`);
    assert(parsed.moodsCount === 1, `Expected 1 mood log, got ${parsed.moodsCount}`);
    assert(parsed.journalCount === 1, `Expected 1 journal entry, got ${parsed.journalCount}`);
    assert(parsed.plansCount === 1, `Expected 1 plan, got ${parsed.plansCount}`);
    assert(parsed.reviewsCount === 1, `Expected 1 review, got ${parsed.reviewsCount}`);
    assert(parsed.reflectionsCount === 1, `Expected 1 reflection, got ${parsed.reflectionsCount}`);

    // Verify Primary Key and Foreign Key preservation
    const parsedHabit = parsed.parsedData.habits.find((h) => h.id === sampleHabitId1);
    assert(!!parsedHabit, 'Habit 1 must exist with exact ID');
    assert(parsedHabit?.name === 'Morning Exercise', 'Habit name preserved');
    assert(parsedHabit?.goal_id === sampleGoalId, 'Foreign key goal_id preserved');

    const parsedEntry = parsed.parsedData.habit_entries[0];
    assert(parsedEntry.id === sampleEntryId1, 'Entry ID preserved');
    assert(parsedEntry.habit_id === sampleHabitId1, 'Entry foreign key habit_id preserved');
    assert(parsedEntry.completed === true, 'Entry completed boolean preserved');
    assert(parsedEntry.date === '2026-10-09', 'Entry date preserved');
  });

  // Test 3: Edit an existing habit and import it
  await test('3. Modify an existing habit in workbook and verify update', async () => {
    const modifiedData = {
      ...baseData,
      habits: [
        {
          ...baseData.habits[0],
          name: 'Morning Exercise (Updated Pace)',
          priority: 'high' as const,
        },
        baseData.habits[1],
      ],
    };
    const wb = buildExcelWorkbook(modifiedData);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(buf);
    assert(parsed.parsedData.habits[0].name === 'Morning Exercise (Updated Pace)', 'Updated habit name read correctly');
  });

  // Test 4: Add new habit and corresponding entry
  await test('4. Add a new habit and entry in workbook', async () => {
    const newHabitId = 'aaaa1111-2222-3333-4444-555566667777';
    const newEntryId = 'bbbb1111-2222-3333-4444-555566667777';
    const extendedData = {
      ...baseData,
      habits: [
        ...baseData.habits,
        {
          id: newHabitId,
          name: 'Evening Meditation',
          category: 'personal',
          frequency: 'daily' as const,
          priority: 'normal' as const,
          status: 'active' as const,
          created_at: '2026-10-09T00:00:00.000Z',
        },
      ],
      habit_entries: [
        ...baseData.habit_entries,
        {
          id: newEntryId,
          habit_id: newHabitId,
          date: '2026-10-09',
          completed: true,
          created_at: '2026-10-09T20:00:00.000Z',
        },
      ],
    };

    const wb = buildExcelWorkbook(extendedData);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(buf);

    assert(parsed.habitsCount === 3, 'Expected 3 habits');
    assert(parsed.entriesCount === 2, 'Expected 2 entries');
    const newEntry = parsed.parsedData.habit_entries.find((e) => e.id === newEntryId);
    assert(newEntry?.habit_id === newHabitId, 'New entry correctly references new habit ID');
  });

  // Test 5: Duplicate primary key detection
  await test('5. Detects duplicate primary keys and flags validation error', async () => {
    const duplicateHabits = [
      { ...baseData.habits[0] },
      { ...baseData.habits[0], name: 'Duplicate Exercise' }, // Same ID
    ];
    const dataWithDupes = { ...baseData, habits: duplicateHabits };
    const wb = buildExcelWorkbook(dataWithDupes);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await parseExcelFile(buf);
    const dupIssue = parsed.issues.find((issue) => issue.message.includes('Duplicate primary key'));
    assert(!!dupIssue, 'Must flag duplicate primary key');
  });

  // Test 6: Invalid date format detection
  await test('6. Detects invalid dates in habit entries', async () => {
    const invalidEntryData = {
      ...baseData,
      habit_entries: [
        {
          id: 'bad-date-entry',
          habit_id: sampleHabitId1,
          date: 'not-a-date',
          completed: true,
          created_at: '2026-10-09T00:00:00.000Z',
        },
      ],
    };
    const wb = buildExcelWorkbook(invalidEntryData);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await parseExcelFile(buf);
    const dateIssue = parsed.issues.find((issue) => issue.column === 'date');
    assert(!!dateIssue, 'Must detect invalid date format');
  });

  // Test 7: Broken foreign key reference detection
  await test('7. Flags error when habit_entry references a non-existent habit_id', async () => {
    const orphanEntryData = {
      ...baseData,
      habit_entries: [
        {
          id: 'orphan-entry-01',
          habit_id: 'non-existent-habit-id-999',
          date: '2026-10-09',
          completed: true,
          created_at: '2026-10-09T00:00:00.000Z',
        },
      ],
    };
    const wb = buildExcelWorkbook(orphanEntryData);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsed = await parseExcelFile(buf);
    const fkIssue = parsed.issues.find((issue) => issue.message.includes('Foreign key'));
    assert(!!fkIssue, 'Must detect broken foreign key habit_id');
    assert(parsed.hasForeignKeysResolved === false, 'hasForeignKeysResolved must be false');
  });

  // Test 8: Missing optional worksheets handled safely
  await test('8. Optional worksheets missing is handled gracefully', async () => {
    const partialData: FullExportData = {
      habits: baseData.habits,
      habit_entries: baseData.habit_entries,
      goals: [],
      mood_tracker: [],
      daily_journal: [],
      weekly_reviews: [],
      weekly_plans: [],
      reflections: [],
    };
    // Export with only habits and habit_entries
    const wb = buildExcelWorkbook(partialData, { selectedTables: ['habits', 'habit_entries'] });
    assert(!wb.SheetNames.includes('goals'), 'goals sheet should be omitted');
    assert(!wb.SheetNames.includes('mood_tracker'), 'mood_tracker sheet should be omitted');

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(buf);

    assert(parsed.habitsCount === 2, 'Habits parsed correctly');
    assert(parsed.entriesCount === 1, 'Entries parsed correctly');
    assert(parsed.goalsCount === 0, 'Goals safely empty');
  });

  // Test 9: Empty workbook handling
  await test('9. Empty workbook is handled safely without crashing', async () => {
    const emptyWb = XLSX.utils.book_new();
    const wsEmpty = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(emptyWb, wsEmpty, 'Sheet1');
    const buf = XLSX.write(emptyWb, { type: 'array', bookType: 'xlsx' });

    const parsed = await parseExcelFile(buf);
    assert(parsed.totalRows === 0, 'Total rows must be 0');
    assert(parsed.warnings.length > 0, 'Must produce a warning about empty/unrecognized sheets');
  });

  // Test 10: Date normalization utilities
  await test('10. Date normalization handles Excel serials, ISO dates, and slashes', () => {
    assert(normalizeExcelDate('2026-10-09') === '2026-10-09', 'ISO date');
    assert(normalizeExcelDate('2026/10/09') === '2026-10-09', 'Slash date');
    assert(isValidIsoDate('2026-10-09') === true, 'Valid date check');
    assert(isValidIsoDate('2026-02-31') === false, 'Invalid Feb 31 check');
    assert(isValidIsoDate('not-a-date') === false, 'Invalid string check');
  });

  // Test 11: Tasks with different statuses, due dates, and optional/empty fields
  await test('11. Tasks with multiple statuses, due dates, and empty/optional fields round-trip cleanly', async () => {
    const task1Id = 't1111111-1111-1111-1111-111111111111';
    const task2Id = 't2222222-2222-2222-2222-222222222222';
    const task3Id = 't3333333-3333-3333-3333-333333333333';
    const task4Id = 't4444444-4444-4444-4444-444444444444';

    const testTasksData: FullExportData = {
      ...baseData,
      tasks: [
        {
          id: task1Id,
          title: 'Deploy Production Migration',
          status: 'Completed',
          completed: true,
          priority: 'High',
          category: 'engineering',
          date: '2026-10-15',
          due_date: '2026-10-15',
          time: '14:00',
          description: 'Migrate PostgreSQL schemas and indexes with zero downtime',
          assigned_to: 'Vignesh',
          notes: 'Pre-flight checks passed successfully',
          follow_up_date: '2026-10-16',
          created_at: '2026-10-09T08:00:00.000Z',
        },
        {
          id: task2Id,
          title: 'Quarterly Executive Review',
          status: 'In Progress',
          completed: false,
          priority: 'Medium',
          category: 'strategy',
          date: '2026-10-20',
          due_date: '2026-10-20',
          time: '10:00',
          description: 'Prepare visual decks and habit metrics report',
          assigned_to: 'Vignesh',
          notes: 'Review draft with team',
          created_at: '2026-10-09T09:00:00.000Z',
        },
        {
          id: task3Id,
          title: 'Archive Legacy Backups',
          status: 'Pending',
          completed: false,
          priority: 'Low',
          category: 'maintenance',
          date: '2026-10-25',
          due_date: '2026-10-25',
          time: '18:00',
          // Optional fields empty / undefined
          description: undefined,
          notes: '',
          follow_up_date: undefined,
          created_at: '2026-10-09T10:00:00.000Z',
        },
        {
          id: task4Id,
          title: 'Deferred Security Audit',
          status: 'Deferred',
          completed: false,
          priority: 'High',
          category: 'compliance',
          // date omitted to test missing optional date
          date: undefined,
          due_date: undefined,
          created_at: '2026-10-09T11:00:00.000Z',
        },
      ],
    };

    const wb = buildExcelWorkbook(testTasksData);
    assert(wb.SheetNames.includes('tasks'), 'Must include tasks sheet');

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(buf);

    assert(parsed.tasksCount === 4, `Expected 4 parsed tasks, got ${parsed.tasksCount}`);

    const pTask1 = parsed.parsedData.tasks.find((t: any) => t.id === task1Id);
    assert(!!pTask1, 'Task 1 must exist with exact ID');
    assert(pTask1.status === 'Completed', 'Task 1 status Completed');
    assert(pTask1.completed === true, 'Task 1 completed boolean true');
    assert(pTask1.due_date === '2026-10-15', 'Task 1 due date preserved');
    assert(pTask1.priority === 'High', 'Task 1 priority High');
    assert(pTask1.description === 'Migrate PostgreSQL schemas and indexes with zero downtime', 'Task 1 description preserved');

    const pTask2 = parsed.parsedData.tasks.find((t: any) => t.id === task2Id);
    assert(!!pTask2, 'Task 2 must exist with exact ID');
    assert(pTask2.status === 'In Progress', 'Task 2 status In Progress');
    assert(pTask2.completed === false, 'Task 2 completed boolean false');
    assert(pTask2.due_date === '2026-10-20', 'Task 2 due date preserved');

    const pTask3 = parsed.parsedData.tasks.find((t: any) => t.id === task3Id);
    assert(!!pTask3, 'Task 3 with empty optional fields must parse cleanly');
    assert(pTask3.status === 'Pending', 'Task 3 status Pending');
    assert(pTask3.due_date === '2026-10-25', 'Task 3 due date preserved');

    const pTask4 = parsed.parsedData.tasks.find((t: any) => t.id === task4Id);
    assert(!!pTask4, 'Task 4 must exist with exact ID');
    assert(pTask4.status === 'Deferred', 'Task 4 status Deferred preserved');
  });

  // Test 12: Journal entries from different dates and multiline text
  await test('12. Daily journal entries from different dates with multiline text & Markdown preserved', async () => {
    const journal1Date = '2026-10-09';
    const journal2Date = '2026-10-10';
    const journal3Date = '2026-10-11';

    const multilineJournalContent = `# Daily Reflection & Execution Plan

Today was a remarkably focused and productive deep work day.

## Key Wins
1. Completed full relational database migration for all entities.
2. Verified multi-sheet workbook export and import round-trip.
3. Maintained 100% habit streak across morning fitness and deep coding.

> "Discipline is choosing between what you want now and what you want most." — Abraham Lincoln

### Challenges & Adjustments
- Need to ensure bedtime wind-down starts by 22:30.
- Tomorrow's #1 priority: Executive review presentation.`;

    const testJournalData: FullExportData = {
      ...baseData,
      daily_journal: [
        {
          id: 'j1111111-1111-1111-1111-111111111111',
          date: journal1Date,
          title: 'Day 1: Solid Foundation',
          content: 'Started sprint with high momentum and clear focus.',
          mood: 'great',
          energy_level: 5,
          productivity: 5,
          highlights: 'Morning workout hit new personal record',
          gratitude: 'Grateful for health, supportive peers, and continuous learning',
          wins: 'Shipped task module',
          challenges: 'Afternoon fatigue',
          priorities: 'Rest well tonight',
          tags: ['#sprint', '#focus', '#habits'],
          created_at: '2026-10-09T08:00:00.000Z',
        },
        {
          id: 'j2222222-2222-2222-2222-222222222222',
          date: journal2Date,
          title: 'Day 2: Deep Work & Multiline Synthesis',
          content: multilineJournalContent,
          mood: 'excellent',
          energy_level: 5,
          productivity: 5,
          highlights: 'Deep work block uninterrupted for 3 hours',
          gratitude: 'Clarity of mind and structured thinking',
          wins: 'Relational engine complete',
          challenges: 'None',
          priorities: 'Ship milestone',
          tags: ['#productivity', '#reflection'],
          created_at: '2026-10-10T08:00:00.000Z',
        },
        {
          id: 'j3333333-3333-3333-3333-333333333333',
          date: journal3Date,
          // Optional fields empty to test graceful fallback
          title: 'Day 3: Quiet Reset',
          content: 'Rest day and weekly review planning.',
          mood: undefined,
          energy_level: undefined,
          created_at: '2026-10-11T08:00:00.000Z',
        },
      ],
    };

    const wb = buildExcelWorkbook(testJournalData);
    assert(wb.SheetNames.includes('daily_journal'), 'Must include daily_journal sheet');

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(buf);

    assert(parsed.journalCount === 3, `Expected 3 journal entries, got ${parsed.journalCount}`);

    const pJ1 = parsed.parsedData.daily_journal.find((j: any) => j.date === journal1Date);
    assert(!!pJ1, 'Journal 1 found by date');
    assert(pJ1.title === 'Day 1: Solid Foundation', 'Journal 1 title preserved');
    assert(pJ1.mood === 'great', 'Journal 1 mood preserved');
    assert(pJ1.energy_level === 5, 'Journal 1 energy_level preserved');

    const pJ2 = parsed.parsedData.daily_journal.find((j: any) => j.date === journal2Date);
    assert(!!pJ2, 'Journal 2 found by date');
    assert(pJ2.title === 'Day 2: Deep Work & Multiline Synthesis', 'Journal 2 title preserved');
    // Ensure multiline content preserved including newlines and Markdown structure
    assert(pJ2.content.includes('# Daily Reflection & Execution Plan'), 'Markdown heading preserved');
    assert(pJ2.content.includes('## Key Wins'), 'Markdown section preserved');
    assert(pJ2.content.includes('> "Discipline is choosing'), 'Markdown blockquote preserved');
    assert(pJ2.content.includes('\n'), 'Newlines in multiline text preserved');

    const pJ3 = parsed.parsedData.daily_journal.find((j: any) => j.date === journal3Date);
    assert(!!pJ3, 'Journal 3 found by date');
    assert(pJ3.content === 'Rest day and weekly review planning.', 'Journal 3 content preserved');
  });

  // Test 13: Notes with Unicode characters, emojis, smart quotes & checklists
  await test('13. Notes with Unicode characters, emojis, smart quotes & checklists round-trip intact', async () => {
    const note1Id = 'n1111111-1111-1111-1111-111111111111';
    const note2Id = 'n2222222-2222-2222-2222-222222222222';

    const unicodeContent = `# 🚀 Digital Second Brain: High-Performance Architecture ✨

“Excellence is not an act, but a habit.” — Will Durant

## 🧠 Core Philosophy
- 🧘 Mindfulness & Clarity: 10 minutes daily breathwork
- 🎯 Intentional Focus: Zero distractions during deep work blocks
- ☕ Café sessions & résumé updates (testing accents: café, résumé, naïve)
- 🌏 Internationalization: 日本語テスト • தமிழ் • Español • Deutsch

### Checklist Items
- [x] Read chapter 4 of Atomic Habits
- [ ] Review sprint backlog
- [x] Drink 3L water`;

    const testNotesData: FullExportData = {
      ...baseData,
      notes: [
        {
          id: note1Id,
          title: '🚀 Second Brain & High-Performance Rituals ✨',
          content: unicodeContent,
          category: 'Personal Development',
          type: 'note',
          tags: ['#habits', '#unicode', '#excellence'],
          pinned: true,
          favorite: true,
          archived: false,
          color: '#10B981',
          created_at: '2026-10-09T10:00:00.000Z',
          updated_at: '2026-10-09T12:00:00.000Z',
        },
        {
          id: note2Id,
          title: 'Grocery & Essentials Checklist 🛒',
          content: 'Weekly healthy essentials',
          type: 'checklist',
          checklist: [
            { id: 'chk-1', text: 'Avocados & Organic Berries 🥑', completed: true },
            { id: 'chk-2', text: 'Greek Yogurt & Almonds 🥜', completed: false },
            { id: 'chk-3', text: 'Green Tea & Sparkling Water 🍵', completed: true },
          ],
          tags: ['#shopping', '#health'],
          pinned: false,
          favorite: false,
          archived: false,
          color: 'default',
          created_at: '2026-10-09T11:00:00.000Z',
        },
      ],
    };

    const wb = buildExcelWorkbook(testNotesData);
    assert(wb.SheetNames.includes('notes'), 'Must include notes sheet');

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(buf);

    assert(parsed.notesCount === 2, `Expected 2 notes, got ${parsed.notesCount}`);

    const pNote1 = parsed.parsedData.notes.find((n: any) => n.id === note1Id);
    assert(!!pNote1, 'Note 1 found by ID');
    assert(pNote1.title.includes('🚀') && pNote1.title.includes('✨'), 'Note 1 emojis in title preserved');
    assert(pNote1.content.includes('“Excellence is not an act, but a habit.”'), 'Smart curly quotes preserved');
    assert(pNote1.content.includes('café, résumé, naïve'), 'Accented characters preserved');
    assert(pNote1.content.includes('日本語テスト'), 'CJK Unicode characters preserved');
    assert(pNote1.pinned === true, 'Note 1 pinned boolean preserved');
    assert(pNote1.favorite === true, 'Note 1 favorite boolean preserved');

    const pNote2 = parsed.parsedData.notes.find((n: any) => n.id === note2Id);
    assert(!!pNote2, 'Note 2 found by ID');
    assert(pNote2.title.includes('🛒'), 'Note 2 emoji preserved');
    assert(Array.isArray(pNote2.checklist), 'Note 2 checklist parsed as array');
    assert(pNote2.checklist.length === 3, 'Note 2 checklist item count 3');
    assert(pNote2.checklist[0].text.includes('🥑'), 'Checklist emoji preserved');
    assert(pNote2.checklist[0].completed === true, 'Checklist item completion preserved');
  });

  // Test 14: Comprehensive round-trip equality (IDs, field values, record counts)
  await test('14. Full relational dataset round-trip satisfies complete ID, field value, and count equality', async () => {
    const fullComprehensiveData: FullExportData = {
      app: 'Vignesh Habit Tracker',
      version: '3.0',
      exported_at: '2026-10-09T12:00:00.000Z',
      habits: baseData.habits,
      habit_entries: baseData.habit_entries,
      goals: baseData.goals,
      mood_tracker: baseData.mood_tracker,
      daily_journal: [
        {
          id: 'j-roundtrip-1',
          date: '2026-10-09',
          title: 'Roundtrip Test Entry',
          content: 'Line 1: Beginning\nLine 2: Middle paragraph\nLine 3: Conclusion',
          mood: 'great',
          energy_level: 4,
          created_at: '2026-10-09T08:00:00.000Z',
        },
      ],
      weekly_plans: baseData.weekly_plans,
      weekly_reviews: baseData.weekly_reviews,
      reflections: baseData.reflections,
      habit_categories: baseData.habit_categories,
      affirmations: [
        {
          id: 'aff-roundtrip-1',
          quote: 'Consistency is the DNA of mastery.',
          author: 'Robin Sharma',
          active: true,
          created_at: '2026-10-09T08:00:00.000Z',
        },
      ],
      tasks: [
        {
          id: 'task-roundtrip-1',
          title: 'Full Stack Integration',
          category: 'engineering',
          priority: 'High',
          status: 'Completed',
          completed: true,
          date: '2026-10-15',
          due_date: '2026-10-15',
          notes: 'Tested and verified',
          created_at: '2026-10-09T08:00:00.000Z',
        },
      ],
      notes: [
        {
          id: 'note-roundtrip-1',
          title: 'Knowledge Base 💡',
          content: 'Key concepts:\n- Atomic commits\n- Immutable records\n- Fast roundtrips ⚡',
          type: 'note',
          pinned: true,
          created_at: '2026-10-09T08:00:00.000Z',
        },
      ],
      settings: {
        theme: 'light',
        auto_lock_minutes: 15,
        week_start: 'sunday',
      },
    };

    const wb = buildExcelWorkbook(fullComprehensiveData);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const cleanDataset = await parseExcelFile(buf);

    // Record counts
    assert(cleanDataset.habitsCount === fullComprehensiveData.habits.length, 'Habits count equality');
    assert(cleanDataset.entriesCount === fullComprehensiveData.habit_entries.length, 'Entries count equality');
    assert(cleanDataset.goalsCount === fullComprehensiveData.goals.length, 'Goals count equality');
    assert(cleanDataset.moodsCount === fullComprehensiveData.mood_tracker.length, 'Moods count equality');
    assert(cleanDataset.journalCount === fullComprehensiveData.daily_journal.length, 'Journal count equality');
    assert(cleanDataset.plansCount === fullComprehensiveData.weekly_plans.length, 'Plans count equality');
    assert(cleanDataset.reviewsCount === fullComprehensiveData.weekly_reviews.length, 'Reviews count equality');
    assert(cleanDataset.reflectionsCount === fullComprehensiveData.reflections.length, 'Reflections count equality');
    assert(cleanDataset.categoriesCount === fullComprehensiveData.habit_categories!.length, 'Categories count equality');
    assert(cleanDataset.affirmationsCount === fullComprehensiveData.affirmations!.length, 'Affirmations count equality');
    assert(cleanDataset.tasksCount === fullComprehensiveData.tasks!.length, 'Tasks count equality');
    assert(cleanDataset.notesCount === fullComprehensiveData.notes!.length, 'Notes count equality');

    // ID and field preservation for every entity
    assert(cleanDataset.parsedData.habits[0].id === fullComprehensiveData.habits[0].id, 'Habit ID equal');
    assert(cleanDataset.parsedData.habits[0].name === fullComprehensiveData.habits[0].name, 'Habit name equal');
    assert(cleanDataset.parsedData.habit_entries[0].id === fullComprehensiveData.habit_entries[0].id, 'Entry ID equal');
    assert(cleanDataset.parsedData.goals[0].id === fullComprehensiveData.goals[0].id, 'Goal ID equal');
    assert(cleanDataset.parsedData.tasks[0].id === 'task-roundtrip-1', 'Task ID equal');
    assert(cleanDataset.parsedData.tasks[0].status === 'Completed', 'Task status equal');
    assert(cleanDataset.parsedData.notes[0].id === 'note-roundtrip-1', 'Note ID equal');
    assert(cleanDataset.parsedData.notes[0].title === 'Knowledge Base 💡', 'Note title equal');
    assert(cleanDataset.parsedData.affirmations![0].id === 'aff-roundtrip-1', 'Affirmation ID equal');
    assert(cleanDataset.parsedData.affirmations![0].quote === 'Consistency is the DNA of mastery.', 'Affirmation quote equal');
  });

  // Test 15: Selected worksheets mode validation
  await test('15. Selected worksheets export and import only contains specified tables without side effects', async () => {
    const customExport = buildExcelWorkbook(baseData, {
      selectedTables: ['tasks', 'goals'],
    });

    assert(customExport.SheetNames.includes('tasks'), 'Selected tasks sheet included');
    assert(customExport.SheetNames.includes('goals'), 'Selected goals sheet included');
    assert(!customExport.SheetNames.includes('habits'), 'Unselected habits sheet excluded');
    assert(!customExport.SheetNames.includes('mood_tracker'), 'Unselected mood_tracker sheet excluded');

    const buf = XLSX.write(customExport, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(buf);

    assert(parsed.goalsCount === 1, 'Goals parsed from selected sheet');
    assert(parsed.habitsCount === 0, 'Habits 0 since sheet omitted');
    assert(parsed.moodsCount === 0, 'Moods 0 since sheet omitted');
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
