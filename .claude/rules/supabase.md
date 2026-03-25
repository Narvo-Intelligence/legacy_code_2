---
paths:
  - "supabase/**/*.sql"
  - "supabase/**"
---
# Supabase Migration Conventions

## Creating Tables
- Always use `gen_random_uuid()` for primary keys.
- Always add `created_at timestamptz default now()`.
- User-owned tables must have `user_id uuid references auth.users(id) on delete cascade`.

## Row Level Security (Mandatory)
- Enable RLS on EVERY new table: `alter table <name> enable row level security;`
- Create policies for select, insert, update, delete as needed.
- Use `auth.uid() = user_id` for user-scoped policies.

## Naming
- Migration filenames should be descriptive: `create_playlists_table.sql`, `add_verified_column_to_stories.sql`.
- Table names: lowercase, plural (e.g., `stories`, `playlists`, `playlist_stories`).
- Column names: lowercase, snake_case.

## Template
```sql
create table example (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  -- your columns here
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table example enable row level security;

create policy "Users can read own data" on example
  for select using (auth.uid() = user_id);

create policy "Users can insert own data" on example
  for insert with check (auth.uid() = user_id);
```
