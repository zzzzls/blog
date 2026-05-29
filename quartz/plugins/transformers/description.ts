import { Root as HTMLRoot } from "hast"
import { toString } from "hast-util-to-string"
import { QuartzTransformerPlugin } from "../types"
import { escapeHTML } from "../../util/escape"

export interface Options {
  descriptionLength: number
  maxDescriptionLength: number
  replaceExternalLinks: boolean
}

const defaultOptions: Options = {
  descriptionLength: 120,
  maxDescriptionLength: 155,
  replaceExternalLinks: true,
}

const urlRegex = new RegExp(
  /(https?:\/\/)?(?<domain>([\da-z\.-]+)\.([a-z\.]{2,6})(:\d+)?)(?<path>[\/\w\.-]*)(\?[\/\w\.=&;-]*)?/,
  "g",
)

function truncateDescription(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  const ellipsis = "..."
  const sliced = text.slice(0, maxLength - ellipsis.length).trimEnd()
  return sliced.replace(/[，。；、,.!?;:：\s]+$/, "") + ellipsis
}

export function buildDescription(text: string, opts: Options): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^(?:\d+[\.)]|[-*•])\s+/, "")
    .trim()

  if (cleaned.length <= opts.descriptionLength) return cleaned

  const boundary = cleaned.slice(0, opts.maxDescriptionLength).search(/[。！？.!?]\s/)
  if (boundary > opts.descriptionLength * 0.6) {
    return truncateDescription(cleaned.slice(0, boundary + 1), opts.maxDescriptionLength)
  }

  return truncateDescription(cleaned, opts.maxDescriptionLength)
}

export const Description: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "Description",
    htmlPlugins() {
      return [
        () => {
          return async (tree: HTMLRoot, file) => {
            let frontMatterDescription = file.data.frontmatter?.description
            let text = escapeHTML(toString(tree))

            if (opts.replaceExternalLinks) {
              frontMatterDescription = frontMatterDescription?.replace(
                urlRegex,
                "$<domain>" + "$<path>",
              )
              text = text.replace(urlRegex, "$<domain>" + "$<path>")
            }

            if (frontMatterDescription) {
              file.data.description = buildDescription(frontMatterDescription, opts)
              file.data.text = text
              return
            }

            file.data.description = buildDescription(text, opts)
            file.data.text = text
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    description: string
    text: string
  }
}
