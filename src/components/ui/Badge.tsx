import React from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "teal" | "purple";
export type BadgeShape = "pill" | "square";
export type BadgeSize = "sm" | "md";
export type BadgeVariant = "soft" | "solid";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 색 — 상태색 토큰 그대로. 기본 neutral(회색) */
  tone?: BadgeTone;
  /** soft = 옅은 배경 + 색 글자(기본) · solid = 색 채움 + 흰 글자 (강조 라벨: 오늘·추천·순위) */
  variant?: BadgeVariant;
  /** pill = 상태·라벨(기본) · square = 분류·카테고리 태그 */
  shape?: BadgeShape;
  /** sm 18px · xs 글자 (기본) · md 22px · sm 글자 */
  size?: BadgeSize;
  /** 앞에 상태 점 */
  dot?: boolean;
  /** 앞 아이콘 (12~14px) */
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 뱃지 — 상태·분류·라벨을 한 규격으로.
 * 로컬 `.badge*`·`.pill*`·`.tag*` 197개(82가지 조합)를 이 하나로 모았다 (2026-09).
 * 누르면 동작하는 건 <FilterChip>·<ChoiceChip>, 숫자 카운트는 <CountBadge>.
 */
export function Badge({
  tone = "neutral",
  variant = "soft",
  shape = "pill",
  size = "sm",
  dot = false,
  icon,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span {...rest} className={`${styles.badge} ${styles[tone]} ${variant === "solid" ? styles.solid : ""} ${styles[shape]} ${styles[size]} ${className}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}

export interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number;
  /** 기본 info(파랑). 미처리·경고는 danger, 조용한 건수는 neutral */
  tone?: "info" | "danger" | "neutral";
  /** 이 값을 넘으면 "99+" */
  max?: number;
  /** 0 이어도 보여줄지 (기본 숨김) */
  showZero?: boolean;
}

/** 숫자 뱃지 — 탭·아이콘 옆 건수. 한 자리는 18px 원, 두 자리부터 알약 */
export function CountBadge({ count, tone = "info", max = 99, showZero = false, className = "", ...rest }: CountBadgeProps) {
  if (count === 0 && !showZero) return null;
  const text = count > max ? `${max}+` : String(count);
  return (
    <span {...rest} className={`${styles.count} ${styles[`count_${tone}`]} ${className}`}>
      {text}
    </span>
  );
}

export default Badge;
