# Dispatch

[![skills.sh](https://skills.sh/b/tylergibbs1/dispatch)](https://skills.sh/tylergibbs1/dispatch)
[![Validate skills](https://github.com/tylergibbs1/dispatch/actions/workflows/validate-skills.yml/badge.svg)](https://github.com/tylergibbs1/dispatch/actions/workflows/validate-skills.yml)

A collection of [Agent Skills](https://agentskills.io/) for orchestrating
multi-agent coding work — fanning out subagents to implement a change, then
shipping it to a PR and running a review-and-fix workflow over the diff.

Both skills require every agent that touches an external library to pull current
docs via [Context7](https://github.com/upstash/context7) before writing code, so
implementations and fixes track real APIs instead of stale training data.

## Available Skills

### orchestrating-subagents

Turns the calling agent into an **orchestrator**: it scouts the repo, freezes
shared contracts, decomposes the task into independent subtasks, and dispatches one
subagent per subtask in parallel — each with a self-contained brief and the
Context7 mandate. Covers Claude Code subagents, Claude Code dynamic workflows, and
Codex subagents.

**Use when:**

- "Use subagents" / "fan out" / "parallelize this implementation"
- Building a feature that splits into independent workstreams
- Orchestrating a codebase-wide audit or large migration

### shipping-pr-reviews

Pushes the current changes to a pull request, then launches a **dynamic workflow**
that reviews the PR diff across dimensions, **adversarially verifies** each finding
to drop false positives, and **fixes** the confirmed ones in isolated worktrees
before pushing the fixes back to the PR.

**Use when:**

- "Push to a PR then review and fix findings"
- "Ship and review this branch"
- Running a multi-agent review-and-fix pass over a diff

The two pair up: `orchestrating-subagents` implements the change, then
`shipping-pr-reviews` ships and reviews it.

## Installation

With the [skills.sh](https://skills.sh) installer (pick the skills and the agents
to install them on):

```bash
npx skills@latest add tylergibbs1/dispatch
```

Or install as a Claude Code plugin (the repo ships a
[`.claude-plugin/plugin.json`](.claude-plugin/plugin.json)):

```text
/plugin marketplace add tylergibbs1/dispatch
/plugin install dispatch
```

Both skills are **invoke-only** (`disable-model-invocation: true`) — they spawn
fleets of subagents / dynamic workflows, so you trigger them deliberately rather
than have the agent auto-fire them.

## Usage

Invoke them as slash commands (or by name):

```
/orchestrating-subagents  build the API, the UI, and the migration for feature X
```

```
/shipping-pr-reviews  push this branch to a PR, then review and fix the findings
```

## Skill structure

Each skill contains:

- `SKILL.md` — instructions for the agent (loaded when triggered)
- `references/` — supporting docs loaded on demand (templates, dispatch mechanisms)
- `metadata.json` — version and references

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a new skill and the
frontmatter rules enforced by CI.

## License

MIT
