// Brand facts that metadata, the manifest and OG images all need. One place,
// so a rename is a one-line change rather than a search.
export const site = {
  name: 'Findaspace',
  tagline: 'Space for the way you live',
  description:
    'Find rooms, homes, hostels, workspaces and event spaces in Ghana. Browse freely and contact owners or authorised managers directly.',
  locale: 'en-GH',

  // Must equal --color-paper in globals.css. Metadata cannot read a CSS
  // variable, so this is duplicated on purpose and a test keeps the two equal.
  themeColor: '#FFFFFF',

  // The named booking protection, in the style of Airbnb's AirCover and
  // Vrbo's VrboCare. A working name until the founders choose one; every
  // mention on the site reads it from here, so renaming is one line.
  protection: 'Findaspace Protect',
} as const;
