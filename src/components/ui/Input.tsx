"use client";

import React, { useCallback, useContext, useId, useLayoutEffect, useState } from "react";
import styles from "./Input.module.css";

type Size = "sm" | "md" | "lg";

/**
 * 칸 글에서 빨갛게 보일 표시 — 화면이 Provider 로 정하면 그 안의 Input · Textarea 가 맞는 글자만 빨간 글자로 보여 준다
 * (2026-11-05 콘텐츠 스튜디오 「[확인 필요]」, 사용자). 칸 글은 투명하게 두고 같은 자리에 칠한 글을 겹쳐 그린다 — 커서 · 고르기는 칸 그대로.
 */
export const InputMarks = React.createContext<RegExp | null>(null);

/* 바깥 ref 에도 같은 칸을 바로 넘긴다 — 처음 그릴 때부터 바깥 effect 가 칸을 볼 수 있게(포커스 등) */
function assignRef<T>(ref: React.ForwardedRef<T>, v: T | null) {
  if (typeof ref === "function") ref(v);
  else if (ref) ref.current = v;
}

const skip = () => {};

function useMarks<T extends HTMLInputElement | HTMLTextAreaElement>(value: unknown, multi: boolean) {
  const re = useContext(InputMarks);
  /* 칸 · 겹친 글 요소는 state 로 받는다(렌더 중 ref 를 읽지 않게) */
  const [el, setEl] = useState<T | null>(null),
    [layer, setLayer] = useState<HTMLSpanElement | null>(null);
  const [place, setPlace] = useState<React.CSSProperties | null>(null);
  const text = typeof value === "string" ? value : "";
  const hit = !!re && new RegExp(re.source, re.flags.replace("g", "")).test(text);
  useLayoutEffect(() => {
    if (!hit || !el) return;
    /* 겹쳐 그린 글도 칸과 같이 스크롤 */
    const sync = () => {
      if (!layer) return;
      layer.scrollLeft = el.scrollLeft;
      layer.scrollTop = el.scrollTop;
    };
    const measure = () => {
      const cs = getComputedStyle(el);
      setPlace({
        left: el.offsetLeft + el.clientLeft,
        top: el.offsetTop + el.clientTop,
        width: el.clientWidth,
        height: el.clientHeight,
        padding: cs.padding,
        font: cs.font,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign as React.CSSProperties["textAlign"],
        lineHeight: multi ? cs.lineHeight : `${el.clientHeight}px`,
        wordBreak: cs.wordBreak as React.CSSProperties["wordBreak"],
        overflowWrap: cs.overflowWrap as React.CSSProperties["overflowWrap"],
      });
    };
    /* 겹친 글은 칸의 부모 기준으로 놓인다 — 부모가 위치 기준이 아니면 더 바깥(페이지)이 기준이 되어,
       스크롤하는 화면 틀 안에서 글이 칸을 벗어난다(2026-11-09 게시글 원고). 부모를 위치 기준으로 두고 끝나면 되돌린다 */
    const parent = el.parentElement;
    const lift = parent && getComputedStyle(parent).position === "static" ? parent : null;
    lift?.style.setProperty("position", "relative");
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (parent) ro.observe(parent);
    el.addEventListener("scroll", sync);
    el.addEventListener("input", sync);
    el.addEventListener("keyup", sync);
    requestAnimationFrame(sync);
    return () => {
      lift?.style.removeProperty("position");
      ro.disconnect();
      el.removeEventListener("scroll", sync);
      el.removeEventListener("input", sync);
      el.removeEventListener("keyup", sync);
    };
  }, [hit, text, multi, el, layer]);
  const overlay =
    hit && re && place ? (
      <span ref={setLayer} className={`${styles.markLayer} ${multi ? styles.markMulti : ""}`} style={place} aria-hidden="true">
        {paint(text, re)}
        {multi && " "}
      </span>
    ) : null;
  /* 표시 규칙이 없는 화면(대부분)은 칸을 받아 두지 않는다 — 다시 그리기가 늘지 않게 */
  return { setEl: re ? setEl : skip, marked: hit, overlay };
}

function paint(text: string, re: RegExp) {
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))) {
    const i = m.index ?? 0;
    out.push(text.slice(at, i), <mark key={i}>{m[0]}</mark>);
    at = i + m[0].length;
  }
  out.push(text.slice(at));
  return out;
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** 높이 — sm 32 · md 36(기본) · lg 44. 버튼·셀렉트와 같은 눈금이라 한 줄에 놓으면 높이가 맞는다 */
  size?: Size;
  /** 빨간 테두리 + aria-invalid. 안내 문구는 <Field error> 가 칸 아래에 적는다 */
  invalid?: boolean;
  /** 칸 안 왼쪽 — 검색 돋보기 같은 아이콘 */
  leading?: React.ReactNode;
  /** 칸 안 오른쪽 — 「원」「명」 같은 단위, 지우기 버튼 */
  trailing?: React.ReactNode;
  fullWidth?: boolean;
  /** 테두리 상자(span) 클래스 — 배치(폭·여백)용 */
  className?: string;
  /** <input> 자체 클래스 — 글자 정렬(숫자 오른쪽 등)용 */
  inputClassName?: string;
}

