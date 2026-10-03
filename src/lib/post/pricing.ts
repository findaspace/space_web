import type { components } from '@/lib/api/schema';
export type PricePeriod=components['schemas']['HostListing']['price_period'];
export function allowedPeriods(type:string,mode:string):PricePeriod[] {
 if(mode==='flexible')return ['hour','day','week'];
 if(mode==='nightly')return ['night','week'];
 return type==='hostel_bed'?['month','year','semester','academic_year']:['month','year'];
}
