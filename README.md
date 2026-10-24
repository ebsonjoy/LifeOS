# LifeOS

A small personal tracker built with React, TypeScript, Vite, and Supabase.

- **Today:** three priorities, two extra habits, daily notes, and tomorrow planning.
- **English:** speaking, listening, reading, and writing practice with saved sessions.
- **Gym & Food:** editable weekly routines, exercise logs, weight and height history, and meal planning.
- **Jobs:** applications, interview dates, follow-ups connected to Today, and a searchable toolkit for keywords, platform links, and notes.

## Run locally

```sh
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` for cloud storage. Use the public client key, never a service-role key. Restart Vite after changing these values. Without configuration, records stay in the current browser; they do not sync across devices. With Supabase configured, sign in with the same account on both devices.

## Update an existing Supabase database

In your project's **SQL Editor**, create a new query, paste the entire contents of [`supabase/migrations/20261021_focus_cleanup.sql`](supabase/migrations/20261021_focus_cleanup.sql), and run it. Then reload the app.

This single transaction creates missing tables, adds the required columns and unique indexes, enables owner access policies, and restores missing profiles for existing accounts. It removes the retired `goals`, `expenses`, `income`, and `journal_entries` tables only if they are empty. It never deletes auth accounts or retained tracking records. If a retired table contains rows, or duplicate daily records prevent creation of a unique index, the transaction fails instead of discarding data.

For the Jobs search toolkit, also run [`supabase/migrations/20261024_job_search_resources.sql`](supabase/migrations/20261024_job_search_resources.sql). This adds a private table for keywords, links, and notes without changing existing applications. If you already ran the focus cleanup migration, only this new migration is needed.

For a brand-new Supabase project, use [`supabase/schema.sql`](supabase/schema.sql). The current schema contains all eleven required tables; no extra migration is needed for a fresh project.

A `404` for `english_sessions`, `meal_plans`, or `workout_routines` means the database update has not been applied to the configured project. Clearing table rows does not change the schema. Cloud errors are shown in the app and never silently redirected to browser storage.

## Validation and backup

```sh
npm test
npm run lint
npm run build
```

Tests cover local-date handling, weekly habits, legacy workout grouping, record preservation, schema errors, and storage failures. They use isolated storage and a mocked database client.

The Jobs toolkit supports pinned favourites, copying search phrases and links, editing, and searching saved content. Platform URLs retain query parameters so you can save a filtered job search. Toolkit records are included in data exports; cloud access is restricted to their owner. Application filters include technical interviews under Interview.

Use **Settings → Download my data** for a JSON export. Partial exports identify tables that could not be read. Dates follow the device's timezone; use matching timezone settings across your devices.

## Daily timetable and reminders

The header shows local time with seconds. On Today, use the date picker to choose a day, then add timed plans to the timetable (8 AM–10 PM slots; you can enter earlier or later times in the form). Timetable plans are separate from the three priorities; priorities with a start time also appear in the timetable.

The header shows the next task and changes to a due reminder at its start time. Unfinished tasks stay due for that local date, including when returning to the app late. The latest due task appears first; marking it done reveals any remaining due tasks. Plans refresh from cloud storage every minute while the app is active and on focus. These are in-app reminders, not background notifications; the app must be open to show them. No database migration is needed for this feature.

## Sign-in and session behavior

Cloud sessions are persisted and renewed by the Supabase client. Auth events are the single source of identity; outdated startup reads and profile responses cannot replace newer state. Account changes and sign-out clear the in-memory query cache. Sign-out applies to the current browser session, leaving other devices signed in. Startup connection failures offer a retry instead of an endless loading screen.

Protected links return you to the same page/date after sign-in. Registration requiring email verification shows a confirmation screen. Configure your deployed origin in Supabase Auth's allowed redirect URLs so confirmation links can return to `/login` on your site.

Without Supabase configuration, **Open local workspace** explicitly opens browser-only storage. Signing out stays signed out after refresh; reopening restores the same local workspace and its records. Local mode is not password-protected cloud authentication.
