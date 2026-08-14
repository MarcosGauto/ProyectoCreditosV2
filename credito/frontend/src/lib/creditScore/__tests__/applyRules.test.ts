import { describe, expect, it } from "vitest"
import {
  matchOperator,
  statusFromScore,
} from "@/lib/creditScore/evaluators/applyRules"

describe("applyRules helpers", () => {
  it("matchOperator cubre operadores lógicos y numéricos", () => {
    expect(matchOperator("missing", null, null, null)).toBe(true)
    expect(matchOperator("present", 1, null, null)).toBe(true)
    expect(matchOperator("truthy", "x", null, null)).toBe(true)
    expect(matchOperator("falsy", 0, null, null)).toBe(true)
    expect(matchOperator("eq", "a", "a", null)).toBe(true)
    expect(matchOperator("neq", "a", "b", null)).toBe(true)
    expect(matchOperator("in", "x", ["x", "y"], null)).toBe(true)
    expect(matchOperator("not_in", "z", ["x", "y"], null)).toBe(true)
    expect(matchOperator("gt", 5, 3, null)).toBe(true)
    expect(matchOperator("gte", 3, 3, null)).toBe(true)
    expect(matchOperator("lt", 2, 3, null)).toBe(true)
    expect(matchOperator("lte", 3, 3, null)).toBe(true)
    expect(matchOperator("between", 5, 1, 10)).toBe(true)
    expect(matchOperator("outside", 0, 1, 10)).toBe(true)
  })

  it("statusFromScore clasifica rangos", () => {
    expect(statusFromScore(null)).toBe("UNKNOWN")
    expect(statusFromScore(95)).toBe("EXCELLENT")
    expect(statusFromScore(80)).toBe("GOOD")
    expect(statusFromScore(60)).toBe("FAIR")
    expect(statusFromScore(40)).toBe("WARNING")
    expect(statusFromScore(10)).toBe("CRITICAL")
  })
})
