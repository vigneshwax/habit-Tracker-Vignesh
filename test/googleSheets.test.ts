import assert from 'node:assert';
import {
  CENTRAL_DATA_SCHEMA,
  ORDERED_TABLE_NAMES,
  SCHEMA_VERSION,
  validateDatabaseTables,
  formatDateIso,
  parseBooleanValue,
} from '../src/utils/dataSchema';
import {
  validateGoogleSheetsImport,
  GOOGLE_APPS_SCRIPT_CODE,
} from '../src/utils/googleAppsScript';

console.log('🧪 Starting Google Sheets Relational Schema Parity & Integration Test Suite...\n');

let passedCount = 0;
let failedCount = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

// Test 1: Shared schema defines all canonical relational tables including tasks and notes
runTest('1. Central schema defines all relational tables including tasks and notes', () => {
  assert(ORDERED_TABLE_NAMES.length >= 13);
  assert(ORDERED_TABLE_NAMES.includes('habits'));
  assert(ORDERED_TABLE_NAMES.includes('habit_entries'));
  assert(ORDERED_TABLE_NAMES.includes('habit_categories') || ORDERED_TABLE_NAMES.includes('categories'));
  assert(ORDERED_TABLE_NAMES.includes('goals'));
  assert(ORDERED_TABLE_NAMES.includes('mood_tracker'));
  assert(ORDERED_TABLE_NAMES.includes('daily_journal'));
  assert(ORDERED_TABLE_NAMES.includes('weekly_plans'));
  assert(ORDERED_TABLE_NAMES.includes('weekly_reviews'));
  assert(ORDERED_TABLE_NAMES.includes('reflections') || ORDERED_TABLE_NAMES.includes('monthly_reflections'));
  assert(ORDERED_TABLE_NAMES.includes('settings'));
  assert(ORDERED_TABLE_NAMES.includes('tasks'), 'Must include tasks worksheet');
  assert(ORDERED_TABLE_NAMES.includes('notes'), 'Must include notes worksheet');
  assert(ORDERED_TABLE_NAMES.includes('affirmations'), 'Must include affirmations worksheet');
});

// Test 2: Foreign key relationships correctly configured
runTest('2. Foreign key definitions match relational architecture', () => {
  const habitEntriesDef = CENTRAL_DATA_SCHEMA.habit_entries;
  const habitIdCol = habitEntriesDef.columns.find((c) => c.name === 'habit_id');
  assert(habitIdCol?.isForeignKey);
  assert.strictEqual(habitIdCol?.foreignKeyRef?.table, 'habits');

  const habitsDef = CENTRAL_DATA_SCHEMA.habits;
  const goalIdCol = habitsDef.columns.find((c) => c.name === 'goal_id');
  assert(goalIdCol?.isForeignKey);
  assert.strictEqual(goalIdCol?.foreignKeyRef?.table, 'goals');
});

// Test 3: Tasks and Notes schemas are comprehensively defined
runTest('3. Tasks and Notes schema column parity', () => {
  const tasksDef = CENTRAL_DATA_SCHEMA.tasks;
  assert(tasksDef, 'Tasks definition must exist');
  const taskColNames = tasksDef.columns.map((c) => c.name);
  assert(taskColNames.includes('id'));
  assert(taskColNames.includes('title'));
  assert(taskColNames.includes('status'));
  assert(taskColNames.includes('priority'));
  assert(taskColNames.includes('date'));
  assert(taskColNames.includes('description'));
  assert(taskColNames.includes('category'));

  const notesDef = CENTRAL_DATA_SCHEMA.notes;
  assert(notesDef, 'Notes definition must exist');
  const noteColNames = notesDef.columns.map((c) => c.name);
  assert(noteColNames.includes('id'));
  assert(noteColNames.includes('title'));
  assert(noteColNames.includes('content'));
  assert(noteColNames.includes('checklist'));
  assert(noteColNames.includes('tags'));
  assert(noteColNames.includes('pinned'));
});

// Test 4: Google Apps Script contains all worksheets in schema action
runTest('4. Google Apps Script schema includes tasks and notes', () => {
  assert(GOOGLE_APPS_SCRIPT_CODE.includes("'tasks'"), "Apps script must declare 'tasks'");
  assert(GOOGLE_APPS_SCRIPT_CODE.includes("'notes'"), "Apps script must declare 'notes'");
  assert(GOOGLE_APPS_SCRIPT_CODE.includes("shouldSync('tasks')"), 'Apps script must have sync handler for tasks');
  assert(GOOGLE_APPS_SCRIPT_CODE.includes("shouldSync('notes')"), 'Apps script must have sync handler for notes');
  assert(GOOGLE_APPS_SCRIPT_CODE.includes("findSheet(['tasks', 'Tasks'])"), 'Apps script must have export parser for tasks');
  assert(GOOGLE_APPS_SCRIPT_CODE.includes("findSheet(['notes', 'Notes'"), 'Apps script must have export parser for notes');
});

