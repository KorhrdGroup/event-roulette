# 당근 장학금 룰렛 이벤트 랜딩

당근 광고 → 이 사이트 → 휴대폰 인증 → 룰렛 → 당첨 팝업 → 상담 신청서 → 한평생오피스 학점은행제 문의DB.

이 사이트의 서버(`/api/roulette/{slug}`)가 휴대폰 인증 문자(네이버 클라우드 SENS) · 룰렛 추첨(확률 · 최대 수량 · 1인 1회) ·
상담 신청 등록을 처리하고 **한평생오피스 DB 에 바로 넣습니다**(바로소셜과 같은 방식). 확률 · 수량 · 기간은 오피스
「당근 광고 › 룰렛 이벤트」 탭에서 바꿉니다. 화면은 한평생오피스 디자인 시스템(`src/styles/tokens.css` · `src/components/ui`)을 옮겨 와 씁니다.

## 환경변수

`.env.example` 에 다 적혀 있습니다. 로컬은 `.env.local` 로 복사해서, Vercel 은 Project → Settings → Environment Variables 에 넣습니다.

| 이름 | 필수 | 무엇 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 | 오피스 Supabase 주소 (오피스 · 바로소셜과 같은 값) |
| `SUPABASE_SERVICE_ROLE_KEY` | 필수 | 오피스 Supabase service role 키 (서버 전용 — 화면으로 나가지 않는다) |
| `NAVER_SENS_ACCESS_KEY` | 필수 | 네이버 클라우드 SENS Access Key |
| `NAVER_SENS_SECRET_KEY` | 필수 | SENS Secret Key (오피스에는 `NAVER_CLOUD_SECRET_KEY` 이름으로 있다 — 그 이름도 읽는다) |
| `NAVER_SENS_SERVICE_ID` | 필수 | SENS 서비스 ID (`ncp:sms:kr:…`) |
| `NEXT_PUBLIC_ROULETTE_SLUG` | 선택 | 첫 화면 이벤트. 기본 `roulette-202612` |
| `ALIGO_API_KEY` · `ALIGO_USER_ID` · `ALIGO_SENDER_KEY` · `ALIGO_SENDER` | 선택 | 상담 신청 접수 알림톡(알리고). 비우면 보내지 않는다 |
| `ALIGO_RECEIPT_TEMPLATE_CODE` · `ALIGO_RECEIPT_TEMPLATE_MESSAGE` · `ALIGO_RECEIPT_TEMPLATE_SUBJECT` | 선택 | 접수 알림톡 템플릿 (오피스 당근 폼과 같은 값) |
| `PROXY_URL` · `PROXY_SECRET` | 선택 | 알리고용 고정 IP 프록시 (바로소셜 · 오피스와 같은 값) |

인증번호 문자의 발신번호는 SENS 에 등록된 회사 대표번호 1661-7768 로 고정입니다.

## 실행

```
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3100
```

개발 서버에서만 `http://localhost:3100/?demo=1` 미리보기가 켜집니다 — 인증 → 룰렛 → 신청 → 완료를 그대로 거치지만
문자를 보내지 않고(인증번호 123456 을 화면에 안내) 아무것도 DB 에 넣지 않아 몇 번이든 다시 할 수 있습니다.

## 배포 (Vercel)

1. 이 폴더를 새 GitHub 저장소로 올리고 Vercel 에 새 프로젝트로 연결합니다.
2. 위 환경변수를 넣습니다(필수 5개 + 알림톡을 보내려면 선택 값).
3. 배포된 주소(또는 연결한 도메인)를 오피스 「당근 광고 › 룰렛 이벤트 › 이벤트 설정 › 랜딩 주소」에 적어 두면 관리 탭에서 주소 복사 · 랜딩 열기가 됩니다.
4. 당근 광고의 연결 주소를 이 사이트 첫 화면(`/`)으로 둡니다.

## 파일

- `src/app/api/roulette/[slug]/` — 이벤트 정보 · 인증번호 보내기/확인 · 룰렛 · 상담 신청 (서버)
- `src/lib/server/` — 오피스 DB(Supabase) · SENS 문자 · 알리고 알림톡 · 룰렛 규칙 (서버 전용)
- `src/components/roulette/` — 랜딩 화면(룰렛 판 · 인증 팝업 · 신청서 · 결과 팝업)
- `src/components/layout/` — 바로소셜과 같은 머리줄 · 바닥줄
- `src/lib/roulette.ts` — 오피스 `src/lib/event/roulette.ts` 와 같은 모양 · 규칙(바꾸면 같이 맞춘다)
