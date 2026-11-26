import RouletteLanding from "@/components/roulette/RouletteLanding";

// 다른 이벤트를 같은 사이트에서 열 때 — /{slug} (오피스 roulette_events.slug)
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <RouletteLanding slug={slug} />;
}
