import { assertEquals, assertExists } from '@std/assert'
import { convertTools, parseFrontmatter, processContentForPlatform, reconstructMarkdown } from './agents-commands-converter.ts'

Deno.test('parseFrontmatter - valid agent', () => {
  const content = `---
name: test-agent
description: A test agent
tools: Read, Write
model: sonnet
---

# Agent Body

This is the agent body.`

  const result = parseFrontmatter(content)

  assertExists(result)
  assertEquals(result.frontmatter.name, 'test-agent')
  assertEquals(result.frontmatter.description, 'A test agent')
  assertEquals(result.frontmatter.tools, 'Read, Write')
  assertEquals(result.frontmatter.model, 'sonnet')
  assertEquals(result.body, '# Agent Body\n\nThis is the agent body.')
})

Deno.test('parseFrontmatter - missing required fields', () => {
  const content = `---
name: test-agent
---

Body`

  const result = parseFrontmatter(content)
  assertEquals(result, null)
})

Deno.test('parseFrontmatter - invalid format', () => {
  const content = 'Not valid markdown frontmatter'
  const result = parseFrontmatter(content)
  assertEquals(result, null)
})

Deno.test('parseFrontmatter - valid command', () => {
  const content = `---
name: fix-issue
description: Fix a coding issue
argument-hint: "[issue-number]"
model: claude-sonnet-4
---

Fix issue #$ARGUMENTS`

  const result = parseFrontmatter(content)

  assertExists(result)
  assertEquals(result.frontmatter.name, 'fix-issue')
  assertEquals(result.frontmatter.description, 'Fix a coding issue')
  assertEquals(result.frontmatter['argument-hint'], '[issue-number]')
  assertEquals(result.body, 'Fix issue #$ARGUMENTS')
})

Deno.test('parseFrontmatter - with agent link', () => {
  const content = `---
name: review-pr
description: Review pull request
agent: code-reviewer
---

Review PR #$1`

  const result = parseFrontmatter(content)

  assertExists(result)
  assertEquals(result.frontmatter.agent, 'code-reviewer')
})

Deno.test('parseFrontmatter - generic function works for agents', () => {
  const content = `---
name: test-agent
description: Test agent
---

Body`

  const result = parseFrontmatter(content)
  assertExists(result)
  assertEquals(result.frontmatter.name, 'test-agent')
  assertEquals(result.frontmatter.description, 'Test agent')
})

Deno.test('parseFrontmatter - generic function works for commands', () => {
  const content = `---
name: test-command
description: Test command
---

Body`

  const result = parseFrontmatter(content)
  assertExists(result)
  assertEquals(result.frontmatter.name, 'test-command')
  assertEquals(result.frontmatter.description, 'Test command')
})

Deno.test('convertTools - string to object', () => {
  const result = convertTools('Read, Grep, Bash', 'object')
  assertEquals(result, { read: true, grep: true, bash: true })
})

Deno.test('convertTools - string to array', () => {
  const result = convertTools('Read, Grep, Bash', 'array')
  assertEquals(result, ['read', 'grep', 'bash'])
})

Deno.test('convertTools - string to string (normalizes capitalization)', () => {
  const result = convertTools('read, GREP, BaSh', 'string')
  assertEquals(result, 'Read, Grep, Bash')
})

Deno.test('convertTools - object to string', () => {
  const result = convertTools({ read: true, grep: true, bash: true }, 'string')
  assertEquals(result, 'Read, Grep, Bash')
})

Deno.test('convertTools - object to array', () => {
  const result = convertTools({ read: true, grep: false, bash: true }, 'array')
  assertEquals(result, ['read', 'bash']) // Only true values
})

Deno.test('convertTools - array to object', () => {
  const result = convertTools(['read', 'grep', 'bash'], 'object')
  assertEquals(result, { read: true, grep: true, bash: true })
})

Deno.test('convertTools - array to string', () => {
  const result = convertTools(['read', 'grep', 'bash'], 'string')
  assertEquals(result, 'Read, Grep, Bash')
})

Deno.test('convertTools - handles empty input', () => {
  assertEquals(convertTools('', 'object'), {})
  assertEquals(convertTools('', 'array'), [])
  assertEquals(convertTools([], 'object'), {})
  assertEquals(convertTools({}, 'array'), [])
})

