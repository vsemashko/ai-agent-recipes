import { assertEquals, assertExists } from '@std/assert'
import { exists } from '@std/fs'
import { join } from '@std/path'
import { StateManager } from './state-manager.ts'

// Test helpers
async function createTempDir(): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'state-manager-test-' })
  return tempDir
}

async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
}

Deno.test('StateManager - initial state structure', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    const state = await stateManager.load()

    assertEquals(state.version, '1.0')
    assertEquals(state.configs, {})
    assertEquals(state.agents, {})
    assertEquals(state.commands, {})
    assertEquals(state.recipesVersion, null)
    assertExists(state.lastSync)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - persists state to disk', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setLastSyncedConfig('claude', '~/.claude/config.json', { test: true })
    await stateManager.save()

    const stateFilePath = join(tempDir, 'state.json')
    assertEquals(await exists(stateFilePath), true)

    const content = await Deno.readTextFile(stateFilePath)
    const parsedState = JSON.parse(content)
    assertEquals(parsedState.configs.claude['~/.claude/config.json'].test, true)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

// ============================================================================
// Agent Tracking Tests
// ============================================================================

Deno.test('StateManager - tracks agent filenames for platform', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedAgents('claude', ['agent1.md', 'agent2.md'])

    const retrieved = stateManager.getTrackedAgents('claude')
    assertEquals(retrieved, ['agent1.md', 'agent2.md'])
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - returns empty array for non-existent platform', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    const retrieved = stateManager.getTrackedAgents('missing-platform')
    assertEquals(retrieved, [])
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - tracks agents for multiple platforms', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedAgents('claude', ['agent1.md', 'agent2.md'])
    stateManager.setTrackedAgents('opencode', ['agent3.md'])

    const claudeAgents = stateManager.getTrackedAgents('claude')
    assertEquals(claudeAgents, ['agent1.md', 'agent2.md'])

    const opencodeAgents = stateManager.getTrackedAgents('opencode')
    assertEquals(opencodeAgents, ['agent3.md'])
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - checks if platform has tracked agents', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    assertEquals(stateManager.hasTrackedAgents('claude'), false)

    stateManager.setTrackedAgents('claude', ['agent1.md'])
    assertEquals(stateManager.hasTrackedAgents('claude'), true)
    assertEquals(stateManager.hasTrackedAgents('opencode'), false)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - updates tracked agents', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedAgents('claude', ['agent1.md', 'agent2.md'])
    assertEquals(stateManager.getTrackedAgents('claude').length, 2)

    // Update to new list
    stateManager.setTrackedAgents('claude', ['agent3.md'])
    assertEquals(stateManager.getTrackedAgents('claude'), ['agent3.md'])

    // Clear agents
    stateManager.setTrackedAgents('claude', [])
    assertEquals(stateManager.hasTrackedAgents('claude'), false)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - persists agents to disk', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedAgents('claude', ['test-agent.md', 'code-reviewer.md'])
    await stateManager.save()

    // Load in new instance
    const stateManager2 = new StateManager(tempDir)
    await stateManager2.load()

    const retrieved = stateManager2.getTrackedAgents('claude')
    assertEquals(retrieved, ['test-agent.md', 'code-reviewer.md'])
  } finally {
    await cleanupTempDir(tempDir)
  }
})

// ============================================================================
// Command Tracking Tests
// ============================================================================

