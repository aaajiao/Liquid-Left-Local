#!/bin/bash
# Reminds the user to bump CACHE_VERSION in public/service-worker.js
# when assets cached at fixed paths change. Without a bump, returning
# users keep getting the old asset from the SW cache.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[ -z "$file_path" ] && exit 0

case "$file_path" in
  */public/*|*/favicon/*|*/index.html) ;;
  *) exit 0 ;;
esac

dir=$(dirname "$file_path")
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)
[ -z "$root" ] && exit 0

sw="$root/public/service-worker.js"
[ -f "$sw" ] || exit 0

if git -C "$root" diff HEAD -- public/service-worker.js 2>/dev/null | grep -q "CACHE_VERSION"; then
  exit 0
fi

current_ver=$(grep -oE "v[0-9]+" "$sw" | head -1)

printf '{"systemMessage":"⚠️  Cached asset changed (%s) — bump CACHE_VERSION in public/service-worker.js (currently %s) so returning users do not get a stale cache."}\n' "${file_path##*/}" "$current_ver"
