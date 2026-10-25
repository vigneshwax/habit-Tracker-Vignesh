import {
  processDataImport,
  isValidDateValue,
  DatabaseSnapshot,
  ImportPayload,
} from '../src/utils/importEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runImportRestorationTestSuite() {
  console.log('🧪 Starting Import & Restoration Logic Automated Test Suite...\n');
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

  // Base database snapshot used across test setups
  const createBaseDb = (): DatabaseSnapshot => ({
    habits: [
      {
        id: 'habit-101',
        name: 'Morning Meditation',
        category: 'mindfulness',
        frequency: 'daily',
        status: 'active',
        priority: 'high',
        created_at: '2026-10-01T08:00:00.000Z',
      },
      {
        id: 'habit-102',
        name: 'Daily Hydration (3L)',
        category: 'health',
        frequency: 'daily',
        status: 'active',
        priority: 'medium',
        created_at: '2026-10-01T08:00:00.000Z',
      },
    ],
    habit_entries: [
      {
        id: 'entry-201',
        habit_id: 'habit-101',
        date: '2026-10-20',
        completed: true,
        notes: 'Felt calm and centered',
        created_at: '2026-10-20T09:00:00.000Z',
      },
      {
        id: 'entry-202',
        habit_id: 'habit-102',
        date: '2026-10-20',
        completed: false,
        created_at: '2026-10-20T21:00:00.000Z',
      },
    ],
    goals: [
      {
        id: 'goal-301',
        title: 'Run Half Marathon',
        category: 'health',
        progress: 60,
        status: 'active',
        target_date: '2026-12-15',
        created_at: '2026-10-01T00:00:00.000Z',
      },
    ],
    mood_tracker: [
      {
        id: 'mood-401',
        date: '2026-10-20',
        mood: 'energized',
        mood_score: 5,
        energy_level: 4,
        note: 'Productive morning workout',
        created_at: '2026-10-20T18:00:00.000Z',
      },
    ],
    daily_journal: [
      {
        id: 'journal-501',
        date: '2026-10-20',
        content: '# Daily Reflections\n\n- Completed habit engine testing.\n- Strong focus throughout.',
        created_at: '2026-10-20T20:00:00.000Z',
      },
    ],
    weekly_plans: [
      {
        id: 'plan-601',
        year: 2026,
        month: 10,
        week_number: 43,
        main_goal: 'Deliver Google Sheets sync & transactional import',
        target_percentage: 85,
        created_at: '2026-10-19T08:00:00.000Z',
      },
    ],
    weekly_reviews: [
      {
        id: 'review-701',
        year: 2026,
        month: 10,
        week_number: 43,
        went_well: 'Completed all core database endpoints',
        challenges: 'Ensuring backward compatibility with legacy spreadsheets',
        score: 9,
        created_at: '2026-10-25T18:00:00.000Z',
      },
    ],
    reflections: [
      {
        id: 'refl-801',
        year: 2026,
        month: 10,
        content: 'October was a strong month of systematic building and feature stabilization.',
        created_at: '2026-10-25T20:00:00.000Z',
      },
    ],
    habit_categories: [
      { id: 'cat-901', name: 'Mindfulness', icon: '🧘', created_at: '2026-10-01T00:00:00.000Z' },
      { id: 'cat-902', name: 'Health', icon: '🏃', created_at: '2026-10-01T00:00:00.000Z' },
    ],
    affirmations: [
      {
        id: 'aff-1001',
        quote: 'Consistency beats intensity over time.',
        author: 'Vignesh',
        active: true,
        created_at: '2026-10-01T00:00:00.000Z',
      },
    ],
    settings: {
      theme: 'light',
      week_start: 'sunday',
      default_view: 'today',
    },
    tasks: [
      {
        id: 'task-1101',
        title: 'Complete Google Sheets Apps Script testing',
        category: 'Engineering',
        priority: 'High',
        status: 'In Progress',
        date: '2026-10-25',
        assignedTo: 'Vignesh',
        notes: 'Verify 13 relational worksheets',
        created_at: '2026-10-25T08:00:00.000Z',
        updated_at: '2026-10-25T08:00:00.000Z',
      },
    ],
    notes: [
      {
        id: 'note-1201',
        title: 'Relational Schema Rules',
        content: 'Primary keys are UUIDs. habit_entries must reference habits.id.',
        type: 'note',
        pinned: true,
        created_at: '2026-10-25T09:00:00.000Z',
        updated_at: '2026-10-25T09:00:00.000Z',
      },
    ],
  });

  // =========================================================================
  // TEST 1: Importing the same backup twice does not create duplicates (Merge Mode Idempotency)
  // =========================================================================
  console.log('--- TEST GROUP 1: Idempotency & Duplicate Prevention ---');

  await test('Importing identical backup payload twice results in zero duplicate records', () => {
    const initialDb = createBaseDb();
    const backupPayload: ImportPayload = {
      mode: 'merge',
      habits: [
        {
          id: 'habit-101',
          name: 'Morning Meditation',
          category: 'mindfulness',
          frequency: 'daily',
        },
        {
          id: 'habit-103',
          name: 'Read 20 Pages',
          category: 'learning',
          frequency: 'daily',
        },
      ],
      habit_entries: [
        {
          id: 'entry-201',
          habit_id: 'habit-101',
          date: '2026-10-20',
          completed: true,
        },
        {
          id: 'entry-203',
          habit_id: 'habit-103',
          date: '2026-10-21',
          completed: true,
        },
      ],
      tasks: [
        {
          id: 'task-1101',
          title: 'Complete Google Sheets Apps Script testing',
          date: '2026-10-25',
          status: 'Completed',
          completed: true,
        },
        {
          id: 'task-1102',
          title: 'Review quarterly architecture plan',
          date: '2026-10-26',
          status: 'Pending',
        },
      ],
      daily_journal: [
        {
          id: 'journal-501',
          date: '2026-10-20',
          content: '# Daily Reflections\n\nUpdated with new insights.',
        },
        {
          id: 'journal-502',
          date: '2026-10-21',
          content: 'Productive day working on task management.',
        },
      ],
    };

    // First import
    const result1 = processDataImport(initialDb, backupPayload);
    assert(result1.newDb.habits.length === 3, 'Expected 3 habits after 1st import');
    assert(result1.newDb.habit_entries.length === 3, 'Expected 3 entries after 1st import');
    assert(result1.newDb.tasks.length === 2, 'Expected 2 tasks after 1st import');
    assert(result1.newDb.daily_journal.length === 2, 'Expected 2 journals after 1st import');

    // Second import with the exact same backup payload
    const result2 = processDataImport(result1.newDb, backupPayload);
    assert(result2.newDb.habits.length === 3, `Expected still 3 habits, got ${result2.newDb.habits.length}`);
    assert(result2.newDb.habit_entries.length === 3, `Expected still 3 entries, got ${result2.newDb.habit_entries.length}`);
    assert(result2.newDb.tasks.length === 2, `Expected still 2 tasks, got ${result2.newDb.tasks.length}`);
    assert(result2.newDb.daily_journal.length === 2, `Expected still 2 journals, got ${result2.newDb.daily_journal.length}`);

    // Verify values updated in-place without duplicate entries
    const updatedJournal = result2.newDb.daily_journal.find((j) => j.id === 'journal-501');
    assert(
      updatedJournal?.content.includes('Updated with new insights'),
      'Existing record content was successfully updated'
    );
  });

  await test('Natural composite key fallback matches existing records even if ID was unassigned in import file', () => {
    const initialDb = createBaseDb();
    const payloadWithoutIds: ImportPayload = {
      mode: 'merge',
      habit_entries: [
        // No 'id', but habit_id + date matches existing entry-201
        {
          habit_id: 'habit-101',
          date: '2026-10-20',
          completed: true,
          notes: 'Updated notes via natural composite key matching',
        },
      ],
      daily_journal: [
        // No 'id', but date matches existing journal-501
        {
          date: '2026-10-20',
          content: 'Updated content matching via date composite key',
        },
      ],
    };

    const res = processDataImport(initialDb, payloadWithoutIds);
    assert(res.newDb.habit_entries.length === 2, 'Composite key match must not create duplicate entry');
    assert(res.newDb.daily_journal.length === 1, 'Composite key match must not create duplicate journal');
    assert(
      res.newDb.habit_entries.find((e) => e.habit_id === 'habit-101' && e.date === '2026-10-20')?.notes ===
        'Updated notes via natural composite key matching',
      'Entry notes correctly merged'
    );
  });

  // =========================================================================
  // TEST 2: Selected-table imports preserve unrelated data
  // =========================================================================
  console.log('\n--- TEST GROUP 2: Selected-Table Mode Data Preservation ---');

  await test('Selected-table import for tasks leaves habits, goals, entries, journals untouched', () => {
    const initialDb = createBaseDb();
    const initialHabitsCount = initialDb.habits.length;
    const initialGoalsCount = initialDb.goals.length;
    const initialJournalCount = initialDb.daily_journal.length;
    const initialNotesCount = initialDb.notes.length;

    const payload: ImportPayload = {
      mode: 'selected',
      selected_tables: ['tasks'],
      tasks: [
        {
          id: 'task-1103',
          title: 'Implement unit testing suite',
          category: 'Engineering',
          priority: 'High',
          status: 'Completed',
          completed: true,
          date: '2026-10-25',
        },
      ],
    };

    const result = processDataImport(initialDb, payload);

    assert(result.newDb.tasks.length === 2, 'New task added to tasks table');
    assert(result.newDb.habits.length === initialHabitsCount, 'Habits preserved without modification');
    assert(result.newDb.goals.length === initialGoalsCount, 'Goals preserved without modification');
    assert(result.newDb.daily_journal.length === initialJournalCount, 'Journals preserved without modification');
    assert(result.newDb.notes.length === initialNotesCount, 'Notes preserved without modification');
    assert(
      result.newDb.habits[0].name === initialDb.habits[0].name,
      'Habit data integrity preserved exactly'
    );
  });

  await test('Selected-table import with alias table names (e.g. categories for habit_categories) preserves unselected data', () => {
    const initialDb = createBaseDb();
    const payload: ImportPayload = {
      mode: 'selected',
      selected_tables: ['categories'],
      categories: [
        { id: 'cat-903', name: 'Productivity', icon: '⚡' },
      ],
    };

    const result = processDataImport(initialDb, payload);
    assert(result.newDb.habit_categories.length === 3, 'Category added via alias name');
    assert(result.newDb.tasks.length === initialDb.tasks.length, 'Tasks table untouched');
    assert(result.newDb.daily_journal.length === initialDb.daily_journal.length, 'Journals table untouched');
  });

  // =========================================================================
  // TEST 3: Failed imports do not erase or corrupt existing records (Atomic Rollback)
  // =========================================================================
  console.log('\n--- TEST GROUP 3: Pre-Commit Validation & Atomic Rollback ---');

  await test('Batch with duplicate primary key IDs throws and original DB remains unchanged', () => {
    const initialDb = createBaseDb();
    const payloadWithDuplicateIds: ImportPayload = {
      mode: 'merge',
      habits: [
        { id: 'dup-id-999', name: 'Habit Alpha' },
        { id: 'dup-id-999', name: 'Habit Beta with same ID' },
      ],
    };

    let caughtError: any = null;
    try {
      processDataImport(initialDb, payloadWithDuplicateIds);
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Expected duplicate primary key validation error');
    assert(caughtError.message.includes('Duplicate primary key ID'), 'Error specifies duplicate ID');
    assert(initialDb.habits.length === 2, 'Initial habits table length is unchanged');
    assert(!initialDb.habits.some((h) => h.id === 'dup-id-999'), 'No corrupt records committed to DB');
  });

  await test('Batch with invalid date (e.g. 2026-02-31) throws and preserves existing state', () => {
    const initialDb = createBaseDb();
    const payloadWithInvalidDate: ImportPayload = {
      mode: 'merge',
      daily_journal: [
        {
          id: 'journal-bad-date',
          date: '2026-02-31', // Non-existent February date
          content: 'This should fail validation.',
        },
      ],
    };

    let caughtError: any = null;
    try {
      processDataImport(initialDb, payloadWithInvalidDate);
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Expected invalid date validation error');
    assert(caughtError.message.includes('invalid date'), 'Error indicates invalid calendar date');
    assert(initialDb.daily_journal.length === 1, 'Daily journal unchanged');
  });

  await test('Batch missing required fields (e.g. habit without name) throws and leaves data intact', () => {
    const initialDb = createBaseDb();
    const payloadMissingName: ImportPayload = {
      mode: 'merge',
      habits: [
        { id: 'habit-invalid', name: '' },
      ],
    };

    let caughtError: any = null;
    try {
      processDataImport(initialDb, payloadMissingName);
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Expected missing required field error');
    assert(caughtError.message.includes("missing required 'name'"), 'Error identifies missing field');
    assert(initialDb.habits.length === 2, 'Existing habits count intact');
  });

  await test('Orphaned foreign key (habit_entries referencing non-existent habit) triggers dependency error', () => {
    const initialDb = createBaseDb();
    const payloadOrphanEntry: ImportPayload = {
      mode: 'selected',
      selected_tables: ['habit_entries'],
      habit_entries: [
        {
          id: 'entry-orphan',
          habit_id: 'non-existent-habit-id-777',
          date: '2026-10-25',
          completed: true,
        },
      ],
    };

    let caughtError: any = null;
    try {
      processDataImport(initialDb, payloadOrphanEntry);
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Expected dependency validation error');
    assert(
      caughtError.message.includes('Dependency validation error') ||
        caughtError.message.includes('references missing parent habit_id'),
      'Error correctly flagged broken foreign key'
    );
    assert(initialDb.habit_entries.length === 2, 'Existing habit entries intact');
  });

  // =========================================================================
  // TEST 4: Merge vs Replace mode rules
  // =========================================================================
  console.log('\n--- TEST GROUP 4: Merge vs Replace Mode Rules ---');

  await test('Replace mode requires explicit confirm_replace: true before destructive commit', () => {
    const initialDb = createBaseDb();
    const unconfirmedReplace: ImportPayload = {
      mode: 'replace',
      confirm_replace: false, // Not confirmed!
      habits: [{ id: 'new-habit-1', name: 'Fresh Habit' }],
    };

    let caughtError: any = null;
    try {
      processDataImport(initialDb, unconfirmedReplace);
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Replace mode must reject without explicit confirmation');
    assert(caughtError.message.includes('destructive operation and requires explicit confirmation'), 'Expected explicit confirmation message');
    assert(initialDb.habits.length === 2, 'Existing habits preserved on unconfirmed replace');
  });

  await test('Replace mode replaces only intended/provided tables, leaving unprovided tables intact', () => {
    const initialDb = createBaseDb();
    const confirmedReplace: ImportPayload = {
      mode: 'replace',
      confirm_replace: true,
      habits: [
        {
          id: 'fresh-habit-1',
          name: 'Completely Replaced Habit',
          status: 'active',
        },
      ],
      // tasks, daily_journal, notes, etc. are NOT provided in this payload
    };

    const res = processDataImport(initialDb, confirmedReplace);
    // Provided table is replaced
    assert(res.newDb.habits.length === 1, 'Habits table was replaced with 1 new record');
    assert(res.newDb.habits[0].name === 'Completely Replaced Habit', 'Habit name is updated');

    // Unprovided tables are strictly preserved
    assert(res.newDb.tasks.length === 1, 'Tasks table remained intact');
    assert(res.newDb.daily_journal.length === 1, 'Daily journal remained intact');
    assert(res.newDb.notes.length === 1, 'Notes table remained intact');
    assert(res.newDb.goals.length === 1, 'Goals table remained intact');
  });

  await test('Merge mode appends new records and updates matching records by ID', () => {
    const initialDb = createBaseDb();
    const mergePayload: ImportPayload = {
      mode: 'merge',
      habits: [
        // Update existing
        {
          id: 'habit-101',
          name: 'Morning Meditation (Updated)',
          priority: 'urgent',
        },
        // Add new
        {
          id: 'habit-104',
          name: 'Evening Journaling',
          category: 'personal',
          frequency: 'daily',
        },
      ],
    };

    const res = processDataImport(initialDb, mergePayload);
    assert(res.newDb.habits.length === 3, 'Habits total increased by 1');
    const updated = res.newDb.habits.find((h) => h.id === 'habit-101');
    assert(updated?.name === 'Morning Meditation (Updated)', 'Matching record updated');
    assert(updated?.priority === 'urgent', 'Matching record fields merged');
    assert(updated?.category === 'mindfulness', 'Original unmentioned fields preserved');
  });

  // =========================================================================
  // TEST 5: Tasks and Journal entries retain content and relationships
  // =========================================================================
  console.log('\n--- TEST GROUP 5: Tasks & Journal Preservation ---');

  await test('Tasks retain multiline notes, priorities, statuses, and due dates', () => {
    const initialDb = createBaseDb();
    const taskPayload: ImportPayload = {
      mode: 'merge',
      tasks: [
        {
          id: 'task-rich-1',
          title: 'Implement Database Migration Script',
          name: 'Implement Database Migration Script',
          description: 'Step 1: Export current schema.\nStep 2: Apply migration changes.\nStep 3: Verify foreign keys.',
          notes: 'Important checklist:\n- [x] Habis table\n- [x] Tasks table\n- [x] Journal table',
          category: 'Infrastructure',
          priority: 'Urgent',
          status: 'Completed',
          completed: true,
          date: '2026-10-25',
          due_date: '2026-10-25',
          time: '04:00 PM',
          assigned_to: 'Vignesh',
          follow_up_date: '2026-10-28',
        },
      ],
    };

    const res = processDataImport(initialDb, taskPayload);
    const importedTask = res.newDb.tasks.find((t) => t.id === 'task-rich-1');
    assert(importedTask !== undefined, 'Task found in new database state');
    assert(importedTask?.description?.includes('Step 2: Apply migration changes.'), 'Multiline description preserved');
    assert(importedTask?.notes?.includes('[x] Journal table'), 'Multiline markdown notes preserved');
    assert(importedTask?.priority === 'Urgent', 'Priority preserved');
    assert(importedTask?.completed === true, 'Completed boolean preserved');
    assert(importedTask?.status === 'Completed', 'Status string preserved');
    assert(importedTask?.date === '2026-10-25', 'Due date preserved');
    assert(importedTask?.follow_up_date === '2026-10-28', 'Follow-up date preserved');
  });

  await test('Daily Journal entries retain multiline markdown, unicode, and date keys', () => {
    const initialDb = createBaseDb();
    const richMarkdownContent = `# Weekly Retrospective 🚀\n\n### Key Accomplishments:\n1. Fixed Google Sheets 2-way sync with full 13-worksheet parity.\n2. Built transactional pre-commit rollback import engine.\n3. Zero data loss on failed imports.\n\n> "Consistency is the foundation of excellence."\n\n- Mood: 😊 Energized\n- Focus score: 10/10`;

    const journalPayload: ImportPayload = {
      mode: 'merge',
      daily_journal: [
        {
          id: 'journal-rich-1',
          date: '2026-10-25',
          content: richMarkdownContent,
        },
      ],
    };

    const res = processDataImport(initialDb, journalPayload);
    const importedJournal = res.newDb.daily_journal.find((j) => j.id === 'journal-rich-1');
    assert(importedJournal !== undefined, 'Journal found in new database state');
    assert(importedJournal?.content.includes('🚀'), 'Unicode emojis preserved');
    assert(importedJournal?.content.includes('### Key Accomplishments:'), 'Markdown headers preserved');
    assert(importedJournal?.content.includes('😊 Energized'), 'Unicode symbols preserved');
    assert(importedJournal?.date === '2026-10-25', 'Date preserved');
  });

  await test('Date format validator correctly identifies valid vs malformed dates', () => {
    assert(isValidDateValue('2026-10-25') === true, 'Valid ISO date accepted');
    assert(isValidDateValue('2026-02-28') === true, 'Valid Feb date accepted');
    assert(isValidDateValue('2026-02-30') === false, 'Invalid Feb 30 rejected');
    assert(isValidDateValue('2026-13-01') === false, 'Month 13 rejected');
    assert(isValidDateValue('2026-04-31') === false, 'April 31 rejected');
    assert(isValidDateValue('not-a-date') === false, 'Garbage string rejected');
    assert(isValidDateValue(undefined) === true, 'Optional date permitted');
  });

  console.log('\n======================================================');
  console.log(`🏁 Test Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runImportRestorationTestSuite().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
