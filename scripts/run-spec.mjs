// 规格测试运行器：用 esbuild 把 TS 测试打成临时 ESM 后执行，不写入 dist
import { build } from '../node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/lib/main.js';
import { pathToFileURL } from 'node:url';
import { rmSync } from 'node:fs';

const outfile = new URL('../.spec-build.mjs', import.meta.url);
const messageStub = new URL('./message-stub.js', import.meta.url).pathname;
// 避免为跑测试引入 element-plus / DOM：把 store 里的 toast 模块重定向到桩
const toastStubPlugin = {
  name: 'toast-stub',
  setup(buildInstance) {
    buildInstance.onResolve({ filter: /(^|\/)message$/ }, () => ({ path: messageStub }));
  },
};

await build({
  entryPoints: [new URL('./rendezvous.spec.ts', import.meta.url).pathname],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outfile.pathname,
  logLevel: 'silent',
  plugins: [toastStubPlugin],
});
try {
  await import(pathToFileURL(outfile.pathname).href + '?t=' + Date.now());
} finally {
  rmSync(outfile.pathname, { force: true });
}
