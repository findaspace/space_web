import { z } from 'zod';

// Mirrors the Problem and FieldError components in space_api's OpenAPI spec.
// Parsed rather than cast: a response body is untrusted input, and a proxy's
// HTML error page arriving where JSON was expected must not crash the render.
const fieldErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  detail: z.string().optional(),
});

const problemSchema = z.object({
  type: z.string().optional(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  trace_id: z.string().optional(),
  errors: z.array(fieldErrorSchema).optional(),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type Problem = z.infer<typeof problemSchema>;

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.problem = problem;
  }

  // Matches the request_id in space_api's logs. Shown to a user who reports a
  // problem, it turns "it didn't work" into one grep.
  get traceId(): string | undefined {
    return this.problem.trace_id;
  }

  // Keyed by field so a form can put each message under its own input. The
  // first message per field wins; showing three at once under one box helps
  // nobody fix it.
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.problem.errors ?? []) {
      out[e.field] ??= e.detail ?? e.code;
    }
    return out;
  }
}

// toProblem always returns a usable Problem, whatever arrived. Anything that is
// not a valid problem document becomes a generic one carrying the real status,
// so callers branch on status and never on whether parsing worked.
export function toProblem(status: number, body: unknown): Problem {
  const parsed = problemSchema.safeParse(body);
  if (parsed.success) {
    return parsed.data;
  }
  return {
    title: status >= 500 ? 'The service is unavailable' : 'The request could not be completed',
    status,
  };
}

// Unavailable is a status the client produces itself, for a request that never
// got an answer: a timeout, a refused connection, a DNS failure. It is not a
// status the API can return, which keeps the two cases distinguishable.
export const STATUS_UNAVAILABLE = 0;

export function unavailable(reason: string): ApiError {
  return new ApiError({
    title: 'The service is unavailable',
    detail: reason,
    status: STATUS_UNAVAILABLE,
  });
}
