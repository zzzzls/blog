import test, { describe } from "node:test"
import assert from "node:assert"
import { getSeoTitle } from "./Head"
import { FullSlug } from "../util/path"

describe("SEO head metadata", () => {
  test("uses the configured site title for the home page when the note title is index", () => {
    const title = getSeoTitle(
      {
        locale: "zh-CN",
        pageTitle: "姜姜姜的blog",
        pageTitleSuffix: "",
      },
      {
        slug: "index" as FullSlug,
        frontmatter: {
          title: "index",
        },
      },
    )

    assert.strictEqual(title, "姜姜姜的blog | 技术笔记与思考")
  })
})
