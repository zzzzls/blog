import test, { describe } from "node:test"
import assert from "node:assert"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { transformSync } from "esbuild"

class FakeButton {
  private listeners = new Map<string, Set<() => void>>()

  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener)
  }

  click() {
    for (const listener of this.listeners.get("click") ?? []) {
      listener()
    }
  }
}

function setupReaderMode(slug?: string) {
  const attrs = new Map<string, string>()
  const listeners = new Map<string, Set<(event?: unknown) => void>>()
  const button = new FakeButton()
  const document = {
    body: { dataset: { slug } },
    documentElement: {
      setAttribute(name: string, value: string) {
        attrs.set(name, value)
      },
      getAttribute(name: string) {
        return attrs.get(name) ?? null
      },
    },
    addEventListener(type: string, listener: (event?: unknown) => void) {
      const existing = listeners.get(type) ?? new Set()
      existing.add(listener)
      listeners.set(type, existing)
    },
    dispatchEvent(event: { type: string }) {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event)
      }
    },
    getElementsByClassName(className: string) {
      return className === "readermode" ? [button] : []
    },
  }

  const source = readFileSync("quartz/components/scripts/readermode.inline.ts", "utf8")
  const script = transformSync(source, { loader: "ts", format: "iife" }).code

  vm.runInNewContext(script, {
    document,
    window: { addCleanup() {} },
    CustomEvent: class CustomEvent {
      type: string
      detail: unknown

      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type
        this.detail = init?.detail
      }
    },
  })

  document.dispatchEvent({ type: "nav" })

  return {
    button,
    getReaderMode: () => document.documentElement.getAttribute("reader-mode"),
  }
}

describe("reader mode defaults", () => {
  test("enables reader mode by default on note pages", () => {
    const page = setupReaderMode("10-Notes/工程/Docker-跨架构构建")

    assert.strictEqual(page.getReaderMode(), "on")
  })

  test("does not enable reader mode by default on non-note pages", () => {
    for (const slug of ["index", "10-Notes/工程/index", "tags/claude", "404", undefined]) {
      const page = setupReaderMode(slug)

      assert.strictEqual(page.getReaderMode(), "off")
    }
  })

  test("keeps the reader mode button available to toggle the default state", () => {
    const page = setupReaderMode("10-Notes/工程/Docker-跨架构构建")

    page.button.click()

    assert.strictEqual(page.getReaderMode(), "off")
  })
})
