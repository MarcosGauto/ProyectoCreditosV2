import { describe, expect, it } from "vitest"
import {
  createProjectionRegistry,
  projectLimitSettingsToLimitPolicy,
  projectScoreSettingsToCreditPolicyDocument,
} from "@/lib/settings/projection"
import {
  createProductLimitSettings,
  createProductOrganizationSettings,
  createProductScoreSettings,
} from "@/lib/settings/seeds/createProductOrganizationSettings"
import { freezeLimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import { freezePolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import { TEST_AT } from "@/lib/sc1/__tests__/sc1TestFixtures"

describe("Projection Registry", () => {
  it("createProjectionRegistry expone projectores score/limit/profile", () => {
    const registry = createProjectionRegistry()
    expect(registry.score).toBeTruthy()
    expect(registry.limit).toBeTruthy()
    expect(registry.profile).toBeTruthy()
    expect(registry.resolveActive).toBeTruthy()
  })

  it("proyecta ScoreSettings a CreditPolicyDocument", () => {
    const score = createProductScoreSettings()
    const doc = projectScoreSettingsToCreditPolicyDocument(score, {
      organizationId: "org_test",
      profileId: "profile_default",
      profileName: "Default",
      createdBy: "test",
    })
    expect(doc.dimensions.length).toBeGreaterThan(0)
    expect(doc.meta).toBeTruthy()
  })

  it("proyecta LimitSettings a LimitPolicy", () => {
    const limit = createProductLimitSettings()
    const policy = projectLimitSettingsToLimitPolicy(limit, {
      organizationId: "org_test",
      profileId: "profile_default",
      profileName: "Default",
      createdBy: "test",
    })
    expect(policy.meta).toBeTruthy()
    expect(policy.categories?.length ?? 0).toBeGreaterThan(0)
  })

  it("registry.resolveActive + project + freeze sin Firestore", () => {
    const org = createProductOrganizationSettings({ organizationId: "org_test" })
    const registry = createProjectionRegistry()
    const profile = registry.resolveActive.resolve(org, {})
    expect(profile).toBeTruthy()

    const creditPolicy = registry.profile.projectScore(profile)
    const limitPolicy = registry.profile.projectLimit(profile)
    const scoreRevision = freezePolicyRevision({
      policy: creditPolicy,
      createdBy: "test",
      createdAt: TEST_AT,
    })
    const limitRevision = freezeLimitPolicyRevision({
      policy: limitPolicy,
      createdBy: "test",
      createdAt: TEST_AT,
    })

    expect(scoreRevision.id).toBeTruthy()
    expect(limitRevision.id).toBeTruthy()
    expect(creditPolicy.dimensions.length).toBeGreaterThan(0)
  })
})
