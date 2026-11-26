"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import styles from "./PrivacyPolicyModal.module.css";

/** 회사 개인정보처리방침 전문 — 바로소셜 */
const POLICY_FULL = "https://barosocial.vercel.app/privacy";

/**
 * 개인정보처리방침 팝업 — 바로소셜 상담 신청서(app/form/page.tsx)의 「개인정보처리방침」 팝업과 같은 내용(2026-11-26 사용자).
 * 바로소셜처럼 이 동의 안에 홍보 · 광고성 정보 제공 목적이 들어 있다 — 그래서 동의하면 광고 수신 동의도 함께 기록한다(apply API).
 * 수집 항목에 이 신청서의 관심 과정 · 이벤트 당첨 내역을 더했다(나머지 칸은 바로소셜 신청서와 같다). 바로소셜 문구가 바뀌면 같이 맞춘다.
 */
export default function PrivacyPolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="개인정보처리방침"
      footer={
        <Button variant="primary" onClick={onClose}>
          확인
        </Button>
      }
    >
      <div className={styles.body}>
        <section>
          <h4>1. 개인정보 수집 및 이용 목적</h4>
          <p>
            사회복지사 자격 취득 상담 진행, 문의사항 응대, 이벤트 당첨 혜택 제공
            <br />
            개인정보는 상담 서비스 제공을 위한 목적으로만 수집 및 이용되며, 동의 없이 제3자에게 제공되지 않습니다.
          </p>
        </section>
        <section>
          <h4>2. 수집 및 이용하는 개인정보 항목</h4>
          <p>
            필수 - 이름, 연락처(휴대전화번호), 최종학력, 관심 과정, 취득사유, 이벤트 당첨 내역
            <br />
            선택 - 빠른 상담 여부, 상담 선호 시간, 상담 시간 메모
          </p>
        </section>
        <section>
          <h4>3. 동의 거부 권리</h4>
          <p>신청자는 동의를 거부할 권리가 있습니다. 단, 동의를 거부하는 경우 상담 서비스 이용이 제한됩니다.</p>
        </section>
        <section>
          <h4>4. 개인정보 수집 · 이용 동의</h4>
          <p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
          <p>
            학점은행제 교육과정 이용에 필요한 사항 제공 및 안내
            <br />
            신규 서비스 및 연수과정 홍보, 이벤트 및 광고성 정보 제공 및 참여기회 제공
          </p>
          <p>
            수집하는 개인 정보 항목 : 이름, 연락처, 관심과정, 이벤트 당첨 내역
            <br />
            보유 및 이용기간 : 신청일 기준 3년 이내
            <br />
            보존근거 : 소비자보호에 관한 법률 시행령 제6조 제3항
          </p>
        </section>
        <a className={styles.full} href={POLICY_FULL} target="_blank" rel="noreferrer">
          개인정보처리방침 전문 보기
        </a>
      </div>
    </Modal>
  );
}
