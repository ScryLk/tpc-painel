import { defineConfig } from 'tsup'

// Bundle de produção do API.
// - Workspace packages (@tpc/db, @tpc/lib) entram inline no bundle: senão o
//   Node em runtime não acharia esses módulos (eles exportam .ts crus).
// - Tudo de node_modules fica externo: pegamos via `pnpm install` no servidor.
// - Prisma client tem bindings nativos e NÃO pode ser bundlado.
// - JSX dos templates @react-email roda com runtime automático.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@tpc\//],
  external: ['@prisma/client', '.prisma/client'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
