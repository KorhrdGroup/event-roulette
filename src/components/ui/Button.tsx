import React from "react";
import styles from "./Button.module.css";

type Variant =
  | "primary"
  | "secondary"
  | "neutral"
  | "soft"
  | "outline"
  | "ghost"
  | "dashed"
  | "success"
  | "successSoft"
  | "danger"
  | "dangerSoft"
  | "dangerOutline"
  | "dangerGhost";
type Size = "xs" | "sm" | "md" | "lg" | "touch";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 색 변형 (기본 secondary). neutral=회색 채움 — **주 버튼 옆의 두 번째 행동**
   *  (저장 옆 취소)과 아이콘 전용 버튼 전용이다. 혼자 서는 버튼은 바탕색에 묻혀
   *  비활성처럼 보이니 secondary 를 쓴다 (Button.module.css 의 .neutral 주석 참고),
   *  soft=옅은 파랑, outline=흰 배경+파랑 테두리,
   *  dashed=점선 테두리('추가' 전용 — 아직 없는 것을 만드는 자리),
   *  success=초록 채움(엑셀 다운로드·승인·저장 등 확정적 긍정 액션 전용),
   *  successSoft=연초록 채움(완료·승인됨을 옅게), danger=빨강 채움,
   *  dangerSoft=연빨강 채움, dangerOutline=흰 배경+빨강,
   *  dangerGhost=평소 회색·손이 닿으면 빨강 — **확인창·실행취소가 받아 주는 삭제**(§2.8 ② 지켜짐).
   *  목록 행마다 서는 삭제에 쓴다: 평소에 빨강이면 행마다 빨간 세로줄이 생긴다 */
  variant?: Variant;
  /** 크기 (기본 md). xs(28px)는 아이콘 전용 — iconOnly 와 함께 쓰고,
   *  글자 버튼은 sm(32px)이 최소다.
   *  touch(56px)는 **손가락으로 누르는 화면의 전체폭 CTA 전용**이다 —
   *  radius·굵기도 같이 커진다. 데스크톱 툴바에 쓰지 않는다. */
  size?: Size;
  /** 텍스트 앞 아이콘 */
  leftIcon?: React.ReactNode;
  /** 텍스트 뒤 아이콘 (화살표 등) */
  rightIcon?: React.ReactNode;
  /** 아이콘 전용(정사각) 버튼 */
  iconOnly?: boolean;
  /** 가로 꽉 채우기 */
  fullWidth?: boolean;
}

/**
 * 공유 버튼.
 * variant(primary/secondary/ghost/danger/dangerOutline) + size(sm/md/lg)로
 * 통일된 색·높이·radius를 --hps-* 토큰에서 상속한다.
 * 아이콘은 leftIcon/rightIcon 슬롯으로 좌·우 배치.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    leftIcon,
    rightIcon,
    iconOnly = false,
    fullWidth = false,
    type = "button",
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    iconOnly ? styles.iconOnly : "",
    fullWidth ? styles.fullWidth : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // ref 전달 — <Menu anchorRef> 처럼 트리거 위치가 필요한 곳에서 쓴다 (2026-09)
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});

export default Button;
