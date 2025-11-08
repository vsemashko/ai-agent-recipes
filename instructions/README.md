# Instructions Layout

All managed instruction content lives under this directory so every AI platform can share the same source of truth.

```
instructions/
├── GLOBAL_INSTRUCTIONS.md # Shared guidance embedded into all platforms
├── common/
│   └── skills.eta        # Skills section template (renders skillsList)
├── claude/
│   ├── CLAUDE.md.eta     # Generates ~/.claude/CLAUDE.md
│   └── AGENTS.md.eta     # Generates ~/.claude/AGENTS.md
├── codex/
│   └── AGENTS.md.eta     # Generates ~/.codex/AGENTS.md
└── opencode/
    └── AGENTS.md.eta     # Generates ~/.opencode/AGENTS.md
```

## Template System

### Eta Templating

We use [Eta](https://eta.js.org/) templating engine for flexible, maintainable templates:

- **Interpolation**: `<%= it.variableName %>`
- **Conditionals**: `<% if (it.condition) { %> ... <% } %>`
- **No HTML escaping**: We render markdown, not HTML

### Template Variables

Templates receive a data object with these properties:

- `it.agents`: Contents of `instructions/GLOBAL_INSTRUCTIONS.md` (global guidance)
- `it.skillsList`: Markdown list of skills (if `skillsFormat` is set)
- `it.skillsSection`: Rendered skills section template (if `skillsFormat` is set)
- `it.platform`: Platform key (e.g., 'claude', 'codex')

## Template Layering

1. **Global instructions** live in `GLOBAL_INSTRUCTIONS.md` - this is the shared baseline for all platforms
2. **Platform templates** (`{platform}/*.eta`) compose the final outputs using Eta syntax
   - Template filenames determine output filenames (e.g., `CLAUDE.md.eta` → `CLAUDE.md`)
   - Multiple templates per platform are supported
3. **Skills template** (`common/skills.eta`) provides the shared skills section boilerplate

**Example** (`codex/AGENTS.md.eta`):

```eta
<%= it.agents %>

<%= it.skillsSection %>
```

## Adding a New Platform

### 1. Create Platform Config

Add to `PLATFORM_CONFIGS` in `cli/lib/installer.ts`:

```typescript
'my-platform': {
  name: 'My Platform',
  dir: '.myplatform',              // Home directory
  skillsFormat: 'agent-md',        // Optional: convert & embed skills
  pathReplacements: {              // Optional: path adjustments
    '~/.claude': '~/.myplatform'
  }
}
```

### 2. Create Templates

Create `instructions/my-platform/AGENTS.md.eta` (or other .eta files as needed):

```eta
<%= it.agents %>

<%= it.skillsSection %>
```

### 3. Test

```bash
agent-recipes sync
# Check output in ~/.myplatform/
```

## Platform Configuration Options

### Required Fields

- `name`: Display name shown to users
- `dir`: Home directory (e.g., `.claude`, `.codex`)

### Optional Fields

- `skillsFormat`: If set to `'agent-md'`, skills are converted and embedded in templates
- `pathReplacements`: Map of path replacements applied when copying skill files

## Workflow

1. Edit `instructions/GLOBAL_INSTRUCTIONS.md` to update global guidance
2. Edit platform templates to change platform-specific structure
3. Run `agent-recipes sync` to render and sync to platform directories
4. Update `CHANGELOG.md` to document changes

## Design Principles

- **Single source of truth**: `GLOBAL_INSTRUCTIONS.md` contains shared guidance
- **Convention over configuration**: Template filenames determine output filenames (`{platform}/*.eta`)
- **Declarative platforms**: Config-driven, no platform-specific code
- **Composable templates**: Reuse shared content via Eta includes

---

_For detailed development instructions, see CLAUDE.md and CONTRIBUTING.md._
