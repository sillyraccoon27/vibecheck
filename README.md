# Vibecheck — AI 브랜드 인식 진단 SaaS

## 이 프로젝트가 뭐야?

> "AI가 우리 브랜드를 어떻게 알고 있는지 진단해주는 서비스"

사용자가 브랜드를 등록하면, AI(Gemini)에게 수백~수천 개의 관련 질문을 던져서  
"AI가 이 브랜드를 얼마나 자주, 어떤 이미지로, 얼마나 정확하게 설명하는지"를 분석한다.

분석 결과로 6가지 점수와 함께, 브랜드 이미지 개선을 위한 구체적인 액션 플랜(브랜딩 보드)을 제공한다.

### 예시 시나리오
- 성수동 카페 사장이 "우리 카페 등록"
- AI에게 "성수동 작업하기 좋은 카페 추천해줘" 같은 질문 500개를 자동 생성
- 각 질문을 Gemini에게 3번씩 반복 → 1,500개 응답 수집
- "우리 카페가 몇 번이나 언급됐고, 어떤 이미지로 소개됐는지" 분석
- 결과: "AI는 당신 카페를 감성 카페로 인식하지만, 작업 카페로는 모름. 네이버 플레이스 소개글 바꾸세요"

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js (App Router, Route Handlers) |
| DB / Auth | Supabase (PostgreSQL + Auth) |
| AI | Google Gemini (search grounded) |
| 비동기 Job | Inngest 또는 QStash |
| 배포 | Vercel |
| 언어 | TypeScript |

---

## 핵심 데이터 흐름

```
브랜드 등록
    ↓
질문 풀 생성 (Gemini로 질문 N개 자동 생성 → QUESTION_BANK)
    ↓
분석 실행 (질문 샘플링 → Gemini에게 반복 질의 → 응답 저장)
    ↓
점수 계산 (visibility, ranking, stability, image_match, accuracy, competitor_pressure)
    ↓
대시보드 확인 + 브랜딩 보드 생성 (개선 액션 플랜)
```

---

## 팀 역할 분담

### Person A — 프론트엔드
**브랜치**: `feat/frontend`

맡는 것:
- Supabase Auth 연동 (로그인/회원가입)
- 브랜드 등록/목록 화면
- 분석 실행 버튼 + 진행률 polling UI (Supabase Realtime 구독)
- 대시보드 (점수 카드, 카테고리별 노출률, 경쟁 브랜드)
- 브랜딩 보드 화면 (추천 액션 목록)

API 연동 기준 문서: `api-specification-v2.md` 섹션 2~3, 8.2, 8.5, 9.2

---

### Person B — 백엔드 API + DB
**브랜치**: `feat/api`

맡는 것:
- Supabase 테이블 마이그레이션 (18개 테이블)
- MVP 필수 Route Handlers 구현:
  - `POST /api/brands`, `GET /api/brands`, `GET /api/brands/:brand_id`
  - `POST /api/brands/:brand_id/analysis-runs` (202 + Inngest enqueue)
  - `POST /api/analysis-runs/:run_id/cancel`
  - `GET /api/analysis-runs/:run_id` (상태 polling)
  - `GET /api/analysis-runs/:run_id/dashboard`
  - `GET /api/jobs/:job_id`
- Supabase RLS 정책 설정
- 공통 응답 포맷, 에러 핸들러 미들웨어

API 연동 기준 문서: `api-specification-v2.md` 섹션 0, 2~3, 8.1~8.5, 13~16

---

### Person C — AI Worker + 비동기 처리
**브랜치**: `feat/ai-worker`

맡는 것:
- Inngest worker 세팅
- 질문 풀 생성 job: Gemini에게 브랜드 정보 기반 질문 N개 생성 → `QUESTION_BANK` insert
- 분석 실행 job:
  1. `QUESTION_BANK`에서 샘플링 → `ANALYSIS_SAMPLES` insert
  2. 각 sample을 Gemini에게 질의 (repeat_count 반복) → `AI_RESPONSE_TRIALS` insert
  3. 응답 분석 → `RESPONSE_ANALYSES` insert
  4. 점수 계산 (공식은 `api-specification-v2.md` 섹션 8.6) → `ANALYSIS_RUNS` 업데이트
  5. `BRAND_INSIGHT_HISTORY` 스냅샷 insert
  6. `status = 'succeeded'` 로 변경
- 브랜딩 보드 생성 job

API 연동 기준 문서: `api-specification-v2.md` 섹션 7, 8.1, 8.6, 9.1

---

## MVP 범위

### 포함
- [x] 회원가입 / 로그인
- [x] 브랜드 등록 / 조회
- [x] 질문 풀 생성 (비동기)
- [x] 분석 실행 + 진행상태 확인 (비동기)
- [x] 대시보드 (6개 점수 + 카테고리별)
- [x] 브랜딩 보드 생성 + 조회

### MVP 제외 (이후 단계)
- 구독 / 결제 (Toss Payments)
- 질문 클러스터링 (임베딩 벡터)
- 리포트 PDF 생성
- 모니터링 스케줄 자동 실행
- 브랜드 공유 / 팀 계정

---

## 브랜치 전략

```
main
 ├── feat/frontend   (Person A)
 ├── feat/api        (Person B)
 └── feat/ai-worker  (Person C)
```

- 각자 브랜치에서 작업 후 PR → `main` 머지
- PR 올리기 전 `main` rebase 필수
- 머지 전 관리자(haechan) 리뷰 필요

---

## 시작하기

```bash
# 1. 저장소 클론
git clone https://github.com/sillyraccoon27/vibecheck.git
cd vibecheck

# 2. 자기 브랜치 생성
git checkout -b feat/frontend   # 또는 feat/api, feat/ai-worker

# 3. 패키지 설치 (Next.js 프로젝트 생성 후)
npm install

# 4. 환경변수 설정
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, INNGEST_EVENT_KEY 입력

# 5. 개발 서버 실행
npm run dev
```

---

## 참고 문서

- **API 명세서**: [`api-specification-v2.md`](./api-specification-v2.md) — 모든 endpoint, 요청/응답 포맷, 점수 계산 공식, 확정된 정책
- **ERD**: 18개 테이블 구조 (api-specification-v2.md 섹션 1 참고)
- **와이어프레임**: Pencil.dev (작업 예정)

---

## 관리자 체크 포인트

| 확인 항목 | 담당 |
|---|---|
| Supabase 테이블명이 API 명세 snake_case와 일치 | B |
| 202 응답 즉시 반환 + 실제 작업은 worker에서만 처리 | B + C |
| polling UI가 `status: succeeded` 시 대시보드로 이동 | A + B |
| 점수 계산이 섹션 8.6 공식과 동일하게 구현됨 | C |
| Gemini 호출 실패 시 job `status: failed` 처리 후 에러 저장 | C |
| BRAND_INSIGHT_HISTORY insert가 점수 계산과 같은 트랜잭션 | C |
