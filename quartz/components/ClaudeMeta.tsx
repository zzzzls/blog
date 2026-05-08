import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import style from "./styles/claudeMeta.scss"

function ClaudeMeta({ fileData, displayClass }: QuartzComponentProps) {
  const fm = fileData.frontmatter as Record<string, unknown> | undefined
  const version = typeof fm?.claude_version === "string" ? fm.claude_version : null

  if (!version) return null

  const category = typeof fm?.category === "string" ? fm.category : null

  return (
    <p class={classNames(displayClass, "claude-meta")}>
      <span class="claude-version">{version}</span>
      {category && <span class="claude-meta-sep"> · </span>}
      {category && <span class="claude-category">#{category}</span>}
    </p>
  )
}

ClaudeMeta.css = style

export default (() => ClaudeMeta) satisfies QuartzComponentConstructor
