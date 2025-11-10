import { Command } from '@cliffy/command'
import { Confirm, Select } from '@cliffy/prompt'
import { format, increment, parse } from '@std/semver'
import denoConfig from './deno.json' with { type: 'json' }

const textDecoder = new TextDecoder()
const releaseTypes = ['patch', 'minor', 'major'] as const
type ReleaseType = typeof releaseTypes[number]

new Command()
  .name('release')
  .description('Release workflow for agent-recipes')
  .option('--dry-run', 'Print mutations without executing them')
  .option('--no-git-check', 'Skip git branch/clean checks')
  .option('--skip-tests', 'Skip fmt/lint/test verification')
  .arguments('[version:string]')
  .action(async ({ dryRun, gitCheck, skipTests }, versionArg?: string) => {
    if (!skipTests) {
      await runCommand(['deno', 'fmt'])
      await runCommand(['deno', 'fmt', '--check'])
      await runCommand(['deno', 'lint'])
      await runCommand(['deno', 'task', 'test'])
    }

    const branch = await getCurrentBranch()
    const onMain = branch === 'main'
    if (!onMain) {
      console.warn(
        `⚠️  Current branch ${branch ?? '(unknown)'} is not main. Release files will be updated but commits/tags are your responsibility.`,
      )
    }

    if (gitCheck) {
      const status = (await runText(['git', 'status', '--porcelain'])).trim()
      if (status.length > 0) {
        console.error('Working tree is dirty. Commit or stash changes first.')
        console.error(status)
        Deno.exit(1)
      }
    }

    const currentVersion = parseVersion(denoConfig.version)
    const targetVersion = versionArg ? parseVersion(versionArg) : await chooseNextVersion(currentVersion)

    const confirmed = await Confirm.prompt({
      message: `Release ${format(currentVersion)} → ${format(targetVersion)}?`,
      default: true,
    })
    if (!confirmed) {
      console.log('Aborted')
      Deno.exit(0)
    }

    await updateDenoJson(format(targetVersion), dryRun)
    const notes = await updateChangelog({
      currentVersion: denoConfig.version,
      nextVersion: format(targetVersion),
    }, dryRun)
    await runCommand(['deno', 'fmt', 'CHANGELOG.md'])

    if (onMain) {
      await commitAndTag(format(targetVersion), dryRun)
      console.log('\nRelease ready!')
      console.log('Next steps:')
      console.log('  1. git push && git push --tags')
      console.log('  2. Publish release notes if needed')
    } else {
      console.log('\nRelease files prepared (manual commit required).')
      console.log('Next steps:')
      console.log('  1. Review deno.json and CHANGELOG.md')
      console.log('  2. Commit the updates on your feature branch')
      console.log('  3. Tag the release on main once merged (e.g., git tag <version>)')
    }
    console.log(`\nChangelog entry:\n${notes}`)
  })
  .parse(Deno.args)

function parseVersion(input: string) {
  const parsed = parse(input)
  if (!parsed) {
    throw new Error(`Invalid semver: ${input}`)
  }
  return parsed
}

async function chooseNextVersion(currentVersion: ReturnType<typeof parse>) {
  const selection = await Select.prompt<ReleaseType>({
    message: `Current version ${format(currentVersion)}. Select release type:`,
    options: releaseTypes.map((type) => ({ name: type, value: type })),
    default: 'patch',
  })
  return increment(currentVersion, selection)
}

async function updateDenoJson(newVersion: string, dryRun: boolean) {
  console.log(`\n▶ Updating deno.json to ${newVersion}`)
  if (dryRun) return
  const nextConfig = { ...denoConfig, version: newVersion }
  await Deno.writeTextFile('deno.json', JSON.stringify(nextConfig, null, 2) + '\n')
}

async function updateChangelog(
  { currentVersion, nextVersion }: { currentVersion: string; nextVersion: string },
  dryRun: boolean,
) {
  const changes = await collectCommitMessages(currentVersion)
  if (!changes) {
    console.warn('No commits found since last release; skipping changelog update')
    return ''
  }

  const edited = await editInEditor(changes)
  const trimmed = edited.trim() || '- Internal maintenance'

  const changelog = await readChangelog()
  const entry = [`## ${nextVersion}`, trimmed].join('\n\n')
  const base = changelog.includes('# Changelog') ? changelog : ['# Changelog', '', changelog.trimStart()].join('\n')
  const updated = base.replace('# Changelog', ['# Changelog', '', entry].join('\n'))

  if (!dryRun) {
    await Deno.writeTextFile('CHANGELOG.md', updated.trimEnd() + '\n')
  }

  console.log('\nUpdated changelog entry:\n')
  console.log(entry)
  return entry
}

async function collectCommitMessages(reference: string) {
  const range = `${reference}..HEAD`
  let logOutput = ''
  try {
    logOutput = await runText(['git', 'log', range, '--pretty=%B'])
  } catch {
    logOutput = await runText(['git', 'log', '--pretty=%B'])
  }

  return logOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('Release '))
    .map((line) => `- ${line}`)
    .join('\n')
}

async function editInEditor(initial: string) {
  const tempDir = await Deno.makeTempDir()
  const filePath = `${tempDir}/changes.md`
  await Deno.writeTextFile(filePath, initial)

  const editor = Deno.env.get('EDITOR') || 'nano'
  const [cmd, ...args] = editor.split(' ')
  try {
    await runCommand([cmd, ...args, filePath])
    return await Deno.readTextFile(filePath)
  } catch (error) {
    console.warn(`Editor failed (${editor}): ${error}`)
    console.warn('Using generated notes instead.')
    return initial
  }
}

async function readChangelog() {
  try {
    return await Deno.readTextFile('CHANGELOG.md')
  } catch {
    return '# Changelog\n'
  }
}

async function commitAndTag(version: string, dryRun: boolean) {
  console.log(`\n▶ Committing and tagging ${version}`)
  if (dryRun) {
    console.log(`(dry-run) git commit -m "Release ${version}" -- deno.json CHANGELOG.md`)
    console.log(`(dry-run) git tag ${version}`)
    return
  }
  await runCommand(['git', 'commit', '-m', `Release ${version}`, '--', 'deno.json', 'CHANGELOG.md'])
  await runCommand(['git', 'tag', version])
}

async function getCurrentBranch(): Promise<string | null> {
  try {
    return (await runText(['git', 'branch', '--show-current'])).trim()
  } catch {
    return null
  }
}

async function runCommand(cmd: string[], options: { allowFail?: boolean } = {}) {
  // Use piped stdio so we can capture outputs for error messages. We will echo
  // them to the console to preserve visibility similar to 'inherit'.
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: 'piped',
    stderr: 'piped',
  })
  const result = await command.output()
  const out = textDecoder.decode(result.stdout)
  const err = textDecoder.decode(result.stderr)
  if (out) console.log(out.trimEnd())
  if (err) console.error(err.trimEnd())
  if (!result.success && !options.allowFail) {
    throw new Error(`Command "${cmd.join(' ')}" failed${err ? `: ${err}` : ''}`)
  }
  return result
}

async function runText(cmd: string[]) {
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: 'piped',
    stderr: 'piped',
  })
  const result = await command.output()
  if (!result.success) {
    const stderr = textDecoder.decode(result.stderr)
    throw new Error(`Command "${cmd.join(' ')}" failed${stderr ? `: ${stderr}` : ''}`)
  }
  return textDecoder.decode(result.stdout)
}
