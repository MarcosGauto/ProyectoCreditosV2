import { describe, expect, it } from "vitest"
import { createDefaultLimitPolicy } from "@/lib/creditLimit/policy/limitPolicyDefaults"
import { freezeLimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import { runLimitEngine } from "@/lib/creditLimit/engine/runLimitEngine"
import {
  makeCommercialContext,
  makeOkScore,
  TEST_AT,
} from "@/lib/sc1/__tests__/sc1TestFixtures"

describe("Limit Engine restrictions & policy edges", () => {
  it("política deshabilitada produce decisión disabled o no-approve", () => {
    const policy = createDefaultLimitPolicy({ createdBy: "test", at: TEST_AT })
    const disabled = {
      ...policy,
      enabled: false,
    }
    const revision = freezeLimitPolicyRevision({
      policy: disabled,
      createdBy: "test",
      createdAt: TEST_AT,
    })

    const result = runLimitEngine({
      score: makeOkScore(),
      revision,
      commercialContext: makeCommercialContext(),
    })

    expect(
      result.decision.code === "disabled" ||
        result.status === "disabled" ||
        result.decision.allowLimit === false
    ).toBe(true)
  })

  it("genera decision trace con pasos", () => {
    const result = runLimitEngine({
      score: makeOkScore(),
      revision: freezeLimitPolicyRevision({
        policy: createDefaultLimitPolicy({ createdBy: "test", at: TEST_AT }),
        createdBy: "test",
        createdAt: TEST_AT,
      }),
      commercialContext: makeCommercialContext(),
      computedAt: TEST_AT,
    })

    expect(result.trace.steps.length).toBeGreaterThan(0)
    expect(result.trace.steps.some((s) => s.code)).toBe(true)
  })
})
