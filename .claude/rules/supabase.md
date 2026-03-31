---
paths:
  - "backend/supabase_schema.sql"
  - "backend/supabase_migrations/**"
---
# Supabase Conventions — Narvo v5

## Table Schema Standards
- Always use `gen_random_uuid()` for primary keys (where story-id hash is not used).
- Always add `created_at timestamptz default now()`.
- User-owned tables must have `user_id uuid references auth.users(id) on delete cascade`.
- Update triggers: Add `updated_at` with a trigger to auto-update on row changes.

## Core Tables
- `story_content`: Stores SHA-1 hashed `story_id`, `narrative`, `translations` (JSONB), and `audio_by_lang` (JSONB).
- `listening_history`: Tracks `user_id`, `story_id`, and `played_at`.
- `bookmarks`: Stores user-saved stories.
- `user_preferences`: Stores `broadcast_language`, `theme`, and `playback_rate`.

## Row Level Security (Mandatory)
- Enable RLS on EVERY new table.
- Use `auth.uid() = user_id` for user-private data.
- Public content (like `story_content`) should have `SELECT` policies for authenticated users.

## Key SQL Patterns
```sql
-- Story content with JSONB for multi-language support
create table story_content (
  story_id text primary key,
  title text not null,
  narrative text,
  translations jsonb default '{}',
  audio_by_lang jsonb default '{}',
  created_at timestamptz default now()
);

-- User-scoped table with RLS
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  story_id text not null,
  created_at timestamptz default now()
);

alter table bookmarks enable row level security;
create policy "Users can manage own bookmarks" on bookmarks
  for all using (auth.uid() = user_id);
```
