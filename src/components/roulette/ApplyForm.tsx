"use client";

import { useState } from "react";
import { ChevronDown, ClipboardList, Gift, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field, Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { ChoiceChip, ChoiceGroup } from "@/components/ui/ChoiceChip";
import {
  DEFAULT_INTEREST_COURSE,
  EDUCATION_OPTIONS,
  INTEREST_COURSES,
  PREFERRED_TIME_OPTIONS,
  REASON_OPTIONS,
  ROULETTE_LIMITS,
  TIME_MEMO_MAX,
  formatMobile,
} from "@/lib/roulette";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import styles from "./ApplyForm.module.css";

/**
 * 무료 상담 신청서 — 이름 · 연락처(인증한 번호, 고칠 수 없음) · 관심 과정(기본 사회복지사 2급) · 최종학력 · 취득사유
 *   · 빠른 상담 · 상담 선호 시간 · 시간 메모(바로소셜 신청서와 같은 칸, 2026-11-26) · 당첨 혜택(룰렛 결과, 고칠 수 없음) · 동의 두 가지
 *   (개인정보처리방침 동의 — 바로소셜과 같은 방침 팝업, 상담 연락 동의).
 * 「상담 신청 완료」를 누르면 오피스 학점은행제 문의DB 로 들어간다(apply API).
 * 오피스 입력 폼 규칙: 칸은 <Field> 로 20 간격, 버튼은 빈 칸이 있어도 끄지 않는다 — 누르면 보내지 않고 빈 칸에 문구를 띄운다.
 */
export default function ApplyForm({
  api,
  demo = false,
  ticket,
  phone,
  prizeLabel,
  onDone,
  onExpired,
}: {
  api: string;
  /** 미리보기(?demo=1) — 접수하지 않고 완료 화면으로 */
  demo?: boolean;
  ticket: string;
  phone: string;
  prizeLabel: string;
  onDone: (name: string) => void;
  onExpired: () => void;
}) {
  const [name, setName] = useState("");
  const [course, setCourse] = useState<string>(DEFAULT_INTEREST_COURSE);
  const [education, setEducation] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [fast, setFast] = useState(false);
  const [times, setTimes] = useState<string[]>([]);
  const [timeMemo, setTimeMemo] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [contact, setContact] = useState(false);
  const [openTerms, setOpenTerms] = useState<"contact" | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; education?: string; reason?: string; agree?: string; submit?: string }>({});
  const [busy, setBusy] = useState(false);

  const all = privacy && contact;
  const clearAgree = () => {
    if (errors.agree) setErrors((p) => ({ ...p, agree: undefined }));
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "이름을 입력해 주세요";
    if (!education) next.education = "최종학력을 골라 주세요";
    if (!reasons.length) next.reason = "하나 이상 골라 주세요";
    if (!all) next.agree = "필수 항목에 모두 동의해 주세요";
    setErrors(next);
    if (next.name || next.education || next.reason || next.agree) return;

    setBusy(true);
    if (demo) {
      setTimeout(() => {
        setBusy(false);
        onDone(name.trim());
      }, 400);
      return;
    }
    try {
      const res = await fetch(`${api}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket,
          name: name.trim(),
          course,
          education,
          reasons,
          fastConsultation: fast,
          preferredTimes: times,
          timeMemo: timeMemo.trim(),
          privacyAgreed: privacy,
          contactAgreed: contact,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 && body.code === "ticket") {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error(body.error ?? "상담 신청을 접수하지 못했습니다.");
      onDone(name.trim());
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : "상담 신청을 접수하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="apply-title">
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          <ClipboardList size={24} />
        </span>
        <h1 id="apply-title" className={styles.title}>
          무료 상담 신청서
        </h1>
        <p className={styles.sub}>당첨된 장학 혜택으로 사회복지사 취득 상담을 도와드립니다.</p>
      </div>

      <div className={styles.fields}>
        <Field label="이름" required error={errors.name} errorPlacement="label">
          <Input
            size="lg"
            fullWidth
            placeholder="이름을 입력해 주세요"
            autoComplete="name"
            maxLength={ROULETTE_LIMITS.name}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
          />
        </Field>

        <Field label="연락처" required hint="인증한 번호로 상담 연락을 드립니다.">
          <Input
            size="lg"
            fullWidth
            readOnly
            value={formatMobile(phone)}
            trailing={
              <Badge tone="success" size="sm" icon={<ShieldCheck size={12} />}>
                인증 완료
              </Badge>
            }
          />
        </Field>

        <Field label="관심 과정" required>
          <NativeSelect size="lg" fullWidth value={course} onChange={(e) => setCourse(e.target.value)}>
            {INTEREST_COURSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="최종학력" required group hint="최종학력마다 과정이 달라져요!" error={errors.education} errorPlacement="label">
          <ChoiceGroup
            layout="grid"
            columns={2}
            value={education}
            onChange={(v) => {
              setEducation(v);
              if (errors.education) setErrors((p) => ({ ...p, education: undefined }));
            }}
          >
            {EDUCATION_OPTIONS.map((o) => (
              <ChoiceChip key={o} value={o} tile>
                {o}
              </ChoiceChip>
            ))}
          </ChoiceGroup>
        </Field>

        <Field label="취득사유가 어떻게 되시나요?" required group hint="복수선택 가능" error={errors.reason} errorPlacement="label">
          <ChoiceGroup
            multiple
            layout="grid"
            columns={2}
            value={reasons}
            onChange={(v) => {
              setReasons(v);
              if (errors.reason) setErrors((p) => ({ ...p, reason: undefined }));
            }}
          >
            {REASON_OPTIONS.map((o) => (
              <ChoiceChip key={o} value={o} tile>
                {o}
              </ChoiceChip>
            ))}
          </ChoiceGroup>
        </Field>

        <div className={styles.fastRow}>
          <Checkbox label="빠른 상담을 원합니다." checked={fast} onChange={(e) => setFast(e.target.checked)} />
          <p className={styles.fastHint}>영업시간 9:00~18:00 사이 연락 드립니다.</p>
        </div>

        <Field label="상담이 편하신 시간대를 알려주세요." group hint="복수선택 가능">
          <ChoiceGroup multiple layout="grid" columns={3} className={styles.threeAcross} value={times} onChange={setTimes}>
            {PREFERRED_TIME_OPTIONS.map((o) => (
              <ChoiceChip key={o} value={o} tile>
                {o}
              </ChoiceChip>
            ))}
          </ChoiceGroup>
        </Field>

        <Field label="상담 시간 관련 메모" hint="편하신 요일, 시간 관련 메모를 남겨주시면 최대한 맞춰서 연락드려요.">
          <Input
            size="lg"
            fullWidth
            maxLength={TIME_MEMO_MAX}
            placeholder="월/수/금 오전, 화/목 오후 선호"
            value={timeMemo}
            onChange={(e) => setTimeMemo(e.target.value)}
            trailing={
              <span className={styles.count}>
                {timeMemo.length}/{TIME_MEMO_MAX}
              </span>
            }
          />
        </Field>

        <Field label="당첨 혜택" hint="룰렛 결과가 자동으로 들어갑니다.">
          <Input
            size="lg"
            fullWidth
            readOnly
            value={prizeLabel}
            leading={<Gift size={16} className={styles.gift} />}
            inputClassName={styles.prizeInput}
          />
        </Field>

        <Field label="약관 동의" required group error={errors.agree} errorPlacement="label">
          <div className={styles.agree}>
            <div className={styles.agreeAll}>
              <Checkbox
                label="전체 동의"
                checked={all}
                onChange={(e) => {
                  setPrivacy(e.target.checked);
                  setContact(e.target.checked);
                  clearAgree();
                }}
              />
            </div>
            <AgreeRow
              checked={privacy}
              onChange={(v) => {
                setPrivacy(v);
                clearAgree();
              }}
              label="개인정보처리방침 동의"
              onView={() => setPolicyOpen(true)}
            />
            <AgreeRow
              checked={contact}
              onChange={(v) => {
                setContact(v);
                clearAgree();
              }}
              label="상담 연락 동의"
              open={openTerms === "contact"}
              onToggle={() => setOpenTerms((o) => (o === "contact" ? null : "contact"))}
            >
              <p className={styles.termsNote}>신청하신 번호로 담당 선생님이 전화 · 문자로 교육 과정과 당첨 혜택을 안내해 드립니다.</p>
            </AgreeRow>
          </div>
        </Field>
      </div>

      {errors.submit && (
        <p className={styles.submitError} role="alert">
          {errors.submit}
        </p>
      )}

      <PrivacyPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />

      <div className={styles.actions}>
        <Button variant="primary" size="touch" fullWidth onClick={submit} disabled={busy}>
          {busy ? "접수하는 중…" : "상담 신청 완료"}
        </Button>
      </div>
    </section>
  );
}

function AgreeRow({
  checked,
  onChange,
  label,
  open = false,
  onToggle,
  onView,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  /** 펼쳐 보이는 내용 — onView 가 없을 때 */
  open?: boolean;
  onToggle?: () => void;
  /** 내용을 팝업으로 볼 때(개인정보처리방침) — 「보기」 버튼 */
  onView?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.agreeRow}>
      <div className={styles.agreeLine}>
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          label={
            <>
              <span className={styles.req}>[필수]</span> {label}
            </>
          }
        />
        {onView ? (
          <Button variant="ghost" size="sm" onClick={onView}>
            보기
          </Button>
        ) : (
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={`${label} 내용 ${open ? "접기" : "보기"}`}
          aria-expanded={open}
          onClick={onToggle}
        >
          <ChevronDown size={16} className={open ? styles.chevOpen : undefined} />
        </Button>
        )}
      </div>
      {open && <div className={styles.termsBody}>{children}</div>}
    </div>
  );
}
