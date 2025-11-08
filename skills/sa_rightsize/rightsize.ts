#!/usr/bin/env -S deno run --allow-net

/**
 * RightSize Service Analyzer
 *
 * Fetches CPU/memory recommendations from RightSize API across all regions.
 * Returns structured JSON that AI agents can use to compare with deployment configs.
 *
 * Usage:
 *   deno run --allow-net rightsize.ts <app-name> <namespace>
 *
 * Example:
 *   deno run --allow-net rightsize.ts temporal-ts-general-worker app-temporal
 */

interface ResourceRecommendation {
  container: string
  requests: number | string
  limits: number | string
}

interface ContainerRecommendation {
  container: string
  cpu: {
    requests?: number
    limits?: number
  }
  memory: {
    requests?: number
    limits?: number
  }
}

interface RegionAnalysis {
  region: string
  containers: ContainerRecommendation[]
  error?: string
}

const REGIONS = ['sg', 'my', 'co.th', 'ae', 'hk']

/**
 * Normalize API response value (handle "null" string)
 */
function normalizeValue(value: number | string): number | undefined {
  if (value === 'null' || value === null || value === undefined) {
    return undefined
  }
  return typeof value === 'number' ? value : parseFloat(value)
}

/**
 * Fetch recommendations from RightSize API
 */
async function fetchRecommendations(
  region: string,
  app: string,
  namespace: string,
  resourceType: 'cpu' | 'memory',
): Promise<ResourceRecommendation[]> {
  const url = `https://rightsize-api.production.stashaway.${region}/resource-recommendation/${resourceType}?app=${app}&namespace=${namespace}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(`Failed to fetch ${resourceType} from ${region}: ${(error as Error).message}`)
  }
}

/**
 * Analyze a single region - fetch API recommendations only
 */
async function analyzeRegion(region: string, app: string, namespace: string): Promise<RegionAnalysis> {
  try {
    // Fetch CPU and memory recommendations
    const [cpuRecs, memRecs] = await Promise.all([
      fetchRecommendations(region, app, namespace, 'cpu'),
      fetchRecommendations(region, app, namespace, 'memory'),
    ])

    // Combine recommendations by container
    const containerMap = new Map<string, ContainerRecommendation>()

    // Process CPU recommendations
    for (const rec of cpuRecs) {
      if (!containerMap.has(rec.container)) {
        containerMap.set(rec.container, {
          container: rec.container,
          cpu: {},
          memory: {},
        })
      }
      const container = containerMap.get(rec.container)!
      container.cpu.requests = normalizeValue(rec.requests)
      container.cpu.limits = normalizeValue(rec.limits)
    }

    // Process memory recommendations
    for (const rec of memRecs) {
      if (!containerMap.has(rec.container)) {
        containerMap.set(rec.container, {
          container: rec.container,
          cpu: {},
          memory: {},
        })
      }
      const container = containerMap.get(rec.container)!
      container.memory.requests = normalizeValue(rec.requests)
      container.memory.limits = normalizeValue(rec.limits)
    }

    return {
      region,
      containers: Array.from(containerMap.values()),
    }
  } catch (error) {
    return {
      region,
      containers: [],
      error: (error as Error).message,
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = Deno.args

  if (args.length < 2) {
    console.error('Usage: rightsize.ts <app-name> <namespace>')
    console.error('Example: rightsize.ts temporal-ts-general-worker app-temporal')
    Deno.exit(1)
  }

  const [app, namespace] = args

  console.error(`🔍 Analyzing rightsize recommendations for ${app} in namespace ${namespace}\n`)

  // Analyze all regions
  const analyses = await Promise.all(
    REGIONS.map((region) => analyzeRegion(region, app, namespace)),
  )

  // Output results as JSON to stdout
  const result = {
    app,
    namespace,
    timestamp: new Date().toISOString(),
    regions: analyses,
  }

  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.main) {
  main()
}
