"use client";

import React, { createContext, useCallback, useContext, useId } from "react";
import styles from "./ChoiceChip.module.css";

type Size = "sm" | "md";
/** 선택 색. default=파랑. success/warning 은 좋음·나쁨 같은 의미가 있는 자리(업무일지 잘된/아쉬운 이유) 전용.
 *  neutral=무채색(FilterChip tone="neutral" 과 같은 색) — 칩이 많아 파랑이 시끄러운 편집 칸(프레젠테이션 구도 · 테마) */
type Tone = "default" | "success" | "warning" | "neutral";

interface GroupCtx {
  multiple: boolean;
  /** 단일 모드에서 아무것도 선택되지 않았으면 모든 칩이 탭 정지점 */
  hasSelection: boolean;
  isChecked: (v: string) => boolean;
  toggle: (v: string) => void;
}

const Ctx = createContext<GroupCtx | null>(null);

interface BaseGroupProps {
  /** 크기 (기본 md=36px). sm=32px */
  size?: Size;
  /** 선택 색 (기본 파랑). 값 자체가 좋음/나쁨 뜻을 가질 때만 success/warning, 무채색은 neutral */
  tone?: Tone;
  /** 단일 선택에서 고른 칩을 다시 눌러 해제할 수 있게 (기본 false) */
  allowDeselect?: boolean;
  /**
   * 배치 (기본 row — 칩이 줄줄이 이어 붙고 넘치면 다음 줄).
   * <ChoiceCard> 는 설명이 붙어 폭이 필요하니 둘 중 하나를 고른다 (2026-09-14):
   *   grid    나란히 놓고 비교하는 두세 갈래 (예산 범위, 테스트 구조)
   *   column  위아래로 훑어 하나 고르는 목록 (연결할 광고 고르기)
   */
  layout?: "row" | "grid" | "column";
  /**
   * grid 일 때 열 수 (기본 2). (2026-09-14)
   *   3       세 갈래를 한 줄에 — 소재 형식(이미지·영상·캐러셀)
   *   4       넷씩 두 줄 — 콘텐츠 스튜디오 용도 여덟 칸(2026-11-03)
   *   "auto"  항목 수가 그때그때 다를 때 폭에 맞춰 채운다 — 권한 관리의 직급
   */
  columns?: 2 | 3 | 4 | "auto";
  className?: string;
  /** 스크린리더용 그룹 이름 — 폼 라벨이 따로 있으면 그걸 aria-labelledby 로 */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  children: React.ReactNode;
}

export interface SingleChoiceGroupProps<T extends string = string> extends BaseGroupProps {
  multiple?: false;
  value: T | null;
  onChange: (value: T | null) => void;
}

export interface MultiChoiceGroupProps<T extends string = string> extends BaseGroupProps {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
}

export type ChoiceGroupProps<T extends string = string> =
  | SingleChoiceGroupProps<T>
  | MultiChoiceGroupProps<T>;

/**
 * 폼 값 선택 그룹.
 * - 단일: role="radiogroup" + radio, ←/→ 로 선택 이동. allowDeselect 면 재클릭 해제.
 * - 다중(multiple): role="group" + checkbox, 각 칩이 탭 정지점.
 * 값을 저장하는 자리 전용 — 목록 거르기는 <FilterChip>, 같은 데이터 보기 전환은 <Tabs segment>.
 */
export function ChoiceGroup<T extends string = string>(props: ChoiceGroupProps<T>) {
  const {
    size = "md",
    tone = "default",
    allowDeselect = false,
    layout = "row",
    columns = 2,
    className = "",
    children,
  } = props;
  const multiple = props.multiple === true;

  const isChecked = useCallback(
    (v: string) =>
      props.multiple ? props.value.includes(v as T) : props.value === (v as T),
    [props],
  );

  const toggle = useCallback(
    (v: string) => {
      if (props.multiple) {
        const cur = props.value;
        props.onChange(
          cur.includes(v as T) ? cur.filter((x) => x !== v) : [...cur, v as T],
        );
      } else if (props.value === v) {
        if (allowDeselect) props.onChange(null);
      } else {
        props.onChange(v as T);
      }
    },
    [props, allowDeselect],
  );

  const hasSelection = multiple ? true : props.value != null;

  // 단일 선택 ←/→ — DOM 순서 기준이라 칩이 <span> 등으로 감싸여 있어도 동작
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (multiple) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const enabled = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')].filter(
      (el) => !el.disabled,
    );
    if (enabled.length === 0) return;
    const cur = enabled.findIndex((el) => el.dataset.value === (props.value as string));
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = enabled[(cur + dir + enabled.length) % enabled.length];
    e.preventDefault();
    (props as SingleChoiceGroupProps<T>).onChange(next.dataset.value as T);
    next.focus();
  };

  const cls = [
    styles.group,
    styles[size],
    layout === "grid" ? styles.grid : layout === "column" ? styles.column : "",
    layout === "grid" && columns === 3 ? styles.gridCols3 : "",
    layout === "grid" && columns === 4 ? styles.gridCols4 : "",
    layout === "grid" && columns === "auto" ? styles.gridColsAuto : "",
    tone !== "default" ? styles[tone] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Ctx.Provider value={{ multiple, hasSelection, isChecked, toggle }}>
      <div
        role={multiple ? "group" : "radiogroup"}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        className={cls}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export interface ChoiceChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onChange"> {
  value: string;
  /** 라벨 앞 아이콘 */
  icon?: React.ReactNode;
  /**
   * 타일 — 그림(icon)을 위에 크게, 이름은 아래 (2026-10-28 콘텐츠 스튜디오 프레젠테이션 구도).
   * 글자만으로는 모양을 알기 어려운 값을 고를 때. 높이는 내용대로, 그림은 고르기 전엔 옅게.
   * 보통 <ChoiceGroup layout="grid" columns={3}> 와 같이 쓴다.
   */
  tile?: boolean;
  children: React.ReactNode;
}

/** ChoiceGroup 안에서만 쓴다. 선택 상태·역할은 그룹이 정한다. */
export function ChoiceChip({
  value,
  icon,
  tile,
  children,
  className = "",
  disabled,
  onClick,
  ...rest
}: ChoiceChipProps) {
  const ctx = useContext(Ctx);
  const id = useId();
  if (!ctx) throw new Error("<ChoiceChip> 은 <ChoiceGroup> 안에서만 쓸 수 있습니다.");
  const checked = ctx.isChecked(value);
  // 단일: 선택된 칩만 탭 정지점(roving). 선택이 없으면 전부 정지점.
  const tabIndex = ctx.multiple || checked || !ctx.hasSelection ? 0 : -1;

  return (
    <button
      {...rest}
      id={rest.id ?? id}
      type="button"
      role={ctx.multiple ? "checkbox" : "radio"}
      aria-checked={checked}
      data-value={value}
      tabIndex={tabIndex}
      disabled={disabled}
      className={`${styles.chip} ${checked ? styles.checked : ""} ${tile ? styles.tile : ""} ${className}`}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) ctx.toggle(value);
      }}
    >
      {ctx.multiple && checked && (
        <span className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 9 6" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.146.183a.625.625 0 0 1 0 .884L3.461 5.752a.667.667 0 0 1-.943 0L.19 3.424a.625.625 0 1 1 .884-.884L2.99 4.456 7.262.183a.625.625 0 0 1 .884 0Z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
      {icon && <span className={styles.icon}>{icon}</span>}
      <span
        className={styles.label}
        data-label={typeof children === "string" ? children : undefined}
      >
        {children}
      </span>
    </button>
  );
}

export default ChoiceGroup;

/* =========================================================================
   ChoiceCard — 설명이 붙는 값 선택
   ========================================================================= */

