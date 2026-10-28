import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 윤리시티 · 연대성 「성적표의 비밀」 빌드 설정.
// 산출물은 ../solidarity/ (index.html + assets/app-*.js|css).
// 공통 팩은 번들하지 않고 ../shared/ethicity-elementary-common-v1 에서 런타임에 불러온다.

const HERE = fileURLToPath(new URL(".", import.meta.url));
const COMMON = "../shared/ethicity-elementary-common-v1";

/** index.html 의 자리표시 주석을 공통 팩 css/js 태그로 바꾼다(번들 금지, 런타임 상대경로 로드). */
function commonPackTags(): Plugin {
  const tags = [
    `<link rel="stylesheet" href="${COMMON}/runtime/common.css" />`,
    `<script src="${COMMON}/runtime/manifest.js"></script>`,
    `<script src="${COMMON}/runtime/common.js"></script>`,
  ].join("\n    ");
  return {
    name: "solidarity-common-pack-tags",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace("<!-- ethicity-common-pack -->", tags);
      },
    },
  };
}

/** 이전 빌드의 해시 번들만 지운다. README·docs·assets/manifest.json 은 남긴다. */
function cleanOldBundles(): Plugin {
  return {
    name: "solidarity-clean-old-bundles",
    apply: "build",
    buildStart() {
      const dir = path.resolve(HERE, "../solidarity/assets");
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        if (/^(app|chunk)-[\w-]+\.(js|css)$/.test(f)) fs.rmSync(path.join(dir, f));
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), commonPackTags(), cleanOldBundles()],
  server: { port: 5173 },
  build: {
    outDir: "../solidarity",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app-[hash].js",
        chunkFileNames: "assets/chunk-[hash].js",
        assetFileNames: "assets/app-[hash][extname]",
      },
    },
  },
});
