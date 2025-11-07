import { join } from '@std/path'
import { exists } from '@std/fs'

interface SkillFrontmatter {
  name: string
  description: string
}

interface ParsedSkill {
  frontmatter: SkillFrontmatter
  body: string
}

export function parseSkillFrontmatter(content: string): ParsedSkill | null {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)/)
  if (!frontmatterMatch) return null

  const frontmatterText = frontmatterMatch[1]
  const body = frontmatterMatch[2]

  const nameMatch = frontmatterText.match(/name:\s*(.+)/)
  const descMatch = frontmatterText.match(/description:\s*(.+)/)

  if (!nameMatch || !descMatch) return null

  return {
    frontmatter: {
      name: nameMatch[1].trim(),
      description: descMatch[1].trim(),
    },
    body: body.trim(),
  }
}

export function skillToAgentMd(parsed: ParsedSkill, skillPath?: string): string {
  const { frontmatter } = parsed

  // Only include name and description - not the full body
  // Full skill instructions are available in the skills directory
  if (skillPath) {
    return `- **${frontmatter.name}** (\`${skillPath}\`) - ${frontmatter.description}`
  }
  return `- **${frontmatter.name}** - ${frontmatter.description}`
}

export function skillToCursorMdc(parsed: ParsedSkill): string {
  const { frontmatter, body } = parsed

  return `---
name: ${frontmatter.name}
description: ${frontmatter.description}
---

${body}
`
}

export function skillToCodexAgent(parsed: ParsedSkill): object {
  const { frontmatter, body } = parsed

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    instructions: body,
    trigger: `/${frontmatter.name}`,
  }
}

export async function convertSkillFile(
  skillPath: string,
  format: 'agent-md' | 'cursor-mdc' | 'codex-json',
  displayPath?: string,
): Promise<string | object> {
  if (!await exists(skillPath)) {
    throw new Error(`Skill file not found: ${skillPath}`)
  }

  const content = await Deno.readTextFile(skillPath)
  const parsed = parseSkillFrontmatter(content)

  if (!parsed) {
    throw new Error('Invalid skill format: could not parse frontmatter')
  }

  switch (format) {
    case 'agent-md':
      return skillToAgentMd(parsed, displayPath)
    case 'cursor-mdc':
      return skillToCursorMdc(parsed)
    case 'codex-json':
      return skillToCodexAgent(parsed)
    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

export async function batchConvertSkills(
  skillsDir: string,
  format: 'agent-md' | 'cursor-mdc' | 'codex-json',
  displayPathTemplate?: (skillDirName: string) => string,
): Promise<Array<{ skill: string; output: string | object }>> {
  const results: Array<{ skill: string; output: string | object }> = []

  for await (const entry of Deno.readDir(skillsDir)) {
    if (entry.isDirectory) {
      const skillFile = join(skillsDir, entry.name, 'SKILL.md')
      const displayPath = displayPathTemplate ? displayPathTemplate(entry.name) : undefined

      try {
        const output = await convertSkillFile(skillFile, format, displayPath)
        results.push({ skill: entry.name, output })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`⚠ Failed to convert ${entry.name}:`, message)
      }
    }
  }

  return results
}
