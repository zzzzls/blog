import { appendFile, cp, mkdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const root = process.cwd()
const publicDir = join(root, "public")
const mermaidOut = join(publicDir, "static", "mermaid")
const mermaidChunksOut = join(mermaidOut, "chunks", "mermaid.esm.min")
const mermaidSrc = join(root, "node_modules", "mermaid", "dist")

await cp(join(root, "cloudflare", "robots.txt"), join(publicDir, "robots.txt"))
await cp(join(root, "cloudflare", "_headers"), join(publicDir, "_headers"))

await mkdir(mermaidChunksOut, { recursive: true })
await cp(
  join(mermaidSrc, "mermaid.esm.min.mjs"),
  join(mermaidOut, "mermaid.esm.min.mjs"),
)
await cp(join(mermaidSrc, "chunks", "mermaid.esm.min"), mermaidChunksOut, {
  recursive: true,
  filter: (src) => !src.endsWith(".map"),
})

// 本地化 LXGW WenKai Screen（仅 GB 子集，~4.3MB / 194 切片，覆盖 GB18030 常用汉字）
const lxgwSrc = join(root, "node_modules", "lxgw-wenkai-screen-webfont")
const lxgwDest = join(publicDir, "static", "fonts", "lxgw-wenkai-screen")
const lxgwCssName = "lxgwwenkaigbscreen.css"

await mkdir(join(lxgwDest, "files"), { recursive: true })
await cp(join(lxgwSrc, "files"), join(lxgwDest, "files"), {
  recursive: true,
  filter: (src) =>
    !src.endsWith(".woff2") || src.includes("lxgwwenkaigbscreen-subset-"),
})

const lxgwCss = await readFile(join(lxgwSrc, lxgwCssName), "utf-8")
const lxgwCssRewritten = lxgwCss.replace(
  /url\((['"]?)\.\/files\//g,
  `url($1/static/fonts/lxgw-wenkai-screen/files/`,
)
await appendFile(
  join(publicDir, "index.css"),
  `\n/* LXGW WenKai Screen (local, GB subset) */\n${lxgwCssRewritten}\n`,
)

console.log(
  "postbuild: robots.txt + mermaid + LXGW WenKai Screen assets copied to public/",
)
