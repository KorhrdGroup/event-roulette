/**
 * 당근 장학금 룰렛 이벤트 (2026-11-26) — 랜딩이 쓰는 모양과 규칙.
 * 한평생오피스(KorhrdGroupDB) src/lib/event/roulette.ts 를 옮겨 온 것 — 바꾸면 그쪽도 같이 맞춘다.
 *   고객 흐름: 이 사이트 → 「내 룰렛 결과 확인하기」 → 휴대폰 인증(1인 1회) → 룰렛 → 당첨 팝업 → 상담 신청서 → 오피스 학점은행제 문의DB
 *   인증(네이버 SENS) · 추첨 · 신청은 이 사이트 서버(/api/roulette/{slug})가 오피스 DB 에 직접 한다. 확률 · 수량은 오피스 「당근 광고 › 룰렛 이벤트」 탭에서 바꾼다
 */

export type RouletteStatus = "open" | "before" | "ended" | "off";

export interface RoulettePrizePublic {
  id: number;
  /** 룰렛 칸 윗줄(작은 글자) */
  top: string;
  /** 룰렛 칸 큰 글자 */
  main: string;
  /** 당첨 혜택 이름 — 팝업 · 신청서 · 문의DB 에 같은 글자 */
  label: string;
}

export interface RouletteEventPublic {
  slug: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  status: RouletteStatus;
  prizes: RoulettePrizePublic[];
}

/** 참여 결과 — 인증 직후(이미 참여한 번호) · 룰렛을 돌린 뒤 */
export interface RouletteResult {
  prizeId: number | null;
  label: string;
  /** 이미 참여한 번호라 예전 결과를 돌려준 것 */
  already: boolean;
  /** 상담 신청까지 마쳤는지 */
  applied: boolean;
}

export const ROULETTE_LIMITS = {
  label: 30,
  wheelTop: 10,
  wheelMain: 10,
  prizes: 10,
  name: 20,
} as const;


/** 문의DB 대분류 — click_source = 「당근_{source_minor}」 */
export const ROULETTE_SOURCE_MAJOR = "당근";

export function rouletteStatus(
  ev: { active: boolean; starts_at: string | null; ends_at: string | null },
  now = Date.now(),
): RouletteStatus {
  if (!ev.active) return "off";
  if (ev.starts_at && now < new Date(ev.starts_at).getTime()) return "before";
  if (ev.ends_at && now > new Date(ev.ends_at).getTime()) return "ended";
  return "open";
}

/** 휴대폰 번호 숫자만 — 010 · 011 · 016~019 로 시작하는 10~11자리만 받는다 */
export function mobileDigits(raw: unknown): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(d) ? d : null;
}

/** 010-1234-5678 꼴 — 입력 중에도 쓴다 */
export function formatMobile(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}


/** 기간 글자 — 「12.01 ~ 12.31」 (한국 시간) */
export function roulettePeriodLabel(startsAt: string | null, endsAt: string | null): string {
  const f = (iso: string | null) => {
    if (!iso) return "";
    const k = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
    return `${String(k.getUTCMonth() + 1).padStart(2, "0")}.${String(k.getUTCDate()).padStart(2, "0")}`;
  };
  const a = f(startsAt);
  const b = f(endsAt);
  if (!a && !b) return "";
  return `${a} ~ ${b}`;
}

/**
 * 관심 과정 — 사회복지사 2급으로 고정(2026-11-26 사용자 「관심과정 사회복지사 2급으로 고정」). 신청서는 고칠 수 없는 칸으로 보여 준다.
 * value 는 오피스 문의DB 희망과정(hope_course) 값 — 오피스 거르기 목록(HOPE_COURSE_FILTER_OPTIONS) · 바로소셜과 같은 글자
 */
export const INTEREST_COURSE = { label: "사회복지사 2급", value: "사회복지사" } as const;

/** 상담 신청서 고르는 칸 — 바로소셜 상담 신청서(app/form)와 같은 글자. 오피스 문의DB 에 그대로 들어간다 (2026-11-26 사용자) */
export const EDUCATION_OPTIONS = ["고졸", "전문대졸", "대학교 중퇴", "4년제 대졸", "대학원생 이상"] as const;
export const REASON_OPTIONS = ["즉시취업", "이직", "미래준비", "취미"] as const;
export const PREFERRED_TIME_OPTIONS = ["9:00~12:30", "13:30~15:00", "15:00~18:00"] as const;
export const TIME_MEMO_MAX = 25;
