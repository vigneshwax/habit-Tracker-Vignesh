import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Heading as TiptapHeading } from '@tiptap/extension-heading';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { InputRule } from '@tiptap/core';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table as TableIcon,
  Link2,
  Undo2,
  Redo2,
  Columns,
  Eye,
  FileCode,
  Sparkles,
  Search,
  Plus,
  Trash2,
  FileSpreadsheet,
  Check,
  ChevronDown,
  Rows,
} from 'lucide-react';
import { KnowledgeNote } from '../../types';
import { TableEditorModal } from './TableEditorModal';
import { MarkdownRenderer } from './MarkdownRenderer';
import { parseSpreadsheetPaste, formatTableToMarkdown } from '../../utils/markdownUtils';

// Custom Heading with enhanced input rules and Obsidian keyboard shortcuts
const CustomHeading = TiptapHeading.extend({
  addInputRules() {
    return [
      // Standard # space -> H1, ## space -> H2, etc.
      ...this.parent?.() || [],
      // Handle user typing '# Hi' and pressing Space -> converts line to H1 with 'Hi'
      new InputRule({
        find: /^(#{1,6})\s+(.+?)\s$/,
        handler: ({ state, range, match }) => {
          const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
          const headingText = match[2];
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.replaceWith(start, end, state.schema.text(headingText + ' '));
          tr.setBlockType(start, start + headingText.length + 1, this.type, { level });
        },
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      // Enter on a heading: move to a normal paragraph
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        if ($from.parent.type.name === 'heading') {
          if ($from.parent.textContent.trim().length === 0) {
            return editor.commands.setParagraph();
          }
          if ($from.parentOffset === $from.parent.content.size) {
            return editor.chain().insertContentAt($from.after(), { type: 'paragraph' }).focus().run();
          }
          return editor.chain().splitBlock().setParagraph().run();
        }
        return false;
      },
      // Backspace on empty heading: return to normal paragraph
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        if ($from.parent.type.name === 'heading' && $from.parent.textContent.length === 0) {
          return editor.commands.setParagraph();
        }
        return false;
      },
    };
  },
});

// Custom TaskItem with input rules for - [ ] and - [x]
const CustomTaskItem = TaskItem.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^\s*-\s*\[ \]\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          this.editor.commands.toggleTaskList();
        },
      }),
      new InputRule({
        find: /^\s*-\s*\[x\]\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          this.editor.commands.toggleTaskList();
        },
      }),
    ];
  },
});

export type EditorViewMode = 'live' | 'source' | 'split' | 'preview';

interface ObsidianMarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  allNotes?: KnowledgeNote[];
  existingNoteTitles?: Set<string> | string[];
  onInternalLinkClick?: (title: string, heading?: string) => void;
  saveStatus?: 'saved' | 'saving' | 'dirty' | 'error';
  lastSavedTime?: string;
  defaultMode?: EditorViewMode;
  minHeight?: string;
  className?: string;
  titleInput?: React.ReactNode;
}

