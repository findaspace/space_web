'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { allowedPeriods, type PricePeriod } from '@/lib/post/pricing';
import { parseCedis } from '@/lib/post/draft';

import { confirmUpload, readyPhotos, requestUpload, submitForReview } from '@/app/(app)/post/actions';
import { Icon } from '@/components/ui/icon';
import type { components } from '@/lib/api/schema';
import { humanize } from '@/lib/listing/facts';
import { MAX_PHOTOS } from '@/lib/post/draft';
import { prepareImage, putWithProgress } from '@/lib/post/image';

import { updateListingAttributes,updateListingCore,withdrawListing,removeListingPhoto,reorderListingPhotos,refreshListingPhotos } from './actions';

type Field = components['schemas']['FieldSchema'];
export function ListingManager({ listing, fields, media, modes }: { listing: components['schemas']['HostListing']; fields: Field[]; media: components['schemas']['Media'][]; modes: string[] }) {
  const [photos,setPhotos]=useState(media);
 const [core,setCore]=useState({title:listing.title,description:listing.description ?? '',price:String(listing.base_price_minor/100),deposit:String((listing.deposit_minor ?? 0)/100),advance:listing.advance_months ?? 0,occupancy:listing.max_occupancy ?? 1,mode:listing.rental_mode,period:listing.price_period,latitude:listing.location.latitude,longitude:listing.location.longitude,locality:listing.location.locality,region:listing.location.region ?? '',landmark:listing.location.landmark ?? '',digital_address:listing.location.digital_address ?? ''});
  const [attributes, setAttributes] = useState<Record<string, unknown>>(listing.attributes);
  const [status, setStatus] = useState(listing.status);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(media.length);
  const [progress, setProgress] = useState(0);
  async function saveCore() {
    setBusy(true);setError('');setMessage('');
    const price=parseCedis(core.price),deposit=core.deposit.trim()==='' || /^0(?:\.0{1,2})?$/.test(core.deposit.trim())?0:parseCedis(core.deposit);
    if(price===null || deposit===null){setError('Enter valid prices in GHS.');setBusy(false);return;}
    const result=await updateListingCore({id:listing.id,title:core.title,description:core.description,base_price_minor:price,deposit_minor:deposit,advance_months:core.mode==='term'?core.advance:0,max_occupancy:core.occupancy,rental_mode:core.mode,price_period:core.period,latitude:core.latitude,longitude:core.longitude,locality:core.locality,region:core.region,landmark:core.landmark,digital_address:core.digital_address});
    setBusy(false);if(result.ok){setStatus('draft');setMessage('Your listing information has been saved. Send it for review when ready.');}else setError(result.error);
  }
  async function withdraw(){setBusy(true);setError('');const result=await withdrawListing(listing.id);setBusy(false);if(result.ok){setStatus('draft');setMessage('Your listing is now a draft. Edit it, then send it for review.');}else setError(result.error);}
  async function removePhoto(id:string){setBusy(true);setError('');const result=await removeListingPhoto(listing.id,id);setBusy(false);if(result.ok){setPhotos((all)=>all.filter((p)=>p.id!==id));setCount((n)=>Math.max(0,n-1));setMessage('Photo removed.');}else setError(result.error);}
  async function movePhoto(index:number,direction:number){const next=[...photos],target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target]!,next[index]!];setBusy(true);setError('');const result=await reorderListingPhotos(listing.id,next.map((p)=>p.id));setBusy(false);if(result.ok){setPhotos(result.data);setMessage('Photo order saved. The first photo is your cover.');}else setError(result.error);}
  async function refreshPhotos(){setBusy(true);setError('');const result=await refreshListingPhotos(listing.id);setBusy(false);if(result.ok){setPhotos(result.data);setCount((n)=>Math.max(n,result.data.length));setMessage('Ready photos refreshed.');}else setError(result.error);}
  async function save() {
    setBusy(true); setError(''); setMessage('');
    const result = await updateListingAttributes({ id: listing.id, attributes });
    setBusy(false);
    if (result.ok) {setStatus('draft');setMessage('Your listing details have been saved.');} else setError(result.error);
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (files.length + count > MAX_PHOTOS) { setError(`Choose fewer photos. The frontend allows ${MAX_PHOTOS} per space; your account’s upload limit may be lower.`); return; }
    setBusy(true); setError(''); setMessage('');
    let uploaded = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) throw new Error('Choose image files.');
        const blob = await prepareImage(file);
        const ticket = await requestUpload(listing.id);
        if (!ticket.ok) throw new Error(ticket.error);
        if (ticket.data.maxBytes && blob.size > ticket.data.maxBytes) throw new Error('This photo exceeds the upload limit. Choose a smaller image.');
        await putWithProgress(ticket.data.uploadUrl, blob, ticket.data.headers, (value) => setProgress(Math.round((uploaded + value) / files.length * 100)));
        const result = await confirmUpload(listing.id, ticket.data.mediaId);
        if (!result.ok) throw new Error(result.error);
        uploaded++; setCount((n) => n + 1);
      }
      setMessage(`${uploaded} ${uploaded === 1 ? 'photo uploaded' : 'photos uploaded'}. Processing may take a moment. Refresh to see ready photos.`);
    } catch (err) { setError(`${err instanceof Error ? err.message : 'Upload failed.'}${uploaded ? ` ${uploaded} photos were already uploaded.` : ''}`); }
    setBusy(false);
  }
  async function submit() {
    setBusy(true); setError(''); setMessage('');
    const ready = await readyPhotos(listing.id);
    if (!ready.ok || ready.data < 1) { setError(ready.ok ? 'Wait until at least one uploaded photo is ready, then try again.' : ready.error); setBusy(false); return; }
    const result = await submitForReview(listing.id);
    setBusy(false);
    if (result.ok) { setStatus('in_review'); setMessage('Your listing has been sent for review.'); } else setError(result.error);
  }
  return <div className="mt-5 space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sunk p-4"><p className="text-subheadline">Status: <strong>{humanize(status)}</strong></p>{status === 'published' && <Link href={`/s/${listing.slug}`} className="text-subheadline font-semibold underline">View public listing</Link>}</div>
    {error && <p role="alert" className="rounded-lg border border-ink p-4 text-subheadline">{error}</p>}{message && <p role="status" className="rounded-lg bg-sunk p-4 text-subheadline">{message}</p>}
    <section className="rounded-[20px] border border-line p-5 md:p-7"><h2 className="section-title">Photos</h2><p className="mt-2 text-subheadline text-ink-muted">First photo is the cover. Upload a replacement before removing the last photo of a live listing.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo,index)=><div key={photo.id} className="overflow-hidden rounded-lg border border-line"><Image src={photo.url} width={500} height={400} alt={`Listing photo ${index+1}`} className="aspect-square w-full object-cover"/><div className="flex flex-wrap gap-1 p-2">{index===0&&<span className="py-2 text-caption font-semibold">Cover</span>}<button type="button" disabled={busy||index===0} onClick={()=>movePhoto(index,-1)} className="secondary-button px-2 disabled:opacity-40" aria-label={`Move photo ${index+1} earlier`}>←</button><button type="button" disabled={busy||index===photos.length-1} onClick={()=>movePhoto(index,1)} className="secondary-button px-2 disabled:opacity-40" aria-label={`Move photo ${index+1} later`}>→</button><button type="button" disabled={busy} onClick={()=>removePhoto(photo.id)} className="min-h-11 px-2 text-caption underline" aria-label={`Remove photo ${index+1}`}>Remove</button></div></div>)}</div><label className="secondary-button mt-4 cursor-pointer"><Icon name="plus"/>Add photos<input type="file" accept="image/*" multiple disabled={busy} onChange={(e)=>{void upload(e.target.files);e.target.value='';}} className="sr-only"/></label><button type="button" onClick={refreshPhotos} disabled={busy} className="secondary-button mt-4 ml-2">Refresh ready photos</button>{busy&&progress>0&&<p role="status" className="mt-3 text-subheadline">Uploading {progress}%</p>}</section>
    <section className="rounded-[20px] border border-line p-5 md:p-7"><h2 className="section-title">Listing information</h2>{status==='published'&&<div className="mt-3"><p className="text-subheadline leading-6 text-ink-muted">Withdraw your live listing to edit it. It returns to review before appearing in search again.</p><button type="button" onClick={withdraw} disabled={busy} className="secondary-button mt-3">Withdraw to edit</button></div>}<form onSubmit={(e)=>{e.preventDefault();void saveCore();}}><fieldset disabled={busy||(status!=='draft'&&status!=='in_review')} className="mt-5 grid gap-4 sm:grid-cols-2 disabled:opacity-60">
    <label className="sm:col-span-2">Title<input className="field-input mt-2" value={core.title} maxLength={120} required minLength={8} onChange={(e)=>setCore({...core,title:e.target.value})}/></label>
    <label className="sm:col-span-2">Description<textarea className="field-input mt-2" rows={4} value={core.description} maxLength={5000} onChange={(e)=>setCore({...core,description:e.target.value})}/></label>
    <label>Rental mode<select className="field-input mt-2" value={core.mode} onChange={(e)=>{const mode=e.target.value as typeof core.mode;setCore({...core,mode,period:allowedPeriods(listing.space_type,mode)[0]!});}}>{modes.map((m)=><option key={m} value={m}>{m==='term'?'Long term':m==='nightly'?'Short stay':'Hourly / daily'}</option>)}</select></label>
    <label>Price period<select className="field-input mt-2" value={core.period} onChange={(e)=>setCore({...core,period:e.target.value as PricePeriod})}>{allowedPeriods(listing.space_type,core.mode).map((p)=><option key={p} value={p}>{humanize(p)}</option>)}</select></label>
    <label>Price in GHS<input className="field-input mt-2" value={core.price} inputMode="decimal" onChange={(e)=>setCore({...core,price:e.target.value})}/></label><label>Deposit in GHS<input className="field-input mt-2" value={core.deposit} inputMode="decimal" onChange={(e)=>setCore({...core,deposit:e.target.value})}/></label>
    <label>Advance months<input className="field-input mt-2" type="number" min={0} max={6} disabled={core.mode!=='term'} value={core.advance} onChange={(e)=>setCore({...core,advance:Number(e.target.value)})}/></label><label>Maximum occupancy<input className="field-input mt-2" type="number" min={1} max={500} value={core.occupancy} onChange={(e)=>setCore({...core,occupancy:Number(e.target.value)})}/></label>
    {(['locality','region','landmark','digital_address'] as const).map((name)=><label key={name}>{humanize(name)}<input className="field-input mt-2" value={core[name]} maxLength={name==='landmark'?120:80} onChange={(e)=>setCore({...core,[name]:e.target.value})}/></label>)}
    {(['latitude','longitude'] as const).map((name)=><label key={name}>{humanize(name)}<input className="field-input mt-2" type="number" step="any" min={name==='latitude'?-90:-180} max={name==='latitude'?90:180} value={core[name]} onChange={(e)=>setCore({...core,[name]:Number(e.target.value)})}/></label>)}
    <button type="submit" className="primary-button sm:col-span-2">Save listing information</button></fieldset></form></section>
    {fields.length > 0 && <section className="rounded-[20px] border border-line p-5 md:p-7"><h2 className="section-title">Help renters decide</h2><p className="mt-2 text-footnote text-ink-muted">Keep these details accurate. Only describe facilities the space actually has.</p><form className="mt-5 space-y-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>{fields.map((f) => <label key={f.key} className="block"><span className="mb-2 block text-subheadline font-semibold">{f.label}{f.unit ? ` (${f.unit})` : ''}</span>{f.kind === 'bool' || f.kind === 'enum' ? <select className="field-input" value={attributes[f.key] === undefined ? '' : String(attributes[f.key])} onChange={(e) => setAttributes((all) => { const next = { ...all }; if (!e.target.value) delete next[f.key]; else next[f.key] = f.kind === 'bool' ? e.target.value === 'true' : e.target.value; return next; })}><option value="">Not specified</option>{(f.kind === 'bool' ? ['true', 'false'] : f.options ?? []).map((value) => <option key={value} value={value}>{f.kind === 'bool' ? value === 'true' ? 'Yes' : 'No' : humanize(value)}</option>)}</select> : <input className="field-input" type={f.kind === 'int' || f.kind === 'float' ? 'number' : 'text'} step={f.kind === 'float' ? 'any' : 1} maxLength={500} value={attributes[f.key] === undefined ? '' : String(attributes[f.key])} onChange={(e) => setAttributes((all) => { const next = { ...all }; if (!e.target.value) delete next[f.key]; else next[f.key] = f.kind === 'int' || f.kind === 'float' ? Number(e.target.value) : e.target.value; return next; })} />}</label>)}<button type="submit" disabled={busy||(status!=='draft'&&status!=='in_review')} className="primary-button disabled:opacity-50">{busy ? 'Saving…' : 'Save details'}</button></form></section>}
    {status === 'draft' && <section className="rounded-[20px] border border-line p-5 md:p-7"><h2 className="section-title">Ready to open the door?</h2><p className="mt-3 text-subheadline leading-6 text-ink-muted">Save your details and upload at least one photo. We review new listings before they appear in search.</p><button type="button" disabled={busy} onClick={submit} className="primary-button mt-5 disabled:opacity-50">Send for review</button></section>}
  </div>;
}
