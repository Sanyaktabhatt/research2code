export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly requestId?: string;

  constructor(status: number, detail: string, requestId?: string) {
    // `detail: string` is the declared type, but nothing upstream stopped
    // this from being handed a non-string value before (see client.ts's
    // extractErrorDetail comment) - every consumer renders `.detail`
    // straight into JSX, so a coercion guard belongs here too, not just at
    // the one call site that currently happens to normalize it correctly.
    const safeDetail = typeof detail === "string" ? detail : "Something went wrong. Please try again.";
    super(safeDetail);
    this.name = "ApiError";
    this.status = status;
    this.detail = safeDetail;
    this.requestId = requestId;
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}
