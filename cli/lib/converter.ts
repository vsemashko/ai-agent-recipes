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

interface AgentFrontmatter {
  name: string
  description: string
  tools?: string
  model?: string
  disabledTools?: string
}

interface ParsedAgent {
  frontmatter: AgentFrontmatter
  body: string
}

interface CommandFrontmatter {
  name: string
  description: string
  agent?: string
  model?: string
}

interface ParsedCommand {
  frontmatter: CommandFrontmatter
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

// ============================================================================
// Agent Conversion Functions
// ============================================================================

export function parseAgentFrontmatter(content: string): ParsedAgent | null {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)/)
  if (!frontmatterMatch) return null

  const frontmatterText = frontmatterMatch[1]
  const body = frontmatterMatch[2]

  const nameMatch = frontmatterText.match(/name:\s*(.+)/)
  const descMatch = frontmatterText.match(/description:\s*(.+)/)

  if (!nameMatch || !descMatch) return null

  const toolsMatch = frontmatterText.match(/tools:\s*(.+)/)
  const modelMatch = frontmatterText.match(/model:\s*(.+)/)
  const disabledToolsMatch = frontmatterText.match(/disabledTools:\s*(.+)/)

  return {
    frontmatter: {
      name: nameMatch[1].trim(),
      description: descMatch[1].trim(),
      tools: toolsMatch ? toolsMatch[1].trim() : undefined,
      model: modelMatch ? modelMatch[1].trim() : undefined,
      disabledTools: disabledToolsMatch ? disabledToolsMatch[1].trim() : undefined,
    },
    body: body.trim(),
  }
}

export function agentToClaudeMd(parsed: ParsedAgent): string {
  const { frontmatter, body } = parsed
  let output = `---\nname: ${frontmatter.name}\ndescription: ${frontmatter.description}\n`

  if (frontmatter.tools) {
    output += `tools: ${frontmatter.tools}\n`
  }

  if (frontmatter.model) {
    output += `model: ${frontmatter.model}\n`
  }

  output += `---\n\n${body}\n`
  return output
}

export function agentToOpenCodeJson(parsed: ParsedAgent): object {
  const { frontmatter, body } = parsed
  const agent: Record<string, unknown> = {
    description: frontmatter.description,
    prompt: body,
  }

  if (frontmatter.model) {
    // Map model aliases to OpenCode format
    const modelMap: Record<string, string> = {
      'sonnet': 'anthropic/claude-sonnet-4-20250514',
      'opus': 'anthropic/claude-opus-4-20250514',
      'haiku': 'anthropic/claude-haiku-4-20250316',
    }
    agent.model = modelMap[frontmatter.model] || frontmatter.model
  }

  // Handle tool restrictions
  if (frontmatter.disabledTools) {
    const tools: Record<string, boolean> = {}
    const disabledList = frontmatter.disabledTools.split(',').map((t) => t.trim().toLowerCase())
    for (const tool of disabledList) {
      tools[tool] = false
    }
    agent.tools = tools
  }

  return agent
}

export function agentToAgentMd(parsed: ParsedAgent, agentPath?: string): string {
  const { frontmatter } = parsed

  // Format for AGENTS.md listing (similar to skills)
  if (agentPath) {
    return `- **${frontmatter.name}** (\`${agentPath}\`) - ${frontmatter.description}`
  }
  return `- **${frontmatter.name}** - ${frontmatter.description}`
}

