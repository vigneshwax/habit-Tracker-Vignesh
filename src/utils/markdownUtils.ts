import React from 'react';
import { KnowledgeNote, DailyJournal, KnowledgeBacklink, KnowledgeGraphNode, KnowledgeGraphEdge } from '../types';

/**
 * Extracts Obsidian wikilinks [[Note Title]] or [[Note Title|Custom Alias]]
 */
export interface ParsedInternalLink {
  raw: string;
  targetTitle: string;
  heading?: string;
  alias?: string;
}

/**
 * Extracts Obsidian wikilinks [[Note Title]], [[Note Title|Custom Alias]], or [[Note Title#Heading|Alias]]
 */
export function extractInternalLinks(text: string): string[] {
  if (!text) return [];
  const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(text)) !== null) {
    const rawTarget = match[1].trim();
    // Split by # if there's a heading link e.g. [[Note Name#Heading]]
    const noteTitle = rawTarget.split('#')[0].trim();
    if (noteTitle) links.add(noteTitle);
  }
  return Array.from(links);
}

/**
 * Extracts full details of internal links including alias and heading
 */
export function extractDetailedInternalLinks(text: string): ParsedInternalLink[] {
  if (!text) return [];
  const linkRegex = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
  const results: ParsedInternalLink[] = [];
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(text)) !== null) {
    const targetTitle = match[1].trim();
    const heading = match[2]?.trim();
    const alias = match[3]?.trim();
    if (targetTitle) {
      results.push({
        raw: match[0],
        targetTitle,
        heading,
        alias,
      });
    }
  }
  return results;
}

/**
 * Extracts tags (#tag or #tag/subtag)
 */
export function extractTags(text: string): string[] {
  if (!text) return [];
  // Matches tags starting with # followed by alphanumeric or dash/underscore
  const tagRegex = /(?:^|\s)(#[a-zA-Z0-9_\-/]+)/g;
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(text)) !== null) {
    const tag = match[1].trim();
    if (tag.length > 1) tags.add(tag);
  }
  return Array.from(tags);
}

/**
 * Calculates word count and estimated reading time
 */
export function calculateReadingStats(text: string): { wordCount: number; minutes: number } {
  if (!text) return { wordCount: 0, minutes: 1 };
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return { wordCount, minutes };
}

/**
 * Builds backlinks map across a list of knowledge notes and optional daily journals
 */
export function buildBacklinksMap(notes: KnowledgeNote[], journals: DailyJournal[] = []): Record<string, KnowledgeBacklink[]> {
  const titleToIdMap = new Map<string, string>();
  notes.forEach((n) => {
    titleToIdMap.set(n.title.toLowerCase().trim(), n.id);
  });

  const backlinksMap: Record<string, KnowledgeBacklink[]> = {};

  // Initialize arrays
  notes.forEach((n) => {
    backlinksMap[n.id] = [];
    backlinksMap[n.title.toLowerCase().trim()] = [];
  });

  // Check notes for links
  notes.forEach((sourceNote) => {
    const links = extractInternalLinks(sourceNote.content || '');
    links.forEach((targetTitle) => {
      const lower = targetTitle.toLowerCase().trim();
      const targetId = titleToIdMap.get(lower);

      // Extract a snippet around the link
      let snippet = '';
      if (sourceNote.content) {
        const idx = sourceNote.content.toLowerCase().indexOf(`[[${lower}`);
        if (idx >= 0) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(sourceNote.content.length, idx + targetTitle.length + 50);
          snippet = (start > 0 ? '...' : '') + sourceNote.content.substring(start, end).replace(/\n/g, ' ') + (end < sourceNote.content.length ? '...' : '');
        }
      }

      const backlink: KnowledgeBacklink = {
        sourceId: sourceNote.id,
        sourceTitle: sourceNote.title,
        sourceCategory: sourceNote.category || 'Note',
        snippet,
      };

      if (targetId && backlinksMap[targetId]) {
        if (!backlinksMap[targetId].some((b) => b.sourceId === sourceNote.id)) {
          backlinksMap[targetId].push(backlink);
        }
      }
      if (backlinksMap[lower]) {
        if (!backlinksMap[lower].some((b) => b.sourceId === sourceNote.id)) {
          backlinksMap[lower].push(backlink);
        }
      }
    });
  });

  // Check daily journals for links
  journals.forEach((j) => {
    if (!j.content) return;
    const links = extractInternalLinks(j.content);
    links.forEach((targetTitle) => {
      const lower = targetTitle.toLowerCase().trim();
      const targetId = titleToIdMap.get(lower);

      const snippet = j.content.slice(0, 100).replace(/\n/g, ' ') + '...';
      const backlink: KnowledgeBacklink = {
        sourceId: `journal-${j.date}`,
        sourceTitle: `Daily Journal (${j.date})`,
        sourceCategory: 'Daily Journal',
        snippet,
      };

      if (targetId && backlinksMap[targetId]) {
        if (!backlinksMap[targetId].some((b) => b.sourceId === backlink.sourceId)) {
          backlinksMap[targetId].push(backlink);
        }
      }
      if (backlinksMap[lower]) {
        if (!backlinksMap[lower].some((b) => b.sourceId === backlink.sourceId)) {
          backlinksMap[lower].push(backlink);
        }
      }
    });
  });

  return backlinksMap;
}

