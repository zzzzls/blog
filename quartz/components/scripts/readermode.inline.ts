let isReaderMode = false

function shouldEnableReaderModeByDefault(slug?: string) {
  if (!slug || slug === "index" || slug === "404") return false
  if (slug.startsWith("tags/") || slug.endsWith("/index")) return false
  return true
}

const emitReaderModeChangeEvent = (mode: "on" | "off") => {
  const event: CustomEventMap["readermodechange"] = new CustomEvent("readermodechange", {
    detail: { mode },
  })
  document.dispatchEvent(event)
}

document.addEventListener("nav", () => {
  const applyReaderMode = () => {
    const newMode = isReaderMode ? "on" : "off"
    document.documentElement.setAttribute("reader-mode", newMode)
    emitReaderModeChangeEvent(newMode)
  }

  isReaderMode = shouldEnableReaderModeByDefault(document.body.dataset.slug)

  const switchReaderMode = () => {
    isReaderMode = !isReaderMode
    applyReaderMode()
  }

  for (const readerModeButton of document.getElementsByClassName("readermode")) {
    readerModeButton.addEventListener("click", switchReaderMode)
    window.addCleanup(() => readerModeButton.removeEventListener("click", switchReaderMode))
  }

  // Set initial state
  applyReaderMode()
})
