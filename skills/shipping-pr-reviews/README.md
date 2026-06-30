# Shipping PR Reviews

A skill you call to **push the current changes to a PR, then run a dynamic workflow
that reviews the diff, verifies findings, and fixes the real ones** — pushing the
fixes back to the same PR.

It's the review-and-ship counterpart to
[`orchestrating-subagents`](../orchestrating-subagents/README.md): that one
implements a feature with parallel subagents; this one ships and reviews the result.

## What it does

1. **Pre-flight** — confirms a clean git state and green build/tests.
2. **Ship** — branches (if needed), commits, pushes, and opens the PR with `gh`;
   surfaces the PR URL.
3. **Review-and-fix workflow** — a dynamic workflow reviews the PR diff across
   dimensions (correctness, security, error handling, tests, performance),
   adversarially verifies each finding so false positives are dropped, and fixes the
   confirmed ones in isolated worktrees. Fix agents pull fresh docs via Context7.
4. **Push fixes + report** — applies fixes to the branch, re-runs build/tests,
   pushes, and reports confirmed / fixed / skipped / unverified.

## How to invoke

In Claude Code: `/shipping-pr-reviews`, or ask to "push to a PR then review and fix
findings" / "ship and review this".

For a lighter local pass without a custom workflow, the built-in `/code-review`
(`--fix` applies findings, `ultra` runs a deeper cloud review) may be enough.

## Install

This skill follows the [Agent Skills](https://agentskills.io/) format. Once it's
pushed to a repo, install it with the `skills` CLI — the same way
[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) installs:

```bash
npx skills add tylergibbs1/dispatch
```

Skills are available automatically once installed. (Locally, this skill already
lives in `~/.claude/skills/shipping-pr-reviews/`, available in every project.)

## Requirements

- A git repository and the `gh` CLI authenticated for the remote.
- Dynamic workflows enabled (Claude Code v2.1.154+, paid plan). Launching the
  workflow shows an approval card first.

## Files

| File | Purpose |
| --- | --- |
| `SKILL.md` | Main instructions (loaded when triggered) |
| `references/pr-push.md` | Git + `gh` steps to branch, commit, push, and open the PR |
| `references/review-fix-workflow.md` | Adaptable review→verify→fix dynamic-workflow script |
| `metadata.json` | Version and references |