// Test 5: Validation detects valid Google Sheets payload with tasks and notes
runTest('5. Validates clean Google Sheets data including tasks and notes', () => {
  const mockPayload = {
    habits: [
      { id: 'h-1', name: 'Exercise', category: 'health', frequency: 'daily' },
      { id: 'h-2', name: 'Read Book', category: 'learning', frequency: 'daily' },
    ],
    habit_entries: [
      { id: 'e-1', habit_id: 'h-1', date: '2026-10-09', completed: true },
      { id: 'e-2', habit_id: 'h-2', date: '2026-10-09', completed: false },
    ],
    mood_tracker: [
      { id: 'm-1', date: '2026-10-09', mood: 'energized', mood_score: 5, energy_level: 4 },
    ],
    tasks: [
      {
        id: 't-1',
        title: 'Review System Design',
        status: 'Completed',
        priority: 'High',
        date: '2026-10-10',
        description: 'Verify database schemas\nand edge cases',
      },
      {
        id: 't-2',
        title: 'Call Team Member',
        status: 'Pending',
        priority: 'Medium',
        date: '2026-10-12',
      },
    ],
    notes: [
      {
        id: 'n-1',
        title: 'Architecture Ideas 🚀',
        content: 'Multiline note with unicode: 🎯 🧘 📚\nSecond line of note.',
        type: 'text',
        tags: 'architecture, system',
        pinned: true,
      },
      {
        id: 'n-2',
        title: 'Checklist note',
        content: '',
        type: 'checklist',
        checklist: JSON.stringify([{ id: 'c1', text: 'Item 1', completed: true }]),
      },
    ],
  };

  const { summary, counts } = validateGoogleSheetsImport(mockPayload);
  assert(summary.isValid);
  assert.strictEqual(summary.totalErrors, 0);
  assert.strictEqual(counts.habits, 2);
  assert.strictEqual(counts.habit_entries, 2);
  assert.strictEqual(counts.mood_tracker, 1);
  assert.strictEqual(counts.tasks, 2);
  assert.strictEqual(counts.notes, 2);
});

// Test 6: Validation detects broken foreign key in Google Sheets data
runTest('6. Flags broken foreign key (habit_entries referencing missing habit)', () => {
  const mockPayload = {
    habits: [{ id: 'h-1', name: 'Exercise' }],
    habit_entries: [
      { id: 'e-1', habit_id: 'h-non-existent', date: '2026-10-09', completed: true },
    ],
  };

  const { summary } = validateGoogleSheetsImport(mockPayload);
  assert(!summary.isValid);
  assert(summary.foreignKeyErrorCount > 0);
  assert(summary.issues.some((i) => i.sheet === 'habit_entries' && i.column === 'habit_id'));
});

// Test 7: Validation detects duplicate primary keys
runTest('7. Flags duplicate primary key in Google Sheets data', () => {
  const mockPayload = {
    habits: [
      { id: 'dup-1', name: 'Habit 1' },
      { id: 'dup-1', name: 'Habit 1 Duplicate' },
    ],
  };

  const { summary } = validateGoogleSheetsImport(mockPayload);
  assert(!summary.isValid);
  assert(summary.duplicatePkCount > 0);
});

// Test 8: Boolean parser handles TRUE/FALSE/1/0/yes/no
runTest('8. Boolean parser handles multiple Sheet conventions safely', () => {
  assert.strictEqual(parseBooleanValue('TRUE'), true);
  assert.strictEqual(parseBooleanValue('true'), true);
  assert.strictEqual(parseBooleanValue(true), true);
  assert.strictEqual(parseBooleanValue(1), true);
  assert.strictEqual(parseBooleanValue('YES'), true);
  assert.strictEqual(parseBooleanValue('FALSE'), false);
  assert.strictEqual(parseBooleanValue(0), false);
  assert.strictEqual(parseBooleanValue(''), false);
  assert.strictEqual(parseBooleanValue(null, false), false);
});

// Test 9: Date normalization formats to YYYY-MM-DD
runTest('9. Date formatting normalizes dates to ISO YYYY-MM-DD', () => {
  assert.strictEqual(formatDateIso('2026-10-09'), '2026-10-09');
  assert.strictEqual(formatDateIso(new Date('2026-10-09T12:00:00Z')), '2026-10-09');
});

// Test 10: Safe insert/update logic in Apps Script code
runTest('10. Apps Script preserves existing records in merge mode', () => {
  assert(GOOGLE_APPS_SCRIPT_CODE.includes("mode === 'replace'"), 'Apps script must check for replace mode');
  assert(GOOGLE_APPS_SCRIPT_CODE.includes('idToRowIdx[recordId]'), 'Apps script must map records by stable ID for in-place updates');
  assert(GOOGLE_APPS_SCRIPT_CODE.includes('rowsToAppend.push'), 'Apps script must append non-existent rows');
});

console.log('\n========================================');
console.log(`Test Results: ${passedCount} passed, ${failedCount} failed`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
