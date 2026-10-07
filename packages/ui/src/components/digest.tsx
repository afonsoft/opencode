/**
 * Hex digest of a blob's bytes. Uses `crypto.subtle` SHA-256 when available and
 * falls back to a non-cryptographic hash on insecure (non-HTTPS) origins so
 * content-derived IDs keep working everywhere. The fallback is for dedup keys
 * only, never for security decisions.
 */
export async function digestBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    return Array.from(new Uint8Array(await subtle.digest("SHA-256", bytes)))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  }
  return cyrb53(bytes, 0) + cyrb53(bytes, 1) + cyrb53(bytes, 2) + cyrb53(bytes, 3)
}

function cyrb53(bytes: Uint8Array, seed: number) {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes[i]!
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")
}
