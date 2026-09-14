"use client";

import React from 'react';
import { Comment } from '@/types';

interface CommentListProps {
  comments: Comment[] | null;
}

export function CommentList({ comments }: CommentListProps) {
  if (!comments || comments.length === 0) {
    return (
      <div style={styles.emptyComments} className="glass">
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--heading-color)' }}>No comments yet</h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
          Be the first to share your thoughts on this story!
        </p>
      </div>
    );
  }

  return (
    <div style={styles.commentsList}>
      {comments.map((comment) => (
        <div key={comment.id} style={styles.commentCard} className="glass glass-interactive">
          <div style={styles.commentHeader}>
            <div className="story-avatar-wrap" style={{ width: '36px', height: '36px' }}>
              <div className="story-avatar-inner">
                <span style={styles.commentAvatarLetter}>
                  {comment.username.substring(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={styles.commentAuthor}>@{comment.username}</span>
              <span style={{ color: 'var(--fg-subtle)', fontSize: '0.75rem' }}>• Commenter</span>
            </div>
          </div>
          <p style={styles.commentText}>{comment.comment_content}</p>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  emptyComments: {
    padding: '3rem 2rem',
    textAlign: 'center',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  commentCard: {
    padding: '1.35rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  commentAvatarLetter: {
    fontSize: '0.8rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  commentAuthor: {
    fontWeight: 700,
    fontSize: '0.92rem',
    color: 'var(--heading-color)',
  },
  commentText: {
    fontSize: '0.96rem',
    lineHeight: '1.6',
    color: 'var(--fg-main)',
    paddingLeft: '0.25rem',
  },
};
