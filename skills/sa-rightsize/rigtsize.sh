#!/bin/bash
set -euo pipefail

APP="${1:?Usage: $0 <app-name> <namespace>}"
NAMESPACE="${2:?}"
REGIONS=(sg my co.th ae hk)

echo '{"app":"'$APP'","namespace":"'$NAMESPACE'","regions":{' >&2

for i in "${!REGIONS[@]}"; do
  REGION="${REGIONS[$i]}"
  BASE_URL="https://rightsize-api.production.stashaway.$REGION"

  [[ $i -gt 0 ]] && echo "," >&2
  echo -n "\"$REGION\":" >&2

  # Fetch CPU and memory recommendations
  CPU=$(curl -sf "$BASE_URL/resource-recommendation/cpu?app=$APP&namespace=$NAMESPACE" 2>/dev/null || echo '[]')
  MEM=$(curl -sf "$BASE_URL/resource-recommendation/memory?app=$APP&namespace=$NAMESPACE" 2>/dev/null || echo '[]')

  if [[ "$CPU" == "[]" ]] && [[ "$MEM" == "[]" ]]; then
    echo -n '{"error":"No data available"}' >&2
  else
    # Merge CPU and memory by container using jq
    RESULT=$(jq -s '
      def norm(v): if v == "null" or v == null then null else v | tonumber end;

      # Merge CPU and memory arrays
      (.[0] + .[1])
      | group_by(.container)
      | map({
          key: .[0].container,
          value: {
            cpu: {
              requests: (map(select(.requests != null)) | .[0].requests // null | norm),
              limits: (map(select(.limits != null)) | .[0].limits // null | norm)
            },
            memory: {
              requests: (map(select(.requests != null)) | .[1].requests // null | norm),
              limits: (map(select(.limits != null)) | .[1].limits // null | norm)
            }
          }
        })
      | from_entries
    ' <(echo "$CPU") <(echo "$MEM") 2>/dev/null)

    if [[ -n "$RESULT" ]]; then
      echo -n "$RESULT" >&2
    else
      echo -n '{"error":"Failed to parse recommendations"}' >&2
    fi
  fi
done

echo '}}' >&2

# Output JSON to stdout (stderr was used for progress)
cat /dev/stderr