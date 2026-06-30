#!/usr/bin/env node
// Validates every skills/<name>/SKILL.md against the Agent Skills frontmatter
// rules: required name/description, name charset/length, no reserved words, name
// matching the directory, and YAML-safety of plain scalars. No external
// dependencies — a minimal frontmatter parser scoped to what we validate.
//
// Usage: node scripts/validate-skills.mjs
// Exits non-zero (and prints each problem) if any skill is invalid.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SKILLS_DIR = 'skills'
const RESERVED = ['anthropic', 'claude']
const errors = []

function fail(skill, msg) {
  errors.push(`${skill}: ${msg}`)
}

// Parse the top-level keys of the YAML frontmatter. For each key we capture the
// folded value plus its `style`: 'plain' (unquoted), 'quoted', 'block' (>/|), or
// 'mapping' (a nested key: value block like `metadata:`). Style matters because a
// *plain* multi-line scalar containing ": " is invalid YAML — strict parsers (e.g.
// the skills CLI) reject the whole file and silently drop the skill. That is the
// bug this validator exists to catch, so we surface it instead of guessing.
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const lines = text.slice(text.indexOf('\n') + 1, end).split('\n')

  const entries = []
  let cur = null
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s?(.*)$/)
    if (m && !line.startsWith(' ')) {
      if (cur) entries.push(cur)
      cur = { key: m[1], inline: m[2], lines: [] }
    } else if (cur && line.trim()) {
      cur.lines.push(line)
    }
  }
  if (cur) entries.push(cur)

  const fields = {}
  for (const { key, inline, lines: raw } of entries) {
    const join = (arr) => arr.map((l) => l.trim()).join(' ').trim()
    let style, value
    if (/^[>|]/.test(inline)) {
      style = 'block'
      value = join(raw)
    } else if (/^["']/.test(inline)) {
      style = 'quoted'
      value = join([inline, ...raw])
    } else if (inline === '' && raw.length && raw.every((l) => /^\s+[\w-]+:(\s|$)/.test(l))) {
      style = 'mapping'
      value = ''
    } else {
      style = 'plain'
      value = inline ? join([inline, ...raw]) : join(raw)
    }
    fields[key] = { value, style }
  }
  return fields
}

if (!existsSync(SKILLS_DIR)) {
  console.error(`No ${SKILLS_DIR}/ directory found.`)
  process.exit(1)
}

const skillDirs = readdirSync(SKILLS_DIR).filter((d) =>
  statSync(join(SKILLS_DIR, d)).isDirectory()
)

if (skillDirs.length === 0) {
  console.error(`No skills found under ${SKILLS_DIR}/.`)
  process.exit(1)
}

for (const dir of skillDirs) {
  const skillPath = join(SKILLS_DIR, dir, 'SKILL.md')
  if (!existsSync(skillPath)) {
    fail(dir, 'missing SKILL.md')
    continue
  }

  const fm = parseFrontmatter(readFileSync(skillPath, 'utf8'))
  if (!fm) {
    fail(dir, 'SKILL.md has no YAML frontmatter (--- ... ---)')
    continue
  }

  // YAML-safety: a plain (unquoted, non-block) scalar must not contain ": " or
  // end with ":", or strict parsers treat it as a nested mapping and drop the skill.
  for (const [k, { value, style }] of Object.entries(fm)) {
    if (style === 'plain' && (/:\s/.test(value) || /:$/.test(value))) {
      fail(
        dir,
        `\`${k}\` is an unquoted scalar containing ": " — use a block scalar (>-) or quote it`
      )
    }
  }

  const name = fm.name?.value
  if (!name) {
    fail(dir, 'frontmatter missing `name`')
  } else {
    if (!/^[a-z0-9-]+$/.test(name))
      fail(dir, `name "${name}" must be lowercase letters, numbers, and hyphens only`)
    if (name.length > 64) fail(dir, `name "${name}" exceeds 64 characters`)
    if (RESERVED.some((w) => name.includes(w)))
      fail(dir, `name "${name}" contains a reserved word (${RESERVED.join(', ')})`)
    if (name !== dir)
      fail(dir, `name "${name}" should match the directory name "${dir}"`)
  }

  const description = fm.description?.value
  if (!description) {
    fail(dir, 'frontmatter missing `description`')
  } else if (description.length > 1024) {
    fail(dir, `description exceeds 1024 characters (${description.length})`)
  }
}

if (errors.length) {
  console.error('Skill validation failed:\n')
  for (const e of errors) console.error(`  ✗ ${e}`)
  process.exit(1)
}

console.log(`✓ Validated ${skillDirs.length} skill(s): ${skillDirs.join(', ')}`)
