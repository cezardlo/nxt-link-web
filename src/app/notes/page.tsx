'use client';
import { useState, useMemo } from 'react';
import { useNotes, NoteCategory, Note } from '@/hooks/useNotes';

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  industry: '#3b82f6',
  problem: '#f97316',
  technology: '#a855f7',
  company: '#00ff88',
  signal: '#ff3b30',
  general: '#94a3b8',
};

const CATEGORY_LABELS: { key: NoteCategory | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'ALL', color: '#ffffff' },
  { key: 'industry', label: 'INDUSTRY', color: '#3b82f6' },
  { key: 'problem', label: 'PROBLEM', color: '#f97316' },
  { key: 'technology', label: 'TECH', color: '#a855f7' },
  { key: 'company', label: 'COMPANY', color: '#00ff88' },
  { key: 'signal', label: 'SIGNAL', color: '#ff3b30' },
  { key: 'general', label: 'GENERAL', color: '#94a3b8' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; note: Note };

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote, searchNotes } = useNotes();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | 'all'>('all');
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<NoteCategory>('general');
  const [formEntitySlug, setFormEntitySlug] = useState('');

  const filtered = useMemo(() => {
    let result = search ? searchNotes(search) : notes;
    if (categoryFilter !== 'all') {
      result = result.filter((n) => n.category === categoryFilter);
    }
    return result;
  }, [notes, search, categoryFilter, searchNotes]);

  function openCreate() {
    setFormTitle('');
    setFormContent('');
    setFormCategory('general');
    setFormEntitySlug('');
    setModal({ mode: 'create' });
  }

  function openEdit(note: Note) {
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormEntitySlug(note.entitySlug || '');
    setModal({ mode: 'edit', note });
  }

  function handleSave() {
    if (!formTitle.trim()) return;
    if (modal.mode === 'create') {
      addNote({
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        entitySlug: formEntitySlug.trim() || undefined,
      });
    } else if (modal.mode === 'edit') {
      updateNote(modal.note.id, {
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        entitySlug: formEntitySlug.trim() || undefined,
      });
    }
    setModal({ mode: 'closed' });
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    deleteNote(id);
  }

  return (
    <div className="bg-black min-h-screen text-white pl-16 md:pl-16 pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase">
            NXT//LINK &mdash; Notes
          </h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.1] rounded-sm px-3 py-2 text-white font-mono text-sm flex-1 sm:w-64 outline-none focus:border-white/[0.2] placeholder:text-white/30"
            />
            <button
              onClick={openCreate}
              className="bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/20 rounded-sm px-4 py-2 font-mono text-xs tracking-wider whitespace-nowrap transition-colors"
            >
              NEW NOTE
            </button>
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORY_LABELS.map((cat) => {
            const active = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className="rounded-sm px-3 py-1 font-mono text-[10px] tracking-wider border transition-colors"
                style={{
                  backgroundColor: active ? `${cat.color}18` : 'transparent',
                  borderColor: active ? `${cat.color}50` : 'rgba(255,255,255,0.08)',
                  color: active ? cat.color : 'rgba(255,255,255,0.4)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Notes grid or empty state */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <p className="font-mono text-[11px] text-white/30 tracking-wide text-center">
              {notes.length === 0
                ? 'No notes yet. Click NEW NOTE to start capturing intelligence.'
                : 'No notes match your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((note) => {
              const catColor = CATEGORY_COLORS[note.category];
              return (
                <div
                  key={note.id}
                  onClick={() => openEdit(note)}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-sm p-4 hover:border-white/[0.15] cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-mono text-sm text-white/90 truncate flex-1">
                      {note.title}
                    </h3>
                    <button
                      onClick={(e) => handleDelete(e, note.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 font-mono text-[10px] transition-opacity shrink-0"
                      title="Delete note"
                    >
                      DEL
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-white/40 mb-3 line-clamp-3">
                    {note.content.length > 100
                      ? note.content.slice(0, 100) + '...'
                      : note.content || '\u00A0'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm"
                      style={{
                        backgroundColor: `${catColor}18`,
                        color: catColor,
                        border: `1px solid ${catColor}30`,
                      }}
                    >
                      {note.category}
                    </span>
                    <span className="font-mono text-[9px] text-white/25">
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.mode !== 'closed' && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModal({ mode: 'closed' })}
        >
          <div
            className="bg-[#0a0a0a] border border-white/[0.1] rounded-sm p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-mono text-[11px] tracking-[0.15em] text-white/50 uppercase mb-5">
              {modal.mode === 'create' ? 'New Note' : 'Edit Note'}
            </h2>

            {/* Title */}
            <label className="font-mono text-[9px] tracking-wider text-white/40 uppercase block mb-1">
              Title
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.1] rounded-sm px-3 py-2 text-white font-mono text-sm w-full outline-none focus:border-white/[0.2] mb-4 placeholder:text-white/20"
              placeholder="Note title"
              autoFocus
            />

            {/* Content */}
            <label className="font-mono text-[9px] tracking-wider text-white/40 uppercase block mb-1">
              Content
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={6}
              className="bg-white/[0.04] border border-white/[0.1] rounded-sm px-3 py-2 text-white font-mono text-sm w-full outline-none focus:border-white/[0.2] mb-4 resize-y placeholder:text-white/20"
              placeholder="Write your intelligence notes..."
            />

            {/* Category */}
            <label className="font-mono text-[9px] tracking-wider text-white/40 uppercase block mb-1">
              Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as NoteCategory)}
              className="bg-white/[0.04] border border-white/[0.1] rounded-sm px-3 py-2 text-white font-mono text-sm w-full outline-none focus:border-white/[0.2] mb-4 appearance-none"
            >
              <option value="general">General</option>
              <option value="industry">Industry</option>
              <option value="problem">Problem</option>
              <option value="technology">Technology</option>
              <option value="company">Company</option>
              <option value="signal">Signal</option>
            </select>

            {/* Entity slug */}
            <label className="font-mono text-[9px] tracking-wider text-white/40 uppercase block mb-1">
              Entity Slug (optional)
            </label>
            <input
              type="text"
              value={formEntitySlug}
              onChange={(e) => setFormEntitySlug(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.1] rounded-sm px-3 py-2 text-white font-mono text-sm w-full outline-none focus:border-white/[0.2] mb-6 placeholder:text-white/20"
              placeholder="e.g. cybersecurity, raytheon"
            />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModal({ mode: 'closed' })}
                className="bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] rounded-sm px-4 py-2 font-mono text-xs tracking-wider text-white/60 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleSave}
                disabled={!formTitle.trim()}
                className="bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/20 rounded-sm px-4 py-2 font-mono text-xs tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
