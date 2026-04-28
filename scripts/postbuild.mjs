import { cp, mkdir } from "node:fs/promises"
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

console.log("postbuild: robots.txt + mermaid assets copied to public/")
