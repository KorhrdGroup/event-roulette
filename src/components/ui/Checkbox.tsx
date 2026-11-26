"use client";

/**
 * 체크박스 · 라디오 · 스위치 — 16 · 앱 파랑, 브라우저 기본 위젯 대신 직접 그린다(브라우저마다 같은 모양).
 *
 *   <Checkbox checked={agree} onChange={…} label="동의합니다" />
 *   <Checkbox aria-label="전체 선택" checked={all} indeterminate={some} onChange={…} />   // 이름표 없이 상자만
 *   <Radio name="cost" checked={v === "a"} onChange={…} label="판관비" />
 *   <Switch checked={pinned} onChange={…} label="상단 고정" />     // 켜는 즉시 적용되는 설정에만
 *
 * label 을 주면 <label> 로 감싸 글자를 눌러도 선택된다. 표 안에서는 Table 의 <TableCheckbox> 를 쓴다(같은 모양 + 줄 클릭 막기).
 * 여러 값 중 하나를 칩으로 고르는 자리는 라디오가 아니라 <ChoiceGroup>.
 */

import React, { useEffect, useRef } from "react";
import styles from "./Checkbox.module.css";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

function Option({
  label,
  disabled,
  className,
  children,
}: {
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  children: React.ReactElement;
}) {
  if (label == null) return children;
  return (
    <label className={cx(styles.option, disabled && styles.optionDisabled, className)}>
      {children}
      <span>{label}</span>
    </label>
  );
}

export function Checkbox({
  label,
  indeterminate,
  className,
  ...rest
}: InputProps & {
  label?: React.ReactNode;
  /** 일부만 선택 — 표 머리줄의 전체 선택 칸 */
  indeterminate?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  const bare = label == null;
  return (
    <Option label={label} disabled={rest.disabled} className={className}>
      <input ref={ref} type="checkbox" className={cx(styles.box, bare && className)} {...rest} />
    </Option>
  );
}

export function Radio({ label, className, ...rest }: InputProps & { label?: React.ReactNode }) {
  const bare = label == null;
  return (
    <Option label={label} disabled={rest.disabled} className={className}>
      <input type="radio" className={cx(styles.radio, bare && className)} {...rest} />
    </Option>
  );
}

export function Switch({ label, className, ...rest }: InputProps & { label?: React.ReactNode }) {
  const bare = label == null;
  return (
    <Option label={label} disabled={rest.disabled} className={className}>
      <input type="checkbox" role="switch" className={cx(styles.switch, bare && className)} {...rest} />
    </Option>
  );
}
