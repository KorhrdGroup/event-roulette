import { NextRequest, NextResponse } from 'next/server'
import { getRouletteEvent, getRouletteEventPublic } from '@/lib/server/roulette'

export const runtime = 'nodejs'

// GET /api/roulette/[slug] — 랜딩이 그리는 이벤트 정보(기간 · 상태 · 룰렛 칸). 확률 · 수량은 보내지 않는다. 로그인 없이(proxy 공개 경로)
async function handleGET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const ev = await getRouletteEvent(slug)
    if (!ev) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })
    return NextResponse.json(await getRouletteEventPublic(ev), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[roulette GET]', e)
    return NextResponse.json({ error: '이벤트 정보를 불러오지 못했습니다.' }, { status: 500 })
  }
}

export const GET = handleGET
