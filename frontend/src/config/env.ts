import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:8000/api/v1"),
  NEXT_PUBLIC_WS_BASE_URL: z.string().url().default("ws://localhost:8000/api/v1"),
  NEXT_PUBLIC_MOCK_API: z.string().optional(),
  /**
   * The browser needs MLflow's *host*-published port, not the backend's own
   * `MLFLOW_TRACKING_URI` (container-to-container, via the "mlflow" service
   * hostname, which a browser can't resolve at all) - there's no API that
   * returns this, so it's mirrored here from docker-compose.yml's `ports:`
   * mapping for the mlflow service. That mapping is 5050:5000, not the
   * container's own 5000, because macOS reserves host port 5000 for AirPlay
   * Receiver - hitting it returns a 403 from AirPlay instead of MLflow.
   */
  NEXT_PUBLIC_MLFLOW_BASE_URL: z.string().url().default("http://localhost:5050"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_WS_BASE_URL: process.env.NEXT_PUBLIC_WS_BASE_URL,
  NEXT_PUBLIC_MOCK_API: process.env.NEXT_PUBLIC_MOCK_API,
  NEXT_PUBLIC_MLFLOW_BASE_URL: process.env.NEXT_PUBLIC_MLFLOW_BASE_URL,
});

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

// Only auth.ts/client.ts honor this - every other endpoint always calls the
// real backend - so defaulting this to "on" for `next dev` (as opposed to
// requiring the explicit env var) mocks login/signup while every other
// request still hits the real API, permanently 401ing on the fake token.
export const IS_MOCK_API = env.NEXT_PUBLIC_MOCK_API === "true";
