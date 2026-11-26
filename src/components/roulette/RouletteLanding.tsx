"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, Gift, PartyPopper, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { roulettePeriodLabel, type RouletteEventPublic, type RouletteResult } from "@/lib/roulette";
import { rouletteApi } from "@/lib/api";
import Wheel from "./Wheel";
import VerifySheet from "./VerifySheet";
import ApplyForm from "./ApplyForm";
import styles from "./RouletteLanding.module.css";

/*
 * 당근 장학금 룰렛 랜딩 (2026-11-26) — 모바일 우선, 넓은 화면에서는 가운데 480 폭. 한평생오피스 디자인 시스템(--hps-* · 오피스 부품).
 *   ① 첫 화면 「내 룰렛 결과 확인하기」 → ② 휴대폰 인증(VerifySheet) → ③ 서버가 결과를 정하고 판이 그 칸에 멈춘다
 *   → ④ 당첨 팝업 「상담 신청하기」 → ⑤ 상담 신청서(ApplyForm) → ⑥ 완료
 *   이미 참여한 번호는 인증 뒤 다시 돌리지 않고 그때 결과를 보여 준다.
 *   새로고침해도 이어지게 증표 · 결과를 이 탭(sessionStorage)에 30분 둔다 — 못 읽어도 처음부터 하면 된다.
 */

type View = "landing" | "form" | "done";
interface Saved {
  ticket: string;
  phone: string;
  result: RouletteResult | null;
  at: number;
}
const KEEP_MS = 30 * 60 * 1000;

function loadSaved(slug: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(`roulette:${slug}`);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    return s && Date.now() - s.at < KEEP_MS ? s : null;
  } catch {
    return null;
  }
}
function save(slug: string, s: Saved | null) {
  try {
    if (s) sessionStorage.setItem(`roulette:${slug}`, JSON.stringify(s));
    else sessionStorage.removeItem(`roulette:${slug}`);
    // 결과는 이 기기(브라우저)에 따로 오래 남긴다 — 나갔다 들어와도 새로 돌리지 않고 이 결과만 보여 준다
    if (s?.result) localStorage.setItem(`roulette-done:${slug}`, JSON.stringify(s.result));
  } catch {
    /* 저장 못 해도 진행에는 지장 없다 */
  }
}

/**
 * 이 기기에서 이미 돌린 결과 — 1인 1회의 기기 쪽 막음(2026-11-26 사용자 「나갔다 들어와서 또 돌릴 수 있게 하지 말자」).
 * 진짜 막음은 서버의 휴대폰 번호당 1회다. 이건 같은 휴대폰에서 다른 번호로 다시 인증해 돌리는 것까지 화면에서 막는다
 */
function loadDeviceResult(slug: string): RouletteResult | null {
  try {
    const raw = localStorage.getItem(`roulette-done:${slug}`);
    if (!raw) return null;
    const r = JSON.parse(raw) as RouletteResult;
    return r && typeof r.label === "string" ? { ...r, already: true } : null;
  } catch {
    return null;
  }
}

