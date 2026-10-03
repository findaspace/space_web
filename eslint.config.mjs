import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// The design rules, enforced where they can actually be broken.
//
// globals.css already deletes Tailwind's default palette, shadows and radii,
// so bg-violet-600 generates nothing. But Tailwind does not complain about a
// class it cannot generate: it just emits no CSS and the element silently
// renders unstyled. These rules turn that silence into a build failure.

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

const COLOUR_PROPS =
  'color|background|backgroundColor|borderColor|borderTopColor|borderBottomColor|outlineColor|fill|stroke|boxShadow';

const message = {
  hex: 'Colour literals are banned. Use a token from globals.css: bg-action, text-ink, border-line.',
  palette: 'Tailwind default colours do not exist in this build. Use a semantic token from globals.css.',
  gradient: 'Gradients belong to the logo and nowhere else. Use a flat token.',
};

// A rule has to see both plain strings and template literals, because
// className is written both ways.
const bothKinds = (pattern, text) => [
  { selector: `Literal[value=${pattern}]`, message: text },
  { selector: `TemplateElement[value.raw=${pattern}]`, message: text },
];

const designRules = [
  // Tailwind arbitrary colours: bg-[#7C3AED], text-[#fff].
  ...bothKinds('/\\[#[0-9a-fA-F]{3,8}\\]/', message.hex),

  // Default palette names that the build has deleted: bg-violet-600, text-gray-500.
  ...bothKinds(`/\\b(?:bg|text|border|ring|fill|stroke|outline|divide|placeholder|accent|caret|decoration)-(?:${PALETTE})-\\d{2,3}\\b/`, message.palette),

  // Gradient utilities. The from-, via- and to- stops are left alone: they do
  // nothing without one of these, and banning them would also flag ordinary
  // strings such as "/back-to-top".
  ...bothKinds('/\\bbg-(?:linear|radial|conic|gradient)-/', message.gradient),

  // Inline style colours: style={{ color: '#111827' }}.
  {
    selector: `Property[key.name=/^(?:${COLOUR_PROPS})$/] > Literal[value=/^#|rgb|hsl|oklch/]`,
    message: message.hex,
  },
];

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    // eslint-plugin-react auto-detects the React version by calling
    // context.getFilename(), which ESLint 10 removed. Stating the version skips
    // the detection entirely. Delete this once eslint-config-next ships a
    // plugin built for ESLint 10.
    settings: { react: { version: '19.3' } },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'src/lib/api/schema.d.ts', 'next-env.d.ts', 'public/maplibre/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...designRules],
    },
  },
  {
    // `const { owner, ...rest } = row` is how a field is deliberately left out
    // of an object; the named field is unused by design.
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true }],
    },
  },
  {
    // Two files legitimately hold colours as data: the token file is CSS and
    // never linted here, and site.ts carries the theme colour metadata needs.
    // Tests hold them as expectations. Everything else goes through tokens.
    files: ['src/lib/site.ts', 'src/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];

export default config;
