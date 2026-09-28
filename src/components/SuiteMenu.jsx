import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, ExternalLink, Bookmark, Radio, KeyRound, BookOpen, Cloud, FileText, Activity, Library } from 'lucide-react';

export default function SuiteMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const apps = [
    { name: 'Pure Hub', desc: 'Minimalist dashboard & launcher', icon: LayoutGrid, host: 'https://pure.mcnarya.com' },
    { name: 'Pure Books', desc: 'Google Play Books e-reader', icon: Library, host: '#', current: true },
    { name: 'Pure Read', desc: 'Distraction-free article stash', icon: BookOpen, host: 'https://read.mcnarya.com' },
    { name: 'Pure Feed', desc: 'Zero-distraction stream & RSS', icon: Radio, host: 'https://feed.mcnarya.com' },
    { name: 'Pure OTP', desc: 'Two-factor authenticator', icon: KeyRound, host: 'https://otp.mcnarya.com' },
    { name: 'Pure Clone', desc: 'Cloud storage web client', icon: Cloud, host: 'https://clone.mcnarya.com' },
    { name: 'Pure Note', desc: 'Markdown scratchpad & daily notes', icon: FileText, host: 'https://note.mcnarya.com' },
    { name: 'Pure Ping', desc: 'Homelab uptime & heartbeat', icon: Activity, host: 'https://ping.mcnarya.com' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
        title="Pure Suite"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Pure Suite
          </div>
          <div className="space-y-1">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <a
                  key={app.name}
                  href={app.host}
                  target={app.current ? '_self' : '_blank'}
                  rel="noreferrer"
                  onClick={() => !app.current && setOpen(false)}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    app.current
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'text-neutral-300 hover:bg-neutral-800/50 hover:text-white'
                  }`}
                >
                  <div className="p-1 rounded bg-neutral-800 text-neutral-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span>{app.name}</span>
                      {app.current && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 leading-tight">{app.desc}</div>
                  </div>
                  {!app.current && <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