export default function RouletteLanding({ slug }: { slug: string }) {
  const api = rouletteApi(slug);
  const [event, setEvent] = useState<RouletteEventPublic | null>(null);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("landing");
  const [overlay, setOverlay] = useState<"verify" | "result" | null>(null);
  const [auth, setAuth] = useState<{ ticket: string; phone: string } | null>(null);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinError, setSpinError] = useState("");
  const wheelRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  /**
   * 미리보기(?demo=1) — 개발 서버에서만. 실제와 같은 순서(휴대폰 인증 → 룰렛 → 당첨 팝업 → 신청서 → 완료)를 거치되
   * 오피스 API 를 부르지 않는다: 문자 대신 화면에 인증번호를 보여 주고, 칸은 화면에서 고르고, 신청은 접수하지 않는다.
   * 아무것도 저장하지 않아 몇 번이든 처음부터 다시 할 수 있다. 배포본(production)에서는 켜지지 않는다
   */
  const [demo, setDemo] = useState(false);
  /**
   * 룰렛만 돌려 보기(?spin=1) — 개발 서버에서만. 인증 · 신청 없이 오피스에 설정한 실제 확률로 뽑아(preview-spin, 저장 없음)
   * 판을 돌리고, 몇 번 돌렸는지 · 칸마다 몇 번 나왔는지 보여 준다(확률 눈으로 보기, 2026-11-26 사용자)
   */
  const [spinOnly, setSpinOnly] = useState(false);
  const [tally, setTally] = useState<Record<number, number>>({});
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const q = new URLSearchParams(window.location.search);
    if (q.has("demo")) setDemo(true);
    if (q.has("spin")) {
      setDemo(true);
      setSpinOnly(true);
    }
  }, []);
  // 미리보기는 이 기기에 남은 실제 결과와 섞이지 않게 빈 상태에서 시작한다
  useEffect(() => {
    if (!demo) return;
    setResult(null);
    setAuth(null);
  }, [demo]);
  const resetDemo = () => {
    setOverlay(null);
    setResult(null);
    setAuth(null);
    setSpinError("");
    setView("landing");
    topRef.current?.scrollIntoView();
  };

  useEffect(() => {
    let alive = true;
    fetch(api, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "이벤트 정보를 불러오지 못했습니다.");
        if (alive) setEvent(body as RouletteEventPublic);
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "이벤트 정보를 불러오지 못했습니다."));
    const s = loadSaved(slug);
    if (s) {
      setAuth({ ticket: s.ticket, phone: s.phone });
      setResult(s.result ?? loadDeviceResult(slug));
    } else {
      setResult(loadDeviceResult(slug));
    }
    return () => {
      alive = false;
    };
  }, [api, slug]);

  const remember = useCallback(
    (a: { ticket: string; phone: string } | null, r: RouletteResult | null) => {
      if (demo) return; // 미리보기는 저장하지 않는다
      save(slug, a ? { ...a, result: r, at: Date.now() } : null);
    },
    [slug, demo],
  );

  /** 받은 칸이 위 바늘 아래 오도록 — 지금 각도에서 6바퀴 더 돌고, 칸 안에서 조금 비껴 멈춘다 */
  const aimAt = useCallback(
    (prizeId: number | null) => {
      const prizes = event?.prizes ?? [];
      const idx = Math.max(0, prizes.findIndex((p) => p.id === prizeId));
      const step = 360 / Math.max(prizes.length, 1);
      const jitter = (Math.random() - 0.5) * step * 0.6;
      const want = (((-idx * step + jitter) % 360) + 360) % 360;
      setRotation((cur) => {
        const base = cur - (((cur % 360) + 360) % 360);
        return base + 360 * 6 + want;
      });
    },
    [event],
  );

  const spin = useCallback(
    async (ticket: string, phone: string) => {
      setSpinError("");
      wheelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (demo) {
        // 미리보기 — 서버 추첨 대신 화면에서 아무 칸이나
        const prizes = event?.prizes ?? [];
        if (!prizes.length) return;
        const p = prizes[Math.floor(Math.random() * prizes.length)];
        setResult({ prizeId: p.id, label: p.label, already: false, applied: false });
        setTimeout(() => {
          setSpinning(true);
          aimAt(p.id);
        }, 350);
        return;
      }
      try {
        const res = await fetch(`${api}/spin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 401 && body.code === "ticket") {
          setAuth(null);
          remember(null, null);
          setOverlay("verify");
          return;
        }
        if (!res.ok) throw new Error(body.error ?? "룰렛을 돌리지 못했습니다.");
        const r = body as RouletteResult;
        setResult(r);
        remember({ ticket, phone }, r);
        if (r.already) {
          setOverlay("result");
          return;
        }
        // 화면이 바늘 쪽으로 내려간 뒤 돌기 시작
        setTimeout(() => {
          setSpinning(true);
          aimAt(r.prizeId);
        }, 350);
      } catch (e) {
        setSpinError(e instanceof Error ? e.message : "룰렛을 돌리지 못했습니다.");
      }
    },
    [api, aimAt, remember, demo, event],
  );

  const spinPreview = async () => {
    setSpinError("");
    setOverlay(null);
    wheelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      const res = await fetch(`${api}/preview-spin`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "뽑지 못했습니다.");
      const id = Number(body.prizeId);
      setResult({ prizeId: id, label: String(body.label), already: false, applied: false });
      setTally((t) => ({ ...t, [id]: (t[id] ?? 0) + 1 }));
      setTimeout(() => {
        setSpinning(true);
        aimAt(id);
      }, 350);
    } catch (e) {
      setSpinError(e instanceof Error ? e.message : "뽑지 못했습니다.");
    }
  };

  const onCta = () => {
    if (spinOnly) {
      void spinPreview();
      return;
    }
    if (result) {
      if (result.applied) setView("done");
      else setOverlay("result");
      return;
    }
    if (auth) {
      void spin(auth.ticket, auth.phone);
      return;
    }
    setOverlay("verify");
  };

  const onSpinEnd = () => {
    setSpinning(false);
    setTimeout(() => setOverlay("result"), 450);
  };

  const goForm = () => {
    // 기기에 남은 결과만 있고 인증이 지났으면 — 다시 인증하면 같은 결과로 이어진다(서버가 새로 뽑지 않는다)
    if (!auth) {
      setOverlay("verify");
      return;
    }
    setOverlay(null);
    setView("form");
    topRef.current?.scrollIntoView();
  };

  const prize = event?.prizes.find((p) => p.id === result?.prizeId) ?? null;
  const period = event ? roulettePeriodLabel(event.startsAt, event.endsAt) : "";
  // 미리보기는 이벤트 기간 · 켜짐과 상관없이 늘 참여할 수 있는 것처럼
  const status = demo ? "open" : event?.status;
  const closed = !!event && status !== "open" && !result;
  const ctaLabel = spinning
    ? "룰렛이 돌아가는 중…"
    : spinOnly
      ? "룰렛 돌리기 (확률 그대로)"
      : result
      ? result.applied
        ? "상담 신청 내역 보기"
        : "내 당첨 결과 다시 보기"
      : status === "before"
        ? "이벤트 시작 전입니다"
        : status === "ended"
          ? "이벤트가 종료되었습니다"
          : status === "off"
            ? "지금은 참여할 수 없습니다"
            : "내 룰렛 결과 확인하기";

  return (
    <div className={styles.page} ref={topRef}>
      <main className={styles.shell}>
        {view === "landing" && (
          <>
            <section className={styles.hero}>
              <Badge tone="info" size="md">
                2026년 12월 우리 동네 이웃 한정
              </Badge>
              <p className={styles.lead}>우리 동네 이웃에게 드리는 특별한 연말 선물!</p>
              <h1 className={styles.title}>
                사회복지사 <span className={styles.accent}>장학금 룰렛</span>
              </h1>

              <div className={styles.wheelArea} ref={wheelRef}>
                {event ? (
                  <Wheel prizes={event.prizes} rotation={rotation} spinning={spinning} onSpinEnd={onSpinEnd} />
                ) : (
                  <div className={styles.wheelSkeleton} aria-hidden="true" />
                )}
              </div>

              <p className={styles.sure}>
                꽝 없이 <span className={styles.accent}>100% 당첨!</span>
              </p>
              <p className={styles.cheer}>
                2027년 새로운 시작을 응원합니다. 최대 <strong>75% 추가 장학</strong> 혜택
              </p>

              <div className={styles.ctaWrap}>
                <Button
                  variant="primary"
                  size="touch"
                  fullWidth
                  onClick={onCta}
                  disabled={!event || spinning || closed}
                  leftIcon={(spinOnly || !result) && !spinning && !closed ? <RotateCw size={20} /> : undefined}
                >
                  {ctaLabel}
                </Button>
                {(spinError || loadError) && (
                  <p className={styles.ctaError} role="alert">
                    {spinError || loadError}
                  </p>
                )}
                {spinOnly && event && (
                  <div className={styles.tally}>
                    <div className={styles.tallyHead}>
                      <Badge tone="warning" size="sm">
                        룰렛만 돌려 보기 — 저장 없음
                      </Badge>
                      <span>
                        {Object.values(tally).reduce((a, b) => a + b, 0)}번 돌림
                      </span>
                    </div>
                    <ul className={styles.tallyList}>
                      {event.prizes.map((p) => (
                        <li key={p.id}>
                          <span>{p.label}</span>
                          <b>{tally[p.id] ?? 0}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {demo && !spinOnly && (
                  <div className={styles.demoBar}>
                    <Badge tone="warning" size="sm">
                      미리보기 — 문자 · 접수 없음
                    </Badge>
                    {(result || auth) && !spinning && (
                      <Button variant="ghost" size="sm" onClick={resetDemo}>
                        처음부터 다시
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <p className={styles.fine}>
                {period && <>{period} · </>}1인 1회 참여 · 교육 혜택은 해당 과정 등록 시 적용
              </p>
            </section>

            <section className={styles.section} aria-labelledby="how-title">
              <h2 id="how-title" className={styles.sectionTitle}>
                참여 방법
              </h2>
              <ol className={styles.steps}>
                <li className={styles.step}>
                  <span className={styles.stepIcon} aria-hidden="true">
                    <RotateCw size={20} />
                  </span>
                  <b>룰렛 돌리기</b>
                  <span>휴대폰 확인 후 룰렛이 돌아가요</span>
                </li>
                <li className={styles.step}>
                  <span className={styles.stepIcon} aria-hidden="true">
                    <Gift size={20} />
                  </span>
                  <b>당첨 확인</b>
                  <span>꽝 없이 모두 당첨!</span>
                </li>
                <li className={styles.step}>
                  <span className={styles.stepIcon} aria-hidden="true">
                    <ClipboardList size={20} />
                  </span>
                  <b>상담 신청</b>
                  <span>당첨 혜택으로 상담받기</span>
                </li>
              </ol>
            </section>

            {event && event.prizes.length > 0 && (
              <section className={styles.section} aria-labelledby="prize-title">
                <h2 id="prize-title" className={styles.sectionTitle}>
                  당첨 혜택
                </h2>
                <ul className={styles.prizeList}>
                  {event.prizes.map((p) => (
                    <li key={p.id} className={styles.prizeItem}>
                      <Gift size={16} className={styles.prizeItemIcon} aria-hidden="true" />
                      {p.label}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className={styles.notice} aria-labelledby="notice-title">
              <h2 id="notice-title" className={styles.noticeTitle}>
                유의사항
              </h2>
              <ul>
                <li>이벤트는 휴대폰 번호 기준 1인 1회만 참여할 수 있습니다.</li>
                <li>장학 · 교육 혜택은 해당 과정에 등록할 때 적용됩니다.</li>
                <li>상품권 · 교환권은 상담 후 안내드리는 방법으로 지급됩니다.</li>
                <li>경품은 준비된 수량이 모두 소진되면 조기 종료될 수 있습니다.</li>
                <li>부정한 방법으로 참여한 경우 당첨이 취소될 수 있습니다.</li>
              </ul>
            </section>
          </>
        )}

        {view === "form" && auth && result && (
          <ApplyForm
            api={api}
            demo={demo}
            ticket={auth.ticket}
            phone={auth.phone}
            prizeLabel={result.label}
            onExpired={() => {
              setAuth(null);
              remember(null, null);
              setView("landing");
              setSpinError("인증 시간이 지났어요. 휴대폰 번호를 다시 확인해 주세요.");
              setOverlay("verify");
            }}
            onDone={() => {
              const r = { ...result, applied: true };
              setResult(r);
              remember(auth, r);
              setView("done");
              topRef.current?.scrollIntoView();
            }}
          />
        )}

        {/* 완료 — 바로소셜 상담 신청서(app/form) 완료 화면과 같은 모양: 카드 없이 가운데 3D 체크 이미지 + 두 줄 (2026-11-26 사용자) */}
        {view === "done" && result && (
          <section className={styles.done}>
            <Image src="/complete-check.png" alt="" width={300} height={300} priority className={styles.doneImage} />
            <h1 className={styles.doneTitle}>
              신청이 완료되었습니다.
              <br />
              곧 연락드리겠습니다.
            </h1>
            {demo && (
              <Button variant="secondary" fullWidth className={styles.demoAgain} onClick={resetDemo}>
                미리보기 처음부터 다시 해 보기
              </Button>
            )}
          </section>
        )}
      </main>

      {overlay === "verify" && (
        <VerifySheet
          api={api}
          demo={demo}
          onClose={() => setOverlay(null)}
          onVerified={({ ticket, phone, result: prev }) => {
            setAuth({ ticket, phone });
            setSpinError("");
            if (prev) {
              setResult(prev);
              remember({ ticket, phone }, prev);
              setOverlay("result");
              return;
            }
            remember({ ticket, phone }, null);
            setOverlay(null);
            void spin(ticket, phone);
          }}
        />
      )}

      {result && (
        <Modal
          open={overlay === "result"}
          onClose={() => setOverlay(null)}
          size="sm"
          title="룰렛 결과"
          footer={
            spinOnly ? (
              <>
                <Button variant="neutral" onClick={() => setOverlay(null)}>
                  닫기
                </Button>
                <Button variant="primary" onClick={() => void spinPreview()}>
                  한 번 더 돌리기
                </Button>
              </>
            ) : result.applied ? (
              <Button variant="primary" onClick={() => setOverlay(null)}>
                확인
              </Button>
            ) : (
              <>
                <Button variant="neutral" onClick={() => setOverlay(null)}>
                  닫기
                </Button>
                <Button variant="primary" onClick={goForm}>
                  상담 신청하기
                </Button>
              </>
            )
          }
        >
          <div className={styles.result}>
            <span className={styles.resultIcon} aria-hidden="true">
              <PartyPopper size={28} />
            </span>
            <h2 className={styles.resultTitle}>{result.already ? "이미 참여하셨어요" : "축하드립니다!"}</h2>
            <div className={styles.resultBox}>
              {prize?.top && <span className={styles.resultTop}>{prize.top}</span>}
              <span className={styles.resultMain}>
                {prize?.main || result.label} <small>당첨</small>
              </span>
            </div>
            <p className={styles.resultText}>
              {result.applied
                ? "상담 신청이 이미 접수되었어요. 담당 선생님이 곧 연락드릴게요."
                : "지금 바로 상담 신청하고 당첨 혜택을 받아보세요!"}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
