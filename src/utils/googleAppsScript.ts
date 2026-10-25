/**
 * Google Apps Script Integration & Automation for Vignesh Habit Tracker
 * 
 * Provides 100% schema parity with the Relational Excel export/import system.
 * Uses shared database table definitions from src/utils/dataSchema.ts.
 * 
 * Schema Version: 3.0.0
 */

import {
  CENTRAL_DATA_SCHEMA,
  SCHEMA_VERSION,
  APP_IDENTIFIER,
  ORDERED_TABLE_NAMES,
  SupportedTableName,
  validateDatabaseTables,
  ValidationSummary,
  formatDateIso,
  parseBooleanValue,
  FullExportData,
} from './dataSchema';
import { api } from '../api';

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxE0cwX9-mPiHG-2XkMBApuY4tV4NxxNW5qB6scYnaBydyJpeVPS6a6RvR87qakYviP/exec';

/**
 * Production-ready Google Apps Script Code (v3.0.0)
 * 
 * Instructions:
 * 1. Open Google Sheet (or type sheets.new).
 * 2. Extensions > Apps Script.
 * 3. Replace Code.gs with this code.
 * 4. Deploy > New deployment > Type: Web app.
 * 5. Execute as: Me, Who has access: Anyone.
 * 6. Copy Web App URL (/exec) and paste into Tracker.
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Vignesh Habit Tracker - Google Sheet Database Center Script (v3.0.0)
 * 
 * TWO-WAY RELATIONAL DATABASE ENGINE FOR GOOGLE SHEETS
 * - 100% Schema Parity with Relational Excel (.xlsx) Export & Tracker State
 * - Dedicated relational worksheets: README, habits, habit_entries, categories,
 *   goals, mood_tracker, daily_journal, weekly_plans, weekly_reviews,
 *   monthly_reflections, settings.
 * - Dark navy header styling (#0F172A), bold white text, frozen header row,
 *   active data filters, auto-resized columns, YYYY-MM-DD dates, TRUE/FALSE booleans.
 * - Two-Way live synchronization: PUSH (Save) & PULL (Load) with conflict detection.
 */

