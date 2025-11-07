import { Command } from '@cliffy/command'
import { Table } from '@cliffy/table'
import { join } from '@std/path'
import { exists } from '@std/fs'
import { Installer } from '../lib/installer.ts'

interface Skill {
  name: string
  description: string
  path: string
}

async function parseSkill(skillPath: string): Promise<Skill | null> {
  try {
    const skillFile = join(skillPath, 'SKILL.md')
    if (!await exists(skillFile)) return null

    const content = await Deno.readTextFile(skillFile)

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return null

    const frontmatter = frontmatterMatch[1]
    const nameMatch = frontmatter.match(/name:\s*(.+)/)
    const descMatch = frontmatter.match(/description:\s*(.+)/)

    if (!nameMatch || !descMatch) return null

    return {
      name: nameMatch[1].trim(),
      description: descMatch[1].trim(),
      path: skillPath,
    }
  } catch {
    return null
  }
}

async function listSkills(repoRoot: string): Promise<Skill[]> {
  const skills: Skill[] = []
  const skillsDir = join(repoRoot, 'skills')

  try {
    for await (const entry of Deno.readDir(skillsDir)) {
      if (entry.isDirectory) {
        const skillPath = join(skillsDir, entry.name)
        const skill = await parseSkill(skillPath)
        if (skill) skills.push(skill)
      }
    }
  } catch {
    // Skills directory doesn't exist or can't be read
  }

  return skills
}

export const listCommand = new Command()
  .description('List all available skills and instructions')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    console.log('📚 StashAway Agent Recipes\n')

    const installer = new Installer()
    const repoRoot = await installer.findRepositoryRoot()

    if (!repoRoot) {
      console.log('⚠ Could not locate the skills repository.')
      console.log('   Run `agent-recipes sync` to refresh your installation.')
      return
    }

    const skills = await listSkills(repoRoot)

    if (skills.length === 0) {
      console.log('⚠ No skills found')
      return
    }

    console.log(`Found ${skills.length} skill(s):\n`)

    if (options.verbose) {
      for (const skill of skills) {
        console.log(`📦 ${skill.name}`)
        console.log(`   ${skill.description}`)
        console.log(`   Path: ${skill.path}`)
        console.log()
      }
    } else {
      const table = new Table()
        .header(['Skill', 'Description'])
        .body(skills.map((s) => [s.name, s.description]))
        .border(true)

      table.render()

      console.log('\n💡 Use `agent-recipes list --verbose` for more details')
    }

    console.log('\n📖 To use these skills:')
    console.log(
      '  • Claude Code: Skills are automatically available after running `agent-recipes sync`',
    )
    console.log('  • Cursor: Project-specific instructions will return in a future release')
    console.log(
      '  • Codex: Skills are available via agents.json after running `agent-recipes sync`',
    )
  })
