import type { User } from "@/types/domain";

/**
 * Only auth uses mock data (login/signup/me) so the shell is browsable
 * without a running backend. Every other endpoint module (projects, papers,
 * generated-projects, execution-runs, health) hits the real API with no
 * mock fallback.
 */
export const MOCK_USER: User = {
  id: "user_1",
  email: "ada@research2code.dev",
  displayName: "Ada Lovelace",
};