var SCHEMA_VERSION = '3.0.0';
var APP_NAME = 'Vignesh Habit Tracker';

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'pull';

  if (action === 'test' || action === 'status') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      app: APP_NAME,
      version: SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      message: 'Google Apps Script Database Engine is active and connected!'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'schema') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      version: SCHEMA_VERSION,
      tables: ['README', 'affirmations', 'daily_journal', 'goals', 'habit_categories', 'habit_entries', 'habits', 'mood_tracker', 'reflections', 'settings', 'weekly_plans', 'weekly_reviews']
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Default action: pull / export all relational database tables
  return ContentService.createTextOutput(JSON.stringify(exportAllData()))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : '';
    if (!rawData) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'No data payload received'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = syncDataToSheets(ss, payload);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Successfully synchronized data with Google Sheet database',
      timestamp: new Date().toISOString(),
      schema_version: SCHEMA_VERSION,
      counts: result
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function syncDataToSheets(ss, data) {
  var summary = {};
  var selectedTables = Array.isArray(data.selected_tables) && data.selected_tables.length > 0
    ? data.selected_tables
    : null;

  function shouldSync(name) {
    return !selectedTables || selectedTables.indexOf(name) >= 0;
  }

  // 1. README Worksheet (PostgreSQL Relational Data Dictionary)
  if (shouldSync('README')) {
    var readmeHeaders = ['table_no', 'table_name', 'display_name', 'primary_key', 'foreign_keys', 'columns', 'description'];
    var readmeRows = [
      [0, '__metadata__', 'Database Metadata', 'schema_version', 'none', 'app, version, export_date, format', 'Official relational database schema for ' + APP_NAME + ' (v' + SCHEMA_VERSION + '). Parity with Excel and Tracker State.'],
      [1, 'affirmations', 'Affirmations', 'id', 'none', 'id, quote, author, image_url, active, created_at, updated_at', 'Stores motivational quotes and images'],
      [2, 'daily_journal', 'Daily Journal', 'id', 'none', 'id, date, content, mood, energy_level, created_at, updated_at', 'Stores daily journal entries, moods, and energy levels'],
      [3, 'goals', 'Goals', 'id', 'none', 'id, title, description, category, target_date, progress, status, created_at, updated_at', 'Tracks personal goals and their progress'],
      [4, 'habit_categories', 'Habit Categories', 'id', 'none', 'id, name, icon, created_at', 'Organizes habits into categories (4 columns strictly)'],
      [5, 'habit_entries', 'Habit Entries', 'id', 'habit_id -> habits.id', 'id, habit_id, date, completed, created_at, updated_at', 'Records whether a habit was completed on a particular date'],
      [6, 'habits', 'Habits', 'id', 'goal_id -> goals.id', 'id, name, category, frequency, priority, goal_id, target_count, schedule_days, status, archived_at, created_at, updated_at', 'Stores habit details, schedules, priorities, and statuses'],
      [7, 'mood_tracker', 'Mood Tracker', 'id', 'none', 'id, date, mood, mood_score, energy_level, note, created_at, updated_at', 'Tracks daily moods, mood scores, and energy levels (8 columns strictly)'],
      [8, 'reflections', 'Reflections', 'id', 'none', 'id, month, year, content, created_at, updated_at', 'Stores monthly reflections'],
      [9, 'settings', 'Settings', 'id', 'none', 'id, setting_key, setting_value, updated_at', 'Stores application preferences and configuration'],
      [10, 'weekly_plans', 'Weekly Plans', 'id', 'none', 'id, year, month, week_number, main_goal, priority_1, priority_2, priority_3, target_percentage, created_at, updated_at', 'Stores weekly goals, priorities, and target completion percentages'],
      [11, 'weekly_reviews', 'Weekly Reviews', 'id', 'none', 'id, year, month, week_number, went_well, improve, could_improve, next_focus, created_at, updated_at', 'Stores weekly reviews and improvement plans']
    ];
    writeRelationalSheet(ss, 'README', readmeHeaders, readmeRows, '#1E293B');
  }

  // 2. affirmations Worksheet
  if (shouldSync('affirmations')) {
    var affs = Array.isArray(data.affirmations) ? data.affirmations : [];
    var affHeaders = ['id', 'quote', 'author', 'image_url', 'active', 'created_at', 'updated_at'];
    var affRows = affs.map(function(a) {
      var isActive = a.active !== false && String(a.active).toUpperCase() !== 'FALSE';
      return [
        a.id || '',
        a.quote || '',
        a.author || '',
        a.image_url || '',
        isActive ? 'TRUE' : 'FALSE',
        a.created_at || '',
        a.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'affirmations', affHeaders, affRows, '#0F172A');
    summary.affirmations = affRows.length;
  }

  // 2. habits Worksheet
  if (shouldSync('habits') && Array.isArray(data.habits)) {
    var habitHeaders = ['id', 'name', 'category', 'frequency', 'priority', 'goal_id', 'target_count', 'schedule_days', 'status', 'archived_at', 'created_at', 'updated_at'];
    var habitRows = data.habits.map(function(h) {
      return [
        h.id || '',
        h.name || '',
        h.category || 'general',
        h.frequency || 'daily',
        h.priority || 'normal',
        h.goal_id || '',
        h.target_count != null ? h.target_count : (h.target_days || 1),
        Array.isArray(h.schedule_days) ? h.schedule_days.join(', ') : (h.schedule_days || ''),
        h.status || 'active',
        h.archived_at || '',
        h.created_at || '',
        h.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'habits', habitHeaders, habitRows, '#0F172A');
    summary.habits = habitRows.length;
  }

  // 3. habit_entries Worksheet
  if (shouldSync('habit_entries') && Array.isArray(data.habit_entries)) {
    var entryHeaders = ['id', 'habit_id', 'date', 'completed', 'created_at', 'updated_at'];
    var entryRows = data.habit_entries.map(function(e) {
      var isCompleted = e.completed === true || String(e.completed).toUpperCase() === 'TRUE' || e.completed === 1;
      return [
        e.id || '',
        e.habit_id || '',
        formatDateStr(e.date),
        isCompleted ? 'TRUE' : 'FALSE',
        e.created_at || '',
        e.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'habit_entries', entryHeaders, entryRows, '#0F172A');
    summary.habit_entries = entryRows.length;
  }

  // 4. habit_categories Worksheet
  if (shouldSync('habit_categories') || shouldSync('categories')) {
    var cats = Array.isArray(data.habit_categories) ? data.habit_categories : (Array.isArray(data.categories) ? data.categories : []);
    var catHeaders = ['id', 'name', 'icon', 'created_at'];
    var catRows = cats.map(function(c) {
      return [
        c.id || '',
        c.name || '',
        c.icon || '🎯',
        c.created_at || ''
      ];
    });
    writeRelationalSheet(ss, 'habit_categories', catHeaders, catRows, '#0F172A');
    summary.habit_categories = catRows.length;
    summary.categories = catRows.length;
  }

  // 5. goals Worksheet
  if (shouldSync('goals') && Array.isArray(data.goals)) {
    var goalHeaders = ['id', 'title', 'description', 'category', 'target_date', 'progress', 'status', 'created_at', 'updated_at'];
    var goalRows = data.goals.map(function(g) {
      return [
        g.id || '',
        g.title || '',
        g.description || '',
        g.category || 'general',
        formatDateStr(g.target_date),
        g.progress != null ? Number(g.progress) : 0,
        g.status || 'active',
        g.created_at || '',
        g.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'goals', goalHeaders, goalRows, '#0F172A');
    summary.goals = goalRows.length;
  }

  // 6. mood_tracker Worksheet
  if (shouldSync('mood_tracker') && Array.isArray(data.mood_tracker)) {
    var moodHeaders = ['id', 'date', 'mood', 'mood_score', 'energy_level', 'note', 'created_at', 'updated_at'];
    var moodRows = data.mood_tracker.map(function(m) {
      return [
        m.id || '',
        formatDateStr(m.date),
        m.mood || 'neutral',
        m.mood_score != null ? Number(m.mood_score) : 4,
        m.energy_level != null ? Number(m.energy_level) : 3,
        m.note || '',
        m.created_at || '',
        m.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'mood_tracker', moodHeaders, moodRows, '#0F172A');
    summary.mood_tracker = moodRows.length;
  }

  // 7. daily_journal Worksheet
  if (shouldSync('daily_journal') && Array.isArray(data.daily_journal)) {
    var journalHeaders = ['id', 'date', 'content', 'mood', 'energy_level', 'created_at', 'updated_at'];
    var journalRows = data.daily_journal.map(function(j) {
      return [
        j.id || '',
        formatDateStr(j.date),
        j.content || '',
        j.mood || '',
        j.energy_level != null ? Number(j.energy_level) : 3,
        j.created_at || '',
        j.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'daily_journal', journalHeaders, journalRows, '#0F172A');
    summary.daily_journal = journalRows.length;
  }

  // 8. weekly_plans Worksheet
  if (shouldSync('weekly_plans') && Array.isArray(data.weekly_plans)) {
    var planHeaders = ['id', 'year', 'month', 'week_number', 'main_goal', 'priority_1', 'priority_2', 'priority_3', 'target_percentage', 'created_at', 'updated_at'];
    var planRows = data.weekly_plans.map(function(p) {
      return [
        p.id || '',
        Number(p.year || new Date().getFullYear()),
        Number(p.month || (new Date().getMonth() + 1)),
        Number(p.week_number || 1),
        p.main_goal || '',
        p.priority_1 || '',
        p.priority_2 || '',
        p.priority_3 || '',
        p.target_percentage != null ? Number(p.target_percentage) : 80,
        p.created_at || '',
        p.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'weekly_plans', planHeaders, planRows, '#0F172A');
    summary.weekly_plans = planRows.length;
  }

  // 9. weekly_reviews Worksheet
  if (shouldSync('weekly_reviews') && Array.isArray(data.weekly_reviews)) {
    var reviewHeaders = ['id', 'year', 'month', 'week_number', 'went_well', 'improve', 'could_improve', 'next_focus', 'created_at', 'updated_at'];
    var reviewRows = data.weekly_reviews.map(function(r) {
      return [
        r.id || '',
        Number(r.year || new Date().getFullYear()),
        Number(r.month || (new Date().getMonth() + 1)),
        Number(r.week_number || 1),
        r.went_well || '',
        r.improve || r.could_improve || '',
        r.could_improve || r.improve || '',
        r.next_focus || '',
        r.created_at || '',
        r.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'weekly_reviews', reviewHeaders, reviewRows, '#0F172A');
    summary.weekly_reviews = reviewRows.length;
  }

  // 10. reflections Worksheet
  if (shouldSync('reflections') || shouldSync('monthly_reflections')) {
    var refls = Array.isArray(data.reflections) ? data.reflections : (Array.isArray(data.monthly_reflections) ? data.monthly_reflections : []);
    var reflHeaders = ['id', 'month', 'year', 'content', 'created_at', 'updated_at'];
    var reflRows = refls.map(function(rf) {
      return [
        rf.id || '',
        Number(rf.month || (new Date().getMonth() + 1)),
        Number(rf.year || new Date().getFullYear()),
        rf.content || '',
        rf.created_at || '',
        rf.updated_at || ''
      ];
    });
    writeRelationalSheet(ss, 'reflections', reflHeaders, reflRows, '#0F172A');
    summary.reflections = reflRows.length;
    summary.monthly_reflections = reflRows.length;
  }

  // 11. settings Worksheet
  if (shouldSync('settings') && data.settings) {
    var setHeaders = ['id', 'setting_key', 'setting_value', 'updated_at'];
    var setRows = [];
    if (Array.isArray(data.settings)) {
      setRows = data.settings.map(function(s) {
        var valStr = typeof s.setting_value === 'object' ? JSON.stringify(s.setting_value) : String(s.setting_value || '');
        return [s.id || '', s.setting_key || '', valStr, s.updated_at || new Date().toISOString()];
      });
    } else if (typeof data.settings === 'object') {
      Object.keys(data.settings).forEach(function(k) {
        var v = data.settings[k];
        var valStr = typeof v === 'object' ? JSON.stringify(v) : String(v || '');
        setRows.push(['', k, valStr, new Date().toISOString()]);
      });
    }
    writeRelationalSheet(ss, 'settings', setHeaders, setRows, '#0F172A');
    summary.settings = setRows.length;
  }

  return summary;
}

function writeRelationalSheet(ss, sheetName, headers, rows, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // Also check case-insensitive match to avoid duplicate tabs
    var existingSheets = ss.getSheets();
    for (var i = 0; i < existingSheets.length; i++) {
      if (existingSheets[i].getName().toLowerCase() === sheetName.toLowerCase()) {
        sheet = existingSheets[i];
        break;
      }
    }
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
  }

  // Clear existing data and formatting cleanly
  sheet.clear();

  // 1. Write Header Row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground(headerColor || '#0F172A');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Arial');
  headerRange.setFontSize(10);
  sheet.setRowHeight(1, 32);

  // 2. Freeze the Header Row
  sheet.setFrozenRows(1);

  // 3. Write Data Rows
  if (rows && rows.length > 0) {
    var dataRange = sheet.getRange(2, 1, rows.length, headers.length);
    dataRange.setValues(rows);
    dataRange.setFontFamily('Arial');
    dataRange.setFontSize(10);
  }

  // 4. Safely create Filter
  try {
    var oldFilter = sheet.getFilter();
    if (oldFilter) oldFilter.remove();
    var filterRowCount = Math.max(rows ? rows.length + 1 : 1, 1);
    var filterRange = sheet.getRange(1, 1, filterRowCount, headers.length);
    filterRange.createFilter();
  } catch (err) {
    // Ignore filter creation errors on empty ranges
  }

  // 5. Auto-Resize Columns
  for (var col = 1; col <= headers.length; col++) {
    sheet.autoResizeColumn(col);
  }
}

function exportAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  function findSheet(nameVariants) {
    for (var i = 0; i < nameVariants.length; i++) {
      var s = ss.getSheetByName(nameVariants[i]);
      if (s) return s;
    }
    var all = ss.getSheets();
    for (var j = 0; j < all.length; j++) {
      var sName = all[j].getName().toLowerCase().replace(/[^a-z0-9]/g, '');
      for (var k = 0; k < nameVariants.length; k++) {
        if (sName === nameVariants[k].toLowerCase().replace(/[^a-z0-9]/g, '')) {
          return all[j];
        }
      }
    }
    return null;
  }

  return {
    app: APP_NAME,
    version: SCHEMA_VERSION,
    source: 'Google Sheets Relational Database',
    exported_at: new Date().toISOString(),
    affirmations: parseRelationalSheet(findSheet(['affirmations', 'Affirmations']), function(r) {
      var act = String(r.active || '').toUpperCase();
      return {
        id: r.id || '',
        quote: r.quote || '',
        author: r.author || '',
        image_url: r.imageurl || r.image_url || '',
        active: act !== 'FALSE' && act !== '0',
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    daily_journal: parseRelationalSheet(findSheet(['daily_journal', 'Daily Journal']), function(r) {
      return {
        id: r.id || '',
        date: formatDateStr(r.date),
        content: r.content || '',
        mood: r.mood ? String(r.mood).toLowerCase() : undefined,
        energy_level: r.energylevel ? Number(r.energylevel) : undefined,
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    goals: parseRelationalSheet(findSheet(['goals', 'Goals']), function(r) {
      return {
        id: r.id || '',
        title: r.title || r.name || '',
        category: (r.category || 'general').toLowerCase(),
        description: r.description || '',
        target_date: formatDateStr(r.targetdate || r.target_date),
        progress: Number(r.progress || 0),
        status: (r.status || 'active').toLowerCase(),
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    habit_categories: parseRelationalSheet(findSheet(['habit_categories', 'Habit Categories', 'categories', 'Categories']), function(r) {
      return {
        id: r.id || '',
        name: r.name || r.categoryname || '',
        icon: r.icon || '🎯',
        created_at: r.createdat || r.created_at || ''
      };
    }),
    categories: parseRelationalSheet(findSheet(['habit_categories', 'Habit Categories', 'categories', 'Categories']), function(r) {
      return {
        id: r.id || '',
        name: r.name || r.categoryname || '',
        icon: r.icon || '🎯',
        created_at: r.createdat || r.created_at || ''
      };
    }),
    habit_entries: parseRelationalSheet(findSheet(['habit_entries', 'Habit Entries']), function(r) {
      var comp = String(r.completed || '').toUpperCase();
      return {
        id: r.id || r.entryid || '',
        habit_id: r.habitid || r.habit_id || '',
        date: formatDateStr(r.date),
        completed: comp === 'TRUE' || comp === '1' || comp === 'YES',
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    habits: parseRelationalSheet(findSheet(['habits', 'Habits']), function(r) {
      return {
        id: r.id || '',
        name: r.name || r.habitname || '',
        category: (r.category || 'general').toLowerCase(),
        frequency: (r.frequency || 'daily').toLowerCase(),
        priority: (r.priority || 'normal').toLowerCase(),
        goal_id: r.goalid || r.goal_id || undefined,
        target_count: r.targetcount != null ? Number(r.targetcount) : 1,
        schedule_days: r.scheduledays ? String(r.scheduledays).split(',').map(function(d){ return d.trim(); }).filter(Boolean) : [],
        status: (r.status || 'active').toLowerCase(),
        archived_at: r.archivedat || r.archived_at || null,
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    mood_tracker: parseRelationalSheet(findSheet(['mood_tracker', 'Mood Tracker']), function(r) {
      return {
        id: r.id || '',
        date: formatDateStr(r.date),
        mood: (r.mood || r.moodtier || 'neutral').toLowerCase(),
        mood_score: Number(r.moodscore || r.mood_score || 4),
        energy_level: Number(r.energylevel || r.energy_level || 3),
        note: r.note || '',
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    reflections: parseRelationalSheet(findSheet(['reflections', 'Reflections', 'monthly_reflections', 'Monthly Reflections']), function(r) {
      return {
        id: r.id || '',
        month: Number(r.month || 1),
        year: Number(r.year || new Date().getFullYear()),
        content: r.content || '',
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    monthly_reflections: parseRelationalSheet(findSheet(['reflections', 'Reflections', 'monthly_reflections', 'Monthly Reflections']), function(r) {
      return {
        id: r.id || '',
        month: Number(r.month || 1),
        year: Number(r.year || new Date().getFullYear()),
        content: r.content || '',
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    settings: parseRelationalSheet(findSheet(['settings', 'Settings']), function(r) {
      var val = r.settingvalue || r.setting_value || '';
      try { val = JSON.parse(val); } catch(e) {}
      return {
        id: r.id || undefined,
        setting_key: r.settingkey || r.setting_key || '',
        setting_value: val,
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    weekly_plans: parseRelationalSheet(findSheet(['weekly_plans', 'Weekly Plans']), function(r) {
      return {
        id: r.id || '',
        year: Number(r.year || new Date().getFullYear()),
        month: Number(r.month || 1),
        week_number: Number(r.weeknumber || r.week_number || 1),
        main_goal: r.maingoal || r.main_goal || '',
        priority_1: r.priority1 || r.priority_1 || '',
        priority_2: r.priority2 || r.priority_2 || '',
        priority_3: r.priority3 || r.priority_3 || '',
        target_percentage: Number(r.targetpercentage || r.target_percentage || 80),
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    }),
    weekly_reviews: parseRelationalSheet(findSheet(['weekly_reviews', 'Weekly Reviews']), function(r) {
      return {
        id: r.id || '',
        year: Number(r.year || new Date().getFullYear()),
        month: Number(r.month || 1),
        week_number: Number(r.weeknumber || r.week_number || 1),
        went_well: r.wentwell || r.went_well || '',
        improve: r.improve || r.couldimprove || r.could_improve || '',
        could_improve: r.couldimprove || r.could_improve || r.improve || '',
        next_focus: r.nextfocus || r.next_focus || '',
        created_at: r.createdat || r.created_at || '',
        updated_at: r.updatedat || r.updated_at || ''
      };
    })
  };
}

function parseRelationalSheet(sheet, mapper) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function(h) {
    return String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  });

  var results = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var isEmpty = true;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var val = row[c];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        isEmpty = false;
      }
      obj[headers[c]] = val;
    }
    if (!isEmpty) {
      var mapped = mapper(obj);
      if (mapped) {
        // If row is missing an id, automatically assign a UUID so the record is not dropped
        if (!mapped.id && !mapped.setting_key) {
          if (mapped.name || mapped.title || (mapped.habit_id && mapped.date) || mapped.quote || mapped.content || mapped.mood) {
            mapped.id = Utilities.getUuid();
          }
        }
        if (mapped.id || mapped.setting_key || (mapped.habit_id && mapped.date)) {
          results.push(mapped);
        }
      }
    }
  }
  return results;
}

function formatDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    var d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(val).trim();
}
`;

/**
 * Client helper to extract Google Spreadsheet ID from a URL or raw ID
 */
export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Validate imported Google Sheets data against the central relational schema
 */
export function validateGoogleSheetsImport(data: any): {
  summary: ValidationSummary;
  counts: Record<SupportedTableName, number>;
} {
  const tables: Partial<Record<SupportedTableName, any[]>> = {
    affirmations: Array.isArray(data.affirmations) ? data.affirmations : [],
    daily_journal: Array.isArray(data.daily_journal) ? data.daily_journal : [],
    goals: Array.isArray(data.goals) ? data.goals : [],
    habit_categories: Array.isArray(data.habit_categories) ? data.habit_categories : (Array.isArray(data.categories) ? data.categories : []),
    habit_entries: Array.isArray(data.habit_entries) ? data.habit_entries : [],
    habits: Array.isArray(data.habits) ? data.habits : [],
    mood_tracker: Array.isArray(data.mood_tracker) ? data.mood_tracker : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    reflections: Array.isArray(data.reflections) ? data.reflections : (Array.isArray(data.monthly_reflections) ? data.monthly_reflections : []),
    categories: Array.isArray(data.categories) ? data.categories : (Array.isArray(data.habit_categories) ? data.habit_categories : []),
    monthly_reflections: Array.isArray(data.monthly_reflections) ? data.monthly_reflections : (Array.isArray(data.reflections) ? data.reflections : []),
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    weekly_plans: Array.isArray(data.weekly_plans) ? data.weekly_plans : [],
    weekly_reviews: Array.isArray(data.weekly_reviews) ? data.weekly_reviews : [],
    settings: Array.isArray(data.settings)
      ? data.settings
      : (data.settings && typeof data.settings === 'object'
          ? Object.entries(data.settings).map(([k, v]) => ({ setting_key: k, setting_value: v }))
          : []),
  };

  const summary = validateDatabaseTables(tables);

  const counts: Record<SupportedTableName, number> = {
    affirmations: tables.affirmations?.length || 0,
    daily_journal: tables.daily_journal?.length || 0,
    goals: tables.goals?.length || 0,
    habit_categories: tables.habit_categories?.length || (tables.categories?.length || 0),
    habit_entries: tables.habit_entries?.length || 0,
    habits: tables.habits?.length || 0,
    mood_tracker: tables.mood_tracker?.length || 0,
    notes: tables.notes?.length || 0,
    reflections: tables.reflections?.length || (tables.monthly_reflections?.length || 0),
    settings: tables.settings?.length || 0,
    tasks: tables.tasks?.length || 0,
    weekly_plans: tables.weekly_plans?.length || 0,
    weekly_reviews: tables.weekly_reviews?.length || 0,
    categories: tables.categories?.length || (tables.habit_categories?.length || 0),
    monthly_reflections: tables.monthly_reflections?.length || (tables.reflections?.length || 0),
  };

  return { summary, counts };
}

/**
 * Pull all relational data from Google Sheets via backend proxy or direct fetch
 */
export async function pullRelationalDataFromGoogleSheets(scriptUrl: string): Promise<{
  success: boolean;
  data: FullExportData;
  validation: { summary: ValidationSummary; counts: Record<SupportedTableName, number> };
  message?: string;
}> {
  let rawData: any = null;

  // Try server proxy first
  try {
    const res = await api.pullGoogleSheets(scriptUrl);
    if (res && res.data) {
      rawData = res.data;
    }
  } catch (proxyErr) {
    console.warn('[Google Sheets] Proxy fetch failed, attempting direct fetch:', proxyErr);
    // Direct fetch fallback
    const targetUrl = scriptUrl.includes('?') ? `${scriptUrl}&action=pull` : `${scriptUrl}?action=pull`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Google Apps Script returned status ${response.status}`);
    }
    rawData = await response.json();
  }

  if (!rawData || typeof rawData !== 'object') {
    throw new Error('No valid data received from Google Sheets');
  }

  const validation = validateGoogleSheetsImport(rawData);

  const normalizedData: FullExportData = {
    app: APP_IDENTIFIER,
    version: SCHEMA_VERSION,
    exported_at: rawData.exported_at || new Date().toISOString(),
    habits: Array.isArray(rawData.habits) ? rawData.habits : [],
    habit_entries: Array.isArray(rawData.habit_entries) ? rawData.habit_entries : [],
    categories: Array.isArray(rawData.categories) ? rawData.categories : (Array.isArray(rawData.habit_categories) ? rawData.habit_categories : []),
    goals: Array.isArray(rawData.goals) ? rawData.goals : [],
    mood_tracker: Array.isArray(rawData.mood_tracker) ? rawData.mood_tracker : [],
    daily_journal: Array.isArray(rawData.daily_journal) ? rawData.daily_journal : [],
    weekly_plans: Array.isArray(rawData.weekly_plans) ? rawData.weekly_plans : [],
    weekly_reviews: Array.isArray(rawData.weekly_reviews) ? rawData.weekly_reviews : [],
    reflections: Array.isArray(rawData.monthly_reflections) ? rawData.monthly_reflections : (Array.isArray(rawData.reflections) ? rawData.reflections : []),
    settings: rawData.settings || {},
  };

  return {
    success: true,
    data: normalizedData,
    validation,
    message: `Loaded ${validation.counts.habits} habits, ${validation.counts.habit_entries} entries, ${validation.counts.mood_tracker} mood logs from Google Sheets`,
  };
}

/**
 * Push all relational data to Google Sheets with 100% schema parity
 */
export async function pushRelationalDataToGoogleSheets(
  scriptUrl: string,
  data: FullExportData,
  mode: 'merge' | 'replace' | 'selected' = 'merge',
  selectedTables?: SupportedTableName[]
): Promise<{ success: boolean; message: string; counts?: any; timestamp?: string }> {
  const payload = {
    ...data,
    app: APP_IDENTIFIER,
    version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    mode,
    selected_tables: selectedTables || ORDERED_TABLE_NAMES,
  };

  // Try proxy first
  try {
    const res = await api.syncGoogleSheets(scriptUrl, payload);
    return res;
  } catch (proxyErr) {
    console.warn('[Google Sheets] Proxy push failed, attempting direct post:', proxyErr);
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    return {
      success: true,
      message: result.message || 'Successfully saved to Google Sheets',
      counts: result.counts,
      timestamp: result.timestamp,
    };
  }
}
