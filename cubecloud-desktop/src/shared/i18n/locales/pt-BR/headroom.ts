// English-copy fallback. The repo-localized set
// is en + zh-CN; for the other 6 locales the source of
// truth lives in en/headroom.ts and the locale files
// re-export it so operators always see real strings
// without empty UI. Native-speaker review is a follow-up.

import en from "../en/headroom";

export default {
  quickStart: {
    ...en.quickStart,
  },
} as const;
