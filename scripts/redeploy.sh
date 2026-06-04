#!/usr/bin/env bash
# Dev redeploy: pack the module, swap the host-global registration, reinstall
# for the test tenant. The host rejects duplicate module ids in-process, so we
# uninstall + delete (force) before re-uploading.
#
# Usage: scripts/redeploy.sh [tenantId]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRAMEWORK="$ROOT/../boringos-framework"
SERVER="$ROOT/packages/server"
API="${VCBRAIN_API:-http://localhost:3030}"
TENANT="${1:-397cac55-19f3-44ad-9d34-16e1b5ea19bd}"
VERSION="$(node -e "console.log(require('$SERVER/module.json').version)")"
HM="$SERVER/dist/vcbrain-$VERSION.hebbsmod"

echo "▸ build + pack vcbrain@$VERSION"
( cd "$ROOT" && pnpm -r build >/dev/null )
"$FRAMEWORK/node_modules/.bin/pack-hebbsmod" --pkg "$SERVER" >/dev/null

# NOTE: no uninstall — that runs Migration.down() and DROPS the vc__ tables
# (destroying tenant data). Force-upload re-registers the runtime + UI bundle,
# and install is idempotent (CREATE TABLE IF NOT EXISTS + scrub/reseed
# workflows), so data is preserved. Pass --fresh to do a destructive reinstall.
if [ "${2:-}" = "--fresh" ]; then
  echo "▸ --fresh: uninstall (DROPS vc__ tables)"
  curl -s -m 30 -X POST -H "x-tenant-id: $TENANT" "$API/api/admin/modules/vcbrain/uninstall" >/dev/null 2>&1 || true
fi

echo "▸ upload vcbrain@$VERSION (force re-registers the runtime + UI)"
curl -s -m 30 -F "file=@$HM" "$API/api/admin/modules/upload?force=true" | python3 -c "import json,sys;d=json.load(sys.stdin);print('   ok=%s toolsAdded=%s err=%s'%(d.get('ok'),d.get('toolsAdded'),d.get('error')))"

echo "▸ install for $TENANT"
curl -s -m 60 -X POST -H "x-tenant-id: $TENANT" "$API/api/admin/modules/vcbrain/install" | head -c 200
echo
