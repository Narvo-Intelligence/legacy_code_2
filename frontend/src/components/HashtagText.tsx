import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getTagLabelClass } from '../lib/tagLabelColors';

export interface HashtagTextProps {
  text?: string | null;
  className?: string;
  tagClassName?: string;
}

const HashtagText = ({
  text,
  className = '',
  tagClassName = '',
}: HashtagTextProps) => {
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
              type="button"
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

export interface TagPillProps {
  tag: string;
  className?: string;
}

export const TagPill = ({ tag, className = '' }: TagPillProps) => {
  const navigate = useNavigate();
  const { text, border, bg } = getTagLabelClass(tag);
  const normalizedTag = tag.replace(/^#/, '');
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/search?q=${encodeURIComponent(normalizedTag)}`);
      }}
      className={`narvo-border px-1.5 py-1 mono-ui text-[10px] cursor-pointer transition-colors hover:opacity-90 ${text} ${bg} ${border} ${className}`}
      data-testid={`hashtag-${normalizedTag.toLowerCase()}`}
    >
      #{normalizedTag.toUpperCase()}
    </button>
  );
};

export default HashtagText;
