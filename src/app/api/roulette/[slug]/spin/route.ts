import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { rouletteStatus, type RouletteResult } from '@/lib/roulette'
import {
  SPIN_TICKET_MIN,
  STATUS_MESSAGE,
  clientIp,
  getRouletteEvent,
  phoneByTicket,
  secureRandom,
} from '@/lib/server/roulette'

export const runtime = 'nodejs'

// POST /api/roulette/[slug]/spin { ticket } → RouletteResult
//   결과는 서버가 정한다(DB 함수 roulette_spin — 확률 · 최대 수량 · 1인 1회를 한 트랜잭션에서). 화면은 받은 칸에 멈추게만 돌린다
async function handlePOST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = (await req.json().catch(() => null)) as { ticket?: unknown } | null
  try {
    const ev = await getRouletteEvent(slug)
    if (!ev) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })
    const phone = await phoneByTicket(ev.id, body?.ticket, SPIN_TICKET_MIN)
    if (!phone) return NextResponse.json({ error: '휴대폰 인증이 만료되었습니다. 다시 인증해 주세요.', code: 'ticket' }, { status: 401 })

    const status = rouletteStatus(ev)
    if (status !== 'open') {
      // 기간 밖이어도 이미 참여한 번호는 예전 결과를 돌려준다
      const { data: entry } = await db()
        .from('roulette_entries')
        .select('prize_id, prize_label, applied_at')
        .eq('event_id', ev.id)
        .eq('phone', phone)
        .maybeSingle()
      if (!entry) return NextResponse.json({ error: STATUS_MESSAGE[status] }, { status: 403 })
      const result: RouletteResult = {
        prizeId: entry.prize_id === null ? null : Number(entry.prize_id),
        label: String(entry.prize_label),
        already: true,
        applied: !!entry.applied_at,
      }
      return NextResponse.json(result)
    }

    const { data, error } = await db().rpc('roulette_spin', {
      p_event_id: ev.id,
      p_phone: phone,
      p_rand: secureRandom(),
      p_ip: clientIp(req),
    })
    if (error) {
      if (String(error.message).includes('ROULETTE_NO_PRIZE'))
        return NextResponse.json({ error: '준비한 경품이 모두 소진되었습니다. 참여해 주셔서 감사합니다.' }, { status: 409 })
      throw error
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { prize_id: number | null; prize_label: string; already: boolean; applied: boolean }
      | undefined
    if (!row) throw new Error('룰렛 결과 없음')
    const result: RouletteResult = {
      prizeId: row.prize_id === null ? null : Number(row.prize_id),
      label: row.prize_label,
      already: !!row.already,
      applied: !!row.applied,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('[roulette spin]', e)
    return NextResponse.json({ error: '룰렛을 돌리지 못했습니다. 잠시 뒤 다시 시도해 주세요.' }, { status: 500 })
  }
}

export const POST = handlePOST
