type ClassValue = string | number | false | null | undefined | Record<string, boolean | null | undefined> | ClassValue[]

const collect = (value: ClassValue, out: string[]): void => {
  if (!value) return
  if (typeof value === 'string' || typeof value === 'number') {
    out.push(String(value))
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) collect(v, out)
    return
  }
  for (const [key, enabled] of Object.entries(value)) {
    if (enabled) out.push(key)
  }
}

export const cn = (...inputs: ClassValue[]): string => {
  const parts: string[] = []
  for (const input of inputs) collect(input, parts)
  return parts.join(' ')
}
