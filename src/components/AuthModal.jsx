import React, { useState, useEffect, useRef } from 'react';
import { Lock, Loader2, ArrowRight } from 'lucide-react';

export default function AuthModal({ isOpen, onAuthenticate }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      await onAuthenticate(password);
    } catch (err) {
      setError(err.message || 'Incorrect password');
      setPassword('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-surface-container border border-outline rounded-2xl shadow-2xl p-6 text-center text-on-surface">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-outline mx-auto flex items-center justify-center text-primary mb-4 shadow-xs">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-lg font-bold text-on-surface mb-1">Pure Books Locked</h2>
        <p className="text-xs text-on-surface-variant mb-6">
          Enter your application password to access your Google Play Books library.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-surface border border-outline rounded-xl text-sm text-center text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <div className="text-xs text-error font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Unlock Library</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
