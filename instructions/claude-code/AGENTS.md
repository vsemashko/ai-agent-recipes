# AI Agents for StashAway Agent Recipes

This file defines specialized AI agents for working on the agent-recipes repository itself.

## Skill Developer Agent

Assists with creating new skills for the agent-recipes repository.

### Usage
Invoke when: "Help me create a new skill" or "Add a skill for [purpose]"

### Capabilities
- Creates skill directory structure
- Generates SKILL.md with proper frontmatter
- Converts skill to multiple formats
- Tests skill with Claude Code
- Provides usage examples

### Workflow
1. Ask user for skill name and description
2. Create directory: `skills/{skill-name}/`
3. Generate `SKILL.md` with frontmatter:
   ```markdown
   ---
   name: skill-name
   description: Brief description
   ---
   ```
4. Create sections:
   - When to Use
   - How It Works
   - Example Usage
   - Output Format
5. Test with `agent-recipes sync`
6. Convert to other formats

---

## CLI Command Builder Agent

Helps add new commands to the agent-recipes CLI.

### Usage
Invoke when: "Add a new CLI command" or "Create command for [purpose]"

### Capabilities
- Creates command file in `cli/commands/`
- Uses Cliffy Command API
- Registers command in main.ts
- Adds options and arguments
- Implements action handler
- Provides testing instructions

### Workflow
1. Ask user for command name and purpose
2. Create `cli/commands/{command-name}.ts`
3. Import required dependencies
4. Define command with description
5. Add options and arguments
6. Implement action handler
7. Register in `cli/main.ts`
8. Test with `deno run --allow-all main.ts {command-name}`

---

## Format Converter Agent

Converts skills between different AI tool formats.

### Usage
Invoke when: "Convert skill to [format]" or "Generate [format] version"

### Capabilities
- Parses SKILL.md frontmatter and content
- Converts to AGENTS.md format
- Converts to Cursor .mdc format
- Converts to Codex JSON format
- Batch converts all skills
- Validates output format

### Supported Formats
1. **AGENTS.md**: Claude Code agent definitions
2. **Cursor MDC**: Cursor rules (.mdc files)
3. **Codex JSON**: Codex CLI agents.json

### Workflow
1. Read SKILL.md file
2. Parse frontmatter (name, description)
3. Extract content sections
4. Transform to target format
5. Write output file
6. Validate format correctness

---

## Installation Tester Agent

Tests the installation process across different scenarios.

### Usage
Invoke when: "Test installation" or "Verify install script works"

### Capabilities
- Tests fresh installation
- Tests update scenario
- Verifies PATH modification
- Checks AI tool detection
- Validates file copying/symlinking
- Tests across different shells (zsh, bash)

### Test Scenarios
1. **Fresh Install**:
   - No existing installation
   - Deno already installed
   - First-time setup

2. **Update**:
   - Existing installation
   - Config migration
   - Preserving custom settings

3. **Different Shells**:
   - zsh (macOS default)
   - bash
   - Custom shell configurations

### Workflow
1. Check current state
2. Run install.sh
3. Verify directory structure
4. Check PATH modification
5. Test CLI commands
6. Verify AI tool sync
7. Clean up test artifacts

---

## Documentation Generator Agent

Generates and updates documentation for the repository.

### Usage
Invoke when: "Update documentation" or "Generate docs for [component]"

### Capabilities
- Updates README.md with new features
- Generates command documentation
- Creates skill documentation
- Updates PLAN_claude.md
- Syncs docs across formats
- Checks for doc inconsistencies

### Documentation Types
1. **User Documentation**: README.md
2. **Developer Documentation**: CLAUDE.md
3. **Implementation Plan**: PLAN_claude.md
4. **Skill Documentation**: skills/*/README.md
5. **API Documentation**: JSDoc comments

### Workflow
1. Identify what needs documentation
2. Generate or update relevant files
3. Ensure consistency across docs
4. Validate links and references
5. Check for completeness

---

## Template Customizer Agent

Helps customize templates for repo-specific setup (currently deferred).

### Usage
Invoke when: "Customize template" or "Update [tool] template"

### Capabilities
- Maintains template variables once project-specific setup returns
- Documents expected structure for repo-level instruction files
- Coordinates with Documentation Generator to keep guidance up to date

### Status
- Project-specific templates are currently disabled
- Reactivate this agent when repo-scoped automation is reintroduced
- Monitor roadmap items in PLAN_claude.md for updates

---

## Skill Validator Agent

Validates skill definitions for correctness and completeness.

### Usage
Invoke when: "Validate skill" or "Check skill format"

### Capabilities
- Validates frontmatter format
- Checks required sections
- Verifies markdown syntax
- Tests skill invocation
- Suggests improvements
- Checks against skill guidelines

### Validation Rules
1. **Frontmatter**:
   - Has name field
   - Has description field
   - Name is lowercase-hyphenated
   - Description is concise

2. **Content**:
   - Has "When to Use" section
   - Has "How It Works" section
   - Has "Example Usage" section
   - Proper markdown formatting

3. **Completeness**:
   - Examples are clear
   - No broken references
   - Proper spelling/grammar

### Workflow
1. Read SKILL.md file
2. Parse and validate frontmatter
3. Check content structure
4. Validate markdown syntax
5. Test conversions
6. Report issues and suggestions

---

## Version Manager Agent

Manages version updates and releases.

### Usage
Invoke when: "Bump version" or "Create release"

### Capabilities
- Updates version numbers
- Creates git tags
- Generates changelog
- Updates documentation
- Creates release notes
- Validates release readiness

### Version Update Workflow
1. Determine version bump (major, minor, patch)
2. Update `cli/deno.json`
3. Update `cli/main.ts` VERSION constant
4. Update README.md if needed
5. Generate changelog from commits
6. Create git tag
7. Push to remote

---

## Integration Tester Agent

Tests integration with AI tools (Claude Code, Codex, Cursor).

### Usage
Invoke when: "Test with [tool]" or "Verify [tool] integration"

### Capabilities
- Tests Claude Code integration
- Tests Codex CLI integration
- Tests Cursor integration
- Verifies skill loading
- Tests file sync
- Validates format compatibility

### Test Workflow
1. Sync instructions for tool
2. Open tool and test skill invocation
3. Verify instructions are loaded
4. Test skill functionality
5. Check for errors or issues
6. Document compatibility notes

---

## Performance Optimizer Agent

Optimizes CLI performance and installation speed.

### Usage
Invoke when: "Optimize performance" or "Speed up [operation]"

### Capabilities
- Profiles CLI commands
- Identifies bottlenecks
- Optimizes file operations
- Improves startup time
- Reduces bundle size
- Caches expensive operations

### Optimization Areas
1. **CLI Startup**: Fast command initialization
2. **File Operations**: Efficient copying/symlinking
3. **API Calls**: Concurrent requests, caching
4. **Build Size**: Minimize compiled binary size
5. **Installation**: Quick setup process

---

## How to Use These Agents

Simply mention the agent's purpose in your request:

- "Help me create a new skill for database migrations"
- "Add a CLI command to list configurations"
- "Convert the rightsize skill to Cursor format"
- "Test the installation process"
- "Update the README with new features"

Claude will automatically understand which agent to invoke based on context.

---

*These agents make developing and maintaining agent-recipes easier and more consistent.*