Deno.test('convertTools - filters out false values in object', () => {
  const result = convertTools({ read: true, write: false, edit: true }, 'array')
  assertEquals(result, ['read', 'edit'])
})

Deno.test('processContentForPlatform - transforms tools for OpenCode', () => {
  const parsed = {
    frontmatter: {
      name: 'test',
      description: 'Test',
      tools: 'Read, Grep',
    },
    body: 'Body',
  }

  const result = processContentForPlatform(parsed, 'opencode', 'object')
  assertEquals(result.frontmatter.tools, { read: true, grep: true })
})

Deno.test('processContentForPlatform - keeps tools as string for Claude', () => {
  const parsed = {
    frontmatter: {
      name: 'test',
      description: 'Test',
      tools: { read: true, grep: true },
    },
    body: 'Body',
  }

  const result = processContentForPlatform(parsed, 'claude', 'string')
  assertEquals(result.frontmatter.tools, 'Read, Grep')
})

Deno.test('processContentForPlatform - converts array to appropriate format', () => {
  const parsed = {
    frontmatter: {
      name: 'test',
      description: 'Test',
      tools: ['read', 'grep', 'bash'],
    },
    body: 'Body',
  }

  const claudeResult = processContentForPlatform(parsed, 'claude', 'string')
  assertEquals(claudeResult.frontmatter.tools, 'Read, Grep, Bash')

  const opencodeResult = processContentForPlatform(parsed, 'opencode', 'object')
  assertEquals(opencodeResult.frontmatter.tools, { read: true, grep: true, bash: true })
})

Deno.test('processContentForPlatform - Claude keeps tools as string', () => {
  const parsed = {
    frontmatter: {
      name: 'test-agent',
      description: 'Test',
      tools: 'Read, Write',
      model: 'sonnet',
    },
    body: 'Agent body',
  }

  const result = processContentForPlatform(parsed, 'claude', 'string')

  assertEquals(result.frontmatter.tools, 'Read, Write')
  assertEquals(result.frontmatter.name, 'test-agent')
})

Deno.test('processContentForPlatform - OpenCode transforms tools to object', () => {
  const parsed = {
    frontmatter: {
      name: 'test-agent',
      description: 'Test',
      tools: 'Read, Grep, Bash',
      model: 'sonnet',
    },
    body: 'Agent body',
  }

  const result = processContentForPlatform(parsed, 'opencode', 'object')

  assertEquals(result.frontmatter.tools, {
    read: true,
    grep: true,
    bash: true,
  })
  // OpenCode uses frontmatter for name, so it should be kept
  assertEquals(result.frontmatter.name, 'test-agent')
})

Deno.test('processContentForPlatform - applies provider overrides', () => {
  const parsed = {
    frontmatter: {
      name: 'test-agent',
      description: 'Test',
      model: 'default-model',
      'provider-overrides': {
        claude: {
          model: 'claude-override',
          temperature: 0.7,
        },
        opencode: {
          model: 'opencode-override',
        },
      },
    },
    body: 'Agent body',
  }

  const claudeResult = processContentForPlatform(parsed, 'claude', 'string')
  assertEquals(claudeResult.frontmatter.model, 'claude-override')
  assertEquals(claudeResult.frontmatter.temperature, 0.7)
  assertEquals(claudeResult.frontmatter['provider-overrides'], undefined)

  const opencodeResult = processContentForPlatform(parsed, 'opencode', 'object')
  assertEquals(opencodeResult.frontmatter.model, 'opencode-override')
  assertEquals(opencodeResult.frontmatter.temperature, undefined)
})

Deno.test('processContentForPlatform - provider overrides with tools transformation', () => {
  const parsed = {
    frontmatter: {
      name: 'test-agent',
      description: 'Test',
      tools: 'Read, Write',
      'provider-overrides': {
        opencode: {
          model: 'anthropic/claude-3-5-sonnet',
        },
      },
    },
    body: 'Agent body',
  }

  const result = processContentForPlatform(parsed, 'opencode', 'object')

  assertEquals(result.frontmatter.model, 'anthropic/claude-3-5-sonnet')
  assertEquals(result.frontmatter.tools, {
    read: true,
    write: true,
  })
})

