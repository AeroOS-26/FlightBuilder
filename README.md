# AeroOS — Flight Builder

React frontend for the AeroOS **Flight Builder**: the multi-step creation flow
where a Founder builds a shared flight (route, date, travelers, pets) and gets a
tracked share link. Built brand-agnostic so the same components can serve both
Perro Air and JetLegs.

> This repository is the project **foundation / scaffold**. The step UIs are
> stubbed with clear seams; visual styling follows the Figma source of truth and
> is handled in the build-out milestones.

## Tech stack

| Concern           | Choice                                  |
| ----------------- | --------------------------------------- |
| Framework         | Next.js 15 (App Router)                  |
| Language          | TypeScript                              |
| UI                | React 19                                |
| Routing           | Next.js App Router (file-based)          |
| Global state      | Zustand (with `sessionStorage` persist) |
| Data fetching     | TanStack Query (React Query)            |
| HTTP              | Axios (single instance + interceptors)  |
| Forms             | React Hook Form + Zod                   |
| Styling           | Tailwind CSS v4 + CSS-variable tokens   |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3000
```

### Scripts

| Command         | What it does                            |
| --------------- | --------------------------------------- |
| `npm run dev`   | Start the Next.js dev server (HMR)      |
| `npm run build` | Production build (type-checked)         |
| `npm run start` | Serve the production build              |
| `npm run lint`  | Run `next lint`                         |

## Environment

All env reads go through [`src/config/env.ts`](src/config/env.ts); nothing else
touches `process.env`. See [`.env.example`](.env.example) for the variables.
Only `NEXT_PUBLIC_`-prefixed vars are exposed to the client; server-only secrets
(e.g. the Zoho webhook key) must **not** use that prefix.

## Project structure

The architecture enforces a strict separation between **API logic** and **UI**.

```
src/
├── api/                     # Transport boundary — no UI knowledge
│   ├── client.ts            # Axios instance + interceptors
│   ├── errors.ts            # Normalizes failures into ApiError
│   ├── queryClient.ts       # TanStack Query config (retry policy)
│   ├── queryKeys.ts         # Centralized query keys
│   └── services/            # Service layer (Zoho mapping lives here)
│       ├── flightService.ts
│       └── locationService.ts
├── app/                     # Next.js App Router (routes + composition root)
│   ├── layout.tsx           # Root layout: fonts, globals.css, brand attr
│   ├── providers.tsx        # Client providers (TanStack Query)
│   ├── page.tsx             # / -> /build/route redirect
│   └── build/
│       ├── layout.tsx       # Wraps steps in BuilderLayout shell
│       ├── page.tsx         # /build -> /build/route redirect
│       └── [stepId]/page.tsx# Renders the step for the URL segment
├── components/
│   ├── common/              # Atoms: Button, Input, Stepper
│   └── builder/             # Layout shell, header, step navigation
├── config/                  # env access
├── features/flight-builder/ # The feature
│   ├── config/steps.ts      # Single source of truth for the step flow
│   ├── hooks/               # useStepNavigation, useCreateFlight, …
│   ├── store/               # Zustand draft store (persists across nav)
│   └── steps/               # One component per step
├── theme/                   # Brand-agnostic tokens + brand switch
├── types/                   # Shared domain + API types
└── utils/                   # Formatting, date, share link, Zod schemas
```

## Key architectural decisions

- **API logic is isolated from UI.** Components never call Axios directly; they
  go through hooks → services → the single Axios client. Field-name reconciliation
  with the Zoho backend (e.g. "seats" vs "Spaces") lives in the service layer only.
- **Draft state survives navigation.** The in-progress flight lives in the Zustand
  store, independent of which step is mounted, so moving forward/back never loses
  data. It's persisted to `sessionStorage`.
- **Brand-agnostic theming.** All visual values are CSS variables. A brand is
  selected by setting `data-brand` on the root (see [`src/theme/brand.ts`](src/theme/brand.ts));
  switching brands requires zero component changes.
- **One source of truth for the flow.** Step order, labels, and the sentence-case
  "Continue to X" copy live in [`src/features/flight-builder/config/steps.ts`](src/features/flight-builder/config/steps.ts).

## Locked product rules

These are enforced throughout the codebase, not just in copy:

- Vocabulary: always **"Spaces"** (never "Seats"), always **"Founder"** (never
  "Organizer"). This is a regulatory requirement.
- **Sentence case** for all UI copy.
- **No pricing** is displayed or collected.
- The **Founder** is shown by real identity (header + Traveler 1); other members
  on public surfaces are shown by label only.
- **Placeholders stay placeholders** — example text is never a submitted value.

## Status / next steps

The step components (`src/features/flight-builder/steps`) are scaffolds with
`TODO(M1)` / `TODO(M2)` markers indicating where each step's form, validation,
and states get built out. The store, schemas, services, routing, and theming
they depend on are already in place.
