import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Loader2, Link, Clipboard, Upload, FileText, FileUp, Globe } from 'lucide-react';

export default function AddArticleModal({ isOpen, onClose, onAddArticle, onUploadFile }) {
  const [tab, setTab] = useState('url'); // 'url' or 'upload'
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setSelectedFile(null);
      setError('');
      setLoading(false);
      setIsDragging(false);
      setTab('url');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUrlSubmit = async (e) => {
    e?.preventDefault();
    const targetUrl = url.trim();
    if (!targetUrl) return;

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAddArticle(targetUrl);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to extract content. The site may be behind a paywall or blocking requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedFile) {
      setError('Please select a PDF or DOCX file to import.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUploadFile(selectedFile);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to convert document with MarkItDown.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // Ignore clipboard error
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)] rounded-2xl shadow-2xl p-6 relative text-[var(--md-sys-color-on-surface)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] p-1.5 rounded-xl hover:bg-[var(--md-sys-color-surface)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-primary)]">
            {tab === 'url' ? <Globe className="w-4 h-4" /> : <FileUp className="w-4 h-4" />}
          </div>
          <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">Import to Pure Read</h2>
        </div>

        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mb-4">
          Convert webpages, PDF documents, or Word files into distraction-free Markdown using Microsoft MarkItDown.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setTab('url'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'url'
                ? 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] shadow-sm'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Web / Document URL</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('upload'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'upload'
                ? 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] shadow-sm'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF / DOCX</span>
          </button>
        </div>

        {tab === 'url' ? (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article or link to PDF/DOCX..."
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] rounded-xl text-sm text-[var(--md-sys-color-on-surface)] placeholder-[var(--md-sys-color-on-surface-variant)] focus:outline-none focus:border-[var(--md-sys-color-primary)] pr-24 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handlePaste}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)] rounded-lg transition-colors cursor-pointer"
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste</span>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[var(--md-sys-color-error)] text-xs leading-relaxed">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface)] border border-transparent hover:border-[var(--md-sys-color-outline)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Converting with MarkItDown...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Import Article</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFileSubmit} className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.epub,.txt,.md"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                isDragging
                  ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]/30'
                  : selectedFile
                  ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface)]'
                  : 'border-[var(--md-sys-color-outline)] hover:border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface)]/60 hover:bg-[var(--md-sys-color-surface)]'
              }`}
            >
              {selectedFile ? (
                <>
                  <div className="w-11 h-11 rounded-xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)] flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)] truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                      {formatFileSize(selectedFile.size)} • Click to choose another file
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-11 h-11 rounded-xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">
                      Drop your PDF or DOCX file here
                    </p>
                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                      Or click to browse from your device (PDF, DOCX, EPUB)
                    </p>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[var(--md-sys-color-error)] text-xs leading-relaxed">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface)] border border-transparent hover:border-[var(--md-sys-color-outline)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="flex items-center gap-2 px-5 py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Converting with MarkItDown...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Import Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
