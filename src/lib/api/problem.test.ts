import { describe, expect, it } from 'vitest';

import { ApiError, STATUS_UNAVAILABLE, toProblem, unavailable } from './problem';

describe('toProblem', () => {
  it('keeps a valid problem document intact', () => {
    const body = {
      type: 'about:blank',
      title: 'invalid request',
      status: 422,
      trace_id: 'ae6f2e38dd885bd173874210c2d1db76',
      errors: [{ field: 'months', code: 'advance', detail: 'shorter than the required rent advance' }],
    };
    expect(toProblem(422, body)).toEqual(body);
  });

  // A proxy or a load balancer returning HTML where JSON was expected must not
  // throw a parse error in the middle of a render.
  it('survives a body that is not a problem', () => {
    expect(toProblem(502, '<html>Bad Gateway</html>')).toEqual({
      title: 'The service is unavailable',
      status: 502,
    });
    expect(toProblem(404, null).status).toBe(404);
    expect(toProblem(400, { unrelated: true }).title).toBe('The request could not be completed');
  });
});

describe('ApiError', () => {
  it('maps field errors by field, first message wins', () => {
    const err = new ApiError({
      title: 'invalid request',
      status: 422,
      errors: [
        { field: 'months', code: 'advance', detail: 'shorter than the required rent advance' },
        { field: 'months', code: 'range', detail: 'a second message nobody needs' },
        { field: 'guests', code: 'required' },
      ],
    });
    expect(err.fieldErrors()).toEqual({
      months: 'shorter than the required rent advance',
      guests: 'required',
    });
  });

  it('exposes the trace id for support requests', () => {
    const err = new ApiError({ title: 'x', status: 500, trace_id: 'abc123' });
    expect(err.traceId).toBe('abc123');
  });

  // A request that never got an answer must be distinguishable from any
  // status the API could actually return.
  it('reports network failure as status zero', () => {
    const err = unavailable('fetch failed');
    expect(err.status).toBe(STATUS_UNAVAILABLE);
    expect(err.status).not.toBeGreaterThanOrEqual(100);
  });
});

describe('ApiError field messages', () => {
  // The shape space_api uses for rule failures: a generic title, and the
  // useful sentence on the field.
  it('exposes the field explanation for the action helper to prefer over the title', () => {
    const err = new ApiError({
      title: 'invalid payout',
      status: 422,
      errors: [{ field: 'amount_minor', code: 'insufficient', detail: 'more than your withdrawable balance' }],
    });
    expect(err.fieldErrors()).toEqual({ amount_minor: 'more than your withdrawable balance' });
    expect(err.message).toBe('invalid payout');
  });
});
