import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { sendReceiptAlimtalk } from '@/lib/server/kakao'
import {
  DEFAULT_INTEREST_COURSE,
  EDUCATION_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  REASON_OPTIONS,
  ROULETTE_LIMITS,
  ROULETTE_SOURCE_MAJOR,
  TIME_MEMO_MAX,
  formatMobile,
  isInterestCourse,
} from '@/lib/roulette'
import { APPLY_TICKET_MIN, getAdminUids, getRouletteEvent, phoneByTicket } from '@/lib/server/roulette'

export const runtime = 'nodejs'

// POST /api/roulette/[slug]/apply { ticket, name, course, education, reasons, fastConsultation, preferredTimes, timeMemo, privacyAgreed, contactAgreed }
//   상담 신청서 → 학점은행제 문의DB(hakjeom_consultations) 한 줄
//     이름 · 연락처(인증한 번호 — 화면에서 고칠 수 없다) · 유입경로 「당근_{세부 유입경로}」 · 당첨 혜택(event_prize, 룰렛 결과 — 화면에서 고칠 수 없다)
//     · 관심 과정(hope_course, 기본 사회복지사) · 최종학력(education) · 취득사유(reason, 「, 」로 잇는다 — 바로소셜과 같다)
//     · 빠른 상담(fast_consultation) · 상담 선호 시간(preferred_times) · 시간 메모(consult_time_memo) · 문의 접수 일시(created_at, 지금)
//   한 참여에 한 번만 — 먼저 참여 줄에 applied_at 을 걸고(동시에 두 번 눌러도 하나만 지나간다), 문의 줄을 넣는다
//   개인정보처리방침 동의는 바로소셜과 같은 방침(그 안에 홍보 · 광고성 정보 제공 목적이 있다)이라, 바로소셜처럼
//   광고 수신 동의(marketing_agreed · 시각)도 함께 기록한다. 근거는 marketing_agreed_basis = roulette_privacy_policy
//   (오피스 문의DB 화면에는 보이지 않는다). 상담 연락 동의는 따로 roulette_entries 에 시각만 남긴다
async function handlePOST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = (await req.json().catch(() => null)) as {
    ticket?: unknown
    name?: unknown
    course?: unknown
    education?: unknown
    reasons?: unknown
    fastConsultation?: unknown
    preferredTimes?: unknown
    timeMemo?: unknown
    privacyAgreed?: unknown
    contactAgreed?: unknown
  } | null
  const name = String(body?.name ?? '').replace(/\s+/g, ' ').trim()
  if (!name || name.length > ROULETTE_LIMITS.name)
    return NextResponse.json({ error: '이름을 입력해 주세요.', field: 'name' }, { status: 400 })
  const hopeCourse = isInterestCourse(body?.course) ? body.course : DEFAULT_INTEREST_COURSE
  const education = (EDUCATION_OPTIONS as readonly string[]).includes(String(body?.education)) ? String(body?.education) : null
  if (!education) return NextResponse.json({ error: '최종학력을 골라 주세요.', field: 'education' }, { status: 400 })
  const pickedReasons = Array.isArray(body?.reasons) ? (body?.reasons as unknown[]) : []
  const reasons = REASON_OPTIONS.filter((r) => pickedReasons.includes(r))
  if (!reasons.length) return NextResponse.json({ error: '취득사유를 골라 주세요.', field: 'reason' }, { status: 400 })
  const pickedTimes = Array.isArray(body?.preferredTimes) ? (body?.preferredTimes as unknown[]) : []
  const preferredTimes = PREFERRED_TIME_OPTIONS.filter((t) => pickedTimes.includes(t))
  const timeMemo = String(body?.timeMemo ?? '').replace(/\s+/g, ' ').trim().slice(0, TIME_MEMO_MAX) || null
  const fastConsultation = body?.fastConsultation === true
  if (body?.privacyAgreed !== true)
    return NextResponse.json({ error: '개인정보처리방침에 동의해 주세요.', field: 'privacy' }, { status: 400 })
  if (body?.contactAgreed !== true)
    return NextResponse.json({ error: '상담 연락에 동의해 주세요.', field: 'contact' }, { status: 400 })

  try {
    const ev = await getRouletteEvent(slug)
    if (!ev) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })
    const phone = await phoneByTicket(ev.id, body?.ticket, APPLY_TICKET_MIN)
    if (!phone) return NextResponse.json({ error: '휴대폰 인증이 만료되었습니다. 다시 인증해 주세요.', code: 'ticket' }, { status: 401 })

    const { data: entry } = await db()
      .from('roulette_entries')
      .select('id, prize_label, applied_at')
      .eq('event_id', ev.id)
      .eq('phone', phone)
      .maybeSingle()
    if (!entry) return NextResponse.json({ error: '룰렛을 먼저 돌려 주세요.' }, { status: 400 })
    if (entry.applied_at) return NextResponse.json({ ok: true, already: true })

    const now = new Date().toISOString()
    const { data: claimed, error: claimErr } = await db()
      .from('roulette_entries')
      .update({ applied_at: now, name, privacy_agreed_at: now, contact_agreed_at: now })
      .eq('id', entry.id)
      .is('applied_at', null)
      .select('id')
    if (claimErr) throw claimErr
    if (!claimed?.length) return NextResponse.json({ ok: true, already: true })

    const prizeLabel = String(entry.prize_label)
    const clickSource = `${ROULETTE_SOURCE_MAJOR}_${ev.source_minor}`
    const contact = formatMobile(phone)
    const { data: row, error: insErr } = await db()
      .from('hakjeom_consultations')
      .insert({
        name,
        contact,
        click_source: clickSource,
        event_prize: prizeLabel,
        hope_course: hopeCourse,
        education,
        reason: reasons.join(', '),
        fast_consultation: fastConsultation,
        preferred_times: preferredTimes.length ? preferredTimes : null,
        consult_time_memo: timeMemo,
        status: '상담대기',
        marketing_agreed: true,
        marketing_agreed_at: now,
        marketing_agreed_basis: 'roulette_privacy_policy',
        created_at: now,
      })
      .select('id')
      .single()
    if (insErr || !row) {
      // 문의 줄을 못 넣었으면 다시 신청할 수 있게 되돌린다
      await db()
        .from('roulette_entries')
        .update({ applied_at: null, privacy_agreed_at: null, contact_agreed_at: null })
        .eq('id', entry.id)
      throw insErr ?? new Error('문의 적재 실패')
    }
    await db().from('roulette_entries').update({ consultation_id: row.id }).eq('id', entry.id)

    // 오피스 관리자 인앱 알림 — 응답 뒤에 끊기지 않게 기다리되, 실패해도 신청 결과는 그대로
    try {
      const uids = await getAdminUids()
      if (uids.length)
        await db().from('notifications').insert(
          uids.map((uid) => ({
            user_id: uid,
            type: 'NEW_CONSULTATION',
            title: `새 학점은행제 상담 신청 (${ev.source_label})`,
            message: `${name}님이 ${ev.source_label}으로 상담을 신청했습니다. 당첨 혜택: ${prizeLabel}`,
            link: `/hakjeom?highlight=${row.id}`,
            is_read: false,
          })),
        )
    } catch (e) {
      console.error('[roulette apply] 관리자 알림 실패:', e)
    }

    // 고객에게 「상담 신청 접수」 알림톡 — 오피스 당근 폼 웹훅과 같은 템플릿(env). 값이 없으면 보내지 않는다
    const sent = await sendReceiptAlimtalk(contact)
    if (!sent.success && sent.error !== 'Aligo env 미설정') console.error('[roulette apply] 접수 알림톡 실패:', sent.error)

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    console.error('[roulette apply]', e)
    return NextResponse.json({ error: '상담 신청을 접수하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' }, { status: 500 })
  }
}

export const POST = handlePOST
