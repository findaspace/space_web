'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { actionClient, failure, signedOut, type ActionResult } from '@/lib/api/action';
import { unwrap } from '@/lib/api/client';

const inputSchema = z.object({ id: z.uuid(), attributes: z.record(z.string().max(80), z.unknown()) });
export async function updateListingAttributes(input: z.infer<typeof inputSchema>): Promise<ActionResult<null>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || Object.keys(parsed.data.attributes).length > 100 || JSON.stringify(parsed.data.attributes).length > 20000) return { ok: false, error: 'Check the listing details.' };
  const client = await actionClient();
  if (!client) return signedOut;
  try {
    await unwrap(client.PATCH('/v1/spaces/{id}', { params: { path: { id: parsed.data.id } }, body: { attributes: parsed.data.attributes } }));
    revalidatePath(`/hosting/${parsed.data.id}`);
    revalidatePath('/hosting');
    return { ok: true, data: null };
  } catch (error) { return failure(error); }
}

const coreSchema=z.object({id:z.uuid(),title:z.string().trim().min(8).max(120),description:z.string().trim().max(5000),base_price_minor:z.number().int().positive(),deposit_minor:z.number().int().nonnegative(),advance_months:z.number().int().min(0).max(6),max_occupancy:z.number().int().min(1).max(500),rental_mode:z.enum(['term','nightly','flexible']),price_period:z.enum(['hour','day','night','week','month','year','semester','academic_year']),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),locality:z.string().trim().min(1).max(80),region:z.string().trim().max(80),landmark:z.string().trim().max(120),digital_address:z.string().trim().max(80)});
export async function updateListingCore(input:z.infer<typeof coreSchema>):Promise<ActionResult<null>> {
 const parsed=coreSchema.safeParse(input);
 if(!parsed.success)return {ok:false,error:'Check your title, price, coordinates and rental terms.'};
 const client=await actionClient();if(!client)return signedOut;
 try{const {id,...body}=parsed.data;await unwrap(client.PATCH('/v1/spaces/{id}',{params:{path:{id}},body}));revalidatePath(`/hosting/${id}`);revalidatePath('/hosting');revalidatePath('/');return {ok:true,data:null};}catch(error){return failure(error);}
}
export async function withdrawListing(id:string):Promise<ActionResult<null>> {
 if(!z.uuid().safeParse(id).success)return {ok:false,error:'Unknown listing.'};
 const client=await actionClient();if(!client)return signedOut;
 try{await unwrap(client.POST('/v1/spaces/{id}/withdraw',{params:{path:{id}}}));revalidatePath(`/hosting/${id}`);revalidatePath('/hosting');revalidatePath('/');return {ok:true,data:null};}catch(error){return failure(error);}
}
export async function removeListingPhoto(id:string,mediaId:string):Promise<ActionResult<null>> {
 if(!z.uuid().safeParse(id).success||!z.uuid().safeParse(mediaId).success)return {ok:false,error:'Unknown photo.'};
 const client=await actionClient();if(!client)return signedOut;
 try{await unwrap(client.DELETE('/v1/spaces/{id}/media/{mediaId}',{params:{path:{id,mediaId}}}));revalidatePath(`/hosting/${id}`);return {ok:true,data:null};}catch(error){return failure(error);}
}
export async function reorderListingPhotos(id:string,ids:string[]) {
 if(!z.uuid().safeParse(id).success||ids.length>20||!ids.every((value)=>z.uuid().safeParse(value).success)||new Set(ids).size!==ids.length)return {ok:false as const,error:'Check the photo order.'};
 const client=await actionClient();if(!client)return signedOut;
 try{const result=await unwrap(client.PUT('/v1/spaces/{id}/media/order',{params:{path:{id}},body:{ids}}));revalidatePath(`/hosting/${id}`);return {ok:true as const,data:result.media};}catch(error){return failure(error);}
}
export async function refreshListingPhotos(id:string) {
 if(!z.uuid().safeParse(id).success)return {ok:false as const,error:'Unknown listing.'};
 const client=await actionClient();if(!client)return signedOut;
 try{const result=await unwrap(client.GET('/v1/spaces/{id}/media',{params:{path:{id}}}));return {ok:true as const,data:result.media};}catch(error){return failure(error);}
}
