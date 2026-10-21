import React from 'react';
import { Star, CheckCircle2, Circle, Trash2, ExternalLink, Clock } from 'lucide-react';

export default function ArticleCard({
  article,
  onOpenReader,
  onToggleRead,
  onToggleStar,
  onDelete
}) {
  const formattedDate = new Date(article.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <article
      onClick={() => onOpenReader(article)}
      className={`group relative bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)] hover:border-[var(--md-sys-color-primary)] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm ${
        article.read ? 'opacity-70 hover:opacity-100' : ''
      }`}
    >
      <div>
        {/* Lead Image if available */}
        {article.leadImage && (
          <div className="w-full h-44 bg-[var(--md-sys-color-surface)] overflow-hidden relative border-b border-[var(--md-sys-color-outline)]">
            <img
              src={article.leadImage}
              alt={article.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.parentElement.style.display = 'none';
              }}
            />
            {article.progress > 0 && article.progress < 100 && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                <div
                  className="h-full bg-[var(--md-sys-color-primary)] transition-all"
                  style={{ width: `${article.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="p-4 sm:p-5">
          {/* Site & Meta */}
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--md-sys-color-on-surface-variant)] mb-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {article.favicon ? (
                <img
                  src={article.favicon}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : null}
              <span className="truncate font-semibold text-[var(--md-sys-color-on-surface)]">{article.siteName}</span>
              {article.fileType && article.fileType !== 'web' && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                  article.fileType === 'pdf'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : article.fileType === 'docx'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {article.fileType.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--md-sys-color-on-surface-variant)] shrink-0">
              <Clock className="w-3 h-3 text-[var(--md-sys-color-primary)]" />
              <span>{article.readingTimeMinutes} min</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold text-[var(--md-sys-color-on-surface)] leading-snug line-clamp-2 mb-2">
            {article.title}
          </h2>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] line-clamp-3 leading-relaxed mb-2">
              {article.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Footer bar & action triggers */}
      <div
        className="px-4 sm:px-5 py-2.5 bg-[var(--md-sys-color-surface)] border-t border-[var(--md-sys-color-outline)] flex items-center justify-between text-xs text-[var(--md-sys-color-on-surface-variant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] font-medium">{formattedDate}</span>

        <div className="flex items-center gap-1">
          {/* Star button */}
          <button
            onClick={() => onToggleStar(article.id, !article.starred)}
            className={`p-1.5 rounded-lg hover:bg-[var(--md-sys-color-surface-container)] transition-colors cursor-pointer ${
              article.starred ? 'text-amber-400' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
            title={article.starred ? 'Unstar' : 'Star article'}
          >
            <Star className={`w-4 h-4 ${article.starred ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Read / Archive toggle */}
          <button
            onClick={() => onToggleRead(article.id, !article.read)}
            className={`p-1.5 rounded-lg hover:bg-[var(--md-sys-color-surface-container)] transition-colors cursor-pointer ${
              article.read ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
            title={article.read ? 'Mark as unread' : 'Mark as read'}
          >
            {article.read ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>

          {/* Original link (only for web URLs) */}
          {article.url && article.url.startsWith('http') && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container)] rounded-lg transition-colors"
              title="Open original website"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Delete */}
          <button
            onClick={() => onDelete(article.id)}
            className="p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-surface-container)] rounded-lg transition-colors cursor-pointer"
            title="Delete article"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
