const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');

esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  platform: 'node',
  minify: true,
  sourcemap: true,
  target: 'node18',
  format: 'cjs',
  plugins: [nodeExternalsPlugin()],
  external: ['vscode'],
}).catch(() => process.exit(1));