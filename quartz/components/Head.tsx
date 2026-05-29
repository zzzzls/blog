import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot, simplifySlug } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"
import { CustomOgImagesEmitterName } from "../plugins/emitters/ogImage"

function getAbsoluteUrl(baseUrl: string | undefined, slug: FullSlug): string {
  const origin = `https://${baseUrl ?? "example.com"}`
  const simpleSlug = simplifySlug(slug)
  if (simpleSlug === "/") {
    return `${origin}/`
  }

  return new URL(`/${simpleSlug}`, origin).toString()
}

function isArticlePage(slug: FullSlug, filePath?: string): boolean {
  return Boolean(filePath?.endsWith(".md")) && slug !== "index" && !slug.endsWith("/index")
}

function getIsoDate(value: unknown): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined
}

export function getSeoTitle(
  cfg: Pick<QuartzComponentProps["cfg"], "locale" | "pageTitle" | "pageTitleSuffix">,
  fileData: Pick<QuartzComponentProps["fileData"], "frontmatter" | "slug">,
): string {
  const titleSuffix = cfg.pageTitleSuffix ?? ""
  const frontmatterTitle = fileData.frontmatter?.title
  const isHomeIndexTitle = fileData.slug === "index" && frontmatterTitle === "index"
  const title =
    isHomeIndexTitle
      ? `${cfg.pageTitle} | 技术笔记与思考`
      : (frontmatterTitle ?? i18n(cfg.locale).propertyDefaults.title)

  return title + titleSuffix
}

function getStructuredData({
  cfg,
  fileData,
  title,
  description,
  canonicalUrl,
  isArticle,
}: {
  cfg: QuartzComponentProps["cfg"]
  fileData: QuartzComponentProps["fileData"]
  title: string
  description: string
  canonicalUrl: string
  isArticle: boolean
}) {
  const siteUrl = `https://${cfg.baseUrl ?? "example.com"}/`
  const siteName = cfg.pageTitle
  const inLanguage = fileData.frontmatter?.lang ?? cfg.locale

  if (!isArticle) {
    return {
      "@context": "https://schema.org",
      "@type": fileData.slug === "index" ? "WebSite" : "CollectionPage",
      name: title,
      description,
      url: canonicalUrl,
      inLanguage,
      isPartOf: {
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
      },
    }
  }

  const created = getIsoDate(fileData.dates?.created)
  const modified = getIsoDate(fileData.dates?.modified)
  const published = getIsoDate(fileData.dates?.published) ?? created

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    inLanguage,
    datePublished: published,
    dateModified: modified ?? published,
    keywords: fileData.frontmatter?.tags?.join(", "),
    author: {
      "@type": "Person",
      name: "zzzzls",
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    isPartOf: {
      "@type": "Blog",
      name: siteName,
      url: siteUrl,
    },
  }
}

export default (() => {
  const Head: QuartzComponent = ({
    cfg,
    fileData,
    externalResources,
    ctx,
  }: QuartzComponentProps) => {
    const title = getSeoTitle(cfg, fileData)
    const description =
      fileData.frontmatter?.socialDescription ??
      fileData.frontmatter?.description ??
      unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

    const { css, js, additionalHead } = externalResources

    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")

    const isArticle = isArticlePage(fileData.slug!, fileData.filePath)
    const canonicalUrl = getAbsoluteUrl(cfg.baseUrl, fileData.slug!)
    const robots = fileData.slug === "404" ? "noindex, nofollow" : "index, follow"
    const articlePublished =
      getIsoDate(fileData.dates?.published) ?? getIsoDate(fileData.dates?.created)
    const articleModified = getIsoDate(fileData.dates?.modified) ?? articlePublished
    const structuredData = getStructuredData({
      cfg,
      fileData,
      title,
      description,
      canonicalUrl,
      isArticle,
    })

    const usesCustomOgImage = ctx.cfg.plugins.emitters.some(
      (e) => e.name === CustomOgImagesEmitterName,
    )
    const ogImageDefaultPath = `https://${cfg.baseUrl}/static/og-image.png`

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            {cfg.theme.typography.title && (
              <link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />
            )}
          </>
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content={robots} />
        <meta property="og:site_name" content={cfg.pageTitle}></meta>
        <meta property="og:title" content={title} />
        <meta property="og:type" content={isArticle ? "article" : "website"} />
        <meta property="og:locale" content={cfg.locale.replace("-", "_")} />
        {isArticle && articlePublished && (
          <meta property="article:published_time" content={articlePublished} />
        )}
        {isArticle && articleModified && (
          <meta property="article:modified_time" content={articleModified} />
        )}
        {isArticle &&
          fileData.frontmatter?.tags?.map((tag) => <meta property="article:tag" content={tag} />)}
        {isArticle && <meta name="author" content="zzzzls" />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta property="og:description" content={description} />
        <meta property="og:image:alt" content={description} />

        {!usesCustomOgImage && (
          <>
            <meta property="og:image" content={ogImageDefaultPath} />
            <meta property="og:image:url" content={ogImageDefaultPath} />
            <meta name="twitter:image" content={ogImageDefaultPath} />
            <meta
              property="og:image:type"
              content={`image/${getFileExtension(ogImageDefaultPath) ?? "png"}`}
            />
          </>
        )}

        {cfg.baseUrl && (
          <>
            <meta name="twitter:domain" content={cfg.baseUrl}></meta>
            <meta property="og:url" content={canonicalUrl}></meta>
            <meta name="twitter:url" content={canonicalUrl}></meta>
          </>
        )}

        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        ></script>

        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => {
          if (typeof resource === "function") {
            return resource(fileData)
          } else {
            return resource
          }
        })}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
