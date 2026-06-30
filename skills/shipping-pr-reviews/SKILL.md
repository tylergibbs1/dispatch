---
name: shipping-pr-reviews
description: >-
  Push the current changes to a pull request, then launch a dynamic workflow that
  reviews the PR diff, adversarially verifies each finding, and fixes the confirmed
  ones — pushing the fixes back to the PR. Use when the user wants to "push to a PR
  and review", "open a PR then review and fix findings", "ship and review", or run
  a multi-agent review-and-fix pass over a branch. Pairs with orchestrating-subagents
  (which implements the change first).
disable-model-invocation: true
license: MIT
metadata:
  author: tylergibbs
  version: '1.0.0'
---

# Shipping PR Reviews

Two phases: **ship** the working changes to a PR, then run a **dynamic workflow**
that reviews the diff, verifies findings, and fixes the real ones. The user
invoking this skill is the opt-in to launch a workflow; the approval card still
shows before it runs.

## When to use this

Use after a change is implemented and the build/tests pass, when the user wants it
on a PR with a multi-agent review-and-fix pass. For a quick local review without a
PR or custom script, the built-in `/code-review` (add `--fix` to apply findings,
`ultra` for a deeper cloud review) is lighter — mention it if that's all they need.

## Workflow

```
Ship + Review Progress:
- [ ] 1. Pre-flight: clean state, build/tests green
- [ ] 2. Push to a PR (branch, commit, push, open PR)
- [ ] 3. Launch the review-and-fix dynamic workflow over the PR diff
- [ ] 4. Apply confirmed fixes; push them to the PR
- [ ] 5. Report what was confirmed, fixed, and skipped
```

### 1. Pre-flight

- Confirm you're in a git repo and the build/tests/linters pass. Don't ship broken
  code for review.
- Check `git status` and the current branch. Note the base branch (usually the
  default branch) — the review compares the PR diff against it.

### 2. Push to a PR

Pushing and opening a PR are outward-facing — confirm before the first push unless
the user already told you to ship. Steps and exact commands are in
[references/pr-push.md](references/pr-push.md):

- If on the default branch, create a feature branch first.
- Stage and commit with a descriptive message (include the required co-author
  trailer).
- Push the branch and open the PR with `gh pr create`. **Surface the PR URL.**

### 3. Launch the review-and-fix workflow

Write and run a dynamic workflow over the PR diff. Adapt the ready-made script in
[references/review-fix-workflow.md](references/review-fix-workflow.md). It:

- **Reviews** the diff across independent dimensions (correctness, security, error
  handling, tests, performance) — one agent per dimension, in parallel.
- **Verifies** each finding adversarially — independent skeptics try to refute it;
  findings that don't survive are dropped, so you fix real bugs, not noise.
- **Fixes** each confirmed finding in its own agent. Fix agents that touch an
  external library MUST pull current docs via Context7
  (`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`) before
  writing code, and cite the confirmed version in a comment.

Scale the review to the request: a few dimensions and single-vote verify for "review
this", a larger finder pool and 3-vote adversarial verify for "thoroughly review".

### 4. Apply fixes and push

Workflow agents run with their own context, so collect the confirmed findings + the
fixes the workflow produced, make sure the working tree has them, re-run
build/tests, then commit and push to the same PR branch.

### 5. Report

Post a summary (and/or PR comment) listing: findings confirmed, fixes applied,
findings skipped as false positives, and any finding that couldn't be verified
(e.g. an agent hit an error) — call those out as unverified rather than fixed.

## Key rules

- **Never ship red.** Build/tests must pass before the PR and again after fixes.
- **One PR, one branch.** Push fixes to the same branch, not a new PR.
- **Verify before fixing.** Only fix findings that survive adversarial verification;
  report the rest instead of acting on them.
- **Fresh docs for fixes.** Every library-touching fix agent carries the Context7
  mandate, same as in `orchestrating-subagents`.
- **Confirm outward actions.** Get a go-ahead before the first push/PR unless the
  user already said to ship.
