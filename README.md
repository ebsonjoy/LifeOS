# LifeOS

A small personal tracker built with React, TypeScript, Vite, and Supabase.

- **Dashboard:** daily plans and shortcuts to your active sections.
- **Review:** 7-, 14-, and 30-day graphs for outcomes, activity, time, work and money.
- **Money:** cash, bank and wallet accounts, income, expenses, transfers, monthly budgets, and CSV export.
- **Today:** a short daily report, unfinished plans, focus areas, and reminders.
- **Plans:** daily timetable, tomorrow planning, sleep/deep-work/problem-solving hours, custom activities, and daily notes.
- **Habits:** good/bad habit counts, gradual targets, and complete/incomplete daily reviews.
- **Works:** projects, tasks, priorities, deadlines, notes, and completion progress.
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

For the Jobs search toolkit, also run [`supabase/migrations/20261024_job_search_resources.sql`](supabase/migrations/20261024_job_search_resources.sql). This adds a private table for keywords, links, and notes without changing existing applications. You do not need to repeat the focus cleanup migration if it has already succeeded.

For good/bad habit tracking, run [`supabase/migrations/20261027_habit_counts.sql`](supabase/migrations/20261027_habit_counts.sql). This adds habit direction and target periods without changing old logs. Apply only the migrations you have not already run.

For the dashboard, time records, and complete/incomplete reviews, run [`supabase/migrations/20261027_dashboard_plans.sql`](supabase/migrations/20261027_dashboard_plans.sql). It preserves existing entries and adds links between an unfinished plan and its later attempts.

For Works, run [`supabase/migrations/20261028_works.sql`](supabase/migrations/20261028_works.sql). This adds private projects and tasks; it does not change existing records. Task ownership is tied to project ownership in the database.

For Money, run [`supabase/migrations/20261030_money.sql`](supabase/migrations/20261030_money.sql). It adds three private tables, same-owner account references, atomic transfer entries, and opening-balance protection. No existing data is deleted. The public client key cannot apply migrations; use your project's SQL editor.

For a brand-new Supabase project, use [`supabase/schema.sql`](supabase/schema.sql). The current schema contains all seventeen required tables; no extra migration is needed for a fresh project.

A `404` for `english_sessions`, `meal_plans`, or `workout_routines` means the database update has not been applied to the configured project. Clearing table rows does not change the schema. Cloud errors are shown in the app and never silently redirected to browser storage.

## Validation and backup

```sh
npm test
npm run lint
npm run build
```

Tests cover local dates, habit counts and periods, progress totals, missing versus zero hours, overnight plans, repeat-safe plan copying, legacy workout grouping, record preservation, schema errors, and storage failures. They use isolated storage and a mocked database client.

The Jobs toolkit supports pinned favourites, copying search phrases and links, editing, and searching saved content. Platform URLs retain query parameters so you can save a filtered job search. Toolkit records are included in data exports; cloud access is restricted to their owner. Application filters include technical interviews under Interview.

Use **Settings → Download my data** for a JSON export. Partial exports identify tables that could not be read. Dates follow the device's timezone; use matching timezone settings across your devices.

## Daily timetable and reminders

The header shows local time with seconds. In Plans, use the week navigator or date picker to choose a day. Quick-add tasks to Any time, then open a task to schedule it, add notes, or record its outcome and actual minutes. Pending tasks can be rescheduled; tasks with recorded history stay on their original day and can be copied for a new attempt.

The Schedule view shows each timed task once. Enable Show free time to find available blocks between 8 AM and 10 PM, then choose Plan here to create a task. Earlier/later times, overnight carryover, and overlap notices are supported. All tasks provides search and outcome filters. Time & notes contains time tracking, daily reflections, and the English journal.

The header shows the next task and changes to a due reminder at its start time. Unreviewed tasks stay due for that local date, including when returning to the app late. The latest due task appears first; reviewing it as complete or incomplete reveals any remaining due tasks. Plans refresh from cloud storage every minute while the app is active and on focus. These are in-app reminders, not background notifications; the app must be open to show them.

## Progress and honest outcomes

Plans, habits, time goals, and daily English/gym/job-search goals have explicit Complete and Incomplete controls. Clear an outcome to return it to not reviewed. Missing entries are not automatically failures. For an incomplete plan, Try another day creates a fresh attempt while preserving the original result and actual time. Copying the same plan to the same date again does not duplicate or reset that attempt.

Record planned and actual hours separately for sleep, deep work, problem solving, or your own activities. Sleep belongs to the date you woke up. Blank actual time means unlogged; zero means you recorded none. Completion is your own review, independent of hours. Avoid counting the same time in multiple categories.

Review outcome graphs keep plans, habits, section reviews, time goals, and meals separate to avoid counting one task multiple times in a combined score. Completion rates use only explicitly reviewed entries. Logged sessions and applications show activity volume, not English proficiency or job-search success. Actual-time graphs leave gaps for unlogged days. Time records are included in Settings exports.