/**
 * 한 줄 입력칸. 테두리는 바깥 상자가 그리고 <input> 은 투명하다 —
 * 아이콘·단위가 붙어도 포커스 테두리가 상자 전체를 감싸게 (:focus-within).
 * 모양은 NativeSelect · Select 트리거와 같다(1px 테두리 · radius md · 포커스 파랑 + 링).
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid = false, leading, trailing, fullWidth = false, className = "", inputClassName = "", disabled, readOnly, ...rest },
  ref,
) {
  const cls = [
    styles.box,
    styles[size],
    fullWidth ? styles.fullWidth : "",
    invalid ? styles.invalid : "",
    disabled ? styles.disabled : "",
    readOnly ? styles.readOnly : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const { setEl, marked, overlay } = useMarks<HTMLInputElement>(rest.value, false);
  const setRef = useCallback((v: HTMLInputElement | null) => (assignRef(ref, v), setEl(v)), [ref, setEl]);
  return (
    <span className={cls}>
      {leading && <span className={styles.leading} aria-hidden="true">{leading}</span>}
      <input
        ref={setRef}
        className={`${styles.input} ${marked ? styles.marked : ""} ${inputClassName}`}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      {overlay}
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </span>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  fullWidth?: boolean;
}

/** 여러 줄 입력칸 — Input 과 같은 테두리·포커스·오류 모양. 세로로만 늘릴 수 있다 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, fullWidth = false, className = "", rows = 3, ...rest },
  ref,
) {
  const { setEl, marked, overlay } = useMarks<HTMLTextAreaElement>(rest.value, true);
  const setRef = useCallback((v: HTMLTextAreaElement | null) => (assignRef(ref, v), setEl(v)), [ref, setEl]);
  const cls = [styles.textarea, fullWidth ? styles.fullWidth : "", invalid ? styles.invalid : "", marked ? styles.marked : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <textarea ref={setRef} rows={rows} className={cls} aria-invalid={invalid || undefined} {...rest} />
      {overlay}
    </>
  );
});

export interface FieldProps {
  label: React.ReactNode;
  /** 이름표 옆 빨간 * */
  required?: boolean;
  /** 칸 아래 회색 도움말 — 오류가 있으면 오류가 대신 선다 */
  hint?: React.ReactNode;
  /** 칸 아래 빨간 안내. 있으면 안의 Input/Textarea 가 invalid 가 된다 */
  error?: React.ReactNode;
  /**
   * 오류 문구의 자리 (기본 below = 칸 아래).
   * label = 이름표 줄 오른쪽 — 문구가 떠도 칸 높이가 늘지 않는다(팝업처럼 높이가 바뀌면 안 되는 곳).
   * 이때 도움말(hint)은 칸 아래에 그대로 남는다.
   */
  errorPlacement?: "below" | "label";
  /** 이름표 줄 오른쪽 끝에 둘 버튼 하나(예: 「파일 넣기」) — 칸에 딸린 할 일을 칸 위 줄에 붙인다(2026-10-30) */
  action?: React.ReactNode;
  /**
   * 이름표의 자리 (기본 column = 칸 위).
   * row = 칸 왼쪽(폭 80 · 사이 12) — 상세 팝업처럼 「이름: 값」 줄이 여럿 쌓이는 곳 (2026-10-12).
   * 글자는 column 과 같다(12 / 600). 도움말 · 오류는 칸 아래(칸과 같은 열)에 선다.
   */
  layout?: "column" | "row";
  /** 안에 넣을 칸의 id — 없으면 만든다 */
  id?: string;
  className?: string;
  /**
   * 칸 하나가 아니라 묶음(라디오 여럿, 파일 첨부 버튼)일 때. 이름표를 <label> 대신 글자로 두고
   * 묶음에 role="group" + aria-labelledby 를 단다 — 누를 칸이 하나가 아니라서.
   */
  group?: boolean;
  /** Input · Textarea · NativeSelect 하나 (group 이면 묶음 요소) */
  children: React.ReactElement<{
    id?: string;
    invalid?: boolean;
    role?: string;
    "aria-describedby"?: string;
    "aria-labelledby"?: string;
  }>;
}

/**
 * 이름표 + 칸 + 도움말/오류 한 묶음. 이름표 클릭 → 칸으로 커서, 오류는 aria-describedby 로 읽힌다.
 *   <Field label="휴대전화" required error={errors.phone}>
 *     <Input value={phone} onChange={…} inputMode="tel" />
 *   </Field>
 */
export function Field({
  label,
  required,
  hint,
  error,
  errorPlacement = "below",
  action,
  layout = "column",
  id,
  className = "",
  group = false,
  children,
}: FieldProps) {
  const auto = useId();
  const fieldId = id ?? children.props.id ?? `field-${auto}`;
  const labelId = `${fieldId}-label`;
  const noteId = `${fieldId}-note`;
  const errorInLabel = !!error && errorPlacement === "label";
  // 칸 아래에 서는 한 줄 — 오류가 이름표 줄로 갔으면 도움말만 남는다
  const below = errorInLabel ? hint : error || hint;
  const described = error || hint;
  const child = React.cloneElement(children, {
    ...(group ? { role: "group", "aria-labelledby": labelId } : { id: fieldId }),
    ...(error && !group ? { invalid: true } : {}),
    ...(described ? { "aria-describedby": noteId } : {}),
  });
  const mark = required && <span className={styles.required} aria-hidden="true">*</span>;
  const labelEl = group ? (
    <span id={labelId} className={styles.label}>
      {label}
      {mark}
    </span>
  ) : (
    <label htmlFor={fieldId} className={styles.label}>
      {label}
      {mark}
    </label>
  );
  return (
    <div className={`${styles.field} ${layout === "row" ? styles.fieldRow : ""} ${className}`}>
      {errorInLabel || action ? (
        <div className={styles.labelRow}>
          {labelEl}
          {errorInLabel && (
            <span id={noteId} className={`${styles.error} ${styles.errorInline}`}>
              {error}
            </span>
          )}
          {action}
        </div>
      ) : (
        labelEl
      )}
      {child}
      {below && (
        <span id={errorInLabel ? undefined : noteId} className={error && !errorInLabel ? styles.error : styles.hint}>
          {below}
        </span>
      )}
    </div>
  );
}

export default Input;