Deno.test('processContentForPlatform - applies transformations to commands', () => {
  const parsed = {
    frontmatter: {
      name: 'test-command',
      description: 'Test command',
      tools: 'Read, Grep',
    },
    body: 'Command body',
  }

  const opencodeResult = processContentForPlatform(parsed, 'opencode', 'object')
  assertEquals(opencodeResult.frontmatter.tools, {
    read: true,
    grep: true,
  })
  assertEquals(opencodeResult.frontmatter.name, 'test-command')
})

Deno.test('processContentForPlatform - preserves other fields', () => {
  const parsed = {
    frontmatter: {
      name: 'test-command',
      description: 'Test',
      'argument-hint': '[arg1] [arg2]',
      'allowed-tools': 'Bash(git:*)',
      agent: 'code-reviewer',
    },
    body: 'Command body',
  }

  const result = processContentForPlatform(parsed, 'claude', 'string')

  assertEquals(result.frontmatter['argument-hint'], '[arg1] [arg2]')
  assertEquals(result.frontmatter['allowed-tools'], 'Bash(git:*)')
  assertEquals(result.frontmatter.agent, 'code-reviewer')
})

Deno.test('reconstructMarkdown - creates valid frontmatter', () => {
  const frontmatter = {
    name: 'test-agent',
    description: 'Test agent',
    tools: 'Read, Write',
    model: 'sonnet',
  }
  const body = '# Agent Body\n\nThis is the body.'

  const result = reconstructMarkdown(frontmatter, body)

  // Should have frontmatter delimiters
  assertEquals(result.startsWith('---\n'), true)
  assertEquals(result.includes('\n---\n'), true)

  // Should contain the body
  assertEquals(result.includes('# Agent Body'), true)
  assertEquals(result.includes('This is the body.'), true)

  // Should be parseable
  const reparsed = parseFrontmatter(result)
  assertExists(reparsed)
  assertEquals(reparsed.frontmatter.name, 'test-agent')
  assertEquals(reparsed.frontmatter.description, 'Test agent')
})

Deno.test('reconstructMarkdown - handles complex frontmatter', () => {
  const frontmatter = {
    name: 'complex-agent',
    description: 'Complex test',
    tools: {
      read: true,
      write: true,
      grep: true,
    },
    'argument-hint': '[arg1] [arg2]',
    model: 'anthropic/claude-3-5-sonnet',
  }
  const body = 'Complex body content'

  const result = reconstructMarkdown(frontmatter, body)
  const reparsed = parseFrontmatter(result)

  assertExists(reparsed)
  assertEquals(reparsed.frontmatter.name, 'complex-agent')
  assertEquals(reparsed.frontmatter.tools, {
    read: true,
    write: true,
    grep: true,
  })
})

Deno.test('end-to-end - parse, process, reconstruct for Claude', () => {
  const original = `---
name: e2e-agent
description: End to end test
tools: Read, Grep, Glob
model: sonnet
provider-overrides:
  claude:
    model: claude-sonnet-4
---

# E2E Agent

Test agent body.`

  const parsed = parseFrontmatter(original)
  assertExists(parsed)

  const processed = processContentForPlatform(parsed, 'claude', 'string')
  const reconstructed = reconstructMarkdown(processed.frontmatter, processed.body)

  const final = parseFrontmatter(reconstructed)
  assertExists(final)

  assertEquals(final.frontmatter.model, 'claude-sonnet-4')
  assertEquals(final.frontmatter.tools, 'Read, Grep, Glob')
  assertEquals(final.frontmatter['provider-overrides'], undefined)
  assertEquals(final.body.includes('# E2E Agent'), true)
})

Deno.test('end-to-end - parse, process, reconstruct for OpenCode', () => {
  const original = `---
name: e2e-agent
description: End to end test
tools: Read, Bash
model: sonnet
provider-overrides:
  opencode:
    model: anthropic/claude-3-5-sonnet-20241022
    temperature: 0.8
---

# E2E Agent

Test agent body.`

  const parsed = parseFrontmatter(original)
  assertExists(parsed)

  const processed = processContentForPlatform(parsed, 'opencode', 'object')
  const reconstructed = reconstructMarkdown(processed.frontmatter, processed.body)

  const final = parseFrontmatter(reconstructed)
  assertExists(final)

  assertEquals(final.frontmatter.model, 'anthropic/claude-3-5-sonnet-20241022')
  assertEquals(final.frontmatter.temperature, 0.8)
  assertEquals(final.frontmatter.tools, {
    read: true,
    bash: true,
  })
  assertEquals(final.frontmatter.name, 'e2e-agent')
})