/**
 * Category color palette for Obsidian graph nodes & badges
 */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; node: string; border: string }> = {
  'Daily Journal': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', node: '#10B981', border: 'border-emerald-200 dark:border-emerald-800' },
  'Learning': { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', node: '#06B6D4', border: 'border-cyan-200 dark:border-cyan-800' },
  'Ideas': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', node: '#F59E0B', border: 'border-amber-200 dark:border-amber-800' },
  'Projects': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', node: '#3B82F6', border: 'border-blue-200 dark:border-blue-800' },
  'Books': { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', node: '#8B5CF6', border: 'border-violet-200 dark:border-violet-800' },
  'Personal': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', node: '#F43F5E', border: 'border-rose-200 dark:border-rose-800' },
  'Career': { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', node: '#6366F1', border: 'border-indigo-200 dark:border-indigo-800' },
  'Goals': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', node: '#9333EA', border: 'border-purple-200 dark:border-purple-800' },
  'Checklists': { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', node: '#14B8A6', border: 'border-teal-200 dark:border-teal-800' },
  'Meeting Notes': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', node: '#64748B', border: 'border-slate-300 dark:border-slate-700' },
  'References': { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', node: '#F97316', border: 'border-orange-200 dark:border-orange-800' },
};

export function getCategoryStyle(category?: string) {
  if (!category) return CATEGORY_COLORS['Daily Journal'];
  return CATEGORY_COLORS[category] || {
    bg: 'bg-stone-50 dark:bg-stone-900',
    text: 'text-stone-700 dark:text-stone-300',
    node: '#78716C',
    border: 'border-stone-200 dark:border-stone-800',
  };
}

export interface BuildGraphOptions {
  includeTags?: boolean;
  includeAttachments?: boolean;
  includeUnresolved?: boolean;
}

/**
 * Builds authentic Obsidian Knowledge Graph nodes and edges from journal notes & wikilinks
 */
export function buildGraphData(
  notes: KnowledgeNote[],
  journals: DailyJournal[] = [],
  options: BuildGraphOptions = { includeTags: true, includeAttachments: true, includeUnresolved: true }
): { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] } {
  const nodesMap = new Map<string, KnowledgeGraphNode>();
  const titleToNodeId = new Map<string, string>();

  // Add existing notes as primary nodes
  notes.forEach((note) => {
    if (note.archived) return;
    const catStyle = getCategoryStyle(note.category);
    const node: KnowledgeGraphNode = {
      id: note.id,
      title: note.title,
      category: note.category || 'Note',
      tags: note.tags || [],
      type: 'note',
      linkCount: 0,
      color: note.color || catStyle.node,
      pinned: note.pinned,
      isUnresolved: false,
      contentSnippet: note.content ? note.content.slice(0, 160).replace(/\n/g, ' ') : '',
    };
    nodesMap.set(note.id, node);
    titleToNodeId.set(note.title.toLowerCase().trim(), note.id);
  });

  // Add active daily journals that have content
  journals.forEach((j) => {
    if (!j.content || j.content.trim().length === 0) return;
    const jId = `journal-${j.date}`;
    const node: KnowledgeGraphNode = {
      id: jId,
      title: `Daily Journal: ${j.date}`,
      category: 'Daily Journal',
      tags: j.tags || ['#journal'],
      type: 'journal',
      linkCount: 0,
      color: CATEGORY_COLORS['Daily Journal']?.node || '#10B981',
      isUnresolved: false,
      contentSnippet: j.content ? j.content.slice(0, 160).replace(/\n/g, ' ') : '',
    };
    nodesMap.set(jId, node);
    titleToNodeId.set(`daily journal: ${j.date}`.toLowerCase(), jId);
    titleToNodeId.set(j.date.toLowerCase(), jId);
  });

  const edges: KnowledgeGraphEdge[] = [];
  const edgeSet = new Set<string>();

  // Helper to safely add an edge without duplicates
  const addEdge = (sourceId: string, targetId: string, sourceTitle: string, targetTitle: string) => {
    if (sourceId === targetId) return;
    const edgeKey = [sourceId, targetId].sort().join('<->');
    if (!edgeSet.has(edgeKey)) {
      edgeSet.add(edgeKey);
      edges.push({
        source: sourceId,
        target: targetId,
        sourceTitle,
        targetTitle,
      });

      const sNode = nodesMap.get(sourceId);
      const tNode = nodesMap.get(targetId);
      if (sNode) sNode.linkCount++;
      if (tNode) tNode.linkCount++;
    }
  };

  // Helper to resolve or create unresolved wikilink nodes
  const resolveTarget = (rawTitle: string): string | null => {
    const cleanTitle = rawTitle.split('#')[0].trim();
    if (!cleanTitle) return null;
    const lower = cleanTitle.toLowerCase();
    const existingId = titleToNodeId.get(lower);
    if (existingId) return existingId;

    // Create an unresolved placeholder node if enabled
    if (options.includeUnresolved !== false) {
      const unresId = `unresolved:${lower}`;
      if (!nodesMap.has(unresId)) {
        nodesMap.set(unresId, {
          id: unresId,
          title: cleanTitle,
          category: 'Unresolved',
          tags: [],
          type: 'unresolved',
          linkCount: 0,
          color: '#64748B', // muted gray
          isUnresolved: true,
          contentSnippet: 'Unresolved link. Click to create this note.',
        });
        titleToNodeId.set(lower, unresId);
      }
      return unresId;
    }

    return null;
  };

  // Process note links
  notes.forEach((sourceNote) => {
    if (sourceNote.archived) return;
    const links = extractInternalLinks(sourceNote.content || '');
    links.forEach((targetTitle) => {
      const targetId = resolveTarget(targetTitle);
      if (targetId) {
        addEdge(sourceNote.id, targetId, sourceNote.title, targetTitle);
      }
    });

    // Tag nodes
    if (options.includeTags && sourceNote.tags) {
      sourceNote.tags.forEach((tag) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;
        const tagId = `tag:${cleanTag.toLowerCase()}`;
        if (!nodesMap.has(tagId)) {
          nodesMap.set(tagId, {
            id: tagId,
            title: `#${cleanTag}`,
            category: 'Tag',
            tags: [cleanTag],
            type: 'tag',
            linkCount: 0,
            color: '#38BDF8', // Cyan tag dot
            isUnresolved: false,
            contentSnippet: `Tag #${cleanTag}`,
          });
        }
        addEdge(sourceNote.id, tagId, sourceNote.title, `#${cleanTag}`);
      });
    }

    // Attachment nodes
    if (options.includeAttachments && sourceNote.content) {
      const attachRegex = /!\[\[([^\]]+)\]\]/g;
      let attachMatch: RegExpExecArray | null;
      while ((attachMatch = attachRegex.exec(sourceNote.content)) !== null) {
        const attachName = attachMatch[1].trim();
        if (attachName) {
          const attachId = `attach:${attachName.toLowerCase()}`;
          if (!nodesMap.has(attachId)) {
            nodesMap.set(attachId, {
              id: attachId,
              title: attachName,
              category: 'Attachment',
              tags: [],
              type: 'attachment',
              linkCount: 0,
              color: '#F472B6', // Pink attachment
              isUnresolved: false,
              contentSnippet: `Attachment: ${attachName}`,
            });
          }
          addEdge(sourceNote.id, attachId, sourceNote.title, attachName);
        }
      }
    }
  });

  // Process daily journal links
  journals.forEach((j) => {
    if (!j.content) return;
    const jId = `journal-${j.date}`;
    const links = extractInternalLinks(j.content);
    links.forEach((targetTitle) => {
      const targetId = resolveTarget(targetTitle);
      if (targetId) {
        addEdge(jId, targetId, `Daily Journal: ${j.date}`, targetTitle);
      }
    });

    if (options.includeTags && j.tags) {
      j.tags.forEach((tag) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;
        const tagId = `tag:${cleanTag.toLowerCase()}`;
        if (!nodesMap.has(tagId)) {
          nodesMap.set(tagId, {
            id: tagId,
            title: `#${cleanTag}`,
            category: 'Tag',
            tags: [cleanTag],
            type: 'tag',
            linkCount: 0,
            color: '#38BDF8',
            isUnresolved: false,
            contentSnippet: `Tag #${cleanTag}`,
          });
        }
        addEdge(jId, tagId, `Daily Journal: ${j.date}`, `#${cleanTag}`);
      });
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}

/**
 * Draft recovery helpers stored in localStorage with timestamps
 */
export const DraftStorage = {
  saveJournalDraft(date: string, draft: any) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`vignesh_journal_draft_${date}`, JSON.stringify({ draft, savedAt: Date.now() }));
    } catch (e) {
      console.warn('Could not save draft', e);
    }
  },

  getJournalDraft(date: string): any | null {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(`vignesh_journal_draft_${date}`);
      if (!val) return null;
      const parsed = JSON.parse(val);
      // Valid for 24 hours
      if (Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
        return parsed.draft;
      }
      localStorage.removeItem(`vignesh_journal_draft_${date}`);
    } catch (e) {
      // ignore
    }
    return null;
  },

  clearJournalDraft(date: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`vignesh_journal_draft_${date}`);
    } catch (e) {
      // ignore
    }
  },

  saveNoteDraft(noteId: string, draft: any) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`vignesh_note_draft_${noteId}`, JSON.stringify({ draft, savedAt: Date.now() }));
    } catch (e) {
      console.warn('Could not save note draft', e);
    }
  },

  getNoteDraft(noteId: string): any | null {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(`vignesh_note_draft_${noteId}`);
      if (!val) return null;
      const parsed = JSON.parse(val);
      if (Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
        return parsed.draft;
      }
      localStorage.removeItem(`vignesh_note_draft_${noteId}`);
    } catch (e) {
      // ignore
    }
    return null;
  },

  clearNoteDraft(noteId: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`vignesh_note_draft_${noteId}`);
    } catch (e) {
      // ignore
    }
  },
};

