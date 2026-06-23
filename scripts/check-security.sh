#!/usr/bin/env bash
# Dependency security + freshness check for the courses/apps stack.
#
#   pnpm check:security
#
# Two layers of safety net (Dependabot opens PRs continuously; this is the
# on-demand, before-a-release / monthly snapshot):
#   1. `pnpm audit`     — known CVEs in the installed dependency tree.
#   2. `pnpm outdated`  — packages with newer versions available.
#   3. `osv-scanner`    — broader OSV advisory DB (optional; runs if installed).
#
# Never aborts the report on a non-zero tool exit — it gathers everything, then
# prints a guidance footer. Exit code reflects whether `pnpm audit` found vulns
# (0 = clean, 1 = vulnerabilities) so CI can gate on it if desired.
set -uo pipefail

hr() { printf '\n=== %s ===\n' "$1"; }

hr "pnpm audit — known vulnerabilities (CVEs) in the dependency tree"
pnpm audit
audit_exit=$?

hr "pnpm outdated — packages with newer versions available"
pnpm outdated || true

if command -v osv-scanner >/dev/null 2>&1; then
  hr "osv-scanner — broader OSV advisory database"
  osv-scanner --lockfile=pnpm-lock.yaml || true
else
  hr "osv-scanner (optional, not installed)"
  echo "Install for deeper supply-chain coverage: https://github.com/google/osv-scanner"
fi

hr "Guidance"
cat <<'EOF'
- Patch/minor bumps: safe to take (Dependabot groups these into weekly PRs).
- Major bumps (Next.js, Payload, React, drizzle): review changelogs, then run
  `pnpm test:int` && `pnpm build` before merging — these pin versions across the app.
- A reported vuln in a DEV-only / transitive dep that the app never ships is lower
  priority than one in a production dependency. `pnpm audit --prod` narrows to shipped deps.
- For a code-level (OWASP) review, use the `security-audit` skill — this script only
  covers the supply chain (dependency freshness + advisories).
EOF

exit $audit_exit
