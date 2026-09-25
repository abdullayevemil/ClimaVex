import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth/guards";

/** A malformed or empty body is the caller's mistake, so report it as one. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

/**
 * One error shape for the whole API: `{ error }`, matching the convention the
 * existing routes and `fetchJson` already use, with an additive `details`
 * array for field-level validation problems.
 */
export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: Array<{ path: string; message: string; code?: string }>;
};

export function ok<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function fail(status: number, error: string, details?: ApiErrorBody["details"], code?: string): NextResponse {
  const body: ApiErrorBody = { error };
  if (code) body.code = code;
  if (details?.length) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Wrap a handler so domain and validation errors become the right status code
 * instead of a 500, and so an unexpected failure is logged but never leaks an
 * internal message to the caller.
 */
export async function handle(label: string, fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) {
      return fail(error.status, error.message, error.details as ApiErrorBody["details"]);
    }
    if (error instanceof ZodError) {
      return fail(
        422,
        "Some of the submitted values are not valid.",
        error.issues.map((i) => ({ path: i.path.join("."), message: i.message, code: i.code })),
      );
    }
    if (error && typeof error === "object" && "code" in error && "message" in error) {
      const e = error as { code: string; message: string; details?: unknown };
      if (
        e.code === "INVALID_GEOMETRY" || e.code === "N_OUT_OF_RANGE" ||
        e.code === "SECTION_TOO_SMALL" || e.code === "WEIGHTS_INVALID" ||
        e.code === "DEGENERATE_RESULT"
      ) {
        return fail(422, e.message, undefined, e.code);
      }
    }
    console.error(`${label} failed`, error);
    return fail(500, "Something went wrong handling that request.");
  }
}
