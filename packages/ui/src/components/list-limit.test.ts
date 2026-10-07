import { describe, expect, test } from "bun:test"
import { limitGroups } from "./list-limit"

const groups = (counts: number[]) =>
  counts.map((count, i) => ({ category: `g${i}`, items: Array.from({ length: count }, (_, j) => `g${i}-${j}`) }))

describe("limitGroups", () => {
  test("returns all groups when limit is undefined", () => {
    const input = groups([3, 4])
    const result = limitGroups(input, undefined)
    expect(result.groups).toBe(input)
    expect(result.hidden).toBe(0)
  })

  test("returns all groups when under the limit", () => {
    const result = limitGroups(groups([3, 4]), 10)
    expect(result.groups.flatMap((g) => g.items)).toHaveLength(7)
    expect(result.hidden).toBe(0)
  })

  test("truncates items mid-group and counts hidden", () => {
    const result = limitGroups(groups([3, 5, 2]), 5)
    expect(result.groups[0].items).toHaveLength(3)
    expect(result.groups[1].items).toHaveLength(2)
    expect(result.groups).toHaveLength(2)
    expect(result.hidden).toBe(5)
  })

  test("drops trailing groups entirely once the limit is hit", () => {
    const result = limitGroups(groups([2, 1, 4]), 2)
    expect(result.groups).toHaveLength(1)
    expect(result.hidden).toBe(5)
  })

  test("handles empty groups and empty input", () => {
    expect(limitGroups([], 3)).toEqual({ groups: [], hidden: 0 })
    const result = limitGroups(groups([0, 4]), 2)
    expect(result.groups[1].items).toHaveLength(2)
    expect(result.hidden).toBe(2)
  })
})
