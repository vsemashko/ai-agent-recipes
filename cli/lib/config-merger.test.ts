import { assertEquals } from '@std/assert'
import { ConfigMerger } from './config-merger.ts'

Deno.test('calculateChanges ignores unchanged keys that include dots in their names', () => {
  const merger = new ConfigMerger()

  const projects = {
    '/Users/vladimir.semashko/repo/stashaway/slack-events': {
      trust_level: 'high',
      network_access: 'restricted',
    },
  }

  const oldConfig = {
    features: { test_feature: false },
    projects,
  }

  const newConfig = {
    features: { test_feature: true },
    projects: JSON.parse(JSON.stringify(projects)),
  }

  const changes = merger.calculateChanges(oldConfig, newConfig)

  assertEquals(changes.length, 1)
  assertEquals(changes[0], {
    type: 'modified',
    path: 'features.test_feature',
    oldValue: false,
    newValue: true,
  })
})

Deno.test('calculateChanges formats dotted keys using bracket notation', () => {
  const merger = new ConfigMerger()

  const newConfig = {
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/slack-events': {
        trust_level: 'high',
      },
    },
  }

  const changes = merger.calculateChanges(null, newConfig)

  const trustLevelChange = changes.find((change) => change.path.includes('trust_level'))

  assertEquals(
    trustLevelChange?.path,
    'projects["/Users/vladimir.semashko/repo/stashaway/slack-events"].trust_level',
  )
})

Deno.test('hasUserConflicts ignores parent object diffs when only new managed entries are added', () => {
  const merger = new ConfigMerger()

  const base = {
    features: { test_feature: true },
  }
  const user = {
    features: { test_feature: true },
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/slack-events': { trust_level: 'trusted' },
    },
  }
  const managed = {
    features: { test_feature: true },
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/temporal/test': { trust_level: 'trusted' },
    },
  }

  const merged = merger.threeWayMerge(base, user, managed)

  const conflicts = merger.hasUserConflicts(base, user, managed, merged)
  assertEquals(conflicts, false)
})

Deno.test('hasUserConflicts detects user edits to managed leaves', () => {
  const merger = new ConfigMerger()

  const base = {
    features: { test_feature: true },
  }
  const user = {
    features: { test_feature: false },
  }
  const managed = {
    features: { test_feature: true },
  }

  const merged = merger.threeWayMerge(base, user, managed)

  const conflicts = merger.hasUserConflicts(base, user, managed, merged)
  assertEquals(conflicts, true)
})

Deno.test('user deletions of managed fields are restored and reported', () => {
  const merger = new ConfigMerger()

  const base = {
    features: { test_feature: true },
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/slack-events': { trust_level: 'trusted' },
    },
  }
  const user = {
    features: {},
    projects: {},
  }
  const managed = {
    features: { test_feature: true },
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/slack-events': { trust_level: 'trusted' },
    },
  }

  const merged = merger.threeWayMerge(base, user, managed)
  const conflicts = merger.hasUserConflicts(base, user, managed, merged)
  const changes = merger.calculateChanges(user, merged)

  const mergedFeatures = merged.features as Record<string, unknown> | undefined
  const mergedProjects = merged.projects as Record<string, unknown> | undefined
  const restoredProject = mergedProjects?.['/Users/vladimir.semashko/repo/stashaway/slack-events'] as
    | Record<string, unknown>
    | undefined

  assertEquals(mergedFeatures?.['test_feature'], true)
  assertEquals(restoredProject?.['trust_level'], 'trusted')
  assertEquals(conflicts, true)
  assertEquals(
    changes.some((change) => change.path === 'features.test_feature' && change.type === 'added'),
    true,
  )
})

Deno.test('managed deletions drop only managed leaves while preserving custom siblings', () => {
  const merger = new ConfigMerger()

  const base = {
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/temporal/test': { trust_level: 'trusted' },
    },
  }

  const user = {
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/temporal/test': { trust_level: 'trusted' },
      '/Users/vladimir.semashko/repo/stashaway/custom/tool': { trust_level: 'custom' },
    },
  }

  const managed = {}

  const merged = merger.threeWayMerge(base, user, managed)

  assertEquals(merged, {
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/custom/tool': { trust_level: 'custom' },
    },
  })
})

Deno.test('managed deletions keep user edits on formerly managed leaves', () => {
  const merger = new ConfigMerger()

  const base = {
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/temporal/test': { trust_level: 'trusted' },
    },
  }

  const user = {
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/temporal/test': { trust_level: 'customized' },
    },
  }

  const managed = {}

  const merged = merger.threeWayMerge(base, user, managed)

  assertEquals(merged, {
    projects: {
      '/Users/vladimir.semashko/repo/stashaway/temporal/test': { trust_level: 'customized' },
    },
  })
})
