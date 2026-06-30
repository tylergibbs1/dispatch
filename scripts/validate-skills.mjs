#!/usr/bin/env node
// Validates every skills/<name>/SKILL.md against the Agent Skills frontmatter
// rules: required name/description, name charset/length, no reserved words, and
// name matching the directory. No external dependencies — uses a minimal
// frontmatter parser scoped to the two fields we validate.
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

// Pull the top-level `name:` and `description:` out of the YAML frontmatter.
// description may be a folded block continued on indented lines, so we collect
// continuation lines until the next top-level key.
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const lines = text.slice(text.indexOf('\n') + 1, end).split('\n')

  const fields = {}
  let currentKey = null
  let buffer = []
  const flush = () => {
    if (currentKey) fields[currentKey] = buffer.join(' ').trim()
    buffer = []
  }
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s?(.*)$/)
    if (m && !line.startsWith(' ')) {
      flush()
      currentKey = m[1]
      buffer = m[2] ? [m[2]] : []
    } else if (currentKey && line.trim()) {
      buffer.push(line.trim())
    }
  }
  flush()
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

  const name = fm.name
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

  const description = fm.description
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
