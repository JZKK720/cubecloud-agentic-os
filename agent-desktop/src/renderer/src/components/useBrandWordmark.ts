// Locale-aware brand wordmark hook.
//
// Returns the path to the brand wordmark SVG that should be rendered
// for the current app locale. The bilingual cubecloud + 智方云 mark is
// returned for the Simplified Chinese locale (zh-CN) — the Chinese
// brand 智方云 is the legal Chinese mark owned by Cubecloud Limited
// Company, and showing the bilingual mark to Chinese users is the
// product equivalent of the bilingual mark that lives at the top of
// every README on the monorepo. All other locales fall back to the
// English-only cubecloud wordmark, which preserves the in-product
// brand for users who do not read Chinese.
//
// Adding a new locale whose native script is also CJK (zh-TW, ja-JP,
// ko-KR) is intentionally a one-line change here, not a refactor of
// every consumer — see the comment on the locale set below.
import { useI18n } from "./useI18n";
import cubecloudWordmark from "../assets/cubecloud-wordmark.svg";
import cubecloudZhifangyun from "../assets/cubecloud-zhifangyun.svg";

/** Locales that should see the bilingual (cubecloud + 智方云) wordmark.
 *  Extend this set when a new CJK locale wants the bilingual mark. */
const BILINGUAL_LOCALES = new Set<AppLocale>(["zh-CN"]);

export function useBrandWordmark(): string {
  const { locale } = useI18n();
  return BILINGUAL_LOCALES.has(locale)
    ? cubecloudZhifangyun
    : cubecloudWordmark;
}