// ==========================================
// MARKDOWN TABLE UTILITIES & SPREADSHEET PARSER
// ==========================================

export type ColumnAlignment = 'left' | 'center' | 'right';

export interface MarkdownTableData {
  headers: string[];
  alignments: ColumnAlignment[];
  rows: string[][];
}

/**
 * Checks if a trimmed line is a markdown table delimiter row (e.g. |---|:---:|---:|)
 */
export function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  // Splits by pipe and checks each cell has at least 1 or 2 dashes
  const parts = trimmed.split('|').map((s) => s.trim()).filter((s) => s.length > 0);
  if (parts.length === 0) return false;
  return parts.every((p) => /^:?-+:?$/.test(p));
}

/**
 * Checks if a trimmed line is part of a markdown table
 */
export function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') || (trimmed.includes('|') && trimmed.endsWith('|'));
}

/**
 * Extracts alignment from a delimiter cell string like :---, :---:, ---:
 */
export function parseDelimiterAlignment(cell: string): ColumnAlignment {
  const trimmed = cell.trim();
  const startsWithColon = trimmed.startsWith(':');
  const endsWithColon = trimmed.endsWith(':');
  if (startsWithColon && endsWithColon) return 'center';
  if (endsWithColon) return 'right';
  return 'left';
}

/**
 * Parses markdown table lines into structured table data
 */
