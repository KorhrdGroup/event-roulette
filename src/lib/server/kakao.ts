/**
 * 알리고 알림톡 — 상담 신청 접수 안내(선택). 한평생오피스 src/lib/kakao.ts 의 sendAlimtalk 를 줄여 옮겨 왔다.
 * env: ALIGO_API_KEY · ALIGO_USER_ID · ALIGO_SENDER_KEY · ALIGO_SENDER
 *      ALIGO_RECEIPT_TEMPLATE_CODE · ALIGO_RECEIPT_TEMPLATE_MESSAGE (· ALIGO_RECEIPT_TEMPLATE_SUBJECT)
 *      PROXY_URL · PROXY_SECRET — 알리고는 등록한 IP 에서만 받아서, Vercel 에서는 고정 IP 프록시를 거친다(바로소셜과 같은 값)
 * 값이 없으면 보내지 않는다(신청은 그대로 접수된다).
 */
interface AligoResult {
  code: number;
  message: string;
}

export async function sendReceiptAlimtalk(phone: string): Promise<{ success: boolean; error?: string }> {
  const apikey = process.env.ALIGO_API_KEY;
  const userid = process.env.ALIGO_USER_ID;
  const senderkey = process.env.ALIGO_SENDER_KEY;
  const sender = process.env.ALIGO_SENDER;
  const tplCode = process.env.ALIGO_RECEIPT_TEMPLATE_CODE;
  const message = process.env.ALIGO_RECEIPT_TEMPLATE_MESSAGE;
  const subject = process.env.ALIGO_RECEIPT_TEMPLATE_SUBJECT ?? "알림";
  if (!apikey || !userid || !senderkey || !sender || !tplCode || !message) return { success: false, error: "Aligo env 미설정" };

  const receiver = phone.replace(/\D/g, "");
  if (receiver.length < 10) return { success: false, error: "수신번호 오류" };

  const payload: Record<string, string> = {
    apikey,
    userid,
    senderkey,
    tpl_code: tplCode,
    sender,
    failover: "N",
    receiver_1: receiver,
    subject_1: subject,
    message_1: message,
  };

  try {
    let result: AligoResult;
    const proxyUrl = process.env.PROXY_URL;
    const proxySecret = process.env.PROXY_SECRET;
    if (proxyUrl && proxySecret) {
      const res = await fetch(`${proxyUrl}/alimtalk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-proxy-secret": proxySecret },
        body: JSON.stringify(payload),
      });
      result = (await res.json()) as AligoResult;
    } else {
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => form.append(k, v));
      const res = await fetch("https://kakaoapi.aligo.in/akv10/alimtalk/send/", { method: "POST", body: form });
      result = (await res.json()) as AligoResult;
    }
    return result.code === 0 ? { success: true } : { success: false, error: `${result.code}: ${result.message}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
