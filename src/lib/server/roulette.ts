import { createHash, randomBytes, randomInt } from "crypto";
import type { NextRequest } from "next/server";
import { db } from "./supabase";
import { rouletteStatus, type RouletteEventPublic, type RouletteStatus } from "@/lib/roulette";

/**
 * 룰렛 이벤트 — 서버 전용. 표는 한평생오피스 DB 의 roulette_events · roulette_prizes · roulette_entries · roulette_otp
 * (오피스 저장소 supabase/migrations/20261126_roulette_event.sql). 추첨은 DB 함수 roulette_spin 이 한 트랜잭션에서 한다.
 * 확률 · 수량 · 기간은 오피스 「당근 광고 › 룰렛 이벤트」 탭에서 바꾼다 — 이 사이트는 읽기만 한다.
 *   인증번호는 해시로만 남긴다. 인증되면 ticket(참여 증표)을 발급 — 룰렛 30분 · 상담 신청 60분 안에 쓴다.
 */

export const OTP_TTL_SEC = 300;
export const OTP_RESEND_SEC = 30;
export const OTP_MAX_ATTEMPTS = 5;
/** 한 번호가 하루에 받을 수 있는 인증번호 수 */
export const OTP_PER_PHONE_DAY = 5;
/** 한 IP 가 한 시간에 받을 수 있는 인증번호 수 — 문자 비용을 노린 반복 요청 막기 */
export const OTP_PER_IP_HOUR = 20;
export const SPIN_TICKET_MIN = 30;
export const APPLY_TICKET_MIN = 60;
/** 인증번호 문자 머리 */
export const SMS_BRAND = "[한평생원격교육원]";

export interface RouletteEventRow {
  id: number;
  slug: string;
  title: string;
  source_minor: string;
  source_label: string;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

export async function getRouletteEvent(slug: string): Promise<RouletteEventRow | null> {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return null;
  const { data, error } = await db()
    .from("roulette_events")
    .select("id, slug, title, source_minor, source_label, starts_at, ends_at, active")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as RouletteEventRow | null) ?? null;
}

export async function getRouletteEventPublic(ev: RouletteEventRow): Promise<RouletteEventPublic> {
  const { data, error } = await db()
    .from("roulette_prizes")
    .select("id, label, wheel_top, wheel_main")
    .eq("event_id", ev.id)
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return {
    slug: ev.slug,
    title: ev.title,
    startsAt: ev.starts_at,
    endsAt: ev.ends_at,
    status: rouletteStatus(ev),
    prizes: (data ?? []).map((p) => ({
      id: Number(p.id),
      label: String(p.label),
      top: String(p.wheel_top ?? ""),
      main: String(p.wheel_main ?? ""),
    })),
  };
}

export const STATUS_MESSAGE: Record<Exclude<RouletteStatus, "open">, string> = {
  before: "아직 이벤트 기간이 아닙니다. 기간에 다시 참여해 주세요.",
  ended: "이벤트가 종료되었습니다. 참여해 주셔서 감사합니다.",
  off: "지금은 이벤트에 참여할 수 없습니다.",
};

export function hashOtp(eventId: number, phone: string, code: string): string {
  return createHash("sha256").update(`roulette-otp:${eventId}:${phone}:${code}`).digest("hex");
}

export function newOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function newTicket(): string {
  return randomBytes(24).toString("hex");
}

/** 0 이상 1 미만 — 룰렛 뽑기에 쓴다(crypto) */
export function secureRandom(): number {
  return randomInt(0, 2 ** 48 - 1) / 2 ** 48;
}

export function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : (req.headers.get("x-real-ip") ?? "")).trim();
  return ip ? ip.slice(0, 64) : null;
}

/** 증표 → 인증된 번호. 기한(분)이 지났거나 다른 이벤트 증표면 null */
export async function phoneByTicket(eventId: number, ticket: unknown, withinMin: number): Promise<string | null> {
  const t = typeof ticket === "string" ? ticket.trim() : "";
  if (!/^[0-9a-f]{48}$/.test(t)) return null;
  const { data } = await db().from("roulette_otp").select("phone, event_id, verified_at").eq("ticket", t).maybeSingle();
  if (!data || Number(data.event_id) !== eventId || !data.verified_at) return null;
  if (Date.now() - new Date(data.verified_at as string).getTime() > withinMin * 60 * 1000) return null;
  return String(data.phone);
}

/** 오피스 관리자(admin · master-admin)의 로그인 id — 새 문의 인앱 알림용 (오피스 당근 폼 웹훅과 같은 방식, best-effort) */
export async function getAdminUids(): Promise<string[]> {
  const { data: admins } = await db().from("app_users").select("username").in("role", ["admin", "master-admin"]);
  if (!admins?.length) return [];
  const { data } = await db().auth.admin.listUsers({ perPage: 1000 });
  const emailToId = new Map((data?.users ?? []).map((u) => [u.email, u.id]));
  return admins.map((a) => emailToId.get(a.username as string)).filter((v): v is string => !!v);
}
