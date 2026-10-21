import React from 'react';
import {
  Inbox,
  Library,
  Star,
  Archive,
  RefreshCw,
  Download,
  Rss
} from 'lucide-react';

export default function ArticleNav({
  filter,
  onSelectFilter,
  counts,
  onSyncFeeds,
  isSyncingFeeds,
  onOpenSettingsTab
}) {
  const tabs = [
    { id: 'unread', label: 'Unread', icon: Inbox, count: counts.unread },
    { id: 'all', label: 'All Articles', icon: Library, count: counts.all },
    { id: 'starred', label: 'Starred', icon: Star, count: counts.starred },
    { id: 'archive', label: 'Archive', icon: Archive, count: counts.archive },
  ];

  return (
    <div className="border-b border-outline bg-surface/50 backdrop-blur-xs">
      <div className="w-full px-4 sm:px-6">
        
        {/* Navigation Filter Tabs */}
        <div className="flex items-center justify-between gap-2 py-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectFilter(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive
                        ? 'bg-on-primary/20 text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {tab.count || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Actions (RSS Sync & Feeds) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onSyncFeeds}
              disabled={isSyncingFeeds}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline transition-colors cursor-pointer"
              title="Sync RSS Feeds"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFeeds ? 'animate-spin text-primary' : ''}`} />
              <span>Sync Feeds</span>
            </button>
            <button
              onClick={() => onOpenSettingsTab('feeds')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline transition-colors cursor-pointer"
              title="Manage RSS Feeds"
            >
              <Rss className="w-3.5 h-3.5 text-amber-400" />
              <span>Feeds</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
