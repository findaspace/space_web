import { describe,it,expect } from 'vitest';
import { allowedPeriods } from './pricing';
import { parseSearch,toApiQuery } from '../search/params';
describe('supported price periods',()=>{
 it('offers academic rates for hostel beds',()=>{expect(allowedPeriods('hostel_bed','term')).toContain('academic_year');expect(allowedPeriods('apartment','term')).not.toContain('semester');});
 it('offers hours and days for flexible spaces',()=>{expect(allowedPeriods('football_pitch','flexible')).toEqual(['hour','day','week']);});
 it('sends exact hourly period with the budget',()=>{expect(toApiQuery(parseSearch(new URLSearchParams('group=sports&mode=hourly&max=200')))).toMatchObject({type:'football_pitch,sports_court,sports_facility',mode:'flexible',price_period:'hour',max_price:20000});});
 it('separates academic-year rates from monthly rates',()=>{expect(toApiQuery(parseSearch(new URLSearchParams('mode=academic_year')))).toMatchObject({mode:'term',price_period:'academic_year'});});
});
