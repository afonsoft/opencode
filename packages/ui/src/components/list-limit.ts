export function limitGroups<T>(groups: { category: string; items: T[] }[], limit: number | undefined) {
  if (!limit) return { groups, hidden: 0 }
  let remaining = limit
  let hidden = 0
  const sliced: typeof groups = []
  for (const group of groups) {
    if (group.items.length <= remaining) {
      sliced.push(group)
      remaining -= group.items.length
      continue
    }
    if (remaining > 0) sliced.push({ ...group, items: group.items.slice(0, remaining) })
    hidden += group.items.length - remaining
    remaining = 0
  }
  return { groups: sliced, hidden }
}
