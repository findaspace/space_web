import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { site } from './site';

// Metadata cannot read a CSS variable, so the browser chrome colour is written
// twice. This test is what stops the two drifting apart the first time someone
// adjusts the palette.
describe('site', () => {
  it('uses the same theme colour as the paper token', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../app/globals.css'), 'utf8');
    const match = css.match(/--color-paper:\s*(#[0-9a-fA-F]{6})/);
    expect(match?.[1]?.toUpperCase()).toBe(site.themeColor.toUpperCase());
  });
});
