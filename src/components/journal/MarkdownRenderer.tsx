import React, { useMemo, useState } from 'react';
import {
  isTableLine,
  parseMarkdownTableLines,
  ColumnAlignment,
} from '../../utils/markdownUtils';
import { KnowledgeNote } from '../../types';
import { Check, Copy, Table, AlertCircle, Link2, ExternalLink, FileText } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  existingNoteTitles?: Set<string> | string[];
  notes?: KnowledgeNote[];
  onInternalLinkClick?: (title: string, heading?: string) => void;
  onTagClick?: (tag: string) => void;
}

/**
 * Obsidian & Markdown Renderer
 * Features:
 * - Internal Wikilinks: [[Note Name]], [[Note Name|Display Text]], [[Note Name#Heading]]
 * - Visual indication for broken links (notes that don't exist yet)
 * - Complete Markdown Tables: headers, rows, alignment (:---, :---:, ---:), responsive scroll
 * - Code blocks, blockquotes, headings, lists, task checkboxes, tags (#tag), bold, italic
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  existingNoteTitles,
  notes = [],
  onInternalLinkClick,
  onTagClick,
}) => {
  const [copiedTableIdx, setCopiedTableIdx] = useState<number | null>(null);

  // Set of lowercase existing titles for fast broken-link lookup
  const knownTitlesSet = useMemo(() => {
    if (!existingNoteTitles) return null;
    if (existingNoteTitles instanceof Set) {
      const lower = new Set<string>();
      existingNoteTitles.forEach((t) => lower.add(t.toLowerCase().trim()));
      return lower;
    }
    return new Set(existingNoteTitles.map((t) => t.toLowerCase().trim()));
  }, [existingNoteTitles]);

  // Parse inline text tokens (wikilinks, tags, bold, italic, inline code)
  const renderInlineTokens = (text: string) => {
    // Regex matches:
    // 1. [[Note#Heading|Alias]] or [[Note|Alias]] or [[Note#Heading]] or [[Note]]
    // 2. #tag
    // 3. `inline code`
    // 4. **bold**
    // 5. *italic*
    const tokenRegex = /(\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\])|((?:^|\s)#[a-zA-Z0-9_\-/]+)|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIdx = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }

      const fullMatch = match[0];

      // 1. [[Wikilink]]
      if (match[1]) {
        const targetNote = match[2].trim();
        const heading = match[3]?.trim();
        const alias = match[4]?.trim();

        const displayText = alias || (heading ? `${targetNote} › ${heading}` : targetNote);
        const isKnown = knownTitlesSet ? knownTitlesSet.has(targetNote.toLowerCase()) : true;
        const matchedNote = notes.find(
          (n) => n.title.toLowerCase().trim() === targetNote.toLowerCase()
        );

        if (isKnown) {
          // Standard active Obsidian link with hover preview card
          elements.push(
            <span key={`link-wrap-${keyIdx++}`} className="relative inline-block group">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInternalLinkClick?.(targetNote, heading);
                }}
                className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-semibold bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#2E5A39] dark:text-emerald-300 border border-[#CDE1D4] dark:border-emerald-800/80 hover:bg-[#DCEEE3] dark:hover:bg-emerald-900/60 transition-colors cursor-pointer underline decoration-[#2E5A39]/30 hover:decoration-[#2E5A39]"
                title={heading ? `Open [[${targetNote}#${heading}]]` : `Open [[${targetNote}]]`}
              >
                <span className="text-[10px] text-[#5B8266] dark:text-emerald-400 mr-1 select-none font-mono">[[</span>
                <span>{displayText}</span>
                <span className="text-[10px] text-[#5B8266] dark:text-emerald-400 ml-1 select-none font-mono">]]</span>
              </button>

              {/* Obsidian Hover Preview Card */}
              {matchedNote && (
                <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-stone-900/95 text-stone-100 rounded-2xl shadow-xl text-left z-40 text-xs hidden sm:block border border-stone-700/60 backdrop-blur-md">
                  <span className="font-semibold text-white block truncate mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{matchedNote.title}</span>
                  </span>
                  {matchedNote.category && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono inline-block mb-1.5 border border-emerald-800/60">
                      {matchedNote.category}
                    </span>
                  )}
                  <span className="text-[11px] text-stone-300 line-clamp-3 block leading-relaxed font-sans">
                    {matchedNote.content
                      ? matchedNote.content.replace(/^#+ .*\n/, '').replace(/\[\[|\]\]/g, '').trim().slice(0, 140) + '...'
                      : 'No content written yet.'}
                  </span>
                  <span className="text-[9px] text-stone-400 mt-1.5 block font-mono">
                    Click to open note
                  </span>
                </span>
              )}
            </span>
          );
        } else {
          // Broken / Not-yet-created link visual indication
          elements.push(
            <span key={`link-broken-wrap-${keyIdx++}`} className="relative inline-block group">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInternalLinkClick?.(targetNote, heading);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-medium bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-700 hover:bg-amber-100/90 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                title={`Note "${targetNote}" does not exist yet. Click to create!`}
              >
                <span className="text-[10px] text-amber-500 font-mono">[[</span>
                <span className="underline decoration-amber-400 decoration-wavy">{displayText}</span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-200/70 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-bold tracking-wider">
                  new
                </span>
                <span className="text-[10px] text-amber-500 font-mono">]]</span>
              </button>

              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-stone-900/95 text-stone-100 rounded-xl shadow-xl text-left z-40 text-xs hidden sm:block border border-amber-500/40 backdrop-blur-md">
                <span className="font-semibold text-amber-300 block truncate mb-1">
                  Note Not Created Yet
                </span>
                <span className="text-[11px] text-stone-300 block leading-snug font-sans">
                  Click to create &quot;{targetNote}&quot; and link bi-directionally.
                </span>
              </span>
            </span>
          );
        }
      }
      // 2. #tag
      else if (match[5]) {
        const rawTag = match[5].trim();
        elements.push(
          <button
            key={`tag-${keyIdx++}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTagClick?.(rawTag);
            }}
            className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer border border-stone-200 dark:border-stone-700 transition-colors"
          >
            {rawTag}
          </button>
        );
      }
      // 3. `inline code`
      else if (match[6]) {
        const codeText = match[6].slice(1, -1);
        elements.push(
          <code
            key={`code-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-900 text-rose-600 dark:text-rose-400 text-xs font-mono border border-stone-200 dark:border-slate-800"
          >
            {codeText}
          </code>
        );
      }
      // 4. **bold**
      else if (match[7]) {
        const boldText = match[7].slice(2, -2);
        elements.push(
          <strong key={`bold-${keyIdx++}`} className="font-semibold text-[#1A1815] dark:text-white">
            {boldText}
          </strong>
        );
      }
      // 5. *italic*
      else if (match[8]) {
        const italicText = match[8].slice(1, -1);
        elements.push(
          <em key={`italic-${keyIdx++}`} className="italic text-stone-700 dark:text-stone-300">
            {italicText}
          </em>
        );
      }

      lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements;
  };

  const handleCopyTable = (tableLines: string[], idx: number) => {
    navigator.clipboard.writeText(tableLines.join('\n'));
    setCopiedTableIdx(idx);
    setTimeout(() => setCopiedTableIdx(null), 2000);
  };

  const renderedBlocks = useMemo(() => {
    if (!content) {
      return (
        <p className="text-stone-400 dark:text-stone-500 italic text-sm">
          No content written yet.
        </p>
      );
    }

    const lines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        i++;
        continue;
      }

      // 1. Code blocks (```)
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        blocks.push(
          <div key={`block-${i}`} className="my-3 rounded-xl bg-slate-900 text-slate-100 p-3.5 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
            {lang && <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">{lang}</div>}
            <pre className="leading-relaxed">{codeLines.join('\n')}</pre>
          </div>
        );
        continue;
      }

      // 2. Markdown Tables (| ... |)
      if (isTableLine(trimmed) && i + 1 < lines.length && isTableLine(lines[i + 1])) {
        const tableLines: string[] = [];
        const tableStartIdx = i;
        while (i < lines.length && isTableLine(lines[i].trim())) {
          tableLines.push(lines[i]);
          i++;
        }

        const tableData = parseMarkdownTableLines(tableLines);
        if (tableData) {
          const { headers, alignments, rows } = tableData;
          blocks.push(
            <div
              key={`table-${tableStartIdx}`}
              className="my-4 rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden group"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#FAF8F5]/80 dark:bg-slate-800/60 border-b border-stone-200 dark:border-slate-800 text-[11px] text-stone-500 dark:text-slate-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-[#5B8266]" />
                  <span>Table ({rows.length} rows)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyTable(tableLines, tableStartIdx)}
                  className="opacity-70 group-hover:opacity-100 hover:text-stone-900 dark:hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-stone-200/60 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  title="Copy table markdown"
                >
                  {copiedTableIdx === tableStartIdx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scrollable table container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-stone-50/70 dark:bg-slate-800/40 border-b border-stone-200 dark:border-slate-800">
                      {headers.map((h, colIdx) => {
                        const align = alignments[colIdx] || 'left';
                        const alignClass =
                          align === 'center'
                            ? 'text-center'
                            : align === 'right'
                            ? 'text-right'
                            : 'text-left';
                        return (
                          <th
                            key={colIdx}
                            className={`py-2.5 px-3.5 font-semibold text-stone-800 dark:text-slate-200 border-r last:border-r-0 border-stone-200/80 dark:border-slate-800/80 ${alignClass}`}
                          >
                            {renderInlineTokens(h)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60">
                    {rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-stone-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {row.map((cell, colIdx) => {
                          const align = alignments[colIdx] || 'left';
                          const alignClass =
                            align === 'center'
                              ? 'text-center'
                              : align === 'right'
                              ? 'text-right'
                              : 'text-left';
                          return (
                            <td
                              key={colIdx}
                              className={`py-2 px-3.5 text-stone-700 dark:text-slate-300 border-r last:border-r-0 border-stone-100 dark:border-slate-800/60 ${alignClass}`}
                            >
                              {renderInlineTokens(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
          continue;
        }
      }

      // 3. Blockquotes
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '');
        blocks.push(
          <blockquote
            key={`block-${i}`}
            className="my-2.5 pl-3.5 py-1 border-l-3 border-[#5B8266] dark:border-emerald-500 bg-[#FAF8F5]/80 dark:bg-slate-800/40 italic text-stone-700 dark:text-stone-300 text-sm rounded-r-lg"
          >
            {renderInlineTokens(quoteText)}
          </blockquote>
        );
        i++;
        continue;
      }

      // 4. Headings (with anchor id support for #heading links!)
      if (trimmed.startsWith('# ')) {
        const headingText = trimmed.slice(2);
        const headingId = headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        blocks.push(
          <h1
            id={headingId}
            key={`block-${i}`}
            className="text-xl sm:text-2xl font-serif font-bold text-[#1F1D1A] dark:text-white mt-4 mb-2 tracking-tight scroll-mt-20"
          >
            {renderInlineTokens(headingText)}
          </h1>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith('## ')) {
        const headingText = trimmed.slice(3);
        const headingId = headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        blocks.push(
          <h2
            id={headingId}
            key={`block-${i}`}
            className="text-lg sm:text-xl font-serif font-semibold text-[#1F1D1A] dark:text-white mt-3.5 mb-1.5 tracking-tight border-b border-stone-200/60 dark:border-slate-700/60 pb-1 scroll-mt-20"
          >
            {renderInlineTokens(headingText)}
          </h2>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith('### ')) {
        const headingText = trimmed.slice(4);
        const headingId = headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        blocks.push(
          <h3
            id={headingId}
            key={`block-${i}`}
            className="text-sm sm:text-base font-semibold text-[#2D2A26] dark:text-slate-200 mt-3 mb-1 scroll-mt-20"
          >
            {renderInlineTokens(headingText)}
          </h3>
        );
        i++;
        continue;
      }

      // 5. Task items [ ] or [x]
      if (/^[-*]\s+\[([ xX])\]/.test(trimmed)) {
        const isChecked = /^[-*]\s+\[[xX]\]/.test(trimmed);
        const taskText = trimmed.replace(/^[-*]\s+\[([ xX])\]\s*/, '');
        blocks.push(
          <div key={`block-${i}`} className="flex items-start gap-2.5 my-1.5 text-sm">
            <span
              className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded border text-xs ${
                isChecked
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}
            >
              {isChecked ? '✓' : ''}
            </span>
            <span className={`${isChecked ? 'line-through text-stone-400 dark:text-slate-500' : 'text-stone-800 dark:text-slate-200'}`}>
              {renderInlineTokens(taskText)}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // 6. Unordered list (- or *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        blocks.push(
          <li key={`block-${i}`} className="ml-5 list-disc text-stone-800 dark:text-slate-200 text-sm my-0.5 leading-relaxed">
            {renderInlineTokens(trimmed.slice(2))}
          </li>
        );
        i++;
        continue;
      }

      // 7. Ordered list (1. 2. etc)
      if (/^\d+\.\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s+/, '');
        blocks.push(
          <li key={`block-${i}`} className="ml-5 list-decimal text-stone-800 dark:text-slate-200 text-sm my-0.5 leading-relaxed">
            {renderInlineTokens(itemText)}
          </li>
        );
        i++;
        continue;
      }

      // 8. Divider (--- or ***)
      if (trimmed === '---' || trimmed === '***') {
        blocks.push(<hr key={`block-${i}`} className="my-3 border-stone-200 dark:border-slate-700" />);
        i++;
        continue;
      }

      // 9. Regular paragraph
      blocks.push(
        <p key={`block-${i}`} className="my-1.5 text-stone-800 dark:text-slate-200 text-sm leading-relaxed">
          {renderInlineTokens(line)}
        </p>
      );
      i++;
    }

    return blocks;
  }, [content, knownTitlesSet, copiedTableIdx, onInternalLinkClick, onTagClick]);

  return <div className={`prose-sm max-w-none space-y-1 ${className}`}>{renderedBlocks}</div>;
};
