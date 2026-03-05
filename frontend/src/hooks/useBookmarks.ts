import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';
import type { Story } from '../types/story';

const BOOKMARKS_KEY = 'narvo_bookmarks';

export interface BookmarkItem {
  story_id: string;
  title?: string;
  summary?: string;
  source?: string;
  category?: string;
  source_url?: string;
  saved_at?: string;
  [key: string]: unknown;
}

function getLocalBookmarks(): BookmarkItem[] {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? '[]') as BookmarkItem[];
  } catch {
    return [];
  }
}

function saveLocalBookmarks(items: BookmarkItem[]): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
}

export function useBookmarks(): {
  bookmarks: BookmarkItem[];
  loading: boolean;
  addBookmark: (story: Story) => Promise<void>;
  removeBookmark: (storyId: string) => Promise<void>;
  isBookmarked: (storyId: string) => boolean;
  fetchBookmarks: () => Promise<void>;
} {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks(getLocalBookmarks());
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`api/bookmarks?user_id=${user.id}`);
      if (res.ok) {
        const data = (await res.json()) as BookmarkItem[];
        setBookmarks(data);
        saveLocalBookmarks(data);
      } else {
        setBookmarks(getLocalBookmarks());
      }
    } catch {
      setBookmarks(getLocalBookmarks());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const addBookmark = useCallback(
    async (story: Story) => {
      const bookmark: BookmarkItem = {
        story_id: story.id,
        title: story.title,
        summary: story.summary ?? '',
        source: story.source ?? '',
        category: story.category ?? 'General',
        source_url: (story as Story & { source_url?: string }).source_url ?? '',
        saved_at: new Date().toISOString(),
      };
      const previous = [...bookmarks];
      const updated = [...bookmarks.filter((b) => b.story_id !== story.id), bookmark];
      setBookmarks(updated);
      saveLocalBookmarks(updated);
      if (user) {
        try {
          await api.post('api/bookmarks', { user_id: user.id, ...bookmark });
        } catch (e) {
          console.error('Failed to sync bookmark:', e);
          setBookmarks(previous);
          saveLocalBookmarks(previous);
        }
      }
    },
    [bookmarks, user]
  );

  const removeBookmark = useCallback(
    async (storyId: string) => {
      const previous = [...bookmarks];
      const updated = bookmarks.filter((b) => b.story_id !== storyId);
      setBookmarks(updated);
      saveLocalBookmarks(updated);
      if (user) {
        try {
          await api.del(`api/bookmarks/${storyId}?user_id=${user.id}`);
        } catch (e) {
          console.error('Failed to remove bookmark:', e);
          setBookmarks(previous);
          saveLocalBookmarks(previous);
        }
      }
    },
    [bookmarks, user]
  );

  const isBookmarked = useCallback(
    (storyId: string) => bookmarks.some((b) => b.story_id === storyId),
    [bookmarks]
  );

  return { bookmarks, loading, addBookmark, removeBookmark, isBookmarked, fetchBookmarks };
}