export interface ChoiceCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onChange" | "title"> {
  value: string;
  /** 값 이름 — 카드의 첫 줄 */
  title: React.ReactNode;
  /** 제목 옆 표식 (예: "추천") */
  badge?: React.ReactNode;
  /** 맨 아래 보조 문구 (예: "생성 예정 V4") */
  meta?: React.ReactNode;
  /**
   * 크기 (기본 md). md=여백 12·모서리 8 / lg=여백 16·모서리 12.
   * 전수조사(2026-09-14)에서 실제로 쓰이던 두 덩어리를 그대로 옮긴 값이다.
   */
  size?: "md" | "lg";
  /**
   * 고르는 표시(네모·동그라미)를 그릴지 (기본 true).
   * 아이콘처럼 "고르는 자리" 를 이미 말해 주는 게 따로 있으면 false 로 끈다
   * — marketing-os 소재 형식이 그렇다. (2026-09-14)
   */
  mark?: boolean;
  /** 설명 — 두어 줄까지 */
  children?: React.ReactNode;
}

/**
 * 값 선택 카드 — <ChoiceGroup> 안에서만 쓴다.
 *
 * <ChoiceChip> 과 같은 일(폼 값 저장)을 하지만, **고르기 전에 설명을 읽어야 하는**
 * 자리를 맡는다. 칩은 높이 36px 한 줄 고정이라 설명이 들어갈 자리가 없다.
 *
 * 전수조사(2026-09-14): 같은 모양을 8가지 로컬 클래스가 15곳에서 각자 그리고 있었다
 * (.typeCard · .positionCard · .modalOptionCard · .statusCard · .optionCard ·
 *  .matchCard · .formatCard · .cardSelected). 선택 표시는 그중 다수가 쓰던
 * "파랑 테두리 + 옅은 파랑 배경" 을 따랐다 — 내가 정한 게 아니라 이미 그렇던 것이다.
 *
 * 목록에서 항목을 고르는 자리(광고 후보처럼 값이 여럿 붙는 행)도 이걸 쓴다 —
 * children 에 원하는 만큼 넣으면 된다.
 */
export function ChoiceCard({
  value,
  title,
  badge,
  meta,
  size = "md",
  mark = true,
  children,
  className = "",
  disabled,
  onClick,
  ...rest
}: ChoiceCardProps) {
  const ctx = useContext(Ctx);
  const id = useId();
  if (!ctx) throw new Error("<ChoiceCard> 은 <ChoiceGroup> 안에서만 쓸 수 있습니다.");
  const checked = ctx.isChecked(value);
  const tabIndex = ctx.multiple || checked || !ctx.hasSelection ? 0 : -1;

  return (
    <button
      {...rest}
      id={rest.id ?? id}
      type="button"
      role={ctx.multiple ? "checkbox" : "radio"}
      aria-checked={checked}
      data-value={value}
      tabIndex={tabIndex}
      disabled={disabled}
      className={[
        styles.card,
        size === "lg" ? styles.cardLg : styles.cardMd,
        checked ? styles.cardOn : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) ctx.toggle(value);
      }}
    >
      {/* 고르는 표시는 안 고른 것에도 그린다 — 칩과 다른 점이다. 칩은 글자밖에 없어
          색만으로 충분하지만, 설명이 붙은 카드는 "이게 고르는 자리" 라는 걸 먼저
          말해 줘야 한다. 자리는 지금 화면들이 그리던 그대로다 (2026-09-14 결정):
            하나만 고르기(동그라미) → 카드 왼쪽, 세로 가운데
            여럿 고르기(네모)     → 제목 줄 오른쪽 끝 */}
      {mark && !ctx.multiple && (
        <span className={styles.markDot} aria-hidden="true" />
      )}
      <span className={styles.cardMain}>
        <span className={styles.cardHead}>
          <span className={styles.cardTitle}>{title}</span>
          {badge}
          {mark && ctx.multiple && (
            <span className={styles.markBox} aria-hidden="true">
              {checked && (
                <svg viewBox="0 0 9 6" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.146.183a.625.625 0 0 1 0 .884L3.461 5.752a.667.667 0 0 1-.943 0L.19 3.424a.625.625 0 1 1 .884-.884L2.99 4.456 7.262.183a.625.625 0 0 1 .884 0Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </span>
          )}
        </span>
        {children && <span className={styles.cardDesc}>{children}</span>}
        {meta && <span className={styles.cardMeta}>{meta}</span>}
      </span>
    </button>
  );
}
