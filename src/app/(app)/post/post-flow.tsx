'use client';

import { allowedPeriods,type PricePeriod } from '@/lib/post/pricing';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { components } from '@/lib/api/schema';
import { humanize } from '@/lib/listing/facts';
import {
  MAX_PHOTOS,
  defaultTitle,
  describeAccuracy,
  parseCedis,
  periodFor,
  validateDraft,
  type DraftErrors,
  type Mode,
} from '@/lib/post/draft';
import { prepareImage, putWithProgress } from '@/lib/post/image';
import { runLimited } from '@/lib/post/limit';
import { quickQuestions } from '@/lib/post/questions';
import { CATEGORIES } from '@/lib/search/params';

import { confirmUpload, createListing, readyPhotos, requestUpload, saveAttributes, submitForReview } from './actions';

type TypeSchema = components['schemas']['TypeSchema'];

type Photo = {
  key: string;
  file: File;
  preview: string;
  progress: number;
  state: 'waiting' | 'uploading' | 'done' | 'failed';
  error?: string;
};

type Step = 'photos' | 'details' | 'sending' | 'extras' | 'done';

type Fix = { latitude: number; longitude: number; accuracy: number; manual?: boolean };

const labelFor = new Map<string, string>(CATEGORIES.map((c) => [c.value, c.label]));
// Up to six months, the legal maximum for a tenancy over six months.
const ADVANCE_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const OCCUPANCY_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 20, 50];

// Remounting with a new key resets every piece of state for "post another",
// and the unmount revokes the previous photos' previews, without a reload.
export function PostFlow({ types }: { types: TypeSchema[] }) {
  const [round, setRound] = useState(0);
  return <Flow key={round} types={types} onAgain={() => setRound((r) => r + 1)} />;
}

