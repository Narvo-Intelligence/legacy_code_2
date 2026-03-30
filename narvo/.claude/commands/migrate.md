---
description: Create a new Supabase migration file with RLS boilerplate
argument-hint: [migration-name]
---
## Create Migration: $ARGUMENTS

Create a new migration file at `supabase/migrations/$ARGUMENTS.sql`.

Requirements:
1. Use `gen_random_uuid()` for primary keys
2. Include `created_at timestamptz default now()`
3. Add `user_id uuid references auth.users(id) on delete cascade` for user-owned tables
4. Enable Row Level Security: `alter table <name> enable row level security;`
5. Create appropriate RLS policies (select, insert, update, delete)
6. Use lowercase snake_case for table and column names
7. Table names should be plural

After creating, show me the migration SQL and explain the RLS policies.
