# Review-and-Fix Dynamic Workflow

A ready-to-adapt dynamic-workflow script that reviews the PR diff, adversarially
verifies each finding, and fixes the confirmed ones. Pass the base branch (and any
context) via `args`. The workflow runs in the background; the script holds the plan
and intermediate results, so only the final summary returns to the conversation.

## Contents
- How to launch it
- The script (adapt per task)
- Why it's shaped this way
- Scaling and cost notes

---

## How to launch it

The user invoking `shipping-pr-reviews` with a review request is the opt-in to run
a workflow; the approval card still shows the phases before it starts. Launch the
workflow with the script below, passing the base branch as `args`, e.g.
`{ base: "main" }`. After it returns, apply the produced fixes to the working tree,
re-run build/tests, and push to the PR branch (see pr-push.md).

## The script

Adapt dimensions, vote counts, and the fix instructions to the change under review.
The workflow script is plain JavaScript (no TypeScript syntax); `Date.now()` /
`Math.random()` are unavailable.

```javascript
export const meta = {
  name: 'review-fix-pr',
  description: 'Review the PR diff, adversarially verify findings, and fix the real ones',
  phases: [
    { title: 'Review' },
    { title: 'Verify' },
    { title: 'Fix' },
  ],
}

const base = (args && args.base) || 'main'

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'line', 'summary', 'severity'],
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          summary: { type: 'string' },
          suggested_fix: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['real', 'reason'],
  properties: {
    real: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

const FIX_SCHEMA = {
  type: 'object',
  required: ['file', 'applied', 'summary'],
  properties: {
    file: { type: 'string' },
    applied: { type: 'boolean' },
    summary: { type: 'string' },
    library_versions: { type: 'array', items: { type: 'string' } },
  },
}

const DIMENSIONS = [
  { key: 'correctness', prompt: 'logic errors, wrong conditionals, off-by-one, unhandled cases, broken contracts' },
  { key: 'security',    prompt: 'injection, authz/authn gaps, unsafe input handling, secret exposure' },
  { key: 'errors',      prompt: 'missing error handling, swallowed errors, bad failure modes, resource leaks' },
  { key: 'tests',       prompt: 'missing or weak test coverage for the changed behavior' },
  { key: 'performance', prompt: 'needless work in hot paths, N+1s, unbounded allocations' },
]

const diffCmd = `git diff ${base}...HEAD`

// Pipeline: each dimension's findings verify as soon as that dimension is reviewed.
const reviewed = await pipeline(
  DIMENSIONS,
  (d) => agent(
    `Review the PR diff for ${d.key} issues: ${d.prompt}.\n` +
    `Get the diff with \`${diffCmd}\` and read surrounding code as needed.\n` +
    `Report only concrete, actionable findings with file + line. No style nits.`,
    { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }
  ),
  (review, d) => parallel((review.findings || []).map((f) => () =>
    // 2 independent skeptics try to REFUTE each finding; both must hold for it to survive.
    parallel([0, 1].map((i) => () =>
      agent(
        `Adversarially verify this PR-review finding. Try to REFUTE it; default to ` +
        `real=false if uncertain.\nFile ${f.file}:${f.line} — ${f.summary}\n` +
        `Inspect the actual code (\`${diffCmd}\` and read the file) before deciding.`,
        { label: `verify:${f.file}:${f.line}#${i}`, phase: 'Verify', schema: VERDICT_SCHEMA }
      )
    )).then((votes) => ({
      finding: { ...f, dimension: d.key },
      real: votes.filter(Boolean).every((v) => v.real),
      unverified: votes.filter(Boolean).length < 2,
    }))
  ))
)

const judged = reviewed.flat().filter(Boolean)
const confirmed = judged.filter((j) => j.real && !j.unverified).map((j) => j.finding)
const unverified = judged.filter((j) => j.unverified).map((j) => j.finding)

log(`${confirmed.length} confirmed, ${unverified.length} unverified, ` +
    `${judged.length - confirmed.length - unverified.length} refuted`)

// Fix each confirmed finding in its own agent. One file -> one fix agent to avoid collisions.
const fixes = await parallel(confirmed.map((f) => () =>
  agent(
    `Fix this confirmed PR-review finding with the smallest correct change.\n` +
    `File ${f.file}:${f.line} — ${f.summary}\nSuggested: ${f.suggested_fix || 'n/a'}\n` +
    `Edit only ${f.file} (and its test) unless the fix demands otherwise.\n` +
    `BEFORE writing code that touches any external library, framework, SDK, or API, ` +
    `call mcp__context7__resolve-library-id then mcp__context7__query-docs for the ` +
    `exact version in this project, and cite the confirmed version in a comment. ` +
    `Do not rely on memorized APIs.`,
    { label: `fix:${f.file}:${f.line}`, phase: 'Fix', schema: FIX_SCHEMA, isolation: 'worktree' }
  )
))

return {
  confirmed,
  unverified,
  fixes: fixes.filter(Boolean),
}
```

## Why it's shaped this way

- **Pipeline, not barrier:** each dimension's findings start verifying the moment
  that dimension finishes reviewing — no waiting for the slowest reviewer.
- **Adversarial verify:** independent skeptics prompted to *refute* drop
  plausible-but-wrong findings, so the fix phase only touches real bugs.
- **Unverified ≠ refuted:** a finding whose verifiers errored out is reported as
  unverified rather than silently dropped or fixed.
- **One file, one fix agent**, run in a worktree (`isolation: 'worktree'`) so
  parallel fixes don't collide.
- **Context7 mandate** lives inside each fix agent's prompt — the agent only follows
  what's written in front of it.

## Scaling and cost notes

- A workflow caps at ~16 concurrent agents and 1,000 total per run; it counts toward
  plan usage. Trim `DIMENSIONS` and vote counts for a quick pass; expand for a
  thorough audit.
- The script does not edit files itself — the fix agents do, in worktrees. After the
  run returns, reconcile the worktree changes into your branch, re-run build/tests,
  and push (see pr-push.md).
- Drop the `Fix` phase entirely if the user only wants a review report; return
  `confirmed` and `unverified` and stop.
