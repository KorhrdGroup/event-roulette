import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { mobileDigits, type RouletteResult } from '@/lib/roulette'
import { OTP_MAX_ATTEMPTS, getRouletteEvent, hashOtp, newTicket } from '@/lib/server/roulette'

export const runtime = 'nodejs'

// POST /api/roulette/[slug]/otp/verify { phone, code } → { ticket, result }
//   ticket = 참여 증표(룰렛 30분 · 상담 신청 60분). result = 이미 참여한 번호면 그때 결과(다시 돌리지 않는다), 아니면 null
async function handlePOST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = (await req.json().catch(() => null)) as { phone?: unknown; code?: unknown } | null
  const phone = mobileDigits(body?.phone)
  const code = String(body?.code ?? '').replace(/\D/g, '')
  if (!phone) return NextResponse.json({ error: '휴대폰 번호를 정확히 입력해 주세요.' }, { status: 400 })
  if (code.length !== 6) return NextResponse.json({ error: '인증번호 6자리를 입력해 주세요.' }, { status: 400 })

  try {
    const ev = await getRouletteEvent(slug)
    if (!ev) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })

    const { data: otp } = await db()
      .from('roulette_otp')
      .select('id, code_hash, expires_at, verified_at, attempts')
      .eq('event_id', ev.id)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!otp || otp.verified_at) return NextResponse.json({ error: '인증번호를 먼저 요청해 주세요.' }, { status: 400 })
    if (new Date(otp.expires_at as string).getTime() < Date.now())
      return NextResponse.json({ error: '인증번호가 만료되었습니다. 다시 요청해 주세요.' }, { status: 400 })
    if ((otp.attempts as number) >= OTP_MAX_ATTEMPTS)
      return NextResponse.json({ error: '입력 횟수를 넘었습니다. 인증번호를 다시 요청해 주세요.' }, { status: 400 })
    if (otp.code_hash !== hashOtp(ev.id, phone, code)) {
      await db().from('roulette_otp').update({ attempts: (otp.attempts as number) + 1 }).eq('id', otp.id)
      return NextResponse.json({ error: '인증번호가 일치하지 않습니다.' }, { status: 400 })
    }

    const ticket = newTicket()
    const { error } = await db()
      .from('roulette_otp')
      .update({ verified_at: new Date().toISOString(), ticket })
      .eq('id', otp.id)
      .is('verified_at', null)
    if (error) throw error

    const { data: entry } = await db()
      .from('roulette_entries')
      .select('prize_id, prize_label, applied_at')
      .eq('event_id', ev.id)
      .eq('phone', phone)
      .maybeSingle()
    const result: RouletteResult | null = entry
      ? { prizeId: entry.prize_id === null ? null : Number(entry.prize_id), label: String(entry.prize_label), already: true, applied: !!entry.applied_at }
      : null
    return NextResponse.json({ ok: true, ticket, result })
  } catch (e) {
    console.error('[roulette otp verify]', e)
    return NextResponse.json({ error: '인증하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' }, { status: 500 })
  }
}

export const POST = handlePOST
