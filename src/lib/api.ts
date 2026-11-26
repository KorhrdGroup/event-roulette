/**
 * 룰렛 API — 이 사이트의 서버(/api/roulette/{slug})가 인증 문자(네이버 SENS) · 추첨 · 상담 신청을 처리하고
 * 한평생오피스 DB(문의DB)에 바로 넣는다. 같은 사이트라 주소 앞부분이 없다.
 */

/** 이 사이트 첫 화면이 보여 주는 이벤트 — NEXT_PUBLIC_ROULETTE_SLUG (오피스 roulette_events.slug) */
export const DEFAULT_SLUG = process.env.NEXT_PUBLIC_ROULETTE_SLUG ?? "roulette-202612";

export function rouletteApi(slug: string): string {
  return `/api/roulette/${encodeURIComponent(slug)}`;
}
