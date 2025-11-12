/**
 * Agent & Command Converter
 *
 * Parses, processes, and reconstructs agent and command markdown files
 * with YAML frontmatter for different platforms.
 *
 * Core transformations:
 * 1. Merge provider-overrides into main frontmatter
 * 2. Transform tools format for different providers
 * 3. Pass through all other properties unchanged
 */

import { parse as parseYaml, stringify as stringifyYaml } from '@std/yaml'
import type { ToolsFormat } from './platform-config.ts'

/**
 * Generic parsed content with frontmatter and body
 * Frontmatter is flexible - only name and description are required,
 * all other properties are passed through
 */
export interface ParsedContent {
  frontmatter: Record<string, unknown> & {
    name: string
    description: string
  }
  body: string
}

/**
 * Generic frontmatter parser for agents and commands
 * Returns null if invalid format or missing required fields (name, description)
 */
export function parseFrontmatter(content: string): ParsedContent | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return null

  const frontmatter = parseYaml(match[1]) as Record<string, unknown>

  if (!frontmatter.name || !frontmatter.description) {
    return null
  }

  return {
    frontmatter: frontmatter as ParsedContent['frontmatter'],
    body: match[2].trim(),
  }
}

/**
 * Convert tools between different format types
 *
 * Supported formats:
 * - 'string': Comma-separated (Claude, Codex) - "Read, Grep, Glob"
 * - 'object': Boolean map (OpenCode) - { read: true, grep: true, glob: true }
 * - 'array': Array of strings (future providers) - ["read", "grep", "glob"]
 *
 * @param tools - Input tools in any supported format
 * @param targetFormat - Desired output format
 * @returns Converted tools in target format
 */
export function convertTools(tools: unknown, targetFormat: ToolsFormat): unknown {
  // Normalize to array first
  let toolsArray: string[]

  if (typeof tools === 'string') {
    // Parse comma-separated string
    toolsArray = tools
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
  } else if (Array.isArray(tools)) {
    // Already an array
    toolsArray = tools.map((t) => String(t).toLowerCase())
  } else if (typeof tools === 'object' && tools !== null) {
    // Object format { read: true, grep: true }
    toolsArray = Object.entries(tools)
      .filter(([_, value]) => value === true)
      .map(([key]) => key.toLowerCase())
  } else {
    // Unknown format, return as-is
    return tools
  }

  // Convert to target format
  switch (targetFormat) {
    case 'string':
      return toolsArray.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')

    case 'object':
      return toolsArray.reduce((acc, tool) => ({ ...acc, [tool]: true }), {})

    case 'array':
      return toolsArray

    default:
      return tools
  }
}

/**
 * Process content (agent or command) for specific platform
 * Applies all necessary transformations:
 * - Merges provider-overrides into main frontmatter
 * - Transforms tools format to platform-specific format (if toolsFormat specified)
 * - Passes through all other properties unchanged
 *
 * @param parsed - Parsed content with frontmatter and body
 * @param platform - Platform key (e.g., 'claude', 'opencode')
 * @param toolsFormat - Target tools format for this platform (from PlatformConfig)
 * @returns Processed content with platform-specific transformations applied
 */
export function processContentForPlatform(
  parsed: ParsedContent,
  platform: string,
  toolsFormat?: ToolsFormat,
): ParsedContent {
  // Clone to avoid mutating original
  const frontmatter = { ...parsed.frontmatter } as Record<string, unknown>

  // 1. Apply provider-specific overrides if present
  if (frontmatter['provider-overrides']) {
    const overrides = frontmatter['provider-overrides'] as Record<string, Record<string, unknown>>
    if (overrides[platform]) {
      Object.assign(frontmatter, overrides[platform])
    }
    delete frontmatter['provider-overrides']
  }

  // 2. Transform tools format if needed
  if (frontmatter.tools && toolsFormat) {
    frontmatter.tools = convertTools(frontmatter.tools, toolsFormat)
  }

  return {
    frontmatter: frontmatter as ParsedContent['frontmatter'],
    body: parsed.body,
  }
}

/**
 * Reconstruct markdown from frontmatter and body
 * Outputs YAML frontmatter between --- markers followed by body
 */
export function reconstructMarkdown(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const yaml = stringifyYaml(frontmatter, { lineWidth: -1 })
  return `---\n${yaml.trim()}\n---\n\n${body}\n`
}
