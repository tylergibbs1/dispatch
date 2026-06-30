# Dispatch Mechanisms

How to actually spawn subagents on each platform. Pick by scale (see SKILL.md).
Every dispatch must carry the Context7 mandate from the briefing template.

## Contents
- Claude Code — subagents (default for feature work)
- Claude Code — dynamic workflows (large-scale fan-out)
- Codex — subagents and custom agents
- Choosing between them

---

## Claude Code — subagents

The default for implementation that splits into a handful of pieces. Claude
orchestrates turn by turn and each result returns into the conversation.

- Launch one `Agent` (Task) per subtask. **Put all parallel dispatches in a single
  message with multiple tool calls** so they run concurrently.
- Choose the agent type per subtask: `general-purpose` for implementation,
  `Explore` for read-only investigation, or a project-defined custom subagent.
- The whole prompt to each agent is the self-contained brief (briefing-template.md),
  Context7 mandate included.
- Subagents run with their own context; their final message is the only thing you
  get back, so require a structured report-back in the brief.

## Claude Code — dynamic workflows

For large-scale or repeatable orchestration: codebase-wide audits, 100s-of-files
migrations, research cross-checked across sources, or drafting one plan from
several independent angles. A workflow is a JS script the runtime runs in the
background; it scales to dozens–hundreds of agents and intermediate results stay
in script variables instead of your context.

- Workflows require the user's opt-in. They start one with the `ultracode` keyword,
  by asking in words ("use a workflow" / "run a workflow"), or by setting
  `/effort ultracode`. **Do not launch one without that opt-in** — instead, tell
  the user the task is workflow-shaped and offer to write the script.
- The script still has to embed each agent's brief and the Context7 mandate in the
  prompts it generates — the same self-contained-brief rule applies per agent.
- Build in a quality pass where it helps: have independent agents adversarially
  review each other's output before results are accepted.
- Once a run does what you want, it can be saved as a `/command` under
  `.claude/workflows/` (project) or `~/.claude/workflows/` (personal) and rerun
  with `args`.

## Codex — subagents

Codex spawns subagents **only when you explicitly ask it to**. Built-in agents:
`default` (general), `worker` (implementation/fixes), `explorer` (read-heavy
exploration). Ask it to spawn one agent per subtask, wait for all, and consolidate.

Define reusable custom agents as TOML under `.codex/agents/` (project) or
`~/.codex/agents/` (personal). Required fields: `name`, `description`,
`developer_instructions`. Optional: `model`, `model_reasoning_effort`,
`sandbox_mode`, `mcp_servers`, `skills.config`. A custom agent name matching a
built-in (e.g. `explorer`) takes precedence.

For batches of similar items (one row per file/service/target), use
`spawn_agents_on_csv`: one worker per CSV row, results exported to CSV. Each worker
must call `report_agent_job_result` exactly once.

To bake the Context7 mandate into a Codex agent, put it in
`developer_instructions` and wire the Context7 MCP server so the agent has the
tools:

```toml
name = "implementer"
description = "Implements a bounded subtask against current library docs."
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
developer_instructions = """
Implement only the subtask in your brief. Touch only the files you are assigned.
Before writing any code that uses an external library, framework, SDK, or API,
resolve it and fetch current docs via the context7 MCP server for the exact
version in this project, and cite the confirmed version in a code comment. Do not
rely on memorized APIs. Report back: files changed, contract issues, and the
library versions you confirmed.
"""

[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
```

> Confirm the project's actual Context7 MCP configuration (transport/URL or local
> command) before relying on the snippet above — match what's already set up.

## Choosing between them

| Situation | Mechanism |
| --- | --- |
| 2–6 implementation pieces of one feature | Claude Code subagents |
| Read-only investigation across the repo | `Explore` subagents (or Codex `explorer`) |
| Codebase-wide audit / large migration / cross-checked research | Claude Code dynamic workflow (with opt-in) |
| One row per item, identical task | Codex `spawn_agents_on_csv` |
| Reusable, opinionated worker roles you'll run repeatedly | Codex custom agents in `.codex/agents/` |

When unsure, default to subagents — lighter, and you stay in the loop to integrate.
