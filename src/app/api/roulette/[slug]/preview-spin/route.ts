import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { getRouletteEvent, secureRandom } from '@/lib/server/roulette'

export const runtime = 'nodejs'

// POST /api/roulette/[slug]/preview-spin → { prizeId, label }
//   룰렛만 돌려 보기(?spin=1) — 개발 서버 전용. 오피스에 설정한 실제 확률 · 남은 수량으로 한 번 뽑기만 하고 아무것도 저장하지 않는다
//   (참여 · 지급 수 · 문의 없음). 실제 추첨(DB 함수 roulette_spin)과 같은 규칙: 켜져 있고 확률 > 0 이고 수량이 남은 칸끼리의 비율.
//   배포본(production)에서는 404 — 확률을 밖으로 흘리지 않고, 인증 없이 결과를 뽑아 보는 길을 남기지 않는다
async function handlePOST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { slug } = await params
  try {
    const ev = await getRouletteEvent(slug)
    if (!ev) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })
    const { data, error } = await db()
      .from('roulette_prizes')
      .select('id, label, weight, max_qty, won_count')
      .eq('event_id', ev.id)
      .eq('active', true)
      .order('sort', { ascending: true })
      .order('id', { ascending: true })
    if (error) throw error
    const pool = (data ?? []).filter(
      (p) => Number(p.weight) > 0 && (p.max_qty === null || Number(p.won_count) < Number(p.max_qty)),
    )
    const total = pool.reduce((s, p) => s + Number(p.weight), 0)
    if (!pool.length || total <= 0) return NextResponse.json({ error: '남은 경품이 없습니다.' }, { status: 409 })
    let pick = secureRandom() * total
    let chosen = pool[pool.length - 1]
    for (const p of pool) {
      pick -= Number(p.weight)
      if (pick < 0) {
        chosen = p
        break
      }
    }
    return NextResponse.json({ prizeId: Number(chosen.id), label: String(chosen.label) })
  } catch (e) {
    console.error('[roulette preview-spin]', e)
    return NextResponse.json({ error: '뽑지 못했습니다.' }, { status: 500 })
  }
}

export const POST = handlePOST
