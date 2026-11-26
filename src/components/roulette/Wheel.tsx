"use client";

import { Crown } from "lucide-react";
import type { RoulettePrizePublic } from "@/lib/roulette";
import styles from "./Wheel.module.css";

/*
 * 룰렛 판 — 칸 수만큼 같은 크기로 나눈다(확률은 칸 크기와 무관, 서버가 정한다).
 * 칸 i 의 가운데는 위(12시)에서 시계 방향 i × (360/N)도. 판을 rotation 만큼 돌려 받은 칸이 위 바늘 아래 멈추게 한다.
 */

const C = 200;
const R = 172;

function pt(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

function slicePath(i: number, n: number) {
  const step = 360 / n;
  const a0 = i * step - step / 2;
  const a1 = a0 + step;
  const p0 = pt(a0, R);
  const p1 = pt(a1, R);
  return `M ${C} ${C} L ${p0.x} ${p0.y} A ${R} ${R} 0 ${step > 180 ? 1 : 0} 1 ${p1.x} ${p1.y} Z`;
}

/** 큰 글자 줄 — 길면 띄어쓰기에서 두 줄로 */
function mainLines(main: string): string[] {
  const t = main.trim();
  if (t.length <= 5 || !t.includes(" ")) return [t];
  const i = t.indexOf(" ");
  return [t.slice(0, i), t.slice(i + 1)];
}

/** 글자 폭 어림(글자 크기 1 기준) — 한글은 1, 숫자 · 기호는 좁다 */
function textEm(s: string): number {
  let w = 0;
  for (const ch of s) w += /[가-힣]/.test(ch) ? 1 : ch === "%" ? 0.85 : ch === " " ? 0.3 : 0.6;
  return w;
}

/** 반지름 r 자리의 칸 폭에 들어가는 가장 큰 글자 크기 (max 이하) */
function fitSize(s: string, r: number, step: number, max: number): number {
  const chord = 2 * r * Math.sin(((step / 2) * Math.PI) / 180) * 0.82;
  return Math.max(10, Math.min(max, Math.floor(chord / Math.max(textEm(s), 1))));
}

export default function Wheel({
  prizes,
  rotation,
  spinning,
  onSpinEnd,
}: {
  prizes: RoulettePrizePublic[];
  rotation: number;
  spinning: boolean;
  onSpinEnd: () => void;
}) {
  const n = Math.max(prizes.length, 1);
  const step = 360 / n;
  const dots = Array.from({ length: 24 }, (_, i) => pt(i * 15 + 7.5, 186));

  return (
    <div className={styles.wrap}>
      <svg className={styles.pointer} viewBox="0 0 40 44" aria-hidden="true">
        <path className={styles.pointerShape} d="M20 42 L3 8 Q2 2 8 2 L32 2 Q38 2 37 8 Z" />
      </svg>
      <div
        className={`${styles.disc} ${spinning ? styles.spinning : ""}`}
        // 판 각도 — 받은 결과로 정해지는 런타임 값이라 인라인
        style={{ transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={(e) => {
          if (e.propertyName === "transform") onSpinEnd();
        }}
      >
        <svg viewBox="0 0 400 400" className={styles.svg} role="img" aria-label={`룰렛 — ${prizes.map((p) => p.label).join(", ")}`}>
          <circle cx={C} cy={C} r={196} className={styles.rim} />
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={4} className={i % 2 ? styles.dotDim : styles.dot} />
          ))}
          {prizes.map((p, i) => {
            const lines = mainLines(p.main);
            // 글자 아랫줄(기준선) 자리의 칸 폭에 맞춘다 — 가운데로 갈수록 칸이 좁아진다
            const r1 = R * (lines.length > 1 ? 0.6 : 0.5);
            let size = 34;
            if (lines.length > 1)
              for (let k = 0; k < 3; k++)
                size = Math.min(24, fitSize(lines[0], r1, step, 24), fitSize(lines[1], r1 - size - 2, step, 24));
            else size = fitSize(lines[0], r1, step, 34);
            const topSize = fitSize(p.top, R * 0.8, step, 15);
            const dark = i % 2 === 1;
            const center = i * step;
            const topY = C - R * 0.8;
            const mainY = C - r1;
            return (
              <g key={p.id}>
                <path d={slicePath(i, n)} className={dark ? styles.sliceLight : styles.sliceDeep} />
                <g transform={`rotate(${center} ${C} ${C})`} className={dark ? styles.textDark : styles.textLight}>
                  <text x={C} y={topY} textAnchor="middle" fontSize={topSize} className={styles.top}>
                    {p.top}
                  </text>
                  {lines.map((l, k) => (
                    <text key={k} x={C} y={mainY + k * (size + 2)} textAnchor="middle" fontSize={size} className={styles.main}>
                      {l}
                    </text>
                  ))}
                </g>
              </g>
            );
          })}
          {prizes.map((_, i) => {
            const a = pt(i * step - step / 2, R);
            return <line key={i} x1={C} y1={C} x2={a.x} y2={a.y} className={styles.divider} />;
          })}
        </svg>
      </div>
      <div className={styles.hub} aria-hidden="true">
        <Crown size={18} className={styles.crown} />
        <span>행운</span>
      </div>
    </div>
  );
}
