"use client";

import React from 'react';

export interface StoryChannel {
  name: string;
  tag: string;
  isUser?: boolean;
}

const DEFAULT_STORY_CHANNELS: StoryChannel[] = [
  { name: 'Your Story', tag: 'all', isUser: true },
  { name: 'Golang', tag: 'golang' },
  { name: 'Next.js', tag: 'nextjs' },
  { name: 'Web Dev', tag: 'webdev' },
  { name: 'Indonesia', tag: 'indonesiaemas' },
  { name: 'Learning', tag: 'learningbydoing' },
  { name: 'Tech Talk', tag: 'technology' },
];

interface StoryBarProps {
  activeTag: string;
  onSelectTag: (tag: string) => void;
  onAddStory: () => void;
  channels?: StoryChannel[];
}

export function StoryBar({
  activeTag,
  onSelectTag,
  onAddStory,
  channels = DEFAULT_STORY_CHANNELS,
}: StoryBarProps) {
  return (
    <section style={styles.storyBarContainer} className="glass">
      <div style={styles.storyBar}>
        {channels.map((ch, idx) => {
          const isSelected = activeTag === ch.tag;
          return (
            <div
              key={idx}
              style={styles.storyItem}
              onClick={() => {
                if (ch.isUser) {
                  onAddStory();
                } else {
                  onSelectTag(activeTag === ch.tag ? 'all' : ch.tag);
                }
              }}
            >
              <div
                className="story-avatar-wrap"
                style={{
                  width: '60px',
                  height: '60px',
                  boxShadow: isSelected ? '0 0 16px rgba(225, 48, 108, 0.7)' : 'none',
                }}
              >
                <div className="story-avatar-inner" style={{ position: 'relative' }}>
                  {ch.isUser ? (
                    <div style={styles.addStoryContent}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>+</span>
                    </div>
                  ) : (
                    <span style={styles.storyLetter}>
                      #{ch.name.substring(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <span
                style={{
                  ...styles.storyLabel,
                  color: isSelected ? 'var(--ig-primary)' : 'var(--fg-muted)',
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                {ch.name}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  storyBarContainer: {
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem 1.5rem',
    marginBottom: '2rem',
    overflowX: 'auto',
  },
  storyBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.75rem',
  },
  storyItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  addStoryContent: {
    color: 'var(--ig-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLetter: {
    fontSize: '1.1rem',
    fontWeight: 800,
    background: 'var(--ig-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  storyLabel: {
    fontSize: '0.75rem',
    transition: 'var(--transition)',
  },
};
