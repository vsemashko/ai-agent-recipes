# Conflict Resolution Analysis

## How Conflict Resolution Works

### Hash-Based Protection (`syncFileWithHash`)

The system uses SHA-256 hashes to track file changes:

```typescript
sourceHash = hash(repo_version)      // What we want to sync
targetHash = hash(user_version)      // What user currently has
previousHash = config.fileHashes[key] // What we synced last time
```

**Decision Tree:**

```
1. Target doesn't exist?
   → Write directly, save hash ✅

2. targetHash == sourceHash?
   → Already in sync, skip ✅

3. previousHash exists && targetHash != previousHash?
   → User modified since our last sync! 🔍
   → Prompt: "has local changes. Overwrite?" (default: NO)
   → NO: Keep user changes, don't update hash
   → YES: Overwrite with repo, save new hash

4. No previousHash && targetHash != sourceHash?
   → File exists but we never synced it before 🔍
   → Prompt: "already exists. Replace?" (default: NO)
   → NO: Keep existing file, don't save hash
   → YES: Overwrite with repo, save hash
```

---

## Scenario Analysis

### ✅ Scenario 1: Missing Folders

**What happens:**
```typescript
// Both Claude Code and Codex
await Deno.mkdir(targetPath, { recursive: true })
```

**Result:**
- Creates all parent directories automatically
- No conflicts, works smoothly
- Safe operation

---

### ⚠️ Scenario 2: User Has Custom Skills We Don't Have

#### For Claude Code:

**Current behavior:**
```typescript
// cli/lib/installer.ts:186-196
if (await exists(skillsTarget)) {
  await Deno.remove(skillsTarget, { recursive: true })  // ⚠️ DELETES!
}
await Deno.symlink(skillsSource, skillsTarget, { type: 'dir' })
```

**Problem:**
- Completely removes `~/.config/claude-code/skills/` directory
- Replaces with symlink to our repo's `skills/` directory
- **User custom skills are LOST!** ❌

**Example:**
```
Before sync:
~/.config/claude-code/skills/
  ├── rightsize/          (our skill)
  ├── commit-message/     (our skill)
  └── my-custom-skill/    (user's skill)

After sync:
~/.config/claude-code/skills/ → symlink to repo
  ├── rightsize/          (our skill)
  └── commit-message/     (our skill)
  ❌ my-custom-skill is GONE!
```

#### For Codex:

**Current behavior:**
```typescript
// cli/lib/installer.ts:230
const results = await batchConvertSkills(skillsDir, 'agent-md')
// Only reads from repo skills, ignores user skills
```

**Protection:**
```typescript
// cli/lib/installer.ts:242-249
await this.syncFileWithHash(
  'generated',
  targetFile,
  config,
  'codex/AGENTS.md',
  'Codex AGENTS.md',
  combined  // Only contains our skills
)
```

**Scenario A - User added custom skills to AGENTS.md:**
```
User's AGENTS.md has:
- Our skills (rightsize, commit-message)
- Their custom skill (database-migration)

Our generated AGENTS.md has:
- Only our skills (rightsize, commit-message)

targetHash != sourceHash
→ Prompt: "Codex AGENTS.md has local changes. Overwrite?"
→ Default: NO ✅
→ User sees their custom skills would be lost, declines
```

**Scenario B - User hasn't modified AGENTS.md:**
```
→ Overwrites silently (no custom content to lose)
```

---

### ✅ Scenario 3: User Modified Global Config Files

#### Claude Code CLAUDE.md

**User edits `~/.config/claude-code/CLAUDE.md`:**

```typescript
// First sync after user edits
targetHash = hash(user_edited_content)
previousHash = hash(our_last_sync)

targetHash != previousHash  // Detected! 🔍
→ Prompt: "Claude Code CLAUDE.md has local changes. Overwrite?"
→ Default: NO ✅
→ User keeps their customizations
```

**If user says NO:**
- File unchanged
- Hash NOT updated in config
- Next sync will prompt again

**If user says YES:**
- Overwrites with repo version
- Hash updated
- Future syncs won't prompt (unless they edit again)

#### Codex AGENTS.md

**Same protection as CLAUDE.md:**

```typescript
// User added custom instructions
targetHash = hash(user_version_with_custom_content)
sourceHash = hash(generated_from_repo)

targetHash != previousHash
→ Prompt: "Codex AGENTS.md has local changes. Overwrite?"
→ Default: NO ✅
```

---

## Summary Matrix

| Scenario | Claude Code | Codex | Protected? |
|----------|-------------|-------|------------|
| **Missing folders** | ✅ Created | ✅ Created | N/A |
| **Missing source files** | ⚠️ Logs warning, skips | ⚠️ Logs warning, skips | N/A |
| **User modified CLAUDE.md** | ✅ Prompts (default: NO) | N/A | ✅ YES |
| **User modified AGENTS.md** | N/A | ✅ Prompts (default: NO) | ✅ YES |
| **User has custom skills** | ❌ **DELETED!** | ⚠️ Lost if overwrites | ❌ NO |

---

## 🚨 Critical Issue: Custom Skills Not Protected

### The Problem

**For Claude Code:**
- Skills directory is replaced entirely with symlink
- No hash tracking for directories
- No prompt before deletion
- **User loses custom skills without warning**

**For Codex:**
- AGENTS.md regenerated from repo skills only
- Hash tracking provides warning
- But no way to preserve custom skills even if user declines

### Recommended Solutions

#### Option 1: Copy Instead of Symlink (Safer)
```typescript
// Instead of symlink, copy files
for (const skill in repoSkills) {
  if (!exists(targetSkill)) {
    copy(skill, targetSkill)  // Only add new skills
  } else {
    // Prompt or skip - user's choice
  }
}
```

**Pros:**
- User can add custom skills
- We only update skills that exist in repo
- User skills preserved

**Cons:**
- Not auto-updated when repo changes
- More complex logic

#### Option 2: Separate Directories
```typescript
~/.config/claude-code/
  ├── skills/           (user's custom skills)
  └── skills-repo/      (symlinked from repo)
```

**Pros:**
- Clear separation
- Both can coexist
- Updates don't affect custom skills

**Cons:**
- Claude Code needs to read from both
- More complex setup

#### Option 3: Document the Limitation
```markdown
## Custom Skills

To add custom skills:
1. Fork the repository
2. Add your skill to skills/
3. Point your installation to your fork

OR

Contribute your skill to the main repo!
```

**Pros:**
- Simple implementation
- Encourages contributions

**Cons:**
- Less flexible for users
- May discourage experimentation

---

## Current Best Practice

**For users who want custom skills:**

1. **Fork the repository** to their own GitLab/GitHub
2. **Add custom skills** to `skills/` in their fork
3. **Point installation** to their fork
4. **Sync** from their fork instead

This way:
- Custom skills are in version control
- Updates from upstream can be merged
- Skills are shared with team if desired
