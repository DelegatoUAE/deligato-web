import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import process from 'node:process'

// Build marker: proves which commit is deployed. Vercel sets
// VERCEL_GIT_COMMIT_SHA; locally we fall back to git, then "unknown".
function buildSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  try { return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return 'unknown' }
}

function versionMarker() {
  const sha = buildSha()
  const builtAt = new Date().toISOString()
  return {
    name: 'deligato-version-marker',
    transformIndexHtml: (html) => html.replace('</head>', `    <meta name="deligato-build" content="${sha}" />\n  </head>`),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ sha, built_at: builtAt, env: process.env.VERCEL_ENV || 'local' }, null, 2) + '\n' })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionMarker()],
})
