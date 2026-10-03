'use client';

import { useActionState } from 'react';

import { login, type LoginState } from './actions';

const initial: LoginState = { step: 'phone' };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, initial);

  return state.step === 'phone' ? (
    <PhoneStep state={state} action={action} pending={pending} />
  ) : (
    <CodeStep state={state} action={action} pending={pending} next={next} />
  );
}

type StepProps<S> = {
  state: S;
  action: (form: FormData) => void;
  pending: boolean;
};

function PhoneStep({ state, action, pending }: StepProps<Extract<LoginState, { step: 'phone' }>>) {
  const errorId = 'phone-error';

  return (
    <form action={action} noValidate className="flex flex-col">
      <h1 className="text-large-title">Sign in</h1>
      <p className="mt-2 text-body text-ink-muted">
        We will text you a code. No password to remember.
      </p>

      <label htmlFor="phone" className="mt-8 text-subheadline font-semibold">
        Phone number
      </label>
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="024 123 4567"
        defaultValue={state.phone}
        required
        autoFocus
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? errorId : undefined}
        className="mt-2 h-12 rounded-md border border-line-strong bg-surface px-4 text-body placeholder:text-ink-subtle aria-invalid:border-danger"
      />
      {state.error ? (
        <p id={errorId} role="alert" className="mt-2 text-footnote text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        name="intent"
        value="send"
        disabled={pending}
        className="mt-6 h-12 rounded-md bg-action text-headline text-on-action active:bg-action-pressed disabled:opacity-60"
      >
        {pending ? 'Sending code' : 'Send code'}
      </button>

      <p className="mt-4 text-footnote text-ink-subtle">
        New to Findaspace? The same code creates your account.
      </p>
    </form>
  );
}

function CodeStep({
  state,
  action,
  pending,
  next,
}: StepProps<Extract<LoginState, { step: 'code' }>> & { next: string }) {
  const errorId = 'code-error';

  return (
    <form action={action} noValidate className="flex flex-col">
      <h1 className="text-large-title">Enter the code</h1>
      <p className="mt-2 text-body text-ink-muted">
        {state.resent ? 'A new code was sent to ' : 'Sent by SMS to '}
        <span className="font-semibold text-ink">{state.masked}</span>.
      </p>

      <input type="hidden" name="phone" value={state.phone} />
      <input type="hidden" name="next" value={next} />

      <label htmlFor="code" className="mt-8 text-subheadline font-semibold">
        6-digit code
      </label>
      <input
        id="code"
        name="code"
        type="text"
        // one-time-code lets iOS offer the code straight from the SMS, and
        // Android's autofill does the same. The user never has to switch apps.
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        required
        autoFocus
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? errorId : undefined}
        className="tabular mt-2 h-14 rounded-md border border-line-strong bg-surface px-4 text-title-2 tracking-[0.4em] aria-invalid:border-danger"
      />
      {state.error ? (
        <p id={errorId} role="alert" className="mt-2 text-footnote text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        name="intent"
        value="verify"
        disabled={pending}
        className="mt-6 h-12 rounded-md bg-action text-headline text-on-action active:bg-action-pressed disabled:opacity-60"
      >
        {pending ? 'Checking' : 'Continue'}
      </button>

      <div className="mt-4 flex justify-between">
        <button
          type="submit"
          name="intent"
          value="resend"
          disabled={pending}
          formNoValidate
          className="min-h-11 text-subheadline font-semibold text-state-ink"
        >
          Send a new code
        </button>
        <button
          type="submit"
          name="intent"
          value="change"
          disabled={pending}
          formNoValidate
          className="min-h-11 text-subheadline text-ink-muted"
        >
          Change number
        </button>
      </div>
    </form>
  );
}
