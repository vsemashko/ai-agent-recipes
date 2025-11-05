import { assertEquals, assertRejects } from 'jsr:@std/assert'
import { join } from 'jsr:@std/path'
import {
  batchConvertSkills,
  convertSkillFile,
  parseSkillFrontmatter,
  skillToAgentMd,
} from './converter.ts'

const SAMPLE_SKILL = `---
name: sample-skill
description: Demonstrate converter behaviour
---

## When to Use
- Example usage

## How It Works
- Step one
- Step two
`

Deno.test('parseSkillFrontmatter extracts name, description, and body', () => {
  const parsed = parseSkillFrontmatter(SAMPLE_SKILL)
  if (!parsed) throw new Error('Expected parsed skill data')

  assertEquals(parsed.frontmatter.name, 'sample-skill')
  assertEquals(parsed.frontmatter.description, 'Demonstrate converter behaviour')
  assertEquals(parsed.body.startsWith('## When to Use'), true)
})

Deno.test('skillToAgentMd preserves metadata in output', () => {
  const parsed = parseSkillFrontmatter(SAMPLE_SKILL)
  if (!parsed) throw new Error('Expected parsed skill data')

  const agentMd = skillToAgentMd(parsed)
  assertEquals(agentMd.includes('## sample-skill'), true)
  assertEquals(agentMd.includes('Demonstrate converter behaviour'), true)
})

Deno.test('convertSkillFile reads SKILL.md from disk', async () => {
  const skillPath = join('skills', 'rightsize', 'SKILL.md')
  const agentOutput = await convertSkillFile(skillPath, 'agent-md')
  if (typeof agentOutput !== 'string') throw new Error('Expected string output')
  assertEquals(agentOutput.includes('rightsize'), true)
})

Deno.test('batchConvertSkills converts repository skills', async () => {
  const results = await batchConvertSkills('skills', 'agent-md')
  const convertedSkillNames = results.map((entry) => entry.skill)
  assertEquals(convertedSkillNames.includes('rightsize'), true)
})

Deno.test('convertSkillFile rejects when SKILL.md is missing', async () => {
  await assertRejects(
    () => convertSkillFile('skills/nope/SKILL.md', 'agent-md'),
    Error,
    'Skill file not found',
  )
})
