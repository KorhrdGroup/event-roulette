import Image from "next/image";
import styles from "./SiteFooter.module.css";

/** 이용약관 · 개인정보처리방침은 바로소셜에 있는 회사 문서를 그대로 가리킨다 */
const POLICY_SITE = "https://barosocial.vercel.app";

/** 바닥줄 — 바로소셜(barosocial) 상담 폼과 같은 회사 정보 */
export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Image
        src="/hanpyeong-education-footer-logo.png"
        alt="한평생원격교육원"
        width={790}
        height={171}
        className={styles.logo}
      />
      <p>대표 양병웅 | 사업자등록번호 227-88-03196</p>
      <nav className={styles.links}>
        <a href={`${POLICY_SITE}/terms`} target="_blank" rel="noreferrer">
          이용약관
        </a>
        <span aria-hidden="true">|</span>
        <a href={`${POLICY_SITE}/privacy`} target="_blank" rel="noreferrer">
          개인정보처리방침
        </a>
      </nav>
      <p className={styles.copyright}>2026 © KorhrdGroupCo., Ltd. All rights reserved.</p>
    </footer>
  );
}
