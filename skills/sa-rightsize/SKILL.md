---
name: rightsize
description: Update Kubernetes deployment resources to match RightSize API recommendations for optimal cost and performance
---

# RightSize Resource Optimizer

## When to Use

Check and update CPU/memory resources for Kubernetes deployments based on actual usage data.

## How It Works

### 1. Extract Service Info

- `project_namespace` from `.gitlab-ci.yml` (`include.inputs.project_namespace`)
- App name from `fullnameOverride` in `/deploy/base/values.yaml`

### 2. Fetch Recommendations

```bash
bash ~/.claude/skills/sa-rightsize/rightsize.sh <app-name> <namespace>
```

**Example:**

```bash
bash ~/.claude/skills/sa-rightsize/rightsize.sh temporal-funding-worker funding
```

```bash
bash ~/.claude/skills/sa-rightsize/rightsize.sh temporal-ts-general-worker default
```

**Returns:**

```json
{
  "app": "temporal-funding-worker",
  "namespace": "funding",
  "regions": [
    {
      "region": "sg",
      "containers": [
        {
          "container": "temporal-funding-worker",
          "cpu": {
            "requests": 0.61
          },
          "memory": {
            "requests": 236,
            "limits": 272
          }
        },
        {
          "container": "istio-proxy",
          "cpu": {
            "requests": 0.048
          },
          "memory": {
            "requests": 249,
            "limits": 287
          }
        }
      ]
    },
    {
      "region": "my",
      "containers": [],
      "error": "Failed to fetch: client error (Connect): tls handshake eof"
    }
  ]
}
```

### 3. Update Logic

Compare current values with recommendations:

- **Update if current > recommended + 30%** (over-provisioned)
- **Always update if current < recommended** (under-provisioned)
- **Keep if within 30% threshold** (acceptable range)

Apply changes to:

- `/deploy/base/values.yaml` - base configuration
- `/deploy/{region}-{env}/values.yaml` - region-specific overrides

Round values to clean numbers (e.g., 0.605 → 0.6 or 0.65).

### 4. Commit Changes

```
chore: Rightsize resources for <app-name>

 - adjust CPU and memory based on actual usage to optimize costs and performance.
- sg-production: CPU requests 2.0 → 0.65 (-68%), memory limits 3Gi → 2Gi (-33%)
- my-production: memory requests 1.5Gi → 1.2Gi (-20%)
```

## Example Flow

```
User: Rightsize this service

Agent:
1. Extracts: app=funding-server, namespace=funding from configs
2. Runs: bash rightsize.sh funding-server funding
3. Reads current values from deploy/*/values.yaml
4. Compares: sg CPU 2.0 vs recommended 0.65 → 208% over → UPDATE
5. Shows summary with % savings
6. Asks: "Update deployment files and commit?"
7. If yes: updates files, creates commit
```

## Output Format

```
RightSize Analysis: funding-server (namespace: funding)

sg-production:
  funding-server:
    CPU requests: 2.0 → 0.65 (-68%) ⚠️ UPDATE
    Memory requests: 1.5Gi → 1.2Gi (-20%) ✅ OK
  istio-proxy:
    CPU requests: 250m → 48m (-81%) ⚠️ UPDATE

my-production:
  ✅ All resources within acceptable range

Potential savings: ~65% CPU, ~15% memory

Apply changes? (yes/no)
```

## Important Notes

- Always query all regions for complete analysis
- Extract ticket number from branch name if available
- Never reduce resources that are already under-provisioned