export async function convertAgentFile(
  agentPath: string,
  format: 'claude-md' | 'opencode-json' | 'agent-md',
  displayPath?: string,
): Promise<string | object> {
  if (!await exists(agentPath)) {
    throw new Error(`Agent file not found: ${agentPath}`)
  }

  const content = await Deno.readTextFile(agentPath)
  const parsed = parseAgentFrontmatter(content)

  if (!parsed) {
    throw new Error('Invalid agent format: could not parse frontmatter')
  }

  switch (format) {
    case 'claude-md':
      return agentToClaudeMd(parsed)
    case 'opencode-json':
      return agentToOpenCodeJson(parsed)
    case 'agent-md':
      return agentToAgentMd(parsed, displayPath)
    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

export async function batchConvertAgents(
  agentsDir: string,
  format: 'claude-md' | 'opencode-json' | 'agent-md',
  displayPathTemplate?: (agentDirName: string) => string,
): Promise<Array<{ agent: string; output: string | object }>> {
  const results: Array<{ agent: string; output: string | object }> = []

  if (!await exists(agentsDir)) {
    return results
  }

  for await (const entry of Deno.readDir(agentsDir)) {
    if (entry.isDirectory) {
      const agentFile = join(agentsDir, entry.name, 'AGENT.md')
      const displayPath = displayPathTemplate ? displayPathTemplate(entry.name) : undefined

      try {
        const output = await convertAgentFile(agentFile, format, displayPath)
        results.push({ agent: entry.name, output })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`⚠ Failed to convert agent ${entry.name}:`, message)
      }
    }
  }

  return results
}

// ============================================================================
// Command Conversion Functions
// ============================================================================

export function parseCommandFrontmatter(content: string): ParsedCommand | null {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)/)
  if (!frontmatterMatch) return null

  const frontmatterText = frontmatterMatch[1]
  const body = frontmatterMatch[2]

  const nameMatch = frontmatterText.match(/name:\s*(.+)/)
  const descMatch = frontmatterText.match(/description:\s*(.+)/)

  if (!nameMatch || !descMatch) return null

  const agentMatch = frontmatterText.match(/agent:\s*(.+)/)
  const modelMatch = frontmatterText.match(/model:\s*(.+)/)

  return {
    frontmatter: {
      name: nameMatch[1].trim(),
      description: descMatch[1].trim(),
      agent: agentMatch ? agentMatch[1].trim() : undefined,
      model: modelMatch ? modelMatch[1].trim() : undefined,
    },
    body: body.trim(),
  }
}

export function commandToClaudeMd(parsed: ParsedCommand): string {
  // Claude Code commands are just markdown content (no frontmatter needed in output)
  return parsed.body
}

export function commandToOpenCodeJson(parsed: ParsedCommand): object {
  const { frontmatter, body } = parsed
  const command: Record<string, unknown> = {
    description: frontmatter.description,
    template: body,
  }

  if (frontmatter.agent) {
    command.agent = frontmatter.agent
  }

  if (frontmatter.model) {
    const modelMap: Record<string, string> = {
      'sonnet': 'anthropic/claude-sonnet-4-20250514',
      'opus': 'anthropic/claude-opus-4-20250514',
      'haiku': 'anthropic/claude-haiku-4-20250316',
    }
    command.model = modelMap[frontmatter.model] || frontmatter.model
  }

  return command
}

export async function convertCommandFile(
  commandPath: string,
  format: 'claude-md' | 'opencode-json',
): Promise<string | object> {
  if (!await exists(commandPath)) {
    throw new Error(`Command file not found: ${commandPath}`)
  }

  const content = await Deno.readTextFile(commandPath)
  const parsed = parseCommandFrontmatter(content)

  if (!parsed) {
    throw new Error('Invalid command format: could not parse frontmatter')
  }

  switch (format) {
    case 'claude-md':
      return commandToClaudeMd(parsed)
    case 'opencode-json':
      return commandToOpenCodeJson(parsed)
    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

export async function batchConvertCommands(
  commandsDir: string,
  format: 'claude-md' | 'opencode-json',
): Promise<Array<{ command: string; output: string | object }>> {
  const results: Array<{ command: string; output: string | object }> = []

  if (!await exists(commandsDir)) {
    return results
  }

  for await (const entry of Deno.readDir(commandsDir)) {
    if (entry.isDirectory) {
      const commandFile = join(commandsDir, entry.name, 'COMMAND.md')

      try {
        const output = await convertCommandFile(commandFile, format)
        results.push({ command: entry.name, output })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`⚠ Failed to convert command ${entry.name}:`, message)
      }
    }
  }

  return results
}
