# Contributing

This repo is a collection of [Agent Skills](https://agentskills.io/). Each skill
lives in its own directory under `skills/` and is validated in CI on every push and
pull request.

## Add a new skill

1. **Create the directory** under `skills/`, named in lowercase-kebab-case. Prefer
   gerund form (e.g. `reviewing-prs`). The directory name MUST match the `name` in
   the skill's frontmatter.

   ```text
   skills/<your-skill>/
   ├── SKILL.md                 # required — instructions, loaded when triggered
   ├── metadata.json            # optional — version + references
   ├── README.md                # optional — human-facing overview
   └── references/              # optional — docs loaded on demand
       └── ...
   ```

2. **Write `SKILL.md`** with YAML frontmatter and a concise body:

   ```markdown
   ---
   name: your-skill
   description: >-
     What the skill does and when to use it — third person, specific, with the
     trigger phrases a user would say. This is how the agent decides to load it.
   # Optional: invoke-only (no auto-trigger) for heavyweight/expensive skills.
   disable-model-invocation: true
   ---

   # Your Skill

   Body: the instructions the agent follows when the skill is triggered.
   ```

3. **Register it** in all three places:
   - [`skills.sh.json`](skills.sh.json) — add the directory name to a grouping (for
     the skills.sh listing).
   - [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) — add
     `"./skills/<your-skill>"` to the `skills` array (for Claude Code plugin install).
   - [`README.md`](README.md) — list it under **Available Skills**.

4. **Validate locally**, then open a PR:

   ```bash
   node scripts/validate-skills.mjs
   ```

## Frontmatter rules (enforced by CI)

`scripts/validate-skills.mjs` checks every `skills/<name>/SKILL.md`:

| Field | Rule |
| --- | --- |
| `name` | Required. Lowercase letters, numbers, and hyphens only. Max 64 chars. No reserved words (`anthropic`, `claude`). Must match the directory name. |
| `description` | Required, non-empty. Max 1024 characters. |

A failing check blocks the [Validate skills](.github/workflows/validate-skills.yml)
workflow.

> **YAML gotcha:** a multi-line `description` that contains `": "` (e.g.
> "implementation: decompose...") must use a block scalar (`description: >-`) or be
> quoted. As a plain unquoted scalar, strict YAML parsers — including the skills.sh
> installer — treat the colon as a nested mapping and silently drop the skill. The
> validator catches this.

## Authoring guidelines

Follow the [Skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices):

- **Be concise.** Only add context the agent doesn't already have. Keep `SKILL.md`
  under ~500 lines; move detail into `references/` files loaded on demand.
- **Write the description in third person** and include the trigger phrases a user
  would actually say — it's the primary signal for when the skill loads.
- **Keep references one level deep** from `SKILL.md` so they're read completely.
- **Prefer one default over many options**, and use consistent terminology.
- Avoid time-sensitive content and Windows-style paths (use forward slashes).

## Conventions in this repo

- Skills that spawn implementation or fix agents must carry the **Context7
  mandate**: before writing code against any external library, the agent resolves
  it and fetches current docs via Context7, citing the confirmed version. See
  `skills/orchestrating-subagents/references/briefing-template.md` for the wording.
- One file, one owner: parallel agents never edit the same file.
