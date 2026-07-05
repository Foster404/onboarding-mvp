# Orbit — Employee Onboarding Platform (MVP)

A 90-day onboarding tracker: employees check off stage-by-stage checklists and
watch stage videos/presentations, HR manages content and monitors progress
from an admin panel. Built to run entirely on free tiers: **Next.js on
Vercel** + **Supabase** (Postgres, Auth, Storage).

## 1. Create your free accounts

1. **GitHub** — push this folder to a new (private is fine) repo.
2. **Supabase** — [supabase.com](https://supabase.com) → New project (free tier). Note the
   region closest to your users; nothing else to configure yet.
3. **Vercel** — [vercel.com](https://vercel.com) → New project → Import the GitHub repo.
   Don't deploy yet — set the environment variables first (step 3 below).

## 2. Set up the database

In the Supabase dashboard, open **SQL Editor** and run, in order:

1. `supabase/migrations/0001_init.sql` — creates tables, RLS policies, the
   `colleague_directory` view, and the `avatars`/`media` storage buckets.
2. `supabase/seed.sql` — seeds the six default onboarding stages and their
   checklist items (all editable later from the admin panel).

## 3. Environment variables

Copy `.env.example` to `.env.local` for local dev, and add the same three
variables in Vercel (Project Settings → Environment Variables):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (**server-only, never commit this or expose it to the browser**) |

## 4. Bootstrap the first admin account

There's no self-signup (by design — HR creates every account). So the very
first admin has to be created by hand, once:

1. Supabase dashboard → **Authentication → Users → Add user** → set an email
   and password, and check "Auto Confirm User".
2. Copy the new user's UUID from that same screen.
3. Run in the SQL Editor:
   ```sql
   insert into public.profiles (id, full_name, email, role, status)
   values ('<paste-the-uuid>', 'Your Name', 'you@company.com', 'admin', 'working');
   ```
4. Log in at `/login` with that email/password — you'll see the **Admin**
   link in the nav. From here on, use **Admin → New employee** to create
   every other account (including additional admins, by editing their
   `role` to `admin` in the SQL editor if needed).

## 5. Deploy

Push to GitHub, then in Vercel: Deploy. Every subsequent `git push` to the
main branch auto-deploys. The app is served at your `*.vercel.app` URL (or a
custom domain) — no local run needed to use it.

## 6. Local development

```bash
npm install
npm run dev
```

Requires `.env.local` populated as in step 3, pointing at your real Supabase
project (there's no local/offline mode for this MVP).

## Notes on free-tier limits

- **Supabase free project** pauses after ~7 days with no API activity — just
  restart it from the dashboard if that happens.
- **Vercel Hobby plan** is licensed for personal/non-commercial use. Fine for
  a prototype or internal pilot; if this becomes a paid production tool for
  a business, move to a paid Vercel plan.
- **Video uploads**: keep files under ~200MB (Supabase free Storage is 1GB
  total). For longer videos, paste a YouTube link into the media URL field
  in **Admin → Manage content** instead of uploading — the player embeds it
  automatically.

## What's implemented (spec sections 3–6, 8)

- Employee: 90-day timeline with per-stage checklists and progress %, stage
  video/presentation viewing, profile photo/birthdate editing, read-only
  vacation days, colleagues directory with department filter and
  birthday-soon badges.
- Admin: employee list with current stage/% progress, per-employee detail
  view (editable department/status/vacation days, read-only checklist
  status), employee account creation, and full content management (stage
  titles, checklist items, media) that applies live to all employees.
- 1С integration (spec §6.2) is intentionally out of scope for the MVP —
  `vacation_days_remaining` is a plain admin-editable field, ready to be
  synced automatically later.
