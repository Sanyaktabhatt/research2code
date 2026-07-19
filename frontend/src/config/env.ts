import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:8000/api/v1"),
  NEXT_PUBLIC_WS_BASE_URL: z.string().url().default("ws://localhost:8000/api/v1"),
  NEXT_PUBLIC_MOCK_API: z.string().optional(),
  /** Same default as the backend's own `MLFLOW_TRACKING_URI` (see backend/app/config/settings.py) - there's no API that returns this, so linking to the MLflow UI needs it mirrored here. */
  NEXT_PUBLIC_MLFLOW_BASE_URL: z.string().url().default("http://localhost:5000"),
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

export const IS_MOCK_API = env.NEXT_PUBLIC_MOCK_API === "true" || process.env.NODE_ENV === "development";
