import { assertEquals } from '@std/assert'
import { PathAdjuster } from './path-adjuster.ts'

Deno.test('PathAdjuster - adjust Claude Code paths to Codex', () => {
  const adjuster = new PathAdjuster()
  const content = `
# Example Skill

To use this skill, read the file at ~/.claude/skills/my-skill/SKILL.md
Config is at ~/.claude
  `
  const result = adjuster.adjustPaths(content, 'codex')
  assertEquals(
    result,
    `
# Example Skill

To use this skill, read the file at ~/.codex/skills/my-skill/SKILL.md
Config is at ~/.codex
  `,
  )
})

Deno.test('PathAdjuster - adjust Codex paths to Claude Code', () => {
  const adjuster = new PathAdjuster()
  const content = `
# Example Skill

To use this skill, read the file at ~/.codex/skills/my-skill/SKILL.md
Config is at ~/.codex
  `
  const result = adjuster.adjustPaths(content, 'claude-code')
  assertEquals(
    result,
    `
# Example Skill

To use this skill, read the file at ~/.claude/skills/my-skill/SKILL.md
Config is at ~/.claude
  `,
  )
})

Deno.test('PathAdjuster - adjust $HOME paths', () => {
  const adjuster = new PathAdjuster()
  const content = `
Use $HOME/.claude/skills and $HOME/.codex/skills
  `
  const result = adjuster.adjustPaths(content, 'codex')
  assertEquals(
    result,
    `
Use ~/.codex/skills and ~/.codex/skills
  `,
  )
})

Deno.test('PathAdjuster - no changes if no paths', () => {
  const adjuster = new PathAdjuster()
  const content = 'This is a simple text without any paths'
  const result = adjuster.adjustPaths(content, 'codex')
  assertEquals(result, content)
})

Deno.test('PathAdjuster - getSkillsPath', () => {
  const adjuster = new PathAdjuster()
  assertEquals(adjuster.getSkillsPath('claude-code'), '~/.claude/skills')
  assertEquals(adjuster.getSkillsPath('codex'), '~/.codex/skills')
})

Deno.test('PathAdjuster - getConfigPath', () => {
  const adjuster = new PathAdjuster()
  assertEquals(adjuster.getConfigPath('claude-code'), '~/.claude')
  assertEquals(adjuster.getConfigPath('codex'), '~/.codex')
})

Deno.test('PathAdjuster - multiple path occurrences', () => {
  const adjuster = new PathAdjuster()
  const content = `
First: ~/.claude/skills
Second: ~/.claude/skills
Third: ~/.claude
  `
  const result = adjuster.adjustPaths(content, 'codex')
  assertEquals(
    result,
    `
First: ~/.codex/skills
Second: ~/.codex/skills
Third: ~/.codex
  `,
  )
})
