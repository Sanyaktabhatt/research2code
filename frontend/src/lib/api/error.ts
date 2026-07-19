export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly requestId?: string;

  constructor(status: number, detail: string, requestId?: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.requestId = requestId;
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}
