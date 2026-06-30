# Orchestrating Subagents

A skill that turns the calling agent into an **orchestrator** for multi-agent
implementation work. Instead of writing code itself, the agent decomposes the
task, spins up parallel subagents to implement each piece, and gives every
subagent the context it needs — plus a hard requirement to fetch fresh docs via
[Context7](https://github.com/upstash/context7) before coding against any library.

It knows three dispatch mechanisms and picks by scale:

- **Claude Code subagents** (`Agent`/Task) — default for feature work that splits
  into a handful of pieces.
- **Claude Code dynamic workflows** — script-driven fan-out to dozens–hundreds of
  agents for audits, big migrations, and cross-checked research (needs user opt-in).
- **Codex subagents** — explicit spawn, built-ins (`default`/`worker`/`explorer`),
  and custom agents in `.codex/agents/*.toml`.

## What it does

1. **Scout** — the orchestrator maps the repo, conventions, and exact library
   versions in play.
2. **Decompose** — splits work into independent, bounded subtasks; freezes any
   shared contracts (types/APIs) so parallel agents agree on interfaces.
3. **Brief + dispatch** — one self-contained brief per subtask (see
   `references/briefing-template.md`), each carrying the Context7 mandate, dispatched
   via the right mechanism (see `references/dispatch.md`).
4. **Reconcile** — checks for overlapping edits, contract drift, and skipped doc
   lookups.
5. **Integrate + verify** — wires the pieces together and runs build/tests.

## How to invoke

In Claude Code: `/orchestrating-subagents` (or just ask to "use subagents to
build X" / "fan this out").

## Install

This skill follows the [Agent Skills](https://agentskills.io/) format. Once it's
pushed to a repo, install it with the `skills` CLI — the same way
[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) installs:

```bash
npx skills@latest add tylergibbs1/dispatch
```

Skills are available automatically once installed; the agent uses them when a
relevant task is detected. (Locally, this skill already lives in
`~/.claude/skills/orchestrating-subagents/`, available in every project.)

## Files

| File | Purpose |
| --- | --- |
| `SKILL.md` | Main instructions (loaded when triggered) |
| `references/dispatch.md` | Platform mechanisms: Claude Code subagents, Claude Code workflows, Codex |
| `references/briefing-template.md` | Copy-paste brief for each subagent + filled example |
| `metadata.json` | Version and references |
