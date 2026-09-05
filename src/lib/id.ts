/** Short, sortable-enough ids. crypto.randomUUID needs a secure context; this does not. */
export function newId(prefix = ''): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const rand = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}${Date.now().toString(36)}${rand}`
}
