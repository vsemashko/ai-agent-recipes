import { Command } from '@cliffy/command'
import { join } from '@std/path'
import { batchConvertSkills, convertSkillFile } from '../lib/converter.ts'

export const convertCommand = new Command()
  .description('Convert skill formats (for maintainers)')
  .arguments('<skill-path:string>')
  .option('-f, --format <format:string>', 'Output format: agent-md, cursor-mdc, codex-json', {
    default: 'agent-md',
  })
  .option('-o, --output <output:string>', 'Output file path')
  .option('-b, --batch', 'Convert all skills in directory')
  .action(async (options, skillPath) => {
    try {
      const format = options.format as 'agent-md' | 'cursor-mdc' | 'codex-json'

      if (!['agent-md', 'cursor-mdc', 'codex-json'].includes(format)) {
        console.error('❌ Invalid format. Choose from: agent-md, cursor-mdc, codex-json')
        Deno.exit(1)
      }

      if (options.batch) {
        console.log(`🔄 Converting all skills to ${format}...\n`)

        const results = await batchConvertSkills(skillPath, format)

        if (results.length === 0) {
          console.log('⚠ No skills found to convert')
          return
        }

        console.log(`✓ Converted ${results.length} skill(s)\n`)

        // Output results
        if (format === 'agent-md') {
          // Combine all into single AGENTS.md
          const combined = results.map((r) => r.output).join('\n\n---\n\n')

          if (options.output) {
            await Deno.writeTextFile(options.output, combined)
            console.log(`✓ Wrote to ${options.output}`)
          } else {
            console.log(combined)
          }
        } else if (format === 'codex-json') {
          // Combine into agents array
          const agents = results.map((r) => r.output)
          const json = JSON.stringify({ agents }, null, 2)

          if (options.output) {
            await Deno.writeTextFile(options.output, json)
            console.log(`✓ Wrote to ${options.output}`)
          } else {
            console.log(json)
          }
        } else {
          // For cursor-mdc, output individual files
          for (const result of results) {
            const filename = `${result.skill}.mdc`
            const outputPath = options.output ? join(options.output, filename) : filename

            await Deno.writeTextFile(outputPath, result.output as string)
            console.log(`✓ Wrote ${filename}`)
          }
        }
      } else {
        // Single skill conversion
        console.log(`🔄 Converting skill to ${format}...\n`)

        const output = await convertSkillFile(skillPath, format)

        if (options.output) {
          if (typeof output === 'string') {
            await Deno.writeTextFile(options.output, output)
          } else {
            await Deno.writeTextFile(options.output, JSON.stringify(output, null, 2))
          }
          console.log(`✓ Wrote to ${options.output}`)
        } else {
          if (typeof output === 'string') {
            console.log(output)
          } else {
            console.log(JSON.stringify(output, null, 2))
          }
        }
      }

      console.log('\n✅ Conversion complete!')
    } catch (error) {
      console.error('❌ Conversion failed:', error.message)
      Deno.exit(1)
    }
  })
