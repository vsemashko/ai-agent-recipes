---
name: rightsize
description: Check if the Kubernetes deployment resources for the service match the RightSize API recommendations, and update the configurations if they don’t
---

# RightSize Resource Checker

## When to Use

Use this skill when you need to:

- Check if a service's CPU/memory resources are appropriately sized
- Update Kubernetes deployment configurations based on usage recommendations
- Audit resource allocation across services
- Optimize infrastructure costs

## How It Works

### 1. Extract Project Information

- Find `project_namespace` in `.gitlab-ci.yml` (under `include.inputs.project_namespace`)
- Find app name from `fullnameOverride` in deploy folder (usually `/deploy/base/values.yaml`)

### 2. Run RightSize Analysis Script

**Use the provided script to fetch API recommendations:**

```bash
deno run --allow-net ~/.claude/skills/sa_rightsize/rightsize.ts <app-name> <namespace>
```

**Example:**

```bash
deno run --allow-net ~/.claude/skills/sa_rightsize/rightsize.ts temporal-ts-general-worker app-temporal
```

**The script:**

- Queries RightSize API for all regions (sg, my, co.th, ae, hk)
- Fetches both CPU and memory recommendations for each region
- Returns structured JSON with all recommendations
- Handles API errors gracefully (e.g., regions behind VPN)

**Output Format:**

```json
{
  "app": "funding-server",
  "namespace": "funding",
  "timestamp": "2025-01-09T10:30:00Z",
  "regions": [
    {
      "region": "sg",
      "containers": [
        {
          "container": "funding-server",
          "cpu": {
            "requests": 0.385
          },
          "memory": {
            "requests": 234,
            "limits": 270
          }
        },
        {
          "container": "istio-proxy",
          "cpu": {
            "requests": 0.073
          },
          "memory": {
            "requests": 254,
            "limits": 293
          }
        }
      ]
    },
    {
      "region": "my",
      "containers": [],
      "error": "Failed to fetch cpu from my: ..."
    }
  ]
}
```

**Note:** The script only fetches recommendations. The AI agent should:

- Read current deployment configs from values.yaml files
- Compare current values with recommendations
- Calculate savings percentages
- Determine if resources are optimal/over-provisioned/under-provisioned

### 3. Analyze Results and Present to User

Parse the JSON output and present findings in a user-friendly format (see Output Format section below)

### 4. Update Resources and Commit Changes

**This skill should automatically update files and commit changes** (not just recommend):

1. **Update values.yaml files**:
   - Modify `/deploy/base/values.yaml` and/or `/deploy/{region}-{env}/values.yaml`
   - Update `resources.requests` and `resources.limits` for main container
   - Update `istio.sidecar.resources.requests` and `istio.sidecar.resources.limits` if present
   - Apply rounding where appropriate (round up to clean numbers)
   - Preserve existing values if within 30% tolerance

2. **Commit the changes**:
   - Create a commit with message following StashAway conventions
   - Use format: `chore: <ticket-number> Right-size resources for <app-name>`
   - Include details in commit body about what was changed and why
   - Example commit message:
     ```
     chore: SA-1234 Right-size resources for temporal-ts-general-worker

     Updated CPU and memory allocations based on RightSize API recommendations:
     - Main container: CPU requests 2.0 → 0.61 (69% reduction)
     - Istio proxy: Memory limits 1Gi → 230Mi (77% reduction)

     Changes applied to sg-production deployment.
     ```

3. **User confirmation**:
   - Show summary of changes before applying
   - Ask for confirmation: "Apply these changes and commit?"
   - If user confirms, update files and create commit
   - If user declines, only show recommendations without changes

## Example Usage

```
User: Can you check if this service is rightsized?

Agent: I'll check the rightsize recommendations for this service.
[Extracts namespace and app name from .gitlab-ci.yml and values.yaml]
[Runs: deno run --allow-net ~/.claude/skills/sa_rightsize/rightsize.ts temporal-ts-general-worker app-temporal]
[Reads current deployment configs from ./deploy/base/values.yaml and region-specific overrides]
[Compares API recommendations with current configs]
[Calculates savings percentages]
[Presents findings in user-friendly format]
[Offers to update files and commit if improvements found]
```

## Output Format

```
RightSize Analysis for {app} in namespace {namespace}:

Region: sg-production
Container: main-app
  CPU:
    Current:     requests: 2.0, limits: null
    Recommended: requests: 0.61, limits: null
    Status: ⚠️ Over-provisioned by 228%
  Memory:
    Current:     requests: 2000Mi, limits: 3Gi
    Recommended: requests: 1692Mi, limits: 1946Mi
    Status: ✅ Within acceptable range (+18%)

Container: istio-proxy
  CPU:
    Current:     requests: 250m, limits: null
    Recommended: requests: 48m, limits: null
    Status: ⚠️ Over-provisioned by 421%
  Memory:
    Current:     requests: 200Mi, limits: 1Gi
    Recommended: requests: 200Mi, limits: 230Mi
    Status: ✅ Requests optimal, limits could be reduced

Recommendation: Update resources to match recommendations, would save approximately 40% of CPU allocation.

Would you like me to update the deployment files and create a commit? (yes/no)
```

## Important Notes

- Always query all regions (sg, my, co.th, ae, hk) for complete analysis
- Consider production environments have higher priority
- Round recommendations to clean numbers (e.g., 0.605 → 0.6 or 0.65)
- Never reduce resources that are already under-provisioned
- Include ticket number in commit message if available from branch name
- Test changes in staging before applying to production

## Region-Specific Considerations

- **sg (Singapore)**: Primary region, highest traffic
- **my (Malaysia)**: Secondary region
- **th (Thailand)**: Growing market
- **hk (Hong Kong)**: Special administrative region
- **ae (UAE)**: MENA region
- **globalnetes**: Global infrastructure

Each region may have different usage patterns and requirements.
