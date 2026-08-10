/// <reference types="astro/client" />

// `tsc` (used by `npm run typecheck`) does not type-check `.astro` files as
// inputs, so `.astro`-to-`.astro` imports go unchecked and need no ambient
// declaration. A plain `.ts` module (e.g. src/lib/tool-widgets.ts) importing
// `.astro` components is checked, though, and has no built-in module type —
// astro/client.d.ts declares `*.md`, `*.svg`, etc. but not `*.astro`.
declare module '*.astro' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component: any;
  export default Component;
}
