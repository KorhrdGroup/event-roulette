import React from "react";
import styles from "./NativeSelect.module.css";

type Size = "sm" | "md" | "lg";

export interface NativeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** 높이 (기본 md=36). sm=32 · lg=44 — 공용 Input · DateInput · Select 와 같은 눈금 */
  size?: Size;
  fullWidth?: boolean;
  /** 빨간 테두리 + aria-invalid. 안내 문구는 <Field error> 가 칸 아래에 적는다 */
  invalid?: boolean;
  /** 래퍼(span) 클래스 — 배치용 */
  className?: string;
  /** <select> 자체 클래스 */
  selectClassName?: string;
}

/**
 * 네이티브 <select> 껍데기 — 결재 양식·관리자 설정처럼 폼 안의 긴 목록에 쓴다.
 * 필터 바·기간처럼 눈에 띄는 자리는 <Select>. children 으로 <option> 을 그대로 넘긴다.
 * value 가 "" 이면 placeholder 색.
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  function NativeSelect(
    { size = "md", fullWidth = false, invalid = false, className = "", selectClassName = "", value, children, ...rest },
    ref,
  ) {
    const empty = value === "" || value === undefined && rest.defaultValue === "";
    const wrapCls = [styles.wrap, styles[size], fullWidth ? styles.fullWidth : "", className]
      .filter(Boolean)
      .join(" ");
    return (
      <span className={wrapCls}>
        <select
          ref={ref}
          value={value}
          className={`${styles.select} ${empty ? styles.empty : ""} ${invalid ? styles.invalid : ""} ${selectClassName}`}
          aria-invalid={invalid || undefined}
          {...rest}
        >
          {children}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    );
  },
);

export default NativeSelect;
