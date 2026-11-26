import Image from "next/image";
import styles from "./SiteHeader.module.css";

/** 머리줄 — 바로소셜(barosocial) 상담 폼과 같은 한평생원격교육원 로고 줄 */
export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <Image src="/hanpyeong-education-logo.png" alt="한평생원격교육원" width={690} height={153} className={styles.logo} priority />
    </header>
  );
}
