import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';

const BOOKMARKS_KEY = 'narvo_bookmarks';

export const useBookmarks = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);

  const getLocalBookmarks = () => {
    try {
      return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    } catch { return []; }
  };

  const saveLocalBookmarks = (items) => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
  };

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks(getLocalBookmarks());
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`api/bookmarks?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
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

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const addBookmark = async (story) => {
    const bookmark = {
      story_id: story.id,
      title: story.title,
      summary: story.summary || '',
      source: story.source || '',
      category: story.category || 'General',
      source_url: story.source_url || '',
      saved_at: new Date().toISOString(),
    };

    const previous = [...bookmarks];
    const updated = [...bookmarks.filter(b => b.story_id !== story.id), bookmark];
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
  };

  const removeBookmark = async (storyId) => {
    const previous = [...bookmarks];
    const updated = bookmarks.filter(b => b.story_id !== storyId);
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
  };

  const isBookmarked = (storyId) => bookmarks.some(b => b.story_id === storyId);

  return { bookmarks, loading, addBookmark, removeBookmark, isBookmarked, fetchBookmarks };
};
