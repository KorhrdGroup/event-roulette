import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { sendSensSms } from '@/lib/server/sens'
import { mobileDigits, rouletteStatus } from '@/lib/roulette'
import {
  OTP_PER_IP_HOUR,
  OTP_PER_PHONE_DAY,
  OTP_RESEND_SEC,
  OTP_TTL_SEC,
  SMS_BRAND,
  STATUS_MESSAGE,
  clientIp,
  getRouletteEvent,
  hashOtp,
  newOtpCode,
} from '@/lib/server/roulette'

export const runtime = 'nodejs'

// POST /api/roulette/[slug]/otp/send { phone } — 휴대폰으로 6자리 인증번호(5분). 1인 1회 참여의 본인 확인
//   막는 것: 이벤트 기간 밖 · 같은 번호 30초 안 다시 · 같은 번호 하루 5번 · 같은 IP 한 시간 20번
async function handlePOST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = (await req.json().catch(() => null)) as { phone?: unknown } | null
  const phone = mobileDigits(body?.phone)
  if (!phone) return NextResponse.json({ error: '휴대폰 번호를 정확히 입력해 주세요.' }, { status: 400 })

  try {
    const ev = await getRouletteEvent(slug)
    if (!ev) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })

    // 이미 참여한 번호는 기간이 지나도 결과를 다시 볼 수 있게 보낸다 — 새 참여만 기간을 본다
    const status = rouletteStatus(ev)
    if (status !== 'open') {
      const { data: entry } = await db()
        .from('roulette_entries')
        .select('id')
        .eq('event_id', ev.id)
        .eq('phone', phone)
        .maybeSingle()
      if (!entry) return NextResponse.json({ error: STATUS_MESSAGE[status] }, { status: 403 })
    }

    const ip = clientIp(req)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await db()
      .from('roulette_otp')
      .select('created_at')
      .eq('event_id', ev.id)
      .eq('phone', phone)
      .gte('created_at', dayAgo)
      .order('created_at', { ascending: false })
      .limit(OTP_PER_PHONE_DAY)
    if (recent?.[0]) {
      const elapsed = (Date.now() - new Date(recent[0].created_at as string).getTime()) / 1000
      if (elapsed < OTP_RESEND_SEC)
        return NextResponse.json({ error: `${Math.ceil(OTP_RESEND_SEC - elapsed)}초 뒤에 다시 요청해 주세요.` }, { status: 429 })
    }
    if ((recent?.length ?? 0) >= OTP_PER_PHONE_DAY)
      return NextResponse.json({ error: '오늘 인증번호 요청 횟수를 넘었습니다. 내일 다시 시도해 주세요.' }, { status: 429 })

    if (ip) {
      const { count } = await db()
        .from('roulette_otp')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      if ((count ?? 0) >= OTP_PER_IP_HOUR)
        return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.' }, { status: 429 })
    }

    const code = newOtpCode()
    const { error: insErr } = await db().from('roulette_otp').insert({
      event_id: ev.id,
      phone,
      code_hash: hashOtp(ev.id, phone, code),
      expires_at: new Date(Date.now() + OTP_TTL_SEC * 1000).toISOString(),
      ip,
    })
    if (insErr) throw insErr

    const sms = await sendSensSms({ to: phone, message: `${SMS_BRAND} 장학금 룰렛 인증번호 [${code}] (5분 안에 입력)` })
    if (!sms.success) {
      console.error('[roulette otp send] 문자 실패:', sms.error)
      return NextResponse.json({ error: '인증번호를 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, expiresInSec: OTP_TTL_SEC })
  } catch (e) {
    console.error('[roulette otp send]', e)
    return NextResponse.json({ error: '인증번호를 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.' }, { status: 500 })
  }
}

export const POST = handlePOST
