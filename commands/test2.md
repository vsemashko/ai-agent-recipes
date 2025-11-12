---
name: test2
description: Test the agent recipes system with different scenarios
argument-hint: '[test-type] [parameter]'
agent: test-agent
---

# Test Command

Run test scenario: $1 with parameter: $2

## Available Test Types

### 1. sync-test

Verify that this command was synced correctly:

- Confirm command file exists in platform directory
- Show command metadata (name, description, arguments)
- Display this instruction content

### 2. agent-test

Test the linked test-agent:

- Invoke the test-agent
- Verify tool restrictions work
- Test agent instructions are followed

### 3. args-test

Test argument passing:

- Show all arguments: $ARGUMENTS
- Show first argument: $1
- Show second argument: $2
- Show third argument (if provided): $3

### 4. platform-test

Test platform-specific behavior:

- Identify which platform is running this command (Claude Code, OpenCode, or Codex)
- Show platform-specific configuration
- Verify command discovery works

## Example Usage

```bash
# Test sync
/test sync-test example-param

# Test linked agent
/test agent-test verify-tools

# Test arguments
/test args-test foo bar baz

# Test platform detection
/test platform-test
```

## Expected Behavior

This command should:

- Parse arguments correctly using $1, $2, $ARGUMENTS placeholders
- Be linked to test-agent if agent field is supported
- Be discoverable in the platform's command list
- Execute with the test scenario instructions above
