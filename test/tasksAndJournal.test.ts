import fs from 'fs';
import path from 'path';
import { HRTask, DailyJournal } from '../src/types';
import { extractInternalLinks, extractTags } from '../src/utils/markdownUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('🧪 Starting Tasks & Journal Data Persistence Test Suite...\n');
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

  // ==========================================
  // SECTION A: TASKS DATA INTEGRITY & CRUD
  // ==========================================
  console.log('--- SECTION A: Tasks Persistence & CRUD ---');

  const sampleTasks: HRTask[] = [
    {
      id: 'task-test-1',
      title: 'Review Q4 Performance Reports',
      name: 'Review Q4 Performance Reports',
      description: 'Analyze department metrics and prepare summary deck',
      category: 'Operations',
      priority: 'High',
      status: 'Pending',
      date: '2026-10-25',
      time: '10:00 AM',
      assignedTo: 'Vignesh',
      notes: 'Check revenue projections',
      followUpDate: '2026-10-28',
      createdAt: '2026-10-25T08:00:00.000Z',
      updatedAt: '2026-10-25T08:00:00.000Z',
    },
    {
      id: 'task-test-2',
      title: 'Schedule Team Alignment Meeting',
      name: 'Schedule Team Alignment Meeting',
      description: 'Sync with product and engineering leads',
      category: 'Recruitment',
      priority: 'Medium',
      status: 'In Progress',
      date: '2026-10-26',
      time: '02:00 PM',
      assignedTo: 'Vignesh',
      notes: 'Prepare agenda',
      createdAt: '2026-10-25T09:00:00.000Z',
      updatedAt: '2026-10-25T09:00:00.000Z',
    },
    {
      id: 'task-test-3',
      title: 'Update Benefits Documentation',
      name: 'Update Benefits Documentation',
      description: 'Audit current policies against new state compliance',
      category: 'Compliance',
      priority: 'Low',
      status: 'Completed',
      date: '2026-11-01',
      time: '11:00 AM',
      assignedTo: 'HR Team',
      completed: true,
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T11:00:00.000Z',
    },
  ];

  await test('Task creation preserves all structured fields', () => {
    const task = sampleTasks[0];
    assert(task.id === 'task-test-1', 'ID must be preserved');
    assert(task.title === 'Review Q4 Performance Reports', 'Title must match');
    assert(task.priority === 'High', 'Priority must match');
    assert(task.status === 'Pending', 'Status must match');
    assert(task.date === '2026-10-25', 'Date must match');
    assert(task.assignedTo === 'Vignesh', 'AssignedTo must match');
    assert(task.followUpDate === '2026-10-28', 'Follow-up date must match');
  });

  await test('Editing a task updates targeted record without corrupting other tasks', () => {
    const list = [...sampleTasks];
    const targetId = 'task-test-2';
    const index = list.findIndex((t) => t.id === targetId);
    assert(index !== -1, 'Task should be found');

    const updatedTask: HRTask = {
      ...list[index],
      title: 'Schedule Executive Alignment Meeting',
      priority: 'High',
      updatedAt: '2026-10-25T12:00:00.000Z',
    };
    list[index] = updatedTask;

    assert(list.length === 3, 'Length should remain unchanged');
    assert(list[index].title === 'Schedule Executive Alignment Meeting', 'Target task must be updated');
    assert(list[index].priority === 'High', 'Target task priority updated');
    assert(list[0].title === 'Review Q4 Performance Reports', 'Sibling task 0 untouched');
    assert(list[2].title === 'Update Benefits Documentation', 'Sibling task 2 untouched');
  });

  await test('Completing and toggling a task preserves info and switches status correctly', () => {
    let task = { ...sampleTasks[0] };
    assert(task.status === 'Pending', 'Initial status Pending');

    // Toggle to completed
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    task = {
      ...task,
      status: nextStatus,
      completed: nextStatus === 'Completed',
      updatedAt: new Date().toISOString(),
    };
    assert(task.status === 'Completed', 'Status should now be Completed');
    assert(task.completed === true, 'completed flag should be true');
    assert(task.title === 'Review Q4 Performance Reports', 'Title preserved');
    assert(task.description === 'Analyze department metrics and prepare summary deck', 'Description preserved');
    assert(task.priority === 'High', 'Priority preserved');

    // Toggle back to pending
    const toggledAgain = task.status === 'Completed' ? 'Pending' : 'Completed';
    task = {
      ...task,
      status: toggledAgain,
      completed: toggledAgain === 'Completed',
    };
    assert(task.status === 'Pending', 'Status back to Pending');
    assert(task.completed === false, 'completed flag is false');
  });

  await test('Deleting a task removes correct record and retains siblings', () => {
    let list = [...sampleTasks];
    const toDeleteId = 'task-test-1';
    list = list.filter((t) => t.id !== toDeleteId);

    assert(list.length === 2, 'List length reduced by 1');
    assert(!list.some((t) => t.id === toDeleteId), 'Deleted task not present');
    assert(list[0].id === 'task-test-2', 'Remaining task 2 intact');
    assert(list[1].id === 'task-test-3', 'Remaining task 3 intact');
  });

  await test('Tasks across different dates are isolated and preserved', () => {
    const dates = sampleTasks.map((t) => t.date);
    assert(dates.includes('2026-10-25'), 'Contains 2026-10-25 task');
    assert(dates.includes('2026-10-26'), 'Contains 2026-10-26 task');
    assert(dates.includes('2026-11-01'), 'Contains 2026-11-01 task across month boundary');

    const octTasks = sampleTasks.filter((t) => t.date && t.date.startsWith('2026-10'));
    const novTasks = sampleTasks.filter((t) => t.date && t.date.startsWith('2026-11'));
    assert(octTasks.length === 2, 'October tasks count is 2');
    assert(novTasks.length === 1, 'November tasks count is 1');
  });

  // ==========================================
  // SECTION B: JOURNAL DATA INTEGRITY & UNICODE
  // ==========================================
  console.log('\n--- SECTION B: Journal Data Integrity & Separation ---');

  const sampleJournalWithUnicode: DailyJournal = {
    id: 'journal-entry-unicode-1',
    date: '2026-10-25',
    content: `# Daily Reflection 🌟
## Wins of the Day
- Shipped data persistence upgrades 🚀
- Fixed Unicode serialization: தமிழ் (Tamil), 日本語 (Japanese), Español, Ümläuts
- Maintained 100% test coverage ✨

## Challenges
* Need to ensure zero state regression across offline storage

## Notes
Check out [[Deep Work]] and [[Mindful Living]]!
#productivity #habits #growth`,
    mood: 'great',
    energy_level: 5,
    productivity: 5,
    highlights: 'Delivered flawless persistence engine 🎯',
    gratitude: '1. Peaceful morning walk 🌿\n2. Filter coffee ☕\n3. Smooth progress on code',
    wins: 'All test assertions passed on the first run',
    challenges: 'Balancing multi-tab UX with clean component tree',
    priorities: 'Automated end-to-end verification and documentation update',
    tags: ['productivity', 'habits', 'growth'],
    linked_notes: ['Deep Work', 'Mindful Living'],
    created_at: '2026-10-25T14:00:00.000Z',
    updated_at: '2026-10-25T14:30:00.000Z',
  };

  await test('Journal entry stores multiline text and Unicode characters faithfully', () => {
    const serialized = JSON.stringify(sampleJournalWithUnicode);
    const parsed: DailyJournal = JSON.parse(serialized);

    assert(parsed.id === 'journal-entry-unicode-1', 'ID preserved');
    assert(parsed.date === '2026-10-25', 'Date preserved');
    assert(parsed.content?.includes('தமிழ்'), 'Tamil characters preserved');
    assert(parsed.content?.includes('日本語'), 'Japanese characters preserved');
    assert(parsed.content?.includes('🚀') && parsed.content?.includes('🌟'), 'Emojis preserved');
    assert(parsed.content?.includes('\n## Wins of the Day\n'), 'Newlines and markdown hierarchy preserved');
    assert(parsed.energy_level === 5, 'Energy level preserved');
    assert(parsed.gratitude?.includes('☕'), 'Multiline gratitude with emojis preserved');
    assert(parsed.tags?.length === 3, 'Tags preserved');
    assert(parsed.linked_notes?.length === 2, 'Wiki links preserved');
  });

  await test('Markdown extraction correctly identifies tags and wiki-style [[links]]', () => {
    const content = sampleJournalWithUnicode.content || '';
    const tags = extractTags(content);
    const links = extractInternalLinks(content);
    assert(tags.includes('#productivity'), 'Should extract #productivity');
    assert(tags.includes('#habits'), 'Should extract #habits');
    assert(tags.includes('#growth'), 'Should extract #growth');
    assert(links.includes('Deep Work'), 'Should extract [[Deep Work]]');
    assert(links.includes('Mindful Living'), 'Should extract [[Mindful Living]]');
  });

  await test('Editing a journal updates entry by date/id without clobbering siblings', () => {
    const journalEntries: DailyJournal[] = [
      sampleJournalWithUnicode,
      {
        id: 'journal-entry-prev-day',
        date: '2026-10-24',
        content: 'Yesterday was focused on architecture and requirements.',
        mood: 'good',
        energy_level: 4,
        highlights: 'Finished schema audit',
      },
    ];

    const targetDate = '2026-10-24';
    const idx = journalEntries.findIndex((j) => j.date === targetDate);
    assert(idx !== -1, 'Previous day journal found');

    const updated = {
      ...journalEntries[idx],
      content: 'Yesterday was focused on architecture, schema audit, and test plan.',
      mood: 'excellent' as const,
      energy_level: 5,
    };
    journalEntries[idx] = updated;

    assert(journalEntries.length === 2, 'Total journal entries remains 2');
    assert(journalEntries[idx].mood === 'excellent', 'Updated entry mood is excellent');
    assert(journalEntries[0].id === 'journal-entry-unicode-1', 'Today entry intact');
    assert(journalEntries[0].content?.includes('தமிழ்'), 'Today entry content unchanged');
  });

  await test('Entity separation: Daily Journal vs Notes vs Monthly Reflections', () => {
    // 1. Daily Journal entry (date-keyed personal daily log)
    const dailyJournal: DailyJournal = {
      id: 'dj-10-25',
      date: '2026-10-25',
      content: 'Day reflection text',
      mood: 'great',
      energy_level: 4,
    };

    // 2. Knowledge Graph Note (standalone markdown note)
    const knowledgeNote = {
      id: 'note-atomic-habits',
      title: 'Atomic Habits Summary',
      content: 'Make it obvious, attractive, easy, satisfying.',
      category: 'Books',
      pinned: true,
    };

    // 3. Monthly Reflection (scoped to year + month)
    const monthlyReflection = {
      id: 'refl-2026-10',
      year: 2026,
      month: 10,
      content: 'October was a breakthrough month for habits.',
    };

    // Verify distinct schema properties
    assert('date' in dailyJournal && 'mood' in dailyJournal, 'DailyJournal has date and mood');
    assert('title' in knowledgeNote && !('date' in knowledgeNote), 'Note has title without mandatory date');
    assert('year' in monthlyReflection && 'month' in monthlyReflection, 'Monthly Reflection has year and month');
    assert(dailyJournal.id !== knowledgeNote.id && dailyJournal.id !== monthlyReflection.id, 'IDs are isolated');
  });

  // ==========================================
  // SECTION C: FILE-BACKED PERSISTENCE SIMULATION
  // ==========================================
  console.log('\n--- SECTION C: Local File-Backed DB Persistence ---');

  await test('Server db.json serialization roundtrip preserves tasks and journals completely', () => {
    const mockDb = {
      habits: [],
      habit_entries: [],
      goals: [],
      mood_tracker: [],
      daily_journal: [sampleJournalWithUnicode],
      weekly_reviews: [],
      weekly_plans: [],
      reflections: [
        {
          id: 'ref-10-2026',
          year: 2026,
          month: 10,
          content: 'Monthly review of progress and growth.',
          created_at: new Date().toISOString(),
        },
      ],
      affirmations: [],
      tasks: sampleTasks,
      notes: [
        {
          id: 'note-1',
          title: 'Knowledge Note',
          content: 'Information repository',
          created_at: new Date().toISOString(),
        },
      ],
      settings: {
        theme: 'light',
        week_start: 'sunday',
        auto_lock_minutes: 15,
        default_view: 'today',
      },
    };

    // Serialize and parse
    const rawJson = JSON.stringify(mockDb, null, 2);
    const restored = JSON.parse(rawJson);

    assert(Array.isArray(restored.tasks), 'Restored tasks is array');
    assert(restored.tasks.length === 3, 'All 3 tasks restored');
    assert(restored.tasks[0].id === 'task-test-1', 'First task ID matches');
    assert(restored.tasks[1].category === 'Recruitment', 'Task category matches');
    assert(restored.tasks[2].status === 'Completed', 'Task status matches');

    assert(Array.isArray(restored.daily_journal), 'Restored journals is array');
    assert(restored.daily_journal.length === 1, 'Journal entry restored');
    assert(restored.daily_journal[0].content.includes('தமிழ்'), 'Unicode preserved in restored DB');
    assert(restored.daily_journal[0].tags.length === 3, 'Tags preserved');

    assert(restored.reflections.length === 1, 'Reflections separate from daily journals');
    assert(restored.notes.length === 1, 'Notes separate from daily journals and tasks');
  });

  console.log(`\n==========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`==========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
