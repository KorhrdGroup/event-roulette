"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";
import styles from "./Modal.module.css";

/**
 * 팝업 공용 틀 (2026-10-01 신설, docs/DESIGN_SYSTEM.md §3.18).
 *
 *   <Modal open={open} onClose={close} title="담당자 추가" size="sm"
 *     footer={<>
 *       <Button variant="neutral" onClick={close}>취소</Button>
 *       <Button variant="primary" onClick={save}>저장</Button>
 *     </>}>
 *     …입력칸…
 *   </Modal>
 *
 * 틀이 맡는 것: 뒤 막 · 판(모서리 12 · 그림자) · 머리(제목 + ✕) · 몸(길면 여기만 스크롤) · 바닥줄,
 * 그리고 닫는 동작 — Esc, 바깥 클릭, 뒤 화면 스크롤 잠금, 포커스(열리면 안으로 · Tab 은 안에서만 · 닫히면 열었던 자리로).
 *
 * - 바닥줄: 취소는 neutral, 주 버튼은 primary, 둘 다 md. 삭제는 footerStart 에 dangerGhost — 왼쪽 끝에 따로 선다.
 * - 바깥 클릭: 바닥줄이 없는 조회 팝업은 닫히고, 바닥줄이 있는 입력 팝업은 안 닫힌다(쓰던 내용을 지키려고).
 *   다르게 하려면 dismissOnOutside 를 직접 준다.
 * - 확인창(confirmDialog)은 이 위에 뜬다. 떠 있는 동안 Esc 는 확인창 몫이다.
 * - 안을 화면이 직접 짜는 판(큰 상세 · 단계형 추가)은 bare — 판과 닫기 자리, 닫는 동작만 받는다. 안쪽 여백도 화면이 준다.
 */

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** 폭 — sm 420 · md 520(기본) · lg 720 · xl 880 */
  size?: ModalSize;
  /** 큰 상세 전용 — 폭(px)을 화면이 정한다. 주면 size 대신 쓴다 */
  width?: number;
  title?: ReactNode;
  /** 제목 아래 한 줄 — 누구의 · 언제의 것인지 */
  sub?: ReactNode;
  /** 머리 오른쪽, ✕ 앞 — 「+ 파일 첨부」 같은 팝업 전체에 걸린 행동 */
  headerExtra?: ReactNode;
  /** 바닥줄 오른쪽 — 취소 · 저장 */
  footer?: ReactNode;
  /** 바닥줄 왼쪽 — 삭제처럼 따로 떨어뜨릴 행동 */
  footerStart?: ReactNode;
  /** 바깥(막)을 눌러 닫기. 기본: 바닥줄이 없으면 닫힘, 있으면 안 닫힘 */
  dismissOnOutside?: boolean;
  /**
   * Esc 로 닫기(기본 true). 큰 상세처럼 안에서 「Esc = 편집 취소」를 쓰는 칸이 많은 팝업만 끈다 —
   * 켜 두면 칸의 편집을 취소하려던 Esc 가 팝업까지 닫는다
   */
  dismissOnEsc?: boolean;
  /**
   * 몸 안의 목록(자동완성 · 연도 고르기처럼 body 로 포털하지 않은 것)이 판 밖으로 나가야 할 때.
   * 판과 몸이 자르지 않는 대신 **몸이 스크롤되지 않는다** — 내용이 짧은 팝업에만 쓴다
   */
  overflowVisible?: boolean;
  /** 내용 길이와 상관없이 판을 최대 높이(90vh)로 — 문서 미리보기처럼 몸이 남는 높이를 다 써야 할 때 */
  fullHeight?: boolean;
  /**
   * 큰 상세 전용 — 판이 내용만큼 자라고 **막 전체가 스크롤**된다. 판이 자르지 않아 안의 작은 판(고르기 · 메모 팝업)이 판 밖으로 나갈 수 있다.
   * 기본(판 안 스크롤)에서는 판이 90vh 로 잘린다
   */
  pageScroll?: boolean;
  /** 큰 상세 전용 — 480px 이하에서는 막 여백 · 모서리 없이 화면을 꽉 채운다 */
  mobileFull?: boolean;
  /**
   * 아래에서 올라오는 판 — 좁은 화면(640px 이하)에서만 여는 것에 쓴다(화면 고르기 · 필터).
   * 화면 아래에 붙고 폭을 다 쓴다. 닫는 동작 · 포커스는 팝업과 같다
   */
  sheet?: boolean;
  /** 머리 · 몸 · 바닥 없이 판만 — 안쪽 배치는 children 이 한다 */
  bare?: boolean;
  /** bare 전용 — 안쪽이 자기 머리 · 몸 · 발을 들고 있을 때. 세로로 쌓고, 스크롤은 안쪽의 몸이 맡는다(없으면 판 안 전체가 스크롤) */
  stack?: boolean;
  /** 틀의 ✕ 를 그리지 않는다 — bare 는 안쪽이 자기 닫기 버튼을 들고 있을 때, 일반 팝업은 답하기 전에는 닫을 수 없는 확인(상담 데스크 팝업)일 때 */
  hideClose?: boolean;
  /** 제목이 없을 때(bare) 읽어 줄 이름 */
  ariaLabel?: string;
  /** 몸(bare 면 판 안쪽)에 덧붙일 클래스 — 배치용 */
  bodyClassName?: string;
  children: ReactNode;
}

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