function Flow({ types, onAgain }: { types: TypeSchema[]; onAgain: () => void }) {
  const [step, setStep] = useState<Step>('photos');
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [type, setType] = useState<string>();
  const [mode, setMode] = useState<Mode>();
 const [selectedPeriod,setSelectedPeriod]=useState<PricePeriod>('month');
  const [fix, setFix] = useState<Fix>();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>();
  const [locality, setLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [digitalAddress, setDigitalAddress] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authorised, setAuthorised] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [price, setPrice] = useState('');
  const [advance, setAdvance] = useState(1);
  const [deposit, setDeposit] = useState('');
  const [occupancy, setOccupancy] = useState(2);
  const [errors, setErrors] = useState<DraftErrors>({});

  // Kept once created, so retrying a failed photo never creates a second
  // listing. A duplicate draft is the kind of mess a host cannot clean up.
  const [spaceId, setSpaceId] = useState<string>();
  const [sendError, setSendError] = useState<string>();
  const [signedOut, setSignedOut] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [ready, setReady] = useState(0);
  const [waitedLong, setWaitedLong] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schema = types.find((t) => t.type === type);
  const allowedModes = (schema?.modes ?? ['term', 'nightly']) as Mode[];
  const title = customTitle.trim() || (type ? defaultTitle(labelFor.get(type) ?? humanize(type), locality) : '');
  const period = selectedPeriod.replaceAll('_',' ');

  // Object URLs hold the whole image in memory until revoked.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const all = previews.current;
    return () => all.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Leaving mid-upload loses the photos still in flight, so the browser asks
  // first. Only during sending: warning on every page leave is its own harm.
  useEffect(() => {
    if (step !== 'sending') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [step]);

  // While the worker processes photos, poll until at least one is ready,
  // because the API refuses to submit a listing with no ready photo.
  useEffect(() => {
    if (step !== 'extras' || !spaceId || ready > 0) return;
    let stopped = false;
    const started = Date.now();
    const poll = async () => {
      while (!stopped) {
        const res = await readyPhotos(spaceId);
        if (stopped) return;
        if (res.ok && res.data > 0) {
          setReady(res.data);
          return;
        }
        if (Date.now() - started > 60_000) setWaitedLong(true);
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    void poll();
    return () => {
      stopped = true;
    };
  }, [step, spaceId, ready]);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const added = Array.from(files)
      .slice(0, room)
      .map((file) => {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        return { key: `${file.name}-${file.size}-${Math.random()}`, file, preview, progress: 0, state: 'waiting' as const };
      });
    setPhotos((p) => [...p, ...added]);
  }

  function removePhoto(key: string) {
    setPhotos((p) => {
      const gone = p.find((x) => x.key === key);
      if (gone) {
        URL.revokeObjectURL(gone.preview);
        previews.current.delete(gone.preview);
      }
      return p.filter((x) => x.key !== key);
    });
  }

  function chooseType(value: string) {
    setType(value);
    const modes = (types.find((t) => t.type === value)?.modes ?? ['term', 'nightly']) as Mode[];
    // One allowed mode is not a question worth asking.
    const next=mode && modes.includes(mode)?mode:modes[0]!;setMode(next);setSelectedPeriod(periodFor(next));
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setLocationError('This browser cannot share its location.');
      return;
    }
    setLocating(true);
    setLocationError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFix({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location is blocked. Allow it for this site in your browser settings, then try again.'
            : 'Your location could not be found. Step outside or near a window and try again.',
        );
      },
      // High accuracy uses GPS rather than cell towers; the walk times are only
      // as good as this point.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  function toDetails() {
    if (photos.length === 0) {
      setErrors({ photos: 'Add at least one photo. Listings with photos are the ones that get rented.' });
      return;
    }
    setErrors({});
    setStep('details');
  }

  async function uploadOne(id: string, photo: Photo) {
    const patch = (p: Partial<Photo>) =>
      setPhotos((all) => all.map((x) => (x.key === photo.key ? { ...x, ...p } : x)));

    patch({ state: 'uploading', progress: 0, error: undefined });
    try {
      const blob = await prepareImage(photo.file);
      const ticket = await requestUpload(id);
      if (!ticket.ok) {
        if (ticket.signedOut) setSignedOut(true);
        throw new Error(ticket.error);
      }
      if (ticket.data.maxBytes && blob.size > ticket.data.maxBytes) throw new Error('This photo exceeds the upload limit. Choose a smaller image.');
        await putWithProgress(ticket.data.uploadUrl, blob, ticket.data.headers, (f) => patch({ progress: f }));
      const confirmed = await confirmUpload(id, ticket.data.mediaId);
      if (!confirmed.ok) throw new Error(confirmed.error);
      patch({ state: 'done', progress: 1 });
    } catch (err) {
      patch({ state: 'failed', error: err instanceof Error ? err.message : 'Upload failed.' });
      throw err;
    }
  }

  async function send() {
    const draft = {
      type, mode, latitude: fix?.latitude, longitude: fix?.longitude,
      locality, landmark, price, advanceMonths: advance, occupancy, photos: photos.length,
    };
    const found = validateDraft(draft, allowedModes);
    if (!authorised) { setSendError('Confirm that you own this space or are authorised to list it.'); return; }
    const depositMinor = !deposit.trim() || /^0(?:\.0{1,2})?$/.test(deposit.trim()) ? 0 : parseCedis(deposit);
    if (depositMinor === null) { setSendError('Enter a valid deposit in cedis, or leave it blank.'); return; }
    if (title.length < 8) { setSendError('Use a listing title with at least 8 characters.'); return; }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStep('sending');
    setSendError(undefined);

    let id = spaceId;
    if (!id) {
      const created = await createListing({
        space_type: type as never,
        rental_mode: mode!,
        title,
        description: description.trim(),
        digital_address: digitalAddress.trim(),
        base_price_minor: parseCedis(price)!,
 price_period:selectedPeriod,
        deposit_minor: depositMinor,
        advance_months: mode === 'term' ? advance : 0,
        max_occupancy: occupancy,
        latitude: fix!.latitude,
        longitude: fix!.longitude,
        locality: locality.trim(),
        landmark: landmark.trim(),
      });
      if (!created.ok) {
        if (created.signedOut) setSignedOut(true);
        setSendError(created.error);
        setStep('details');
        return;
      }
      id = created.data.id;
      setSpaceId(id);
    }

    await uploadPending(id);
  }

  async function uploadPending(id: string) {
    setStep('sending');
    const pending = photos.filter((p) => p.state !== 'done');
    const results = await runLimited(pending.map((p) => () => uploadOne(id, p)), 1);
    // Decided from the results, not from state, which has not re-rendered yet.
    // Anything that failed stays on this screen with its own retry.
    if (results.every((r) => r.status === 'fulfilled')) {
      setStep('extras');
    }
  }

  async function finish() {
    if (!spaceId) return;
    setSubmitting(true);
    setSendError(undefined);

    const saved = await saveAttributes(spaceId, answers);
    if (!saved.ok) {
      // Answers are a bonus; failing to save them must not block the listing.
      console.error('attributes not saved', saved.error);
    }
    const submitted = await submitForReview(spaceId);
    setSubmitting(false);
    if (!submitted.ok) {
      if (submitted.signedOut) setSignedOut(true);
      setSendError(submitted.error);
      return;
    }
    setStep('done');
  }

  const uploaded = photos.filter((p) => p.state === 'done').length;
  const failed = photos.filter((p) => p.state === 'failed').length;
  const questions = quickQuestions(schema?.fields, {});

  if (signedOut) {
    return (
      <Panel title="Sign in to continue">
        <p className="text-body text-ink-muted">Your session ended. Anything already uploaded is saved to your listing.</p>
        <Link href="/login?next=/post" className={primary + ' mt-6'}>
          Sign in
        </Link>
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-center gap-2" aria-label="Listing progress">
        {['Photos', 'Details', 'Review'].map((label, index) => { const current = step === 'photos' ? 0 : step === 'details' ? 1 : 2; return <div key={label} className="flex flex-1 flex-col gap-2"><div className={`h-1 rounded-full ${index <= current ? 'bg-ink' : 'bg-line'}`} /><span className={`text-caption ${index === current ? 'font-semibold' : 'text-ink-muted'}`}>{index + 1}. {label}</span></div>; })}
      </div>
      {step === 'photos' ? (
        <Panel title="Show the space" subtitle="Photos first. Take them now or choose from your gallery.">
          {/* No capture attribute: phones then offer both the camera and the
              photo library, so photos taken earlier, or by a photographer,
              upload the same way. */}
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface p-6 text-center active:bg-sunk">
            <span className="text-headline">Add photos</span>
            <span className="text-footnote text-ink-muted">
              {photos.length === 0 ? 'Daylight, one of each room. Show each room, the entrance and key facilities.' : `${photos.length} of ${MAX_PHOTOS}`}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {errors.photos ? <Err>{errors.photos}</Err> : null}

          {photos.length > 0 ? (
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <li key={p.key} className="relative aspect-square overflow-hidden rounded-md bg-sunk">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL; there is nothing to optimise */}
                  <img src={p.preview} alt="" className="size-full object-cover" />
                  {i > 0 ? <button type="button" onClick={() => setPhotos((all) => [all[i]!, ...all.filter((_, index) => index !== i)])} className="absolute bottom-1 left-1 min-h-11 rounded-md bg-surface/95 px-2 text-caption font-semibold">Make cover</button> : null}
                  {i === 0 ? (
                    <span className="absolute bottom-1 left-1 rounded-sm bg-ink/75 px-1.5 py-0.5 text-caption font-semibold text-paper">
                      Cover
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.key)}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-ink/75 text-paper"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button type="button" onClick={toDetails} className={primary + ' mt-6 w-full'}>
            Continue
          </button>
        </Panel>
      ) : null}

      {step === 'details' ? (
        <Panel title="Tell us about your space" subtitle="Clear details help the right people find you.">
          <Question n={1} label="What kind of space is it?">
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <Chip key={t.type} selected={type === t.type} onClick={() => chooseType(t.type)}>
                  {labelFor.get(t.type) ?? humanize(t.type)}
                </Chip>
              ))}
            </div>
            {errors.type ? <Err>{errors.type}</Err> : null}

            {type && allowedModes.length > 1 ? (
              <div className="mt-3 inline-flex rounded-md bg-sunk p-0.5">
                {allowedModes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {setMode(m);setSelectedPeriod(periodFor(m));}}
                    aria-pressed={mode === m}
                    className={`h-10 min-w-28 rounded-[8px] px-3 text-subheadline ${
                      mode === m ? 'bg-surface font-semibold ring-1 ring-line' : 'text-ink-muted'
                    }`}
                  >
                    {m === 'term' ? 'Monthly' : m==='flexible' ? 'Hourly / daily' : 'Nightly'}
                  </button>
                ))}
              </div>
            ) : null}
            {errors.mode ? <Err>{errors.mode}</Err> : null}
          </Question>

          <Field label="Listing title, optional">
            <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={title || 'A bright self-contained room in Madina'} maxLength={120} className={input} />
          </Field>
          <Field label="About your space, optional">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell renters about the rooms, water, power, access and anything they should know." maxLength={5000} rows={4} className="field-input" />
          </Field>
          <Question n={2} label="Where is it?">
            <button type="button" onClick={locate} disabled={locating} className={secondary + ' w-full'}>
              {locating ? 'Finding you' : fix ? 'Update location' : 'Use my current location'}
            </button>
            {fix ? (
              <p className={`mt-2 text-footnote ${describeAccuracy(fix.accuracy) === 'good' ? 'text-ink-muted' : 'text-danger'}`}>
                {fix.manual ? 'Map coordinates added. Check that they point to the space. Renters only see the approximate area.' : describeAccuracy(fix.accuracy) === 'good'
                  ? `Location added, accurate to about ${fix.accuracy} m. Renters only see the area, not the house.`
                  : `Only accurate to about ${fix.accuracy} m. Step outside and update it, so walk times are right.`}
              </p>
            ) : (
              <p className="mt-2 text-footnote text-ink-subtle">Easiest while you are at the space.</p>
            )}
            {locationError ? <Err>{locationError}</Err> : null}
            {errors.location && !fix ? <Err>{errors.location}</Err> : null}

            <button type="button" onClick={() => setManualLocation((v) => !v)} className="mt-2 min-h-11 text-footnote font-semibold underline">{manualLocation ? 'Hide coordinate fields' : 'Enter map coordinates instead'}</button>
            {manualLocation && <div className="rounded-lg border border-line p-4"><p className="text-footnote leading-5 text-ink-muted">Copy the latitude and longitude of the space from your map app. Use the space’s location, even if you are somewhere else.</p><div className="grid grid-cols-2 gap-3"><Field label="Latitude"><input type="number" step="any" min={-90} max={90} value={manualLatitude} onChange={(e) => setManualLatitude(e.target.value)} className={input} /></Field><Field label="Longitude"><input type="number" step="any" min={-180} max={180} value={manualLongitude} onChange={(e) => setManualLongitude(e.target.value)} className={input} /></Field></div><button type="button" className={secondary + ' mt-3 w-full'} onClick={() => { const latitude = Number(manualLatitude), longitude = Number(manualLongitude); if (!manualLatitude.trim() || !manualLongitude.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { setLocationError('Enter valid latitude and longitude values.'); return; } setFix({ latitude, longitude, accuracy: 0, manual: true }); setLocationError(undefined); }}>Use these coordinates</button></div>}
            <Field label="Area" error={errors.locality}>
              <input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Madina" maxLength={80} autoComplete="address-level2" className={input} />
            </Field>
            <Field label="Nearby landmark, optional">
              <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near Madina Market" maxLength={120} className={input} />
            </Field>
            <Field label="GhanaPostGPS digital address, optional"><input value={digitalAddress} onChange={(e) => setDigitalAddress(e.target.value)} placeholder="GA-123-4567" maxLength={80} className={input} /></Field>
          </Question>

          <Question n={3} label="What is the price?">
 <Field label="Price period"><select value={selectedPeriod} onChange={(e)=>setSelectedPeriod(e.target.value as PricePeriod)} className={input}>{allowedPeriods(type ?? '',mode ?? 'term').map((p)=><option key={p} value={p}>{p.replaceAll('_',' ')}</option>)}</select></Field>
            <div className={`flex h-12 items-center gap-2 rounded-md border bg-surface px-4 ${errors.price ? 'border-danger' : 'border-line-strong'}`}>
              <span className="text-body text-ink-muted">GHS</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="1,300"
                aria-label={`Price per ${period}`}
                className="tabular min-w-0 flex-1 bg-transparent text-body outline-none"
              />
              <span className="text-body text-ink-muted">/ {period}</span>
            </div>
            {errors.price ? <Err>{errors.price}</Err> : null}

            <Field label="Deposit in GHS, optional"><input value={deposit} onChange={(e) => setDeposit(e.target.value)} inputMode="decimal" placeholder="0" className={input} /></Field>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {mode === 'term' ? (
                <Field label="Rent paid upfront" error={errors.advance}>
                  <select value={advance} onChange={(e) => setAdvance(Number(e.target.value))} className={input}>
                    {ADVANCE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m === 0 ? 'None' : `${m} month${m === 1 ? '' : 's'}`}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Up to how many people" error={errors.occupancy}>
                <select value={occupancy} onChange={(e) => setOccupancy(Number(e.target.value))} className={input}>
                  {OCCUPANCY_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Question>

          {mode === 'term' ? (
            <p className="mt-3 text-footnote text-ink-subtle">
              Ghana’s Rent Act limits advance rent to six months for tenancies over six months.
            </p>
          ) : null}

          <p className="mt-6 text-footnote text-ink-muted">
            Renters who are signed in can see your phone number and chat with you here.
          </p>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4 text-subheadline leading-6"><input type="checkbox" checked={authorised} onChange={(e) => setAuthorised(e.target.checked)} className="mt-1 size-5 shrink-0 accent-ink" /><span>I own this space or have the owner’s permission to list and manage it.</span></label>
          {title ? (
            <p className="mt-3 text-footnote text-ink-muted">
              It will be listed as <span className="font-semibold text-ink">{title}</span>. Check the title before posting.
            </p>
          ) : null}
          {sendError ? <Err>{sendError}</Err> : null}

          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => setStep('photos')} className={secondary}>
              Back
            </button>
            <button type="button" onClick={send} className={primary + ' flex-1'}>
              Post it
            </button>
          </div>
        </Panel>
      ) : null}

      {step === 'sending' ? (
        <Panel title="Uploading your photos" subtitle={`${uploaded} of ${photos.length} done`}>
          <ul className="space-y-3">
            {photos.map((p, i) => (
              <li key={p.key} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
                <img src={p.preview} alt="" className="size-12 shrink-0 rounded-sm object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-subheadline">Photo {i + 1}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunk" aria-label={`Photo ${i + 1} upload progress`} role="progressbar" aria-valuenow={Math.round(p.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className={`h-full ${p.state === 'failed' ? 'bg-danger' : 'bg-state'}`}
                      style={{ width: `${Math.round((p.state === 'done' ? 1 : p.progress) * 100)}%` }}
                    />
                  </div>
                  {p.error ? <p className="mt-1 text-footnote text-danger">{p.error}</p> : null}
                </div>
              </li>
            ))}
          </ul>

          {failed > 0 && uploaded + failed === photos.length ? (
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" onClick={() => spaceId && uploadPending(spaceId)} className={primary}>
                Try the {failed} again
              </button>
              {uploaded > 0 ? (
                <button type="button" onClick={() => setStep('extras')} className={secondary}>
                  Continue without them
                </button>
              ) : null}
            </div>
          ) : null}
        </Panel>
      ) : null}

      {step === 'extras' ? (
        <Panel
          title={ready > 0 ? 'Ready to send' : 'Processing your photos'}
          subtitle={questions.length ? 'While that happens: a few taps that help renters decide. Skip any.' : undefined}
        >
          {questions.map((q) => (
            <Question key={q.key} label={q.label}>
              <div className="flex flex-wrap gap-2">
                {(q.kind === 'bool' ? [true, false] : (q.options ?? [])).map((opt) => (
                  <Chip
                    key={String(opt)}
                    selected={answers[q.key] === opt}
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt }))}
                  >
                    {typeof opt === 'boolean' ? (opt ? 'Yes' : 'No') : humanize(opt)}
                  </Chip>
                ))}
              </div>
            </Question>
          ))}

          {waitedLong && ready === 0 ? (
            <p className="mt-4 text-footnote text-ink-muted">
              This is taking longer than usual. Your listing and photos are saved; this page will carry on as soon as they are ready.
            </p>
          ) : null}
          {sendError ? <Err>{sendError}</Err> : null}

          <button type="button" onClick={finish} disabled={ready === 0 || submitting} className={primary + ' mt-6 w-full'}>
            {ready === 0 ? 'Processing photos' : submitting ? 'Sending' : 'Send for review'}
          </button>
        </Panel>
      ) : null}

      {step === 'done' ? (
        <Panel title="Sent for review">
          <p className="text-body text-ink-muted">
            We check every new listing before it goes live,. Once approved, it appears in search.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/hosting" className={primary}>
              See my listings
            </Link>
            <button type="button" onClick={onAgain} className={secondary}>
              Post another space
            </button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

const primary =
  'flex h-12 items-center justify-center rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed disabled:opacity-50';
const secondary =
  'flex h-12 items-center justify-center rounded-md border border-line-strong bg-surface px-6 text-headline active:bg-sunk disabled:opacity-50';
const input = 'h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-body';

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-large-title">{title}</h1>
      {subtitle ? <p className="mt-2 text-body text-ink-muted">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Question({ n, label, children }: { n?: number; label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-6 first:mt-0">
      <legend className="text-headline">
        {n ? <span className="tabular mr-2 text-ink-subtle">{n}</span> : null}
        {label}
      </legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-footnote text-ink-muted">{label}</span>
      {children}
      {error ? <Err>{error}</Err> : null}
    </label>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-11 items-center rounded-full border px-4 text-subheadline ${
        selected ? 'border-state bg-state-wash font-semibold text-state-ink' : 'border-line bg-surface text-ink-muted active:bg-sunk'
      }`}
    >
      {children}
    </button>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-footnote text-danger">
      {children}
    </p>
  );
}
