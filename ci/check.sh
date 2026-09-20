#!/usr/bin/env bash
set -euo pipefail

bun run check
bun run lint
bun audit
bun x vitest run --reporter=default --reporter=junit --outputFile.junit=reports/vitest.xml
