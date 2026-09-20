# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14 AS bun

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
# Source is needed by SvelteKit sync; run it explicitly after the copy below.
RUN bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS runner
RUN bun x playwright install --with-deps chromium
COPY . .
RUN bun x svelte-kit sync && mkdir -p reports test-results
ENV CI=true
ENTRYPOINT []
CMD ["bun", "x", "vitest", "run", "--reporter=default", "--reporter=junit", "--outputFile.junit=reports/vitest.xml"]