export const ObsidianMarkdownEditor: React.FC<ObsidianMarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type / for commands, # for headings, - for lists, [[ to link notes...',
  allNotes = [],
  existingNoteTitles,
  onInternalLinkClick,
  saveStatus = 'saved',
  lastSavedTime = 'All changes synced',
  defaultMode = 'live',
  minHeight = '360px',
  className = '',
  titleInput,
}) => {
  const [viewMode, setViewMode] = useState<EditorViewMode>(defaultMode);
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);

  // Autocomplete popup for [[ wikilinks
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Ref to track internal markdown to prevent re-rendering loop
  const internalMarkdownRef = useRef(value);
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Replaced by CustomHeading
        dropcursor: { color: '#5B8266' },
      }),
      CustomHeading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      TaskList,
      CustomTaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'ProseMirror prose prose-stone dark:prose-invert max-w-none focus:outline-none p-4 sm:p-5 text-stone-800 dark:text-stone-100 text-sm leading-relaxed min-h-[320px]',
      },
      handleKeyDown: (_view, event) => {
        // Keyboard Shortcuts
        // Ctrl+B / Cmd+B -> Bold
        // Ctrl+I / Cmd+I -> Italic
        // Ctrl+K / Cmd+K -> Wikilink insertion
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setShowLinkSuggestions(true);
          setLinkQuery('');
          setSuggestionIndex(0);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // @ts-expect-error tiptap-markdown storage
      const md = editor.storage.markdown?.getMarkdown?.() ?? '';
      internalMarkdownRef.current = md;
      onChange(md);

      // Check cursor context for [[ wikilink typing
      try {
        const { state } = editor;
        const { from } = state.selection;
        const textBefore = state.doc.textBetween(Math.max(0, from - 30), from, '\n');
        const lastDoubleBracket = textBefore.lastIndexOf('[[');
        if (lastDoubleBracket !== -1 && !textBefore.slice(lastDoubleBracket).includes(']]')) {
          const query = textBefore.slice(lastDoubleBracket + 2);
          setLinkQuery(query);
          setShowLinkSuggestions(true);
          setSuggestionIndex(0);
        } else {
          setShowLinkSuggestions(false);
        }
      } catch (e) {
        // ignore
      }
    },
  });

  // Sync external value updates to editor if changed externally
  useEffect(() => {
    if (editor && value !== internalMarkdownRef.current) {
      internalMarkdownRef.current = value;
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // Filter note suggestions for [[ wikilinks
  const filteredSuggestions = useMemo(() => {
    const q = linkQuery.toLowerCase().trim();
    return allNotes
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          (n.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (n.category || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 7);
  }, [allNotes, linkQuery]);

  // Insert selected wikilink into editor or source textarea
  const insertWikilink = (noteTitle: string) => {
    const linkText = `[[${noteTitle}]]`;
    if (viewMode === 'live' && editor) {
      // Find range of [[ and query
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 30), from, '\n');
      const lastDoubleBracket = textBefore.lastIndexOf('[[');
      if (lastDoubleBracket !== -1) {
        const replaceFrom = from - (textBefore.length - lastDoubleBracket);
        editor
          .chain()
          .focus()
          .deleteRange({ from: replaceFrom, to: from })
          .insertContent(linkText + ' ')
          .run();
      } else {
        editor.chain().focus().insertContent(linkText + ' ').run();
      }
    } else if (rawTextareaRef.current) {
      const textarea = rawTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const lastBracket = before.lastIndexOf('[[');
      let newText = '';
      if (lastBracket !== -1 && !before.slice(lastBracket).includes(']]')) {
        newText = text.substring(0, lastBracket) + linkText + ' ' + after;
      } else {
        newText = before + linkText + after;
      }
      onChange(newText);
    }
    setShowLinkSuggestions(false);
  };

  // Keyboard navigation for suggestions
  const handleSuggestionKeyDown = (e: React.KeyboardEvent) => {
    if (!showLinkSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev + 1) % Math.max(1, filteredSuggestions.length + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredSuggestions.length) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestionIndex < filteredSuggestions.length) {
        insertWikilink(filteredSuggestions[suggestionIndex].title);
      } else if (linkQuery.trim()) {
        insertWikilink(linkQuery.trim());
      }
    } else if (e.key === 'Escape') {
      setShowLinkSuggestions(false);
    }
  };

  // Handling paste of Excel/Sheets in raw mode
  const handleRawPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData.getData('text/plain');
    if (clipboardData && (clipboardData.includes('\t') || clipboardData.includes('\n'))) {
      const parsed = parseSpreadsheetPaste(clipboardData);
      if (parsed && parsed.rows.length >= 1 && parsed.headers.length >= 2) {
        e.preventDefault();
        const mdTable = formatTableToMarkdown(parsed);
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const nextVal = value.substring(0, start) + '\n\n' + mdTable + '\n\n' + value.substring(end);
        onChange(nextVal);
      }
    }
  };

  // Quick Table Insertion for Tiptap
  const insertTableInEditor = () => {
    if (viewMode === 'live' && editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    } else {
      const sample = [
        '| Column 1 | Column 2 | Column 3 |',
        '| :--- | :---: | ---: |',
        '| Row 1 | Data | Value |',
        '| Row 2 | Data | Value |',
      ].join('\n');
      const updated = (value ? value + '\n\n' : '') + sample + '\n\n';
      onChange(updated);
    }
    setShowTableMenu(false);
  };

  // Stats
  const wordCount = useMemo(() => {
    return value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [value]);

  const charCount = useMemo(() => value.length, [value]);

  return (
    <div
      className={`rounded-2xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs overflow-hidden flex flex-col ${className}`}
      onKeyDown={handleSuggestionKeyDown}
    >
      {/* Title Input (if passed) */}
      {titleInput && (
        <div className="p-4 sm:px-6 pt-5 pb-3 border-b border-stone-100 dark:border-slate-800">
          {titleInput}
        </div>
      )}

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-stone-50/80 dark:bg-slate-900/60 border-b border-stone-200 dark:border-slate-700 text-xs">
        {/* Left Toolbar formatting actions */}
        <div className="flex flex-wrap items-center gap-1">
          {/* View Mode: Live, Source, Split, Preview */}
          <div className="flex items-center p-0.5 rounded-xl bg-stone-200/80 dark:bg-slate-700/80 text-xs mr-2">
            <button
              type="button"
              onClick={() => setViewMode('live')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors ${
                viewMode === 'live'
                  ? 'bg-white dark:bg-slate-800 text-[#2E5A39] dark:text-emerald-300 font-semibold shadow-2xs'
                  : 'text-stone-600 dark:text-slate-300 hover:text-stone-900'
              }`}
              title="Obsidian Live Formatted Mode (Real-time formatting)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5B8266]" />
              <span className="text-[11px]">Live</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('source')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors ${
                viewMode === 'source'
                  ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-stone-600 dark:text-slate-300 hover:text-stone-900'
              }`}
              title="Markdown Source Mode"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="text-[11px]">Source</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-800 text-[#2E5A39] dark:text-emerald-300 font-semibold shadow-2xs ring-1 ring-emerald-500/30'
                  : 'text-stone-600 dark:text-slate-300 hover:text-stone-900'
              }`}
              title="Split View: Editor + Live Output Preview"
            >
              <Columns className="w-3.5 h-3.5 text-[#5B8266]" />
              <span className="text-[11px]">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-stone-600 dark:text-slate-300 hover:text-stone-900'
              }`}
              title="Reading View (Preview Only)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[11px]">Preview</span>
            </button>
          </div>

          {/* Text formatting actions (when not in pure preview) */}
          {viewMode !== 'preview' && (
            <>
              {/* Headings */}
              <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-slate-700 pr-1.5 mr-1">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('heading', { level: 1 })
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39] font-bold'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Heading 1 (# Text + Space)"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('heading', { level: 2 })
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39] font-bold'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Heading 2 (## Text + Space)"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('heading', { level: 3 })
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39] font-bold'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Heading 3 (### Text + Space)"
                >
                  <Heading3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bold, Italic, Strike, Code */}
              <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-slate-700 pr-1.5 mr-1">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('bold')
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39]'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Bold (Ctrl+B / **text**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('italic')
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39]'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Italic (Ctrl+I / *text*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('strike')
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39]'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Strikethrough (~~text~~)"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleCode().run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer font-mono ${
                    editor?.isActive('code')
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39]'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Inline Code (`text`)"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lists & Task List */}
              <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-slate-700 pr-1.5 mr-1">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('bulletList')
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39]'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Bullet List (- item)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('orderedList')
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39]'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Numbered List (1. item)"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleTaskList().run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('taskList')
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39]'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Checklist Task (- [ ] item)"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={`p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer ${
                    editor?.isActive('blockquote')
                      ? 'bg-stone-200 dark:bg-slate-700 text-[#2E5A39]'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}
                  title="Blockquote (> quote)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                  className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 cursor-pointer text-stone-700 dark:text-slate-300"
                  title="Divider (---)"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Obsidian [[Wikilink]] button */}
              <button
                type="button"
                onClick={() => {
                  setShowLinkSuggestions(true);
                  setLinkQuery('');
                  setSuggestionIndex(0);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#2E5A39] dark:text-emerald-300 font-mono font-semibold hover:bg-[#DCEEE3] border border-[#CDE1D4] dark:border-emerald-800 cursor-pointer text-[11px]"
                title="Insert Obsidian internal note link [[Note Name]]"
              >
                <Link2 className="w-3 h-3" />
                <span>[[Link]]</span>
              </button>

              {/* Table Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTableMenu(!showTableMenu)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 cursor-pointer text-[11px]"
                  title="Table Actions"
                >
                  <TableIcon className="w-3.5 h-3.5 text-stone-600 dark:text-slate-300" />
                  <span>Table</span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {showTableMenu && (
                  <div className="absolute left-0 mt-1 w-52 p-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-stone-200 dark:border-slate-700 z-50 text-xs space-y-1">
                    <button
                      type="button"
                      onClick={insertTableInEditor}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#5B8266]" />
                      <span>Insert 3x3 Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTableEditorOpen(true);
                        setShowTableMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer text-[#2E5A39] dark:text-emerald-300 font-semibold"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Visual Table & Excel Import</span>
                    </button>
                    {editor?.isActive('table') && (
                      <>
                        <div className="h-px bg-stone-100 dark:bg-slate-700 my-1" />
                        <button
                          type="button"
                          onClick={() => editor.chain().focus().addRowAfter().run()}
                          className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <Rows className="w-3.5 h-3.5 text-stone-500" />
                          <span>Add Row</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => editor.chain().focus().addColumnAfter().run()}
                          className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <Columns className="w-3.5 h-3.5 text-stone-500" />
                          <span>Add Column</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => editor.chain().focus().deleteRow().run()}
                          className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Row</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => editor.chain().focus().deleteTable().run()}
                          className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 flex items-center gap-2 cursor-pointer font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Entire Table</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer text-stone-600 dark:text-slate-300"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo()}
                  className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer text-stone-600 dark:text-slate-300"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Toolbar: Autosave status & Word count */}
        <div className="flex items-center gap-2.5 text-[11px] font-mono text-stone-500 dark:text-slate-400">
          {/* Autosave status indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200/60 dark:border-slate-700/60">
            {saveStatus === 'saving' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{lastSavedTime}</span>
              </>
            )}
            {saveStatus === 'dirty' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Draft</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-500">Error saving</span>
              </>
            )}
          </div>

          {/* Counts */}
          <div className="hidden sm:flex items-center gap-2 text-stone-400">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} chars</span>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 flex flex-col" style={{ minHeight }}>
        {/* Mode 1: Live Formatted Editor (Obsidian Style Live Editing) */}
        {viewMode === 'live' && (
          <div className="flex-1 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        )}

        {/* Mode 2: Raw Markdown Source */}
        {viewMode === 'source' && (
          <div className="flex-1 flex flex-col p-4 sm:p-5">
            <div className="text-[10px] font-mono uppercase text-stone-400 dark:text-slate-500 mb-1 font-semibold flex items-center justify-between">
              <span>Raw Markdown Source</span>
              <span>Obsidian [[Wikilinks]] &amp; Tables Supported</span>
            </div>
            <textarea
              ref={rawTextareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handleRawPaste}
              placeholder={placeholder}
              className="flex-1 w-full min-h-[340px] bg-transparent text-stone-800 dark:text-stone-100 font-mono text-xs leading-relaxed resize-none focus:outline-none"
            />
          </div>
        )}

        {/* Mode 3: Split (Live Editor on Left, Output Preview on Right) */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200 dark:divide-slate-700 min-h-[380px]">
            {/* Left: Live Formatted Editor */}
            <div className="flex flex-col relative bg-white dark:bg-slate-800 overflow-y-auto">
              <div className="px-4 py-2 text-[10px] font-mono uppercase text-stone-400 dark:text-slate-500 font-semibold border-b border-stone-100 dark:border-slate-700/60 flex items-center justify-between">
                <span>Editor (Live Formatted)</span>
                <span className="text-emerald-600 font-bold">LIVE</span>
              </div>
              <div className="flex-1">
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Right: Rendered Output */}
            <div className="flex flex-col bg-[#FAF8F5]/40 dark:bg-slate-900/40 overflow-y-auto">
              <div className="px-4 py-2 text-[10px] font-mono uppercase text-stone-400 dark:text-slate-500 font-semibold border-b border-stone-100 dark:border-slate-700/60 flex items-center justify-between">
                <span>Output &amp; Navigation Preview</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                  RENDERED
                </span>
              </div>
              <div className="p-4 sm:p-5 flex-1">
                <MarkdownRenderer
                  content={value}
                  existingNoteTitles={existingNoteTitles}
                  notes={allNotes}
                  onInternalLinkClick={onInternalLinkClick}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mode 4: Full Reading View (Preview Only) */}
        {viewMode === 'preview' && (
          <div className="p-4 sm:p-6 bg-[#FAF8F5]/30 dark:bg-slate-900/30 overflow-y-auto flex-1">
            <MarkdownRenderer
              content={value}
              existingNoteTitles={existingNoteTitles}
              notes={allNotes}
              onInternalLinkClick={onInternalLinkClick}
            />
          </div>
        )}

        {/* Autocomplete Popup for [[ wikilinks */}
        {showLinkSuggestions && (
          <div className="absolute top-12 left-6 w-80 max-w-[90vw] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-slate-700 z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95">
            <div className="p-2.5 bg-stone-50 dark:bg-slate-900/70 border-b border-stone-200 dark:border-slate-700 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#5B8266]" />
              <input
                type="text"
                autoFocus
                placeholder="Type note title to link..."
                value={linkQuery}
                onChange={(e) => {
                  setLinkQuery(e.target.value);
                  setSuggestionIndex(0);
                }}
                className="w-full bg-transparent text-xs text-stone-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-stone-100 dark:divide-slate-700/50">
              {filteredSuggestions.map((sNote, idx) => (
                <button
                  key={sNote.id}
                  type="button"
                  onClick={() => insertWikilink(sNote.title)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                    suggestionIndex === idx
                      ? 'bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#2E5A39] dark:text-emerald-300 font-semibold'
                      : 'hover:bg-stone-50 dark:hover:bg-slate-700/50 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate">{sNote.title}</span>
                    {sNote.category && (
                      <span className="text-[10px] text-stone-400 capitalize">
                        {sNote.category}
                      </span>
                    )}
                  </div>
                  <Link2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                </button>
              ))}

              {/* Create new note if query provided */}
              {linkQuery.trim() && (
                <button
                  type="button"
                  onClick={() => insertWikilink(linkQuery.trim())}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer text-[#2E5A39] dark:text-emerald-300 font-semibold ${
                    suggestionIndex === filteredSuggestions.length
                      ? 'bg-[#EBF3EE] dark:bg-emerald-950/60'
                      : 'hover:bg-stone-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create link to &quot;{linkQuery.trim()}&quot;</span>
                </button>
              )}

              {filteredSuggestions.length === 0 && !linkQuery.trim() && (
                <div className="p-4 text-center text-xs text-stone-400">
                  No notes available to link.
                </div>
              )}
            </div>
            <div className="px-3 py-1.5 bg-stone-50 dark:bg-slate-900 text-[10px] text-stone-400 flex items-center justify-between border-t border-stone-200 dark:border-slate-700">
              <span>↑↓ navigate • Enter to select • Esc to dismiss</span>
            </div>
          </div>
        )}
      </div>

      {/* Visual Table Editor Modal */}
      {isTableEditorOpen && (
        <TableEditorModal
          isOpen={isTableEditorOpen}
          onClose={() => setIsTableEditorOpen(false)}
          onInsertTable={(markdownTable) => {
            if (viewMode === 'live' && editor) {
              editor.chain().focus().insertContent('\n\n' + markdownTable + '\n\n').run();
            } else {
              const updated = (value ? value + '\n\n' : '') + markdownTable + '\n\n';
              onChange(updated);
            }
          }}
        />
      )}
    </div>
  );
};
