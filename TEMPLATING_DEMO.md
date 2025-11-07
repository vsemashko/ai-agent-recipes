# Templating System Implementation

This document demonstrates the new templating system implementation for the installer.

## Overview

The installer now uses a **Mustache-style templating engine** to generate AI tool-specific configurations dynamically. This provides:

- ✅ **Separation of concerns**: Templates are separate from code
- ✅ **Easy maintenance**: Edit templates without recompiling
- ✅ **Path adjustment**: Automatic path translation for different AI tools
- ✅ **Reusability**: Template partials for common sections
- ✅ **Type safety**: TypeScript interfaces for template context

## Components Implemented

### 1. TemplateRenderer (`cli/lib/template.ts`)

A lightweight Mustache-style template renderer supporting:

- **Variable substitution**: `{{variable}}`
- **Conditionals**: `{{#if condition}}...{{/if}}`
- **Loops**: `{{#each items}}...{{/each}}`

**Example:**
```typescript
const renderer = new TemplateRenderer()
const output = await renderer.render('template.mustache', {
  companyName: 'StashAway',
  skillsList: '...',
  skillCount: 2
})
```

### 2. PathAdjuster (`cli/lib/path-adjuster.ts`)

Automatically adjusts tool-specific paths when copying skills:

```typescript
const adjuster = new PathAdjuster()

// Input (from skill):
const content = "Read ~/.claude/skills/my-skill/SKILL.md"

// Output for Codex:
const adjusted = adjuster.adjustPaths(content, 'codex')
// Result: "Read ~/.codex/skills/my-skill/SKILL.md"
```

**Supported path patterns:**
- `~/.claude/skills` ↔ `~/.codex/skills`
- `~/.claude` ↔ `~/.codex`
- `$HOME/.claude/skills` ↔ `$HOME/.codex/skills`
- `$HOME/.claude` ↔ `$HOME/.codex`

### 3. Template Files

**Directory structure:**
```
instructions/
├── templates/
│   ├── agents.mustache              # AGENTS.md template (Codex)
│   └── partials/
│       ├── skills-section.mustache  # Skills section (reusable)
│       └── skills-protocol.mustache # Usage protocol (reusable)
```

**Template example** (`agents.mustache`):
```mustache
# {{companyName}} Agent Instructions

This section is managed by agent-recipes.

---

# Global Instructions

{{globalInstructions}}

---

## Available Skills

{{skillsList}}

### Examples

**Task: "Check if deployment is rightsized"**
→ Match: `rightsize` skill
→ Action: Read the rightsize SKILL.md and follow its instructions
```

### 4. Updated Installer

The installer now:

1. **Renders templates dynamically** instead of using hardcoded strings
2. **Adjusts paths** when copying skills to different AI tool directories
3. **Uses template context** to inject variables

**Before (hardcoded):**
```typescript
const managedContent = `# StashAway Agent Instructions

${claudeMdContent}

${this.buildSkillsSection(skillsList)}
`
```

**After (templated):**
```typescript
const renderer = new TemplateRenderer()
const managedContent = await renderer.render(templatePath, {
  companyName: 'StashAway',
  globalInstructions,
  skillsList,
  skillCount: results.length
})
```

## Key Changes in `installer.ts`

### Method Signature Changes

**`syncSkills()` now accepts:**
- `tool`: `'claude-code' | 'codex'` - Target AI tool
- `pathAdjuster`: Instance of `PathAdjuster`

**New method:**
- `copyDirectoryWithPathAdjustment()` - Copies files and adjusts paths in `.md` files

### Example: Syncing Codex

```typescript
private async syncCodex(repoRoot: string): Promise<void> {
  // ... setup ...

  // Render template with context
  const renderer = new TemplateRenderer()
  const managedContent = await renderer.render(templatePath, {
    companyName: 'StashAway',
    toolName: 'Codex CLI',
    globalInstructions,
    skillsList,
    skillCount: results.length,
  })

  // Sync AGENTS.md
  await this.syncManagedFile(targetFile, managedContent, 'Codex AGENTS.md')

  // Copy skills with path adjustment
  const pathAdjuster = new PathAdjuster()
  await this.syncSkills(skillsDir, targetSkillsDir, 'codex', pathAdjuster)
}
```

## Benefits

### 1. **Maintainability**
- Templates are in markdown files, easy to edit
- No need to recompile for content changes
- Version control tracks template changes separately from code

### 2. **Consistency**
- Same template structure for all AI tools
- Centralized skill section definition
- Easy to maintain consistent messaging

### 3. **Flexibility**
- Users can customize templates by overriding them
- Easy to add new template variables
- Support for conditional rendering

### 4. **Path Safety**
- Automatic path adjustment prevents broken references
- Skills work correctly regardless of target AI tool
- No manual path updates needed

## Testing

Tests have been created for both components:

1. **`template_test.ts`**: Tests template rendering with various scenarios
   - Variable substitution
   - Conditionals
   - Loops
   - Complex nested templates

2. **`path-adjuster_test.ts`**: Tests path adjustment logic
   - Claude Code → Codex
   - Codex → Claude Code
   - `$HOME` variable expansion
   - Multiple occurrences

**Run tests:**
```bash
deno test cli/lib/template_test.ts
deno test cli/lib/path-adjuster_test.ts
```

## Example: Path Adjustment in Action

**Original skill** (`skills/sa_rightsize/SKILL.md`):
```markdown
### 2. Query RightSize API

For each region, query the API at ~/.claude/skills/sa_rightsize/helpers/query.sh
```

**After sync to Claude Code** (`~/.claude/skills/sa_rightsize/SKILL.md`):
```markdown
### 2. Query RightSize API

For each region, query the API at ~/.claude/skills/sa_rightsize/helpers/query.sh
```

**After sync to Codex** (`~/.codex/skills/sa_rightsize/SKILL.md`):
```markdown
### 2. Query RightSize API

For each region, query the API at ~/.codex/skills/sa_rightsize/helpers/query.sh
```

## Future Enhancements

Possible improvements for future iterations:

1. **Template inheritance**: Allow templates to extend base templates
2. **Custom filters**: Add filters like `{{name | uppercase}}`
3. **Partials support**: Extract common sections to reusable partials
4. **Template validation**: Validate templates before rendering
5. **User template overrides**: Allow users to customize templates in `~/.config/agent-recipes/templates/`
6. **Variable configuration file**: External JSON file for template variables

## Migration Notes

Since this feature hasn't been released yet, no migration was needed. The implementation directly replaces the hardcoded template strings with the new templating system.

## Documentation Updates Needed

The following documentation should be updated:

1. **CLAUDE.md**: Add section about templating system
2. **CONTRIBUTING.md**: Add instructions for editing templates
3. **CHANGELOG.md**: Document the new templating feature
4. **README.md**: Update architecture section

---

**Summary**: The templating system provides a clean, maintainable way to generate AI tool configurations with automatic path adjustment, making it easy to support multiple AI tools without code duplication.
