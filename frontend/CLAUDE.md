# frontend/CLAUDE.md

Guide for Claude Code working inside `frontend/`. See the root
[`CLAUDE.md`](../CLAUDE.md) for project-wide context.

## Stack

- **React 19** + **TypeScript 5.6** (strict mode), **Vite 7.3**
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin, theme tokens in
  `src/index.css` (`@theme` block)
- **Routing** — React Router 6 (`BrowserRouter`, declarative `<Routes>`)
- **State** — Redux Toolkit (auth + settings), Zustand (feature stores when
  shared between widgets), TanStack Query v5 (all server data)
- **HTTP** — single axios instance `$api` from `src/shared/api/api.ts`
  (introduced by the linters PR; the legacy `*Api` namespaces live in
  `src/shared/api/api-legacy.ts` until each call site moves to TanStack Query)
- **i18n** — i18next with browser language detection; locales in
  `src/shared/config/locales/{en,ru}.json`
- **UI primitives** — `src/shared/ui/` (Button, Modal, Input, etc.).
  Import via `@ui` alias.

## Path aliases

| Alias       | Resolves to              |
|-------------|--------------------------|
| `@/`        | `src/`                   |
| `@ui`       | `src/shared/ui/`         |

Both are configured in `vite.config.ts` and `tsconfig.json`.

## FSD layers

Strict layering enforced by `eslint-plugin-fsd-lint`. Higher layers may import
from lower layers only:

```
app  →  pages  →  widgets  →  features  →  entities  →  shared
```

- `app/` — bootstrap: store, providers, layout, query client, App.tsx
- `pages/` — one folder per route, thin orchestration
- `widgets/` — large composite UI blocks (Layout chrome, dock, drawing board)
- `features/` — interactive flows (CreateDeck modal, ScheduleSlot, etc.)
- `entities/` — stable models with cards (Deck, Teacher, Classroom, LessonBlock)
- `shared/` — primitives, lib, hooks, types, api client; no upstream imports

Within a layer, use **relative imports**, not the `@/<layer>/` alias
(`no-restricted-imports` enforces this). Across layers, use the alias.

## Global utilities

Declared in `src/@types/global.d.ts`, injected at runtime by
`src/app/globalUtils/tw.ts`:

| Symbol         | Use                                                       |
|----------------|-----------------------------------------------------------|
| `cn(...args)`  | `clsx` + `tailwind-merge` — class-name builder            |
| `tw\`...\``    | Tagged template returning its string — for syntax highlight only |
| `Any`          | Type alias = `any`. Use as an escape-hatch, never raw `any` |
| `AnyArray<T>`, `AnyObject`, `AnyRecord`, `AnyFunction` | Wrappers around `any[]` etc. |

## TanStack Query

Pages and widgets that need server data must use
**`useApiQuery` / `useApiMutation` / `useApiInfiniteQuery`** from
`@/shared/lib/query` (wrappers around `$api`). The bare
`useEffect + setState` pattern fires the `react-hooks/set-state-in-effect`
warning and should be avoided in new code.

```tsx
const deckQuery = useApiQuery<Deck>({
  queryKey: ['deck', id],
  url: `/decks/${id}`,
  enabled: Number.isFinite(id),
});
const deck = deckQuery.data ?? null;

const queryClient = useQueryClient();
const refetch = () => queryClient.invalidateQueries({ queryKey: ['deck', id] });
```

For paginated endpoints use `useApiInfiniteQuery` (see `ExplorePage`,
`TeachersPage`). For mutations either call `api-legacy` directly + invalidate,
or wrap with `useApiMutation` for `isPending`/`error` UI states. See
[`docs/tanstack_query.md`](docs/tanstack_query.md) for end-to-end recipes.

## Mandatory rules

1. **No `// eslint-disable-next-line` to bypass rules.** Fix the cause or
   discuss the rule.
2. **No bare `any`.** Use `Any` alias (already global) or, preferably, a
   concrete type from `src/shared/api/types.ts`.
3. **No raw `useEffect(() => fetch().then(setState), [...])`.** Use TanStack
   Query.
4. **Imports** — group/sort per `eslint-plugin-simple-import-sort` config;
   format with Prettier (LF endings, single quotes).
5. **Inline render-helpers** — try to avoid; if unavoidable in legacy code,
   prefer to lift them to module scope.
6. **Do not touch colleague's tooling files** unless you understand the
   change: `eslint.config.mjs`, `stylelint.config.mjs`, `.prettierrc`,
   `.lintstagedrc.mjs`.

## Commands

```bash
cd frontend
npm install
npm run dev          # vite on :3000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint + stylelint
npm run lint:fix     # autofix
npm run format       # prettier --write src
npm run build        # tsc --noEmit + vite build
npm run preview      # serve dist/
```

After non-trivial edits run `npm run typecheck && npm run lint` before
committing.

## Migration status (current)

- `src/_old/` was deleted; all active code lives directly under `src/`.
- TanStack Query migration: batch 1 (17 simple pages) + batch 2a (widgets +
  TeachersPage) committed. Batch 2b (Materials/Chat/Study/LessonEdit/Classroom
  + remaining features) — pending; see
  [`docs/tanstack_query.md`](docs/tanstack_query.md) for the pattern.
- Some `react-hooks/*` rules are at `warn` (not `error`) in
  `eslint.config.mjs` to allow the incremental migration; the comment above
  that block explains which rules and why.

## Routing

All routes live in `src/App.tsx`. Authenticated routes are wrapped in
`<ProtectedRoute>` and render inside `<Layout>` (sidebar). Guest-only routes
(`/`, `/login`, `/register`) redirect logged-in users to `/home`.

Vite proxy (`vite.config.ts`): `/api` → `localhost:8080`, `/ws` → same.
In production set `VITE_API_URL` to the real API URL.
