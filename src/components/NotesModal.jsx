import React, { useState } from 'react';
import {
  X,
  FileText,
  Eye,
  Edit3,
  Save,
  Check,
  Sparkles
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default function NotesModal({
  book,
  isOpen,
  onClose,
  onSaveNotes
}) {
  if (!isOpen || !book) return null;

  const [notes, setNotes] = useState(book.userNotes || '');
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = async () => {
    await onSaveNotes(book.id, notes);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface-container border border-outline rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-on-surface truncate max-w-sm sm:max-w-md">
                Notes & Highlights: {book.title}
              </h2>
              <p className="text-xs text-on-surface-variant">
                Markdown notes and memorable quotes for this book
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar & Save Button */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-surface/60 border-b border-outline text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            {savedStatus ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Notes</span>
              </>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'edit' ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down takeaways, quotes, chapter summaries, or ideas from this book using Markdown..."
              rows={14}
              className="w-full h-full min-h-[300px] p-3 text-xs sm:text-sm font-mono rounded-xl bg-surface border border-outline text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden focus:ring-1 focus:ring-primary resize-y"
            />
          ) : (
            <div className="min-h-[300px] p-4 rounded-xl bg-surface border border-outline">
              {notes.trim() ? (
                <div
                  className="prose-reader text-xs sm:text-sm text-on-surface"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(marked.parse(notes))
                  }}
                />
              ) : (
                <div className="text-center py-16 text-on-surface-variant text-xs">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
                  <p>No notes written yet. Switch to Editor to write markdown notes.</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