export function parseMarkdownTableLines(lines: string[]): MarkdownTableData | null {
  if (lines.length < 2) return null;

  // Split line by pipe, trimming whitespace
  const parseRow = (line: string): string[] => {
    let cleaned = line.trim();
    if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
    if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);
    return cleaned.split('|').map((c) => c.trim());
  };

  const headers = parseRow(lines[0]);
  const delimiterCells = parseRow(lines[1]);

  if (!isTableSeparatorLine(lines[1])) {
    return null;
  }

  const alignments: ColumnAlignment[] = headers.map((_, idx) => {
    const delim = delimiterCells[idx] || '---';
    return parseDelimiterAlignment(delim);
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const rawCells = parseRow(lines[i]);
    // Pad or trim to header length
    const padded = headers.map((_, idx) => rawCells[idx] || '');
    rows.push(padded);
  }

  return { headers, alignments, rows };
}

/**
 * Formats structured table data into aligned Markdown table string
 */
export function formatTableToMarkdown(data: MarkdownTableData): string {
  const { headers, alignments, rows } = data;
  if (!headers || headers.length === 0) return '';

  // Calculate column widths for aesthetic padding
  const colWidths = headers.map((h, colIdx) => {
    let max = Math.max(3, (h || '').length);
    rows.forEach((row) => {
      const cell = row[colIdx] || '';
      if (cell.length > max) max = cell.length;
    });
    return max;
  });

  // Header row
  const headerStr =
    '| ' +
    headers.map((h, i) => (h || '').padEnd(colWidths[i])).join(' | ') +
    ' |';

  // Delimiter row
  const delimStr =
    '| ' +
    alignments
      .map((align, i) => {
        const width = colWidths[i];
        if (align === 'center') {
          return ':' + '-'.repeat(Math.max(1, width - 2)) + ':';
        }
        if (align === 'right') {
          return '-'.repeat(Math.max(2, width - 1)) + ':';
        }
        return ':' + '-'.repeat(Math.max(2, width - 1));
      })
      .join(' | ') +
    ' |';

  // Body rows
  const bodyStrs = rows.map((row) => {
    return (
      '| ' +
      headers
        .map((_, colIdx) => {
          const val = row[colIdx] || '';
          const align = alignments[colIdx] || 'left';
          const width = colWidths[colIdx];
          if (align === 'right') return val.padStart(width);
          if (align === 'center') {
            const padTotal = Math.max(0, width - val.length);
            const leftPad = Math.floor(padTotal / 2);
            const rightPad = padTotal - leftPad;
            return ' '.repeat(leftPad) + val + ' '.repeat(rightPad);
          }
          return val.padEnd(width);
        })
        .join(' | ') +
      ' |'
    );
  });

  return [headerStr, delimStr, ...bodyStrs].join('\n');
}

