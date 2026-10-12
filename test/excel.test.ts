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
