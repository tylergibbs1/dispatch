# Subagent Briefing Template

Fill this out for each subagent. It must be **self-contained** — the subagent
does not see the orchestrator's conversation, so every fact it needs goes here.

## Contents
- The template (copy/paste)
- A filled example
- Notes on the Context7 mandate

---

## Template

```
ROLE
You are an implementation subagent. Implement exactly the subtask below and
return a summary of what you changed (files + key decisions). Do not work
outside your owned files.

GOAL
<one-sentence deliverable>

CONTEXT
- Project: <path, framework, language, package manager>
- Build/test: <commands to build, test, lint>
- Conventions to match: <naming, structure, style, error handling>

FILES YOU OWN (create/edit only these)
- <path/a>
- <path/b>

SHARED CONTRACT (do not change; other agents depend on it)
<types / API shape / schema / function signatures the orchestrator froze>

FRESH DOCS — REQUIRED
Before writing any code that touches an external library, framework, SDK, or
API, call mcp__context7__resolve-library-id then mcp__context7__query-docs to
fetch current docs for the exact version used in this project. Cite the version
in a code comment. Do not rely on memorized APIs — they may be outdated.

ACCEPTANCE
- <what "done" looks like: behavior, tests passing, etc.>
- Build/test/lint commands above pass for your files.

REPORT BACK
- Files changed and why
- Any contract mismatch or blocker you hit
- Which library versions you confirmed via Context7
```

---

## Filled example

```
ROLE
You are an implementation subagent. Implement exactly the subtask below and
return a summary of what you changed. Do not work outside your owned files.

GOAL
Add a POST /api/invoices route that validates input and persists an invoice.

CONTEXT
- Project: ./ — Next.js 15 App Router, TypeScript, pnpm
- Build/test: `pnpm build`, `pnpm test`, `pnpm lint`
- Conventions: Zod for validation, route handlers in app/api/*/route.ts,
  return NextResponse.json, throw via the shared `ApiError` helper

FILES YOU OWN
- app/api/invoices/route.ts
- lib/validation/invoice.ts

SHARED CONTRACT (frozen by orchestrator)
type Invoice = { id: string; amountCents: number; customerId: string;
  status: 'draft' | 'sent' }
The DB layer exposes `db.invoices.create(data: Omit<Invoice,'id'>): Promise<Invoice>`

FRESH DOCS — REQUIRED
Before using Zod or Next.js route-handler APIs, resolve them via
mcp__context7__resolve-library-id and pull current docs with
mcp__context7__query-docs for the versions in package.json. Cite versions in a
comment.

ACCEPTANCE
- Invalid bodies return 400 with field errors; valid bodies return 201 + Invoice
- `pnpm test` and `pnpm lint` pass

REPORT BACK
- Files changed, contract issues, confirmed Zod + Next.js versions
```

---

## Notes on the Context7 mandate

- Keep the mandate **in every brief**, not just the orchestrator's head — the
  subagent only follows what's written in front of it.
- Use the fully-qualified MCP tool names (`mcp__context7__resolve-library-id`,
  `mcp__context7__query-docs`) so the subagent can find the tools.
- Asking the subagent to **cite the confirmed version in a comment** gives you a
  cheap way to verify it actually consulted docs rather than guessing.
- If a subagent reports it couldn't resolve a library in Context7, that's a
  signal to double-check the API surface yourself before integrating.
