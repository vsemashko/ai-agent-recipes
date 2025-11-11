import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { Installer } from './installer.ts'

type InstallerHarness = {
  syncManagedFile: (
    targetPath: string,
    managedContent: string,
    description: string,
  ) => Promise<'created' | 'updated' | null>
  skillNeedsUpdate: (
    sourcePath: string,
    targetPath: string,
    replacements?: Record<string, string>,
  ) => Promise<boolean>
}

async function withTempInstaller(
  fn: (installer: InstallerHarness, tempDir: string) => Promise<void>,
): Promise<void> {
  const tempHome = await Deno.makeTempDir()
  const tempInstallDir = join(tempHome, '.agent-recipes-test')
  const installerInstance = new Installer({ homeDir: tempHome, installDir: tempInstallDir })
  const installer = installerInstance as unknown as InstallerHarness

  try {
    await fn(installer, tempHome)
  } finally {
    await Deno.remove(tempHome, { recursive: true })
  }
}

Deno.test({
  name: 'syncManagedFile only reports when managed content actually changes',
  permissions: { read: true, write: true, env: true },
  async fn() {
    await withTempInstaller(async (installer, tempDir) => {
      const targetPath = join(tempDir, 'AGENTS.md')

      const firstResult = await installer.syncManagedFile(targetPath, 'managed v1', 'Test AGENTS.md')
      assertEquals(firstResult, 'created')

      const secondResult = await installer.syncManagedFile(targetPath, 'managed v1', 'Test AGENTS.md')
      assertEquals(secondResult, null)

      const thirdResult = await installer.syncManagedFile(targetPath, 'managed v2', 'Test AGENTS.md')
      assertEquals(thirdResult, 'updated')
    })
  },
})

Deno.test({
  name: 'skillNeedsUpdate respects path replacements and detects drifts',
  permissions: { read: true, write: true, env: true },
  async fn() {
    await withTempInstaller(async (installer, tempDir) => {
      const sourceSkill = join(tempDir, 'repo-skills', 'demo')
      const targetSkill = join(tempDir, 'user-skills', 'sa-demo')
      await Deno.mkdir(sourceSkill, { recursive: true })
      await Deno.mkdir(targetSkill, { recursive: true })

      await Deno.writeTextFile(join(sourceSkill, 'README.md'), 'Use ~/.claude for configs')
      await Deno.writeTextFile(join(targetSkill, 'README.md'), 'Use ~/.codex for configs')

      const replacements = { '~/.claude': '~/.codex' }

      const unchanged = await installer.skillNeedsUpdate(sourceSkill, targetSkill, replacements)
      assertEquals(unchanged, false)

      await Deno.writeTextFile(join(targetSkill, 'README.md'), 'Use ~/.codex with overrides')

      const changed = await installer.skillNeedsUpdate(sourceSkill, targetSkill, replacements)
      assertEquals(changed, true)
    })
  },
})
