"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { formatMobile, mobileDigits, type RouletteResult } from "@/lib/roulette";
import styles from "./VerifySheet.module.css";

/**
 * 휴대폰 인증 팝업 — 1인 1회 참여. 번호 → 인증번호(6자리 · 5분) → 확인.
 * 오피스 팝업 규칙(docs/DESIGN_SYSTEM.md §3.18): 칸 높이 36 · 칸 사이 16 · 바닥줄 오른쪽 취소 → 주 버튼 ·
 * 검증 문구는 이름표 줄 오른쪽 · 주 버튼은 빈 칸이어도 끄지 않는다(누르면 문구를 띄운다).
 */
/** 미리보기에서 쓰는 인증번호 — 문자를 보내지 않고 화면에 보여 준다 */
const DEMO_CODE = "123456";

export default function VerifySheet({
  api,
  demo = false,
  onClose,
  onVerified,
}: {
  api: string;
  /** 미리보기(?demo=1) — 오피스 API · 문자 없이 */
  demo?: boolean;
  onClose: () => void;
  onVerified: (v: { ticket: string; phone: string; result: RouletteResult | null }) => void;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [errors, setErrors] = useState<{ phone?: string; code?: string }>({});
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const digits = mobileDigits(phone);

  const send = async () => {
    if (!digits) {
      setErrors({ phone: "휴대폰 번호를 확인해 주세요" });
      return;
    }
    setBusy("send");
    setErrors({});
    if (demo) {
      setSent(true);
      setCode("");
      setLeft(300);
      setBusy(null);
      setTimeout(() => codeRef.current?.focus(), 50);
      return;
    }
    try {
      const res = await fetch(`${api}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "인증번호를 보내지 못했습니다.");
      setSent(true);
      setCode("");
      setLeft(body.expiresInSec ?? 300);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setErrors({ phone: e instanceof Error ? e.message : "인증번호를 보내지 못했습니다." });
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (!sent) {
      setErrors({ phone: "인증번호를 먼저 받아 주세요" });
      return;
    }
    if (code.length !== 6) {
      setErrors({ code: "6자리를 입력해 주세요" });
      return;
    }
    if (left <= 0) {
      setErrors({ code: "시간이 지났어요. 다시 받아 주세요" });
      return;
    }
    setBusy("verify");
    setErrors({});
    if (demo) {
      setBusy(null);
      if (code !== DEMO_CODE) {
        setErrors({ code: "인증번호가 일치하지 않습니다" });
        return;
      }
      onVerified({ ticket: "demo", phone: digits!, result: null });
      return;
    }
    try {
      const res = await fetch(`${api}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "인증하지 못했습니다.");
      onVerified({ ticket: body.ticket, phone: digits!, result: body.result ?? null });
    } catch (e) {
      setErrors({ code: e instanceof Error ? e.message : "인증하지 못했습니다." });
    } finally {
      setBusy(null);
    }
  };

  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="휴대폰 번호 확인"
      sub="룰렛은 1인 1회 참여할 수 있어요. 확인 후 바로 룰렛이 돌아갑니다."
      footer={
        <>
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={verify} disabled={busy !== null}>
            {busy === "verify" ? "확인 중…" : "확인하고 룰렛 돌리기"}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Field label="휴대폰 번호" required error={errors.phone} errorPlacement="label">
          <Input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="010-0000-0000"
            fullWidth
            value={phone}
            disabled={busy !== null}
            onChange={(e) => {
              setPhone(formatMobile(e.target.value));
              setErrors({});
            }}
            trailing={
              <Button variant="soft" size="sm" onClick={send} disabled={busy !== null}>
                {busy === "send" ? "보내는 중" : sent ? "다시 받기" : "인증번호 받기"}
              </Button>
            }
          />
        </Field>
        <Field
          label="인증번호"
          required
          error={errors.code}
          errorPlacement="label"
          hint={
            sent
              ? demo
                ? `미리보기 — 문자 대신 인증번호 ${DEMO_CODE} 을 입력해 주세요.`
                : "문자로 받은 6자리를 입력해 주세요."
              : "번호를 적고 「인증번호 받기」를 눌러 주세요."
          }
        >
          <Input
            ref={codeRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6자리 숫자"
            maxLength={6}
            fullWidth
            disabled={!sent || busy !== null}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setErrors({});
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void verify();
            }}
            trailing={sent ? <span className={left > 0 ? styles.timer : styles.timerOver}>{left > 0 ? mmss : "시간 초과"}</span> : undefined}
          />
        </Field>
        <p className={styles.foot}>
          입력하신 번호는 1인 1회 참여 확인에 사용합니다. 상담 연락은 상담 신청서에서 동의하신 경우에만 드립니다.
        </p>
      </div>
    </Modal>
  );
}
