import test, { describe } from "node:test"
import assert from "node:assert"
import { buildDescription } from "./description"

describe("description metadata", () => {
  test("keeps truncated descriptions within the configured maximum length", () => {
    const description = buildDescription(
      "这里囤一些复用率高的笔记，大半是上次那个坑怎么填的来着备忘，小半是为了说服自己某件事弄懂了。不保证每篇都写完了，有的看着像随手记，那确实就是欢迎挑着看。最近写的 claude-tips 系列。",
      {
        descriptionLength: 120,
        maxDescriptionLength: 155,
        replaceExternalLinks: true,
      },
    )

    assert(description.length <= 155)
  })
})
