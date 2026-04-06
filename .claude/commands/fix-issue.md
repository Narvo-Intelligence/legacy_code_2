---
description: Investigate and fix a GitHub issue by number
argument-hint: [issue-number]
---
## Issue Details

!`gh issue view $ARGUMENTS 2>/dev/null || echo "Could not fetch issue $ARGUMENTS — make sure gh CLI is authenticated"`

## Investigation

1. Read the issue description carefully
2. Trace it to the root cause in the codebase
3. Check if it's a frontend issue (`frontend/app/`, `frontend/components/`, `frontend/lib/`), backend issue (`backend/`), investor site (`investor/`), or data issue (`supabase/`)
4. Fix the issue with the minimum necessary changes
5. Verify design system compliance if UI changes are involved
6. Write a test or verify the fix manually

## Commit

After fixing, create a descriptive commit:
```
fix: [brief description] (#$ARGUMENTS)
```
