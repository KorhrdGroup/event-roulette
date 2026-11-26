import RouletteLanding from "@/components/roulette/RouletteLanding";
import { DEFAULT_SLUG } from "@/lib/api";

// 첫 화면 = 지금 진행하는 룰렛 이벤트(NEXT_PUBLIC_ROULETTE_SLUG). 당근 광고는 이 주소로 보낸다
export default function Home() {
  return <RouletteLanding slug={DEFAULT_SLUG} />;
}
