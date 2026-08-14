import { describe, expect, it, vi } from "vitest"

vi.mock("@/service/firebase", () => ({ db: {} }))
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}))

const {
  buildAppliedInflationPeriods,
  resolveInflationFromMasterIndexes,
} = await import("@/lib/inflation/inflationIndexService")

const indexes = [
  { period: "2023-06", value: 115.6 },
  { period: "2024-06", value: 271.5 },
  { period: "2025-06", value: 39.4 },
  { period: "2026-06", value: 33.5 },
]

describe("buildAppliedInflationPeriods", () => {
  it("usa aniversarios posteriores al cierre hasta el último inclusive", () => {
    expect(buildAppliedInflationPeriods("2024-06", "2026-06")).toEqual([
      "2025-06",
      "2026-06",
    ])
    expect(buildAppliedInflationPeriods("2025-06", "2026-06")).toEqual([
      "2026-06",
    ])
    expect(buildAppliedInflationPeriods("2026-06", "2026-06")).toEqual([])
  })
})

describe("resolveInflationFromMasterIndexes", () => {
  it("cierre 06/2025 → 1,335", () => {
    const result = resolveInflationFromMasterIndexes(indexes, "2025-06-30")

    expect(result.destinationPeriod).toBe("2026-06")
    expect(result.chainPeriods).toEqual(["2026-06"])
    expect(result.chainSteps[0]).toMatchObject({
      fromPeriod: "2025-06",
      toPeriod: "2026-06",
      annualInflationPct: 33.5,
      coefficient: 1.335,
    })
    expect(result.inflation?.factorInflacion).toBeCloseTo(1.335, 10)
  })

  it("cierre 06/2024 → 1,394 × 1,335 = 1,86099", () => {
    const result = resolveInflationFromMasterIndexes(indexes, "2024-06-30")

    expect(result.chainPeriods).toEqual(["2025-06", "2026-06"])
    expect(result.inflation?.factorInflacion).toBeCloseTo(1.86099, 5)
  })

  it("cierre 06/2023 → 3,715 × 1,394 × 1,335", () => {
    const result = resolveInflationFromMasterIndexes(indexes, "2023-06-30")

    expect(result.chainPeriods).toEqual(["2024-06", "2025-06", "2026-06"])
    expect(result.inflation?.factorInflacion).toBeCloseTo(
      3.715 * 1.394 * 1.335,
      6
    )
  })

  it("cierre = último período → factor 1", () => {
    const result = resolveInflationFromMasterIndexes(indexes, "2026-06-30")
    expect(result.inflation?.factorInflacion).toBe(1)
    expect(result.chainSteps).toEqual([])
  })

  it("no calcula si falta un tramo intermedio", () => {
    const gap = [
      { period: "2024-06", value: 271.5 },
      { period: "2026-06", value: 33.5 },
    ]
    const result = resolveInflationFromMasterIndexes(gap, "2024-06-30")

    expect(result.inflation).toBeNull()
    expect(result.missingPeriods).toContain("2025-06")
  })

  it("nunca usa el % crudo como factor", () => {
    const result = resolveInflationFromMasterIndexes(indexes, "2025-06-30")
    expect(result.inflation?.factorInflacion).not.toBe(33.5)
    expect(result.inflation?.factorInflacion).toBeCloseTo(1 + 33.5 / 100, 10)
  })
})
