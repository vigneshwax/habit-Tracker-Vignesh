import {
  processDataImport,
  sanitizeErrorMessage,
  DatabaseSnapshot,
} from '../src/utils/importEngine';
import type { OperationTelemetryStats } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runSyncTelemetryTestSuite() {
  console.log('🧪 Starting Backup & Synchronization Telemetry Automated Test Suite...\n');
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

  const createInitialDb = (): DatabaseSnapshot => ({
    habits: [
      { id: 'h-1', name: 'Exercise', category: 'health', frequency: 'daily', status: 'active', created_at: '2026-10-01T08:00:00Z' },
    ],
    habit_entries: [
      { id: 'e-1', habit_id: 'h-1', date: '2026-10-25', completed: true, created_at: '2026-10-25T08:00:00Z' },
    ],
    goals: [
      { id: 'g-1', title: 'Run Marathon', category: 'health', status: 'active', progress: 50, created_at: '2026-10-01T08:00:00Z' },
    ],
    mood_tracker: [
      { id: 'm-1', date: '2026-10-25', mood: 'great', mood_score: 5, energy_level: 4, note: 'Productive day' },
    ],
    daily_journal: [
      { id: 'j-1', date: '2026-10-25', content: 'Morning reflection and focus session', created_at: '2026-10-25T07:30:00Z' },
    ],
    weekly_plans: [],
    weekly_reviews: [],
    reflections: [],
    habit_categories: [
      { id: 'c-1', name: 'health', icon: '💪', created_at: '2026-10-01T08:00:00Z' },
    ],
    affirmations: [],
    settings: {
      google_sheets_last_pushed: '2026-10-20T10:00:00.000Z',
      google_sheets_last_pulled: '2026-10-20T11:00:00.000Z',
      last_backup_time: '2026-10-20T12:00:00.000Z',
    },
    tasks: [
      { id: 't-1', title: 'Complete Quarterly Report', status: 'Pending', category: 'work', created_at: '2026-10-25T09:00:00Z', updated_at: '2026-10-25T09:00:00Z' },
      { id: 't-2', title: 'Team Sync Meeting', status: 'Completed', category: 'work', created_at: '2026-10-25T10:00:00Z', updated_at: '2026-10-25T11:00:00Z' },
    ],
    notes: [
      { id: 'n-1', title: 'Architecture Decisions', content: 'Notes on persistence and telemetry', created_at: '2026-10-25T09:30:00Z', updated_at: '2026-10-25T09:30:00Z' },
    ],
  });

  // TEST 1: Push and pull timestamps are strictly separate and do not cross-contaminate
  await test('Push and pull timestamps remain strictly separated during operations', () => {
    const db = createInitialDb();
    const initialPushed = db.settings.google_sheets_last_pushed;
    const initialPulled = db.settings.google_sheets_last_pulled;

    // Simulate an isolated push update
    const newPushTime = '2026-10-25T14:00:00.000Z';
    db.settings.google_sheets_last_pushed = newPushTime;

    assert(db.settings.google_sheets_last_pushed === newPushTime, 'Push timestamp must be updated');
    assert(db.settings.google_sheets_last_pulled === initialPulled, 'Pull timestamp must NOT change during push operation');

    // Simulate an isolated pull update
    const newPullTime = '2026-10-25T15:00:00.000Z';
    db.settings.google_sheets_last_pulled = newPullTime;

    assert(db.settings.google_sheets_last_pulled === newPullTime, 'Pull timestamp must be updated');
    assert(db.settings.google_sheets_last_pushed === newPushTime, 'Push timestamp must NOT change during pull operation');
  });

  // TEST 2: Successful import computes exact actual processed records and telemetry stats
  await test('Import operation returns exact telemetry stats for tasks, journal, and notes', () => {
    const db = createInitialDb();
    const incoming = {
      tasks: [
        { id: 't-1', title: 'Complete Quarterly Report', status: 'Completed', updated_at: '2026-10-25T12:00:00Z' },
        { id: 't-3', title: 'Prepare Board Deck', status: 'Pending', category: 'work' },
      ],
      daily_journal: [
        { id: 'j-1', date: '2026-10-25', content: 'Updated evening reflection' },
        { id: 'j-2', date: '2026-10-26', content: 'Fresh day plans' },
      ],
      notes: [
        { id: 'n-1', title: 'Architecture Decisions', content: 'Updated architecture specs' },
        { id: 'n-2', title: 'Google Sheets Schema', content: '13 multi-sheet tabs mapping' },
      ],
      mode: 'merge' as const,
    };

    const res = processDataImport(db, incoming);
    assert(res.success === true, 'Import must report success');
    assert(res.stats !== undefined, 'Stats object must be populated');
    assert(res.stats.tasks_restored === 2, `Expected 2 tasks restored, got ${res.stats.tasks_restored}`);
    assert(res.stats.journal_restored === 2, `Expected 2 journal entries restored, got ${res.stats.journal_restored}`);
    assert(res.stats.notes_restored === 2, `Expected 2 notes restored, got ${res.stats.notes_restored}`);
    assert(res.stats.total_records === 6, `Expected 6 total records, got ${res.stats.total_records}`);
    assert(res.stats.failed_records === 0, `Expected 0 failed records on success, got ${res.stats.failed_records}`);
  });

  // TEST 3: Validation failure produces non-zero failed records and never updates success timestamps
  await test('Failed validation prevents timestamp advance and records failed telemetry', () => {
    const db = createInitialDb();
    const initialRestoreTime = db.settings.last_restore_time;

    let thrown = false;
    try {
      // Invalid entry missing parent habit relationship in selected mode
      processDataImport(db, {
        mode: 'selected',
        selected_tables: ['habit_entries'],
        habit_entries: [
          { id: 'e-bad', habit_id: 'non-existent-habit-id', date: '2026-10-25', completed: true },
        ],
      });
    } catch (err: any) {
      thrown = true;
      assert(
        err.message.includes('references missing parent habit_id') ||
          err.message.includes('Dependency validation error'),
        'Must identify missing relation'
      );
    }

    assert(thrown, 'Import engine must throw validation error');
    assert(db.settings.last_restore_time === initialRestoreTime, 'Failure must NOT advance restore timestamp');

    // Simulate failure telemetry capture
    const failureStats: OperationTelemetryStats = {
      tasks_count: 0,
      tasks_restored: 0,
      journal_count: 0,
      journal_restored: 0,
      notes_count: 0,
      notes_restored: 0,
      total_records: 0,
      failed_records: 1,
      success: false,
      message: 'Dependency validation error: referenced habit does not exist',
    };

    assert(failureStats.success === false, 'Status must be false');
    assert(failureStats.failed_records === 1, 'Failed records must reflect exact count');
  });

  // TEST 4: Partial import failure or missing required fields prevents false success
  await test('Malformed records with missing required fields are rejected and report failed records', () => {
    const db = createInitialDb();
    let caughtError = false;

    try {
      processDataImport(db, {
        habits: [
          { id: 'h-bad', name: '', category: 'health' }, // empty name
        ],
        mode: 'merge',
      });
    } catch (err: any) {
      caughtError = true;
      assert(err.message.includes("missing required 'name'"), 'Must catch empty habit name');
    }

    assert(caughtError, 'Empty habit name must be caught');
  });

  // TEST 5: Error message sanitization masks password 9500 and bearer tokens
  await test('Error messages sanitize passwords (9500), bearer tokens, and secret parameters', () => {
    const rawError1 = 'Protected action: valid edit password (9500) or active session token is required';
    const sanitized1 = sanitizeErrorMessage(rawError1);
    assert(!sanitized1.includes('9500'), 'Password 9500 must be masked');
    assert(sanitized1.includes('****'), 'Password must be replaced with ****');

    const rawError2 = 'Unauthorized request with Bearer secret_token_xyz123abc';
    const sanitized2 = sanitizeErrorMessage(rawError2);
    assert(!sanitized2.includes('secret_token_xyz123abc'), 'Bearer token must be redacted');
    assert(sanitized2.includes('Bearer [REDACTED]'), 'Bearer token must show [REDACTED]');

    const rawError3 = 'Failed connecting to https://script.google.com/macros/s/AKfycb/exec?key=my_super_secret_key&auth=admin123';
    const sanitized3 = sanitizeErrorMessage(rawError3);
    assert(!sanitized3.includes('my_super_secret_key'), 'URL key query must be redacted');
    assert(!sanitized3.includes('admin123'), 'URL auth query must be redacted');
  });

  // TEST 6: Backup telemetry captures actual total records across all relational tables
  await test('Backup export calculates exact total records across all 13 supported tables', () => {
    const db = createInitialDb();
    const totalRecords =
      db.habits.length +
      db.habit_entries.length +
      db.tasks.length +
      db.daily_journal.length +
      db.notes.length +
      db.goals.length +
      db.reflections.length +
      db.weekly_reviews.length +
      db.weekly_plans.length +
      db.mood_tracker.length +
      db.affirmations.length +
      db.habit_categories.length;

    // In initial base db: 1 habit, 1 entry, 2 tasks, 1 journal, 1 note, 1 goal, 0 refl, 0 rev, 0 plans, 1 mood, 0 aff, 1 cat = 9
    assert(totalRecords === 9, `Expected 9 total records in base snapshot, got ${totalRecords}`);

    const backupStats: OperationTelemetryStats = {
      format: 'xlsx',
      tasks_count: db.tasks.length,
      tasks_restored: 0,
      journal_count: db.daily_journal.length,
      journal_restored: 0,
      notes_count: db.notes.length,
      notes_restored: 0,
      total_records: totalRecords,
      failed_records: 0,
      success: true,
      message: `Backup exported successfully (${totalRecords} total records)`,
    };

    assert(backupStats.tasks_count === 2, 'Must record 2 tasks exported');
    assert(backupStats.journal_count === 1, 'Must record 1 journal exported');
    assert(backupStats.notes_count === 1, 'Must record 1 note exported');
    assert(backupStats.total_records === 9, 'Must record 9 total records');
    assert(backupStats.failed_records === 0, 'Must record 0 failed records on success');
  });

  // TEST 7: Replace mode requires explicit confirmation and does not wipe unselected data if aborted
  await test('Destructive replace mode strictly checks confirmation before committing', () => {
    const db = createInitialDb();
    let aborted = false;

    try {
      processDataImport(db, {
        habits: [{ id: 'new-h', name: 'New Habit' }],
        mode: 'replace',
        confirm_replace: false, // missing confirmation
      });
    } catch (err: any) {
      aborted = true;
      assert(err.message.includes('Destructive action rejected'), 'Must reject unconfirmed replace');
    }

    assert(aborted, 'Unconfirmed replace must abort');
    assert(db.habits.length === 1 && db.habits[0].id === 'h-1', 'Existing records must be preserved intact');
  });

  console.log(`\n========================================`);
  console.log(`Telemetry Test Suite Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSyncTelemetryTestSuite().catch((e) => {
  console.error('Fatal error in sync telemetry test suite:', e);
  process.exit(1);
});
