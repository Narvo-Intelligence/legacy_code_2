import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getTagLabelClass } from '../lib/tagLabelColors';

/**
 * HashtagText — Parses text and renders #hashtags as clickable links.
 * Clicking a hashtag navigates to /search?q={tag}
 * @param {string} text - Text containing #hashtags
 * @param {string} className - Additional classes for the container span
 * @param {string} tagClassName - Classes for individual tag links
 */
const HashtagText = ({ text, className = '', tagClassName = '' }) => {
  const navigate = useNavigate();

  if (!text) return null;

  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          return (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/search?q=${encodeURIComponent(tag)}`);
              }}
              className={`text-primary hover:underline cursor-pointer ${tagClassName}`}
              data-testid={`hashtag-${tag.toLowerCase()}`}
            >
              {part}
            </button>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
};

/**
 * TagPill — Renders a single tag as a clickable pill.
 * Uses Design System semantic label colours (tagLabelColors) so topic categories
 * match onboarding interests and are consistent app-wide.
 * @param {string} tag - Tag name (with or without #); maps to onboarding/category colours
 * @param {string} className - Additional classes (merged with semantic colour classes)
 */
export const TagPill = ({ tag, className = '' }) => {
  const navigate = useNavigate();
  const { text, border, bg } = getTagLabelClass(tag);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/search?q=${encodeURIComponent(tag)}`);
      }}
      className={`narvo-border px-1.5 py-1 mono-ui text-[10px] cursor-pointer transition-colors hover:opacity-90 ${text} ${bg} ${border} ${className}`}
      data-testid={`hashtag-${tag.toLowerCase().replace(/^#/, '')}`}
    >
      #{tag.replace(/^#/, '').toUpperCase()}
    </button>
  );
};

export default HashtagText;
