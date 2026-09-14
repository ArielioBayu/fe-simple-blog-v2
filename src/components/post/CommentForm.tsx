"use client";

import React, { useState } from 'react';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  loading: boolean;
  error?: string;
}

export function CommentForm({ onSubmit, loading, error }: CommentFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await onSubmit(content);
    setContent('');
  };

  return (
    <div style={styles.commentFormCard} className="glass">
      {error && <div style={styles.errorMsg}>{error}</div>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          placeholder="Write a thoughtful comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
          disabled={loading}
          style={styles.commentTextarea}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)' }}>Markdown friendly</span>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.4rem', fontSize: '0.88rem' }}
            disabled={loading || !content.trim()}
          >
            {loading ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  commentFormCard: {
    padding: '1.5rem',
    borderRadius: 'var(--radius-lg)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  commentTextarea: {
    borderRadius: 'var(--radius-md)',
  },
  errorMsg: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#F87171',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.88rem',
    marginBottom: '0.75rem',
    border: '1px solid rgba(239, 68, 68, 0.25)',
  },
};
