'use client';
import { useState, useEffect, useCallback } from 'react';

export type NoteCategory = 'industry' | 'problem' | 'technology' | 'company' | 'signal' | 'general';

export type Note = {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  entitySlug?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'nxtlink-notes';

function loadNotes(): Note[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Note[];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const persist = useCallback((updated: Note[]) => {
    setNotes(updated);
    saveNotes(updated);
  }, []);

  const addNote = useCallback((data: { title: string; content: string; category: NoteCategory; entitySlug?: string }) => {
    const now = new Date().toISOString();
    const note: Note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: data.title,
      content: data.content,
      category: data.category,
      entitySlug: data.entitySlug,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [note, ...notes];
    persist(updated);
    return note;
  }, [notes, persist]);

  const updateNote = useCallback((id: string, data: Partial<Pick<Note, 'title' | 'content' | 'category' | 'entitySlug'>>) => {
    const updated = notes.map((n) => {
      if (n.id !== id) return n;
      return { ...n, ...data, updatedAt: new Date().toISOString() };
    });
    persist(updated);
  }, [notes, persist]);

  const deleteNote = useCallback((id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    persist(updated);
  }, [notes, persist]);

  const searchNotes = useCallback((query: string): Note[] => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        (n.entitySlug && n.entitySlug.toLowerCase().includes(q))
    );
  }, [notes]);

  return { notes, addNote, updateNote, deleteNote, searchNotes };
}
