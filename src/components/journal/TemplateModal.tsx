import React from 'react';
import {
  Sparkles,
  Target,
  Briefcase,
  BookOpen,
  Lightbulb,
  CheckSquare,
  Users,
  Compass,
  FileText,
  X,
  Plus,
} from 'lucide-react';
import { KnowledgeTemplate } from '../../types';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: KnowledgeTemplate) => void;
}

export const KNOWLEDGE_TEMPLATES: KnowledgeTemplate[] = [
  {
    id: 'tmpl-personal-goals',
    title: 'Personal Goals 2026',
    description: 'Strategic life vision, quarter milestones, and habits connection.',
    category: 'Goals',
    iconName: 'Target',
    defaultTags: ['#goals', '#vision', '#planning'],
    content: `# Personal Goals 2026

## 🎯 Strategic Vision & Theme
> Define the overarching theme of this year in one inspiring sentence.

---

## 🏆 Key Milestones by Dimension
### 1. Physical Health & Energy
- Goal: Maintain 90%+ habit streak on workouts ([[Morning Workout & Stretch]])
- Metric: 

### 2. Career & High-Impact Engineering
- Goal: Architect scalable cloud solutions ([[Learning Architecture & TypeScript]])
- Metric: 

### 3. Personal Mastery & Knowledge
- Goal: Read and synthesize 25 non-fiction books ([[Book Notes - Atomic Habits]])
- Metric: 

---

## 🧭 Habit Systems & Rituals
Link your daily habits to guarantee execution:
- Morning Anchor: [[Daily Priming & High-Performance Habits]]
- Deep Focus Block: [[Deep Work Session (2h)]]
`,
  },
  {
    id: 'tmpl-career-dev',
    title: 'Career Development & Growth Blueprint',
    description: 'Skill matrix, promotion milestones, mentorship, and career roadmap.',
    category: 'Career',
    iconName: 'Briefcase',
    defaultTags: ['#career', '#growth', '#engineering'],
    content: `# Career Development & Growth Blueprint

## 📍 Current Baseline & Desired Level
- Current Role: Senior Software Engineer
- Target Level: Staff / Principal Architect
- Timeline: 12-18 months

---

## 🛠️ High-Leverage Competencies to Master
- [ ] Distributed Systems & High-Throughput Pipelines
- [ ] Technical Strategy & Cross-Team Architecture Design
- [ ] Mentorship & Engineering Culture

---

## 🚀 Active Initiatives & Projects
- Project Alpha: [[Projects - Knowledge Management]]
- Architectural Blueprint: [[Learning Architecture & TypeScript]]
`,
  },
  {
    id: 'tmpl-learning-notes',
    title: 'Learning & Technology Deep-Dive',
    description: 'Structured technical notes, architecture diagrams, and concepts.',
    category: 'Learning',
    iconName: 'Compass',
    defaultTags: ['#learning', '#tech', '#notes'],
    content: `# Learning Note: [Topic Name]

## 💡 Summary in 3 Sentences
1. 
2. 
3. 

---

## 🧠 Mental Model & Key Principles
- **Core Insight**: 
- **Trade-offs**: 

---

## 💻 Code Snippet & Implementation
\`\`\`typescript
// Example architecture
export function solveProblem() {
  // implementation
}
\`\`\`

---

## 🔗 Related Knowledge
- Related to: [[Personal Goals 2026]]
`,
  },
  {
    id: 'tmpl-book-notes',
    title: 'Book Notes & Synthesis',
    description: 'Key takeaways, memorable quotes, and actionable behavior shifts.',
    category: 'Books',
    iconName: 'BookOpen',
    defaultTags: ['#books', '#reading', '#insights'],
    content: `# Book Notes: [Book Title] by [Author]

- **Rating**: ⭐️⭐️⭐️⭐️⭐️ (5/5)
- **Category**: Psychology / Productivity / Business
- **Finished On**: 

---

## 🔑 Top 3 Big Ideas
1. **Idea 1**: 
2. **Idea 2**: 
3. **Idea 3**: 

---

## 💬 Favorite Quotes
> "Quote here..."

---

## 🎯 Actionable Changes for My Life
- Shift 1: 
- Habit to integrate: [[Daily Priming & High-Performance Habits]]
`,
  },
  {
    id: 'tmpl-ideas-breakthroughs',
    title: 'Breakthrough Idea & Innovation',
    description: 'Raw product ideas, hypothesis, market problems, and prototype plans.',
    category: 'Ideas',
    iconName: 'Lightbulb',
    defaultTags: ['#ideas', '#innovation', '#creativity'],
    content: `# Breakthrough Idea: [Idea Name]

## 💡 The Core Problem & Spark
What friction exists in the world, and why does the current solution fall short?

---

## 🚀 The Proposed Solution
Explain the unfair advantage and unique mechanism.

---

## 🧪 Smallest Viable Experiment (MVE)
- Step 1: 
- Step 2: 
- Step 3: 

---

## 🔗 Connections
- Linked to: [[Personal Goals 2026]]
`,
  },
  {
    id: 'tmpl-project-spec',
    title: 'Project Architecture & Spec',
    description: 'Scope, user journeys, technical constraints, and milestone checklist.',
    category: 'Projects',
    iconName: 'CheckSquare',
    defaultTags: ['#projects', '#architecture', '#specs'],
    content: `# Project Spec: [Project Name]

## 🎯 Objective & Success Metrics
- **Problem**: 
- **Outcome**: 

---

## 📋 Scope Checklist
- [ ] Phase 1: Core Architecture & Data Model
- [ ] Phase 2: User Experience & Interactive Visuals
- [ ] Phase 3: Stress Testing & Deploy

---

## 🧱 Architectural Components
- Frontend: React SPA + Tailwind
- Database: Supabase PostgreSQL / LocalStorage fallback
`,
  },
  {
    id: 'tmpl-meeting-notes',
    title: 'High-Impact Meeting Notes',
    description: 'Attendees, agenda, discussion points, decisions, and action items.',
    category: 'Meeting Notes',
    iconName: 'Users',
    defaultTags: ['#meetings', '#sync', '#decisions'],
    content: `# Meeting Notes: [Meeting Topic]

- **Date**: 
- **Attendees**: 
- **Objective**: 

---

## 📝 Key Discussion Points
- 

---

## ⚖️ Decisions Made
- 

---

## 📌 Action Items & Owners
- [ ] Action 1 (Owner: )
- [ ] Action 2 (Owner: )
`,
  },
  {
    id: 'tmpl-hr-directory',
    title: 'HR Management & Team Roster',
    description: 'Formatted markdown table with employee statuses, aliases, and heading links.',
    category: 'Career',
    iconName: 'Users',
    defaultTags: ['#hr', '#team', '#directory', '#operations'],
    content: `# HR Management & Team Directory

## 🏢 Department Overview
This knowledge hub connects employee directories, recruitment pipelines, and payroll systems.

### 👥 Active Team Directory
| Employee | Department | Status |
| :--- | :--- | :---: |
| Arun | HR | Active |
| Priya | Finance | Active |
| Kumar | IT | Inactive |

---

## 🔗 Key Functional Portals
- Talent Pipeline: [[Recruitment]]
- Financial Operations: [[Payroll Management]]
- Team Health: [[Employee Relations|ER Notes]]
- Professional Growth: [[HR Management#Training and Development]]

---

## 🎯 Current Quarter Objectives
- [ ] Complete Q4 Compensation Reviews
- [ ] Onboard 3 senior systems engineers
- [ ] Roll out unified second-brain knowledge base
`,
  },
];

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#5B8266]" />
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-white">
              Personal Knowledge Templates
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
          Instantiate a structured knowledge page with ready-made Obsidian wikilinks and best-practice headings:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {KNOWLEDGE_TEMPLATES.map((tmpl) => {
            return (
              <div
                key={tmpl.id}
                onClick={() => {
                  onSelectTemplate(tmpl);
                  onClose();
                }}
                className="p-4 rounded-2xl border border-stone-200/90 dark:border-slate-800 hover:border-[#5B8266] bg-[#FAF8F5]/60 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EBF3EE] dark:bg-emerald-950/60 text-[#2E5A39] dark:text-emerald-300 border border-[#CDE1D4] dark:border-emerald-800">
                      {tmpl.category}
                    </span>
                    <Plus className="w-4 h-4 text-stone-400 group-hover:text-[#5B8266] transition-colors" />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-white group-hover:text-[#5B8266] transition-colors mb-1">
                    {tmpl.title}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {tmpl.defaultTags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-700 text-stone-500 dark:text-slate-400 font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
