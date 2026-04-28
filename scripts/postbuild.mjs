import {
  appendFile,
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises"
import { execSync } from "node:child_process"
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

// 本地化 LXGW WenKai Screen（仅 GB 子集，~4.3MB / 97 切片，覆盖 GB18030 常用汉字）
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

// 给稳定文件名资源加 ?v=<hash> 触发缓存失效
// 优先用 Cloudflare Pages 注入的 commit sha，回落到本地 git，再回落到时间戳
const buildVersion = (() => {
  if (process.env.CF_PAGES_COMMIT_SHA) {
    return process.env.CF_PAGES_COMMIT_SHA.slice(0, 7)
  }
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim()
  } catch {
    return Date.now().toString(36)
  }
})()

async function* walkHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkHtml(p)
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      yield p
    }
  }
}

// 仅匹配 (href|src)="<相对/绝对前缀>(index.css|prescript.js|postscript.js)" 与 fetch("...static/contentIndex.json")
// 其它带内容 hash 的资源（字体、mermaid chunks）和短期不变的 (icon、og-image) 不动
const linkSrcRe =
  /((?:href|src)=["'])((?:\.{0,2}\/)?(?:index\.css|prescript\.js|postscript\.js))(["'])/g
const fetchRe =
  /(fetch\(["'])((?:\.{0,2}\/)?static\/contentIndex\.json)(["'])/g

let htmlPatched = 0
for await (const htmlFile of walkHtml(publicDir)) {
  const before = await readFile(htmlFile, "utf-8")
  const after = before
    .replace(linkSrcRe, `$1$2?v=${buildVersion}$3`)
    .replace(fetchRe, `$1$2?v=${buildVersion}$3`)
  if (after !== before) {
    await writeFile(htmlFile, after)
    htmlPatched++
  }
}

console.log(
  `postbuild: robots.txt + mermaid + LXGW WenKai Screen copied; cache-bust v=${buildVersion} applied to ${htmlPatched} html files`,
)
