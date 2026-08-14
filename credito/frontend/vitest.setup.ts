import { vi } from "vitest"

vi.mock("@/service/firebase", () => ({
  auth: {},
  db: {},
  storage: {},
}))
