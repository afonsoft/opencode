/**
 * Copy text to the clipboard with a fallback for insecure (non-HTTPS) origins
 * where `navigator.clipboard` is unavailable.
 */
export async function copyText(text: string): Promise<boolean> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard
  if (clipboard?.writeText) {
    const copied = await clipboard.writeText(text).then(
      () => true,
      () => false,
    )
    if (copied) return true
  }
  const body = typeof document === "undefined" ? undefined : document.body
  if (!body) return false
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  textarea.style.pointerEvents = "none"
  body.appendChild(textarea)
  textarea.select()
  const copied = typeof document.execCommand === "function" && document.execCommand("copy")
  body.removeChild(textarea)
  return copied
}
