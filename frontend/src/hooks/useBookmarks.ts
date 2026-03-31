import { useCallback } from 'react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';
import { readJson, writeJson } from '../lib/storage';
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
  return readJson<BookmarkItem[]>(BOOKMARKS_KEY, []);
}

function saveLocalBookmarks(items: BookmarkItem[]): void {
  writeJson(BOOKMARKS_KEY, items);
}

const bookmarksFetcher = async (key: string): Promise<BookmarkItem[]> => {
  if (key === 'bookmarks-guest') return getLocalBookmarks();
  const userId = key.replace('bookmarks-', '');
  const res = await api.get(`api/bookmarks?user_id=${userId}`);
  if (!res.ok) return getLocalBookmarks();
  const data = (await res.json()) as BookmarkItem[];
  saveLocalBookmarks(data);
  return data;
};

export function useBookmarks(): {
  bookmarks: BookmarkItem[];
  loading: boolean;
  addBookmark: (story: Story) => Promise<void>;
  removeBookmark: (storyId: string) => Promise<void>;
  isBookmarked: (storyId: string) => boolean;
  fetchBookmarks: () => Promise<void>;
} {
  const { user } = useAuth();
  const swrKey = user ? `bookmarks-${user.id}` : 'bookmarks-guest';
  const { data, mutate, isLoading } = useSWR<BookmarkItem[]>(swrKey, bookmarksFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const bookmarks =
    data !== undefined ? data : swrKey === 'bookmarks-guest' ? getLocalBookmarks() : [];

  const fetchBookmarks = useCallback(async () => {
    await mutate();
  }, [mutate]);

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
      if (user) {
        mutate(
          (prev) => [...(prev ?? []).filter((b) => b.story_id !== story.id), bookmark],
          false
        );
        try {
          await api.post('api/bookmarks', { user_id: user.id, ...bookmark });
          await mutate();
        } catch (e) {
          console.error('Failed to sync bookmark:', e);
          await mutate();
        }
      } else {
        mutate(
          (prev) => {
            const next = [...(prev ?? []).filter((b) => b.story_id !== story.id), bookmark];
            saveLocalBookmarks(next);
            return next;
          },
          false
        );
      }
    },
    [user, mutate]
  );

  const removeBookmark = useCallback(
    async (storyId: string) => {
      if (user) {
        mutate((prev) => (prev ?? []).filter((b) => b.story_id !== storyId), false);
        try {
          await api.del(`api/bookmarks/${storyId}?user_id=${user.id}`);
          await mutate();
        } catch (e) {
          console.error('Failed to remove bookmark:', e);
          await mutate();
        }
      } else {
        mutate(
          (prev) => {
            const next = (prev ?? []).filter((b) => b.story_id !== storyId);
            saveLocalBookmarks(next);
            return next;
          },
          false
        );
      }
    },
    [user, mutate]
  );

  const isBookmarked = useCallback(
    (storyId: string) => (data ?? []).some((b) => b.story_id === storyId),
    [data]
  );

  return {
    bookmarks,
    loading: isLoading,
    addBookmark,
    removeBookmark,
    isBookmarked,
    fetchBookmarks,
  };
}