Deno.test('StateManager - tracks command filenames for platform', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedCommands('claude', ['cmd1.md', 'cmd2.md'])

    const retrieved = stateManager.getTrackedCommands('claude')
    assertEquals(retrieved, ['cmd1.md', 'cmd2.md'])
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - returns empty array for non-existent platform commands', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    const retrieved = stateManager.getTrackedCommands('missing-platform')
    assertEquals(retrieved, [])
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - tracks commands for multiple platforms', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedCommands('claude', ['cmd1.md', 'cmd2.md'])
    stateManager.setTrackedCommands('opencode', ['cmd3.md'])

    const claudeCommands = stateManager.getTrackedCommands('claude')
    assertEquals(claudeCommands, ['cmd1.md', 'cmd2.md'])

    const opencodeCommands = stateManager.getTrackedCommands('opencode')
    assertEquals(opencodeCommands, ['cmd3.md'])
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - checks if platform has tracked commands', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    assertEquals(stateManager.hasTrackedCommands('claude'), false)

    stateManager.setTrackedCommands('claude', ['cmd1.md'])
    assertEquals(stateManager.hasTrackedCommands('claude'), true)
    assertEquals(stateManager.hasTrackedCommands('opencode'), false)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - updates tracked commands', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedCommands('claude', ['cmd1.md', 'cmd2.md'])
    assertEquals(stateManager.getTrackedCommands('claude').length, 2)

    // Update to new list
    stateManager.setTrackedCommands('claude', ['cmd3.md'])
    assertEquals(stateManager.getTrackedCommands('claude'), ['cmd3.md'])

    // Clear commands
    stateManager.setTrackedCommands('claude', [])
    assertEquals(stateManager.hasTrackedCommands('claude'), false)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - persists commands to disk', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedCommands('claude', ['test.md', 'fix-issue.md'])
    await stateManager.save()

    // Load in new instance
    const stateManager2 = new StateManager(tempDir)
    await stateManager2.load()

    const retrieved = stateManager2.getTrackedCommands('claude')
    assertEquals(retrieved, ['test.md', 'fix-issue.md'])
  } finally {
    await cleanupTempDir(tempDir)
  }
})

// ============================================================================
// Clear State Tests
// ============================================================================

Deno.test('StateManager - clear() resets agents and commands', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    stateManager.setTrackedAgents('claude', ['agent1.md'])
    stateManager.setTrackedCommands('claude', ['cmd1.md'])
    stateManager.setLastSyncedConfig('claude', '~/.claude/config.json', { test: true })

    stateManager.clear()

    assertEquals(stateManager.hasTrackedAgents('claude'), false)
    assertEquals(stateManager.hasTrackedCommands('claude'), false)
    assertEquals(stateManager.hasTrackedConfigs('claude'), false)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

// ============================================================================
// Integration Tests
// ============================================================================

Deno.test('StateManager - tracks configs, agents, and commands together', async () => {
  const tempDir = await createTempDir()
  try {
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    // Track config
    stateManager.setLastSyncedConfig('claude', '~/.claude/settings.json', {
      theme: 'dark',
    })

    // Track agents
    stateManager.setTrackedAgents('claude', ['code-reviewer.md', 'test-agent.md'])

    // Track commands
    stateManager.setTrackedCommands('claude', ['fix-issue.md', 'test.md'])

    await stateManager.save()

    // Reload and verify
    const stateManager2 = new StateManager(tempDir)
    await stateManager2.load()

    assertEquals(stateManager2.hasTrackedConfigs('claude'), true)
    assertEquals(stateManager2.hasTrackedAgents('claude'), true)
    assertEquals(stateManager2.hasTrackedCommands('claude'), true)

    assertEquals(stateManager2.getTrackedAgents('claude').length, 2)
    assertEquals(stateManager2.getTrackedCommands('claude').length, 2)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

Deno.test('StateManager - handles backward compatibility with missing fields', async () => {
  const tempDir = await createTempDir()
  try {
    // Write old state format (without agents/commands)
    const oldState = {
      version: '1.0',
      configs: {
        claude: {
          '~/.claude/config.json': { test: true },
        },
      },
      recipesVersion: '0.1.0',
      lastSync: new Date().toISOString(),
    }

    const stateFilePath = join(tempDir, 'state.json')
    await Deno.writeTextFile(stateFilePath, JSON.stringify(oldState, null, 2))

    // Load with new StateManager
    const stateManager = new StateManager(tempDir)
    await stateManager.load()

    // Should handle missing fields gracefully
    assertEquals(stateManager.hasTrackedAgents('claude'), false)
    assertEquals(stateManager.hasTrackedCommands('claude'), false)
    assertEquals(stateManager.getTrackedAgents('claude'), [])
    assertEquals(stateManager.getTrackedCommands('claude'), [])

    // Should still have old data
    assertEquals(stateManager.hasTrackedConfigs('claude'), true)
  } finally {
    await cleanupTempDir(tempDir)
  }
})