/**
 * Parses tab-delimited or comma-delimited data (e.g. copied from Excel or Google Sheets)
 */
export function parseSpreadsheetPaste(rawText: string): MarkdownTableData {
  if (!rawText) {
    return {
      headers: ['Column 1', 'Column 2', 'Column 3'],
      alignments: ['left', 'left', 'left'],
      rows: [['', '', '']],
    };
  }

  // Detect delimiter: tab (\t) or comma or pipe
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      headers: ['Column 1', 'Column 2'],
      alignments: ['left', 'left'],
      rows: [['', '']],
    };
  }

  const firstLine = lines[0];
  let delimiter = '\t';
  if (!firstLine.includes('\t')) {
    if (firstLine.includes('|')) delimiter = '|';
    else if (firstLine.includes(',')) delimiter = ',';
  }

  const parseRow = (line: string): string[] => {
    if (delimiter === '|') {
      let cleaned = line.trim();
      if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
      if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);
      return cleaned.split('|').map((s) => s.trim());
    }
    return line.split(delimiter).map((s) => s.trim().replace(/^"(.*)"$/, '$1'));
  };

  const rawRows = lines.map(parseRow);
  const maxCols = Math.max(...rawRows.map((r) => r.length), 1);

  // If first line looks like headers, use it, else generate default headers
  const headers = rawRows[0].map((h, idx) => h.trim() || `Column ${idx + 1}`);
  while (headers.length < maxCols) {
    headers.push(`Column ${headers.length + 1}`);
  }

  const rows = rawRows.slice(1).map((r) => {
    const padded = [...r];
    while (padded.length < maxCols) padded.push('');
    return padded;
  });

  if (rows.length === 0) {
    rows.push(headers.map(() => ''));
  }

  const alignments: ColumnAlignment[] = headers.map(() => 'left');

  return { headers, alignments, rows };
}