Dashboard focuses on the selected day's open plans and shortcuts. **Review** in the navigation brings together activity totals, seven area summaries, and recorded-time trends. Use the 7-, 14-, or 30-day filter and ending date, then expand Daily outcomes, Activity & health, or Projects & work for detailed graphs and records. Project completion totals use the selected period; active project health is explicitly labelled as current. On mobile, Review is under More.

## Money tracking

Open **Money** (under More on mobile) and add an account. INR is the default; USD, EUR and GBP are reported separately without exchange-rate conversion. Enter the balance before the transactions you will record and the date tracking begins. Opening balances are not income. Once an account has transactions, its opening balance, date and currency are locked; rename or archive it without deleting history.

Record completed income, expenses or same-currency transfers in the right-side editor. A transfer is a single record that subtracts from one account and adds to the other; it is excluded from income, spending and budget totals. Transfer fees can be recorded as separate expenses. Refunds use the Refund income category, so category expenses remain gross spending. Editing or deleting a transaction recalculates balances immediately. Negative balances are allowed to represent an overdrawn account.

The month selector controls income, spending, categories, cash-flow graphs and budgets. Tracked balances always show the current total, including archived accounts, and are labelled accordingly. Budgets are per month, category and currency across all accounts; saving an existing category updates its limit. There is no automatic rollover. Future transactions are not supported.

Search and filter the Transactions view, then export the matching rows as CSV. Settings backups include accounts, transactions and budgets. Review includes a money summary for its exact selected date range. This is manual tracking: bank sync, recurring bill execution, investments and loans are not automated. The new tables do not automatically import retired legacy `income` or `expenses` tables.

## Habit counts and gradual change

In Habits, add a **Good habit · build** (green) or **Bad habit · reduce** (red). Each +1 records one occurrence on the selected date; minus corrects the count. **None this day · 0** explicitly records zero. **Set count / note** lets you correct a total or record a trigger. Future days cannot be logged. Existing habits default to good, and old checked/unchecked logs remain readable. Pause habits without deleting their history; two appear initially, with Show all for the rest.

After recording a count, review the day as complete or incomplete. This review is separate from the occurrence count and contributes to Review. Changing a count clears its review so an earlier result cannot silently remain attached to a different count.

Good habits have minimum targets; reduction habits have maximum targets, including zero. Periods are daily, rolling 2/3 days ending on the selected date, or a Monday–Sunday week. Targets are personal tracking goals, not medical limits. Editing a target never rewrites counts; all progress is labelled against the current target. A weekly total is the week so far, not a forecast.

History distinguishes missing entries (dash) from recorded zeros. Seven-day totals show logging coverage; comparisons describe direction only when both periods have all seven days recorded. Notes, counts, and habit settings are included in the existing backup export. Existing Supabase owner-access policies remain in place.

Design references: [NIH/NIDDK guidance on habit change](https://www.niddk.nih.gov/health-information/diet-nutrition/changing-habits-better-health) supports manageable goals, progress tracking, and recovery after setbacks. [NHS alcohol guidance](https://www.nhs.uk/conditions/alcohol-use-disorder/) supports keeping a diary and seeking medical help for withdrawal before reducing or stopping. Alcohol entries include this context; the app does not generate taper schedules or infer alcohol dose from an occurrence count.

## Works: projects and next steps

Create a project with a name, description, optional start/deadline, and project link. Open it to add tasks with notes, priority, and a due date. Tasks can be To do, In progress, Complete, or Incomplete. The default view shows open tasks; use the filter for completed, incomplete, overdue, or all tasks. Search finds task titles and notes. Project progress is the fraction of tasks completed, not a time or effort estimate.

Completion records the local date. You can correct that date in Edit task. Reopening a task clears its completion date; completing it again records the new date. The Dashboard graph shows current completed tasks by completion date, including archived projects, rather than an immutable history of every status change. Today lists current open tasks due by the selected date in active projects.

Pause or archive a project to remove it from active counts and Today reminders. Archived tasks remain readable; restore the project to Active to edit them. Settings exports include both Works tables. Works appears in the desktop navigation and under More on phones.

## Sign-in and session behavior

Cloud sessions are persisted and renewed by the Supabase client. Auth events are the single source of identity; outdated startup reads and profile responses cannot replace newer state. Account changes and sign-out clear the in-memory query cache. Sign-out applies to the current browser session, leaving other devices signed in. Startup connection failures offer a retry instead of an endless loading screen.

Protected links return you to the same page/date after sign-in. Registration requiring email verification shows a confirmation screen. Configure your deployed origin in Supabase Auth's allowed redirect URLs so confirmation links can return to `/login` on your site.

Without Supabase configuration, **Open local workspace** explicitly opens browser-only storage. Signing out stays signed out after refresh; reopening restores the same local workspace and its records. Local mode is not password-protected cloud authentication.
