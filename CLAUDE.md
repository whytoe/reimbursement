# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Which is shorter?" is a mileage reimbursement platform that measures the shortest path for mileage claims. Users track trips with multiple stops, the app calculates driving distances via Google Maps, and trips are saved with purpose/notes for reimbursement claims. Each user has configurable starting points and a mileage rate. Trips can be edited and exported to CSV.

## Commands

```bash
npm run dev          # Dev server (localhost only — broken on mobile over network due to Turbopack)
npm run build        # Production build
npm start            # Production server (works on mobile via network IP)
npm run lint         # ESLint
npm run db:migrate   # Run Prisma migrations
npm run db:push      # Push schema to DB without migration
```

**Mobile testing:** Always use `npm run build && npm start`. Turbopack dev server does not hydrate on mobile browsers over network.

## Architecture

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + Prisma (PostgreSQL) + Auth.js v5

**Trip flow:** Single-page state machine on `/`. `useTrip` hook manages state via `useReducer` with phases: `idle` → `entering-destination` → `computing` → `leg-complete` → `finishing` → `summary`. `TripWizard` renders the correct panel per phase. On summary, user adds purpose/notes then saves to DB.

**API proxy pattern:** Google Maps calls go through `/api/geocode` and `/api/distance` to keep the API key server-side.

**Auth:** Email/password via Auth.js CredentialsProvider with JWT sessions. Middleware protects all routes except `/login`, `/register`, `/api/auth/*`. Session includes `user.id`.

**Data layer:** Prisma ORM → PostgreSQL. User settings (starting points + mileage rate) and trips (with legs) stored per user. API routes at `/api/settings`, `/api/trips`, `/api/trips/[id]`, `/api/trips/export`.

## Key Files

- `src/hooks/useTrip.ts` — Core trip state machine (reducer + async actions)
- `src/hooks/useSettings.ts` — Fetches settings from `/api/settings`, handles localStorage migration
- `src/components/TripWizard.tsx` — Main UI orchestrator (renders by phase)
- `src/components/TripSummary.tsx` — Trip completion: purpose/notes input, reimbursement display, save to DB
- `src/components/AddressSearch.tsx` — Debounced geocoding input (used in trip, settings, and edit)
- `src/lib/auth.ts` — Auth.js configuration (credentials provider, JWT callbacks)
- `src/lib/prisma.ts` — Singleton PrismaClient
- `src/lib/session.ts` — `getRequiredUserId()` helper for API routes
- `src/app/api/trips/route.ts` — GET (list with date filter) / POST (create trip)
- `src/app/api/trips/[id]/route.ts` — GET / PUT / DELETE single trip
- `src/app/api/trips/export/route.ts` — CSV export with date range
- `src/app/history/[id]/edit/page.tsx` — Full trip editor (date, purpose, notes, leg addresses with recalculation)
- `prisma/schema.prisma` — Database schema (User, UserSettings, Trip, TripLeg)

## Environment Variables

All in `.env.local` (gitignored):
- `GOOGLE_MAPS_API_KEY` — Geocoding + Distance Matrix APIs enabled
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Auth.js session signing key
- `NEXTAUTH_URL` — Base URL for auth callbacks

## Accessibility

All interactive elements use 56px minimum touch targets. Body font is 18px minimum. Focus-visible rings on all interactive elements. Mobile-first with fixed bottom navigation bar.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
