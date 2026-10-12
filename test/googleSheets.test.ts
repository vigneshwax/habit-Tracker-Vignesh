import assert from 'node:assert';
import {
  CENTRAL_DATA_SCHEMA,
  ORDERED_TABLE_NAMES,
  SCHEMA_VERSION,
  validateDatabaseTables,
  formatDateIso,
  parseBooleanValue,
} from '../src/utils/dataSchema';
import { validateGoogleSheetsImport } from '../src/utils/googleAppsScript';

console.log('🧪 Starting Google Sheets Relational Schema Parity Test Suite...\n');

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

// Test 1: Shared schema defines all canonical relational tables
runTest('1. Central schema defines all relational tables', () => {
  assert(ORDERED_TABLE_NAMES.length >= 10);
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

// Test 3: Validation detects valid Google Sheets payload
runTest('3. Validates clean Google Sheets data without issues', () => {
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
  };

  const { summary, counts } = validateGoogleSheetsImport(mockPayload);
  assert(summary.isValid);
  assert.strictEqual(summary.totalErrors, 0);
  assert.strictEqual(counts.habits, 2);
  assert.strictEqual(counts.habit_entries, 2);
  assert.strictEqual(counts.mood_tracker, 1);
});

// Test 4: Validation detects broken foreign key in Google Sheets data
runTest('4. Flags broken foreign key (habit_entries referencing missing habit)', () => {
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

// Test 5: Validation detects duplicate primary keys
runTest('5. Flags duplicate primary key in Google Sheets data', () => {
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

// Test 6: Boolean parser handles TRUE/FALSE/1/0/yes/no
runTest('6. Boolean parser handles multiple Sheet conventions safely', () => {
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

// Test 7: Date normalization formats to YYYY-MM-DD
runTest('7. Date formatting normalizes dates to ISO YYYY-MM-DD', () => {
  assert.strictEqual(formatDateIso('2026-10-09'), '2026-10-09');
  assert.strictEqual(formatDateIso(new Date('2026-10-09T12:00:00Z')), '2026-10-09');
});

console.log('\n========================================');
console.log(`Test Results: ${passedCount} passed, ${failedCount} failed`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