// 겹쳐 열린 팝업 중 맨 위 하나만 Esc · Tab 을 받는다
const openStack: string[] = [];
// 이어서 여는 팝업 (2026-10-16) — 한 팝업이 닫히는 바로 그 순간(같은 반영) 다른 팝업이 열리면 막 · 판 등장 움직임을 건너뛴다.
// 단계형 흐름(마케팅 새 테스트 → 가설 만들기 · 가설 고르기 → 가설 및 세트)이 팝업을 갈아 끼울 때 새로 열리는 것처럼 깜빡이지 않게
// 닫힌 팝업을 id 와 함께 남긴다 — 개발 모드(StrictMode)는 effect 를 한 번 걷었다 다시 달아서, 같은 팝업이면 갈아 끼운 것이 아니다
let lastClosed = { id: "", at: -Infinity };
const HANDOFF_MS = 100;
// 뒤 화면 스크롤 잠금 — 겹쳐 열려도 마지막 하나가 닫힐 때만 푼다
let scrollLocks = 0;
let bodyBefore = { overflow: "", paddingRight: "" };

/** 창이 놓인 층 — 가장 가까운 fixed 조상의 z-index (없으면 0) */
function layerOf(el: Element): number {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.position === "fixed" && cs.zIndex !== "auto") return Number(cs.zIndex) || 0;
  }
  return 0;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  size = "md",
  width,
  title,
  sub,
  headerExtra,
  footer,
  footerStart,
  dismissOnOutside,
  dismissOnEsc = true,
  pageScroll = false,
  mobileFull = false,
  sheet = false,
  overflowVisible = false,
  fullHeight = false,
  bare = false,
  stack = false,
  hideClose = false,
  ariaLabel,
  bodyClassName,
  children,
}: ModalProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const downOnOverlay = useRef(false);
  const onCloseRef = useRef(onClose);
  const escRef = useRef(dismissOnEsc);
  useEffect(() => {
    onCloseRef.current = onClose;
    escRef.current = dismissOnEsc;
  }, [onClose, dismissOnEsc]);

  // 열었던 자리 — 열리는 렌더에서 잡는다. effect 에서 잡으면 안의 칸이 autoFocus 로 이미 포커스를 가져간 뒤다
  const [wasOpen, setWasOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && typeof document !== "undefined") setOpener(document.activeElement as HTMLElement | null);
  }

  // 닫힐 때 시각을 남기고, 열릴 때 방금 닫힌 팝업이 있으면 움직임 없이 — 그리기 전(layout)에 정해야 첫 장면부터 멈춰 있다
  useLayoutEffect(() => {
    if (!open) return;
    if (lastClosed.id !== id && performance.now() - lastClosed.at < HANDOFF_MS)
      for (const el of [overlayRef.current, panelRef.current]) if (el) el.style.animation = "none";
    return () => {
      lastClosed = { id, at: performance.now() };
    };
  }, [open, id]);

  useEffect(() => {
    if (!open) return;
    openStack.push(id);

    if (scrollLocks === 0) {
      const body = document.body;
      bodyBefore = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      // 스크롤바가 자리를 차지하는 환경(Windows)에서 잠그는 순간 화면이 옆으로 밀리지 않게 그 폭만큼 채운다
      const bar = window.innerWidth - document.documentElement.clientWidth;
      if (bar > 0) body.style.paddingRight = `${bar}px`;
      body.style.overflow = "hidden";
    }
    scrollLocks += 1;

    // 열리면 팝업 안으로 — 안의 칸이 autoFocus 로 이미 받았으면 그대로 둔다
    const node = panelRef.current;
    if (node && !node.contains(document.activeElement)) node.focus();

    const onKey = (e: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== id) return;
      // 위에 확인창이 떠 있으면 Esc · Tab 은 확인창 몫이다
      if (document.querySelector("[data-confirm-dialog]")) return;
      // 이 틀이 아닌 다른 창(마케팅 CRM 의 옛 입력창)이 이 팝업보다 높은 층에 떠 있으면 Esc · Tab 은 그 창 몫이다.
      // 그 창에서 Esc 를 눌렀는데 아래 팝업이 닫혔다 (2026-10-15). 그 창이 포커스를 안 가져가는 경우도 있어 층(z-index)으로 본다 —
      // 이 팝업 아래에 깔린 서랍 같은 창은 상관없다
      if (node) {
        const mine = layerOf(node);
        const above = Array.from(document.querySelectorAll('[aria-modal="true"]:not([data-hps-modal])')).some(
          (d) => layerOf(d) > mine,
        );
        if (above) return;
      }
      if (e.key === "Escape") {
        if (!escRef.current) return;
        // 안의 셀렉트 · 메뉴 · 달력이 Esc 로 자기 판을 닫았으면(preventDefault) 팝업은 그대로 둔다.
        // 그 판의 리스너가 이 리스너보다 늦게 달려 있을 수 있어, 모든 리스너가 돈 뒤에 본다
        window.setTimeout(() => {
          if (!e.defaultPrevented) onCloseRef.current();
        }, 0);
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const active = document.activeElement;
      // body 에 뜬 판(셀렉트 목록 등) 안에 있을 때는 건드리지 않는다
      if (active && active !== document.body && !node.contains(active)) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      if (e.shiftKey && (active === head || active === node || active === document.body)) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && (active === tail || active === document.body)) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const at = openStack.lastIndexOf(id);
      if (at >= 0) openStack.splice(at, 1);
      scrollLocks -= 1;
      if (scrollLocks === 0) {
        document.body.style.overflow = bodyBefore.overflow;
        document.body.style.paddingRight = bodyBefore.paddingRight;
      }
      // 닫히면 열었던 자리로 — 그 자리가 화면에서 사라졌으면 넘어간다
      if (opener?.isConnected && opener !== document.body) opener.focus();
    };
  }, [open, id, opener]);

  if (!open || typeof document === "undefined") return null;

  const hasFooter = !!footer || !!footerStart;
  const outside = dismissOnOutside ?? !hasFooter;

  const close = (
    <Button variant="ghost" size="sm" iconOnly aria-label="닫기" onClick={onClose}>
      <X size={18} />
    </Button>
  );

  return createPortal(
    <div
      ref={overlayRef}
      className={cx(styles.overlay, pageScroll && styles.overlayPage, mobileFull && styles.overlayMobileFull, sheet && styles.overlaySheet)}
      role="presentation"
      // 안에서 글자를 끌다가 바깥에서 놓아도 닫히지 않게 — 누른 곳과 뗀 곳이 둘 다 막일 때만 닫는다
      onMouseDown={(e) => {
        downOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (outside && downOnOverlay.current && e.target === e.currentTarget) onClose();
        downOnOverlay.current = false;
      }}
    >
      <div
        ref={panelRef}
        className={cx(
          styles.panel,
          width == null ? styles[size] : styles.customWidth,
          overflowVisible && styles.overflowVisible,
          fullHeight && styles.fullHeight,
          pageScroll && styles.panelPage,
          mobileFull && styles.panelMobileFull,
          sheet && styles.panelSheet,
        )}
        // 큰 상세의 폭은 화면이 주는 값 — CSS 변수로 넘겨야 좁은 화면 규칙(mobileFull)이 덮어쓸 수 있다
        style={width != null ? ({ "--modal-width": `${width}px` } as CSSProperties) : undefined}
        role="dialog"
        aria-modal="true"
        data-hps-modal=""
        aria-labelledby={!bare && title ? titleId : undefined}
        aria-label={bare || !title ? ariaLabel : undefined}
        tabIndex={-1}
      >
        {bare ? (
          <>
            {!hideClose && <span className={styles.bareClose}>{close}</span>}
            <div className={cx(styles.bareBody, stack && styles.stack, bodyClassName)}>{children}</div>
          </>
        ) : (
          <>
            <div className={styles.head}>
              <div className={styles.titleWrap}>
                <h2 id={titleId} className={styles.title}>
                  {title}
                </h2>
                {sub && <p className={styles.sub}>{sub}</p>}
              </div>
              <div className={styles.headEnd}>
                {headerExtra}
                {!hideClose && close}
              </div>
            </div>
            <div className={cx(styles.body, bodyClassName)}>{children}</div>
            {hasFooter && (
              <div className={styles.foot}>
                {footerStart}
                <div className={styles.footEnd}>{footer}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
