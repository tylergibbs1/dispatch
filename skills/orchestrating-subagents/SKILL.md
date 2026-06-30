---
name: orchestrating-subagents
description: >-
  Orchestrate a multi-agent implementation: decompose a task, fan out subagents to
  implement each piece in parallel, and brief each one with the context it needs
  plus a mandate to pull fresh docs via Context7. Use when the user wants to
  "use subagents", "fan out", "parallelize implementation", "orchestrate agents",
  spin up workers, or build a feature that splits into independent workstreams.
  Covers Claude Code subagents, Claude Code dynamic workflows, and Codex subagents.
disable-model-invocation: true
license: MIT
metadata:
  author: tylergibbs
  version: '2.0.0'
---

# Orchestrating Subagents

You are the **orchestrator**. You do not write the implementation yourself — you
decompose the work, dispatch subagents to implement each piece, give each one
enough context to succeed without your conversation, and require each to verify
APIs against fresh docs via Context7 before writing code. Then you integrate and
verify the combined result.

## When to use this

Use for tasks that split into independent, parallelizable workstreams (e.g. "build
the API, the UI, and the migration"). For a single linear change, just do it
directly — orchestration overhead isn't worth it.

## Pick the dispatch mechanism first

Match the mechanism to the scale. Details and exact commands are in
[references/dispatch.md](references/dispatch.md).

- **A handful of implementation pieces (typical feature work)** → **subagents**.
  In Claude Code, launch one `Agent` (Task) per piece, all in one message so they
  run in parallel. In Codex, ask it to spawn one subagent per piece. Results come
  back into your context for you to integrate.
- **Large-scale fan-out (codebase-wide audit, 100s-of-files migration, cross-checked
  research, drafting one plan from several angles)** → a **dynamic workflow**. The
  orchestration lives in a script that scales to dozens–hundreds of agents and is
  rerunnable. Tell the user this is workflow-shaped and offer to write one (it
  needs their opt-in, e.g. `ultracode` or "use a workflow"); don't silently launch
  one.

When unsure, default to subagents — they're lighter and keep you in the loop.

## Workflow

Copy this checklist into your response and check off as you go:

```
Orchestration Progress:
- [ ] 1. Scout: map the repo, conventions, and the libraries in play
- [ ] 2. Decompose into independent subtasks with explicit boundaries
- [ ] 3. Brief + dispatch one subagent per subtask (parallel)
- [ ] 4. Collect results; resolve conflicts and gaps
- [ ] 5. Integrate and verify the combined result
```

### 1. Scout (do this yourself, first)

Gather what the subagents will need but can't cheaply rediscover, since they don't
share your context:
- Project layout, build/test/lint commands, and conventions to match.
- The exact libraries/frameworks/**versions** involved — subagents must use these,
  not whatever they'd default to.
- Shared contracts (types, API shapes, schemas) that subtasks depend on. **Define
  these yourself** so parallel agents agree on the interface between their pieces.

### 2. Decompose

Split into subtasks that are **independent** (run in parallel without colliding)
and **bounded** (one clear deliverable each). Name the files/modules each subtask
owns so two agents never edit the same file. Freeze any shared contract in step 1
and pass it to every agent that touches it.

If subtasks are NOT independent (B needs A's output), sequence them: dispatch A,
feed its result into B's brief.

### 3. Brief and dispatch

Every subagent gets a **self-contained** brief — it does not see this conversation.
Use the template in [references/briefing-template.md](references/briefing-template.md).
Every brief MUST carry the Context7 mandate so subagents code against current APIs,
not stale training data:

> Before writing any code that touches an external library, framework, SDK, or
> API, call `mcp__context7__resolve-library-id` then `mcp__context7__query-docs`
> to fetch current docs for the exact version in this project. Cite the confirmed
> version in a code comment. Do not rely on memorized APIs.

Dispatch using the mechanism you picked above — see
[references/dispatch.md](references/dispatch.md) for Claude Code subagents, Claude
Code workflows, and Codex (including a custom `.codex/agents` agent wired to docs).

### 4. Collect and reconcile

When subagents return, check for: overlapping edits, mismatched contracts, missing
pieces, and anything that skipped the Context7 step. Fix small gaps yourself or
dispatch a tightly-scoped follow-up. Never assume a subagent succeeded — verify its
claims.

### 5. Integrate and verify

Wire the pieces together, then run the project's build/tests/linters. If something
fails, fix it or send a scoped subagent with the error output. Report what each
subagent produced and the final verification result plainly — including failures.

## Shipping and reviewing

To push the result to a PR and run a review-and-fix workflow over it, that's a
separate skill — `shipping-pr-reviews`. Hand off to it once the build/tests pass.

## Key rules

- **You stay the orchestrator.** Don't implement subtasks yourself except trivial
  glue and conflict resolution.
- **Briefs are self-contained.** Assume the subagent knows nothing about this
  conversation: spell out the goal, owned files, contract, conventions, and the
  Context7 mandate.
- **Freeze shared contracts before fan-out** so parallel agents don't diverge.
- **One file, one owner.** Never let two parallel agents edit the same file.
- **Verify, don't trust.** Re-check every subagent's output against the contract
  and the actual build.
