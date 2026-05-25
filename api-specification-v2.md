# AI 브랜드 인식 진단 SaaS — API 명세서 (v2)

> **버전**: ERD 정식 반영판 + 문제점 수정판 (v2.1)
> **기준 ERD**: 사용자가 제공한 18개 테이블 ERD 다이어그램
> **이전 버전(v1) 대비 변경점 요약**:
> - 모든 PK/FK를 `uuid` 타입으로 통일
> - `Brand`의 링크 컬럼들 → `BRAND_LINKS` 별도 테이블로 분리
> - `User.plan_tier` → `SUBSCRIPTIONS` 별도 테이블로 분리
> - 점수들이 `ANALYSIS_RUNS` 직접 컬럼 (이전엔 별도 `RunScore` 테이블로 분리했었음)
> - `ANALYSIS_SAMPLES` 중간 테이블 추가 (run ↔ trial 연결 매개체)
> - `CONFIDENCE_METRICS`, `BRAND_INSIGHT_HISTORY`, `BRANDING_RECOMMENDATIONS` 별도 테이블 반영
> - JSON 필드명은 ERD 컬럼명 그대로 snake_case 사용

---

## 0. 공통 규칙

### 0.1 Base URL
```
Production : https://api.{domain}/api
Local      : http://localhost:3000/api
```
Next.js Route Handlers(`app/api/**/route.ts`) 기반.

### 0.2 인증
- Supabase Auth 사용. 모든 보호 endpoint는 `Authorization: Bearer <access_token>` 헤더 필수.
- 토큰에서 `user_id`(UUID) 추출. Request body에 `user_id`를 직접 받지 않음.
- 회원가입·로그인 자체는 Supabase 클라이언트 SDK가 처리. 본 명세에는 서버 측 보조 endpoint만 포함.

### 0.3 공통 Response 포맷
성공:
```json
{
  "ok": true,
  "data": { ... }
}
```
실패:
```json
{
  "ok": false,
  "error": {
    "code": "BRAND_NOT_FOUND",
    "message": "해당 브랜드를 찾을 수 없습니다.",
    "details": null
  }
}
```

### 0.4 표준 HTTP 상태 코드
| Code | 의미 |
|---|---|
| 200 | 조회/수정 성공 |
| 201 | 생성 성공 |
| 202 | 비동기 작업 수락 |
| 204 | 삭제 성공, body 없음 |
| 400 | 잘못된 요청 (validation 실패) |
| 401 | 인증 실패 |
| 403 | 권한 없음 (타 유저 리소스 접근 등) |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등록, 진행 중 작업 충돌) |
| 422 | 비즈니스 룰 위반 (플랜 한도 초과 등) |
| 429 | Rate limit 초과 |
| 500 | 서버 에러 |

### 0.5 Pagination 규칙
Query: `?page=1&limit=20&sort=created_at&order=desc`
Response:
```json
{
  "ok": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 134,
      "total_pages": 7
    }
  }
}
```
`limit` 기본 20, 최대 100.

### 0.6 비동기 작업 패턴
무거운 작업(질문 풀 생성, 클러스터링, 분석 실행, 브랜딩 보드 생성, 리포트 생성)은 다음 패턴을 따른다.

1. Client가 `POST` 요청 → 서버는 해당 리소스(예: `ANALYSIS_RUNS`)에 `status='pending'` 상태로 row 생성 후 큐(Inngest/QStash)에 enqueue → `202 Accepted`와 함께 `run_id`(또는 해당 PK) 반환
2. Client는 polling(`GET /api/analysis-runs/:run_id` 등)으로 `status` 변화 확인
3. 공통 status 값: `pending | running | succeeded | failed | cancelled`

### 0.7 URL/Path 컨벤션
- URL path: kebab-case (`analysis-runs`, `branding-boards`)
- Path parameter: snake_case (`:brand_id`, `:run_id`) — ERD 컬럼명과 동일하게
- JSON 필드: snake_case — ERD 컬럼명과 동일하게

---

## 1. ERD 요약 (참조용)

본 명세에서 다루는 18개 테이블의 핵심 컬럼만 정리. 자세한 타입은 각 endpoint의 schema 참고.

| # | 테이블 | PK | 주요 FK | 핵심 컬럼 |
|---|---|---|---|---|
| 1 | `USERS` | user_id | - | email, name, created_at |
| 2 | `SUBSCRIPTIONS` | subscription_id | user_id | plan_name, status, started_at, ended_at |
| 3 | `BRANDS` | brand_id | user_id | brand_name, category, region, description, desired_image, target_customer |
| 4 | `BRAND_LINKS` | link_id | brand_id | link_type, url |
| 5 | `BRAND_FACTS` | fact_id | brand_id | fact_type, fact_value, source_type, source_url, confidence, last_verified_at |
| 6 | `COMPETITORS` | competitor_id | brand_id | competitor_name, category, region, url |
| 7 | `QUESTION_BANK` | question_id | brand_id | category, sub_category, persona, intent, language, prompt_text, importance_weight, embedding (vector) |
| 8 | `QUESTION_CLUSTERS` | cluster_id | brand_id | cluster_name, representative_question, question_count, centroid_embedding (vector), importance_weight |
| 9 | `ANALYSIS_RUNS` | run_id | brand_id | status, total_questions_sampled, total_responses_collected, visibility_score, ranking_score, stability_score, image_match_score, accuracy_score, competitor_pressure_score, total_score, started_at, completed_at |
| 10 | `ANALYSIS_SAMPLES` | sample_id | run_id, question_id | sampling_method, repeat_count, weight, selected_at |
| 11 | `AI_RESPONSE_TRIALS` | trial_id | sample_id | trial_number, ai_provider, model_name, response_text, brand_mentioned, mention_rank, source_urls (jsonb) |
| 12 | `RESPONSE_ANALYSES` | analysis_id | trial_id | image_keywords, positive_points, negative_points, detected_facts, wrong_info, missing_info, competitor_mentions (모두 jsonb), source_reliability |
| 13 | `CONFIDENCE_METRICS` | metric_id | run_id | category, sample_size, variance_score, confidence_score, reliability_label |
| 14 | `BRANDING_BOARDS` | board_id | run_id | current_ai_image, desired_brand_image, image_gap_summary, recommended_intro, photo_direction, faq_suggestions, keyword_suggestions (jsonb) |
| 15 | `BRANDING_RECOMMENDATIONS` | recommendation_id | board_id | recommendation_type, title, content, priority |
| 16 | `MONITORING_SCHEDULES` | schedule_id | brand_id | frequency, next_run_at, status |
| 17 | `REPORTS` | report_id | run_id | file_url, report_type |
| 18 | `BRAND_INSIGHT_HISTORY` | history_id | brand_id, run_id | visibility_score, ranking_score, image_match_score, accuracy_score, total_score |

### 1.1 데이터 흐름
```
한 번의 분석 사이클:
BRANDS → ANALYSIS_RUNS → ANALYSIS_SAMPLES → AI_RESPONSE_TRIALS → RESPONSE_ANALYSES
                      ↘ CONFIDENCE_METRICS
                      ↘ BRANDING_BOARDS → BRANDING_RECOMMENDATIONS
                      ↘ BRAND_INSIGHT_HISTORY (점수 스냅샷 누적)
                      ↘ REPORTS (PDF 등)
```

---

## 2. 인증 / 유저 / 구독

### 2.1 `GET /api/auth/me` — 현재 유저 정보
인증 필요.

Response (200):
```json
{
  "ok": true,
  "data": {
    "user_id": "8e1a...uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "created_at": "2026-05-20T10:00:00Z",
    "current_subscription": {
      "subscription_id": "...",
      "plan_name": "pro",
      "status": "active",
      "started_at": "2026-05-01",
      "ended_at": null
    }
  }
}
```
`current_subscription`은 `SUBSCRIPTIONS`에서 `user_id`가 일치하고 `status='active'`인 row. 없으면 `null`.

---

### 2.2 `PUT /api/auth/me` — 유저 정보 수정
인증 필요.

Request:
```json
{
  "name": "홍길동"
}
```
`email` 변경은 Supabase Auth 측에서 처리하므로 이 endpoint에서는 `name`만 수정 가능.

Response (200): 갱신된 user 객체 (2.1 포맷 동일).

---

### 2.3 `GET /api/subscriptions` — 본인 구독 이력
인증 필요. 본인의 `SUBSCRIPTIONS` row 전체(과거 포함) 반환.

Query: `page`, `limit`, `status` (`active`/`expired`/`cancelled`)

Response (200):
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "subscription_id": "...",
        "user_id": "...",
        "plan_name": "pro",
        "status": "active",
        "started_at": "2026-05-01",
        "ended_at": null
      }
    ],
    "pagination": { ... }
  }
}
```

> 결제 처리(구독 생성·갱신·취소) endpoint는 Toss Payments/Stripe webhook 흐름에 따라 별도 설계 필요. 본 명세는 조회까지만 다룸.

---

## 3. 브랜드 API

### 3.1 `POST /api/brands` — 브랜드 등록
인증 필요. 플랜별 브랜드 개수 한도 검증.

Request:
```json
{
  "brand_name": "무드하우스 카페",
  "category": "cafe",
  "region": "서울 성수동",
  "description": "조용한 작업 카페",
  "desired_image": "조용한, 혼자 가기 좋은, 작업하기 좋은, 따뜻한",
  "target_customer": "혼자 작업하거나 책 읽는 20~30대"
}
```
- `desired_image`는 ERD상 `text` 타입. 콤마 구분 문자열로 저장하는 것을 권장(서버에서 split 처리).
- `user_id`는 토큰에서 자동 추출.

Response (201):
```json
{
  "ok": true,
  "data": {
    "brand_id": "brd_uuid",
    "user_id": "usr_uuid",
    "brand_name": "무드하우스 카페",
    "category": "cafe",
    "region": "서울 성수동",
    "description": "조용한 작업 카페",
    "desired_image": "조용한, 혼자 가기 좋은, 작업하기 좋은, 따뜻한",
    "target_customer": "혼자 작업하거나 책 읽는 20~30대",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-20T10:00:00Z"
  }
}
```

Errors:
- 400 `VALIDATION_ERROR`
- 422 `BRAND_LIMIT_EXCEEDED`
- 409 `BRAND_NAME_DUPLICATED` (동일 user_id + brand_name 조합)

---

### 3.2 `GET /api/brands` — 본인 브랜드 목록
Query: `page`, `limit`, `sort`(`created_at`/`updated_at`/`brand_name`), `order`, `q`(brand_name 검색), `category`, `region`

Response (200):
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "brand_id": "...",
        "brand_name": "무드하우스 카페",
        "category": "cafe",
        "region": "서울 성수동",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 3.3 `GET /api/brands/:brand_id` — 브랜드 상세
응답에 `BRAND_LINKS`, 최신 `ANALYSIS_RUNS` 요약을 함께 포함.

Query: `include` — 콤마 구분으로 옵션 지정. 예: `?include=links,latest_run`

Response (200):
```json
{
  "ok": true,
  "data": {
    "brand_id": "...",
    "user_id": "...",
    "brand_name": "무드하우스 카페",
    "category": "cafe",
    "region": "서울 성수동",
    "description": "...",
    "desired_image": "...",
    "target_customer": "...",
    "created_at": "...",
    "updated_at": "...",
    "links": [
      { "link_id": "...", "link_type": "website", "url": "https://...", "created_at": "..." }
    ],
    "latest_run": {
      "run_id": "...",
      "status": "succeeded",
      "total_score": 58.0,
      "completed_at": "..."
    }
  }
}
```

Errors:
- 404 `BRAND_NOT_FOUND`
- 403 `FORBIDDEN`

---

### 3.4 `PUT /api/brands/:brand_id` — 브랜드 수정
Partial update. 전달된 필드만 갱신. `updated_at`은 서버에서 자동 갱신.

Request: 3.1의 부분집합.
Response (200): 갱신된 brand 전체 객체.

---

### 3.5 `DELETE /api/brands/:brand_id` — 브랜드 삭제
하위 리소스(BRAND_LINKS, BRAND_FACTS, COMPETITORS, QUESTION_BANK, QUESTION_CLUSTERS, ANALYSIS_RUNS, ANALYSIS_SAMPLES, AI_RESPONSE_TRIALS, RESPONSE_ANALYSES, CONFIDENCE_METRICS, BRANDING_BOARDS, BRANDING_RECOMMENDATIONS, REPORTS, MONITORING_SCHEDULES, BRAND_INSIGHT_HISTORY) 전체 hard cascade 삭제. soft delete 없음.

Response: 204 No Content.

---

## 4. 브랜드 링크 (BRAND_LINKS)

### 4.1 `POST /api/brands/:brand_id/links`
Request:
```json
{
  "link_type": "website",
  "url": "https://moodhouse.example.com"
}
```
`link_type` 권장 enum: `website | instagram | naver_place | google_map | youtube | other`

Response (201):
```json
{
  "ok": true,
  "data": {
    "link_id": "...",
    "brand_id": "...",
    "link_type": "website",
    "url": "https://...",
    "created_at": "..."
  }
}
```

### 4.2 `GET /api/brands/:brand_id/links`
Query: `link_type`, `page`, `limit`.
Response: 페이지네이션 형식.

### 4.3 `PUT /api/brands/:brand_id/links/:link_id`
Partial update (`link_type`, `url`).

### 4.4 `DELETE /api/brands/:brand_id/links/:link_id`
Response: 204.

---

## 5. 브랜드 공식 정보 (BRAND_FACTS)

### 5.1 `POST /api/brands/:brand_id/facts`
Request:
```json
{
  "fact_type": "business_hours",
  "fact_value": "10:00~22:00",
  "source_type": "user_input",
  "source_url": null,
  "confidence": 0.95,
  "last_verified_at": "2026-05-20"
}
```
- `fact_type` 권장 enum: `business_hours | address | price_range | menu | parking | reservation | service | strength | other`
- `source_type` 권장 enum: `user_input | official_website | naver_place | google_map | user_upload | ai_inferred`
- `confidence`: 0.0 ~ 1.0

Response (201):
```json
{
  "ok": true,
  "data": {
    "fact_id": "...",
    "brand_id": "...",
    "fact_type": "business_hours",
    "fact_value": "10:00~22:00",
    "source_type": "user_input",
    "source_url": null,
    "confidence": 0.95,
    "last_verified_at": "2026-05-20",
    "created_at": "..."
  }
}
```

### 5.2 `GET /api/brands/:brand_id/facts`
Query: `fact_type`, `source_type`, `min_confidence`(0~1), `page`, `limit`.

### 5.3 `PUT /api/brands/:brand_id/facts/:fact_id`
Partial update. `fact_value`, `confidence`, `last_verified_at`, `source_url`, `source_type` 갱신이 주 용도.

### 5.4 `DELETE /api/brands/:brand_id/facts/:fact_id`
Response: 204.

---

## 6. 경쟁 브랜드 (COMPETITORS)

### 6.1 `POST /api/brands/:brand_id/competitors`
Request:
```json
{
  "competitor_name": "A카페",
  "category": "cafe",
  "region": "서울 성수동",
  "url": "https://acafe.example.com"
}
```

Response (201):
```json
{
  "ok": true,
  "data": {
    "competitor_id": "...",
    "brand_id": "...",
    "competitor_name": "A카페",
    "category": "cafe",
    "region": "서울 성수동",
    "url": "https://...",
    "created_at": "..."
  }
}
```

### 6.2 `GET /api/brands/:brand_id/competitors`
Query: `category`, `region`, `q`(이름 검색), `page`, `limit`.

### 6.3 `PUT /api/brands/:brand_id/competitors/:competitor_id`
Partial update.

### 6.4 `DELETE /api/brands/:brand_id/competitors/:competitor_id`
Response: 204.

---

## 7. 질문 풀 (QUESTION_BANK)

### 7.1 `POST /api/brands/:brand_id/question-bank/generate` — 질문 풀 생성 (비동기)
플랜에 따라 target_size 한도 검증.

Request:
```json
{
  "target_size": 5000,
  "categories": [
    "region_recommendation",
    "purpose_recommendation",
    "atmosphere_recommendation",
    "customer_type",
    "time_based",
    "price_sensitive",
    "comparison",
    "competitor_exploration",
    "info_check",
    "trust_check",
    "review_summary",
    "negative",
    "image_association",
    "foreign_language",
    "typo_colloquial",
    "long_sentence",
    "mobile_search",
    "brand_direct",
    "brand_excluded",
    "competitor_included"
  ],
  "languages": ["ko", "en"]
}
```
`categories` 미전달 시 전체 카테고리 사용. `target_size`는 `QUESTION_BANK`에 저장될 row 개수 목표.

Response (202):
```json
{
  "ok": true,
  "data": {
    "job_id": "job_uuid",
    "brand_id": "...",
    "target_size": 5000,
    "status": "pending",
    "estimated_seconds": 600
  }
}
```

Errors:
- 422 `PLAN_LIMIT_EXCEEDED`

> Job 상태 조회는 `GET /api/jobs/:job_id` (15장 참조).

---

### 7.2 `GET /api/brands/:brand_id/question-bank` — 질문 풀 조회
Query: `category`, `sub_category`, `persona`, `intent`, `language`, `min_importance_weight`, `cluster_id`, `q`(prompt_text 검색), `page`, `limit`.

Response (200):
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "question_id": "...",
        "brand_id": "...",
        "category": "purpose_recommendation",
        "sub_category": "work_friendly",
        "persona": "solo_worker",
        "intent": "recommendation",
        "language": "ko",
        "prompt_text": "성수동에서 혼자 노트북 하기 좋은 조용한 카페 추천해줘",
        "importance_weight": 0.92,
        "created_at": "..."
      }
    ],
    "pagination": { ... }
  }
}
```
> `embedding` 컬럼은 응답에서 제외(클라이언트 노출 불필요). 필요 시 별도 endpoint로.

---

### 7.3 `POST /api/brands/:brand_id/question-bank/cluster` — 클러스터링 실행 (비동기)
`QUESTION_BANK.embedding` 기반으로 유사도 클러스터링 → `QUESTION_CLUSTERS` 채움.

Request:
```json
{
  "embedding_model": "text-embedding-004",
  "similarity_threshold": 0.85,
  "min_cluster_size": 5
}
```
모든 필드 옵션, 서버 기본값 적용 가능.

Response (202):
```json
{
  "ok": true,
  "data": {
    "job_id": "...",
    "brand_id": "...",
    "status": "pending"
  }
}
```

---

### 7.4 `GET /api/brands/:brand_id/question-clusters` — 클러스터 목록
Query: `min_question_count`, `min_importance_weight`, `page`, `limit`.

Response (200):
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "cluster_id": "...",
        "brand_id": "...",
        "cluster_name": "work_friendly_cafe",
        "representative_question": "성수동에서 혼자 노트북 하기 좋은 조용한 카페 추천해줘",
        "question_count": 148,
        "importance_weight": 0.94,
        "created_at": "..."
      }
    ],
    "pagination": { ... }
  }
}
```
> `centroid_embedding`은 응답에서 제외.

---

## 8. 분석 실행 (ANALYSIS_RUNS / ANALYSIS_SAMPLES / AI_RESPONSE_TRIALS / RESPONSE_ANALYSES)

### 8.0 비동기 polling 통합 규칙
모든 비동기 endpoint(7.1, 7.3, 8.1, 9.1, 11.1)는 동일한 방식으로 상태를 확인한다.

- **공통**: 응답에 항상 `job_id`를 포함. `GET /api/jobs/:job_id` (13장)로 통합 polling.
- **예외**: `ANALYSIS_RUNS`는 run 자체가 추적 단위이므로 `GET /api/analysis-runs/:run_id`로 직접 polling도 허용. 두 방법 모두 유효.
- **장시간 job(분석 실행 등)**: Supabase Realtime을 통한 `ANALYSIS_RUNS.status` 구독 권장. polling 시 15초 간격 이상 권장 (rate limit 고려).

---

### 8.1 `POST /api/brands/:brand_id/analysis-runs` — 분석 실행 시작 (비동기)
한 번의 호출이 `ANALYSIS_RUNS` row 1개를 만들고, 그 아래로 `ANALYSIS_SAMPLES → AI_RESPONSE_TRIALS → RESPONSE_ANALYSES`를 순차적으로 채운다.

Request:
```json
{
  "sample_size": 500,
  "repeat_count": 3,
  "sampling_method": "balanced",
  "ai_provider": "gemini",
  "model_name": "gemini-search-grounded",
  "use_search_grounding": true
}
```
- `sampling_method` 권장 enum: `balanced | importance_weighted | competitor_focused | image_focused`
- `sample_size` * `repeat_count` = 예상 `AI_RESPONSE_TRIALS` row 수

Response (202):
```json
{
  "ok": true,
  "data": {
    "run_id": "run_uuid",
    "brand_id": "...",
    "status": "pending",
    "total_questions_sampled": 500,
    "total_responses_collected": 0,
    "started_at": "2026-05-20T10:00:00Z",
    "completed_at": null,
    "estimated_seconds": 1800
  }
}
```

Errors:
- 422 `PLAN_LIMIT_EXCEEDED`
- 409 `RUN_ALREADY_IN_PROGRESS` (같은 brand에 진행 중 run 있을 때)
- 422 `QUESTION_BANK_EMPTY` (해당 brand의 QUESTION_BANK row가 0개일 때 — 질문 풀 생성 먼저 필요)

---

### 8.2 `GET /api/analysis-runs/:run_id` — 실행 상태/요약
`ANALYSIS_RUNS` row 그대로 반환. 점수 컬럼은 `completed_at`이 채워진 이후에만 의미 있음.

Response (200):
```json
{
  "ok": true,
  "data": {
    "run_id": "...",
    "brand_id": "...",
    "status": "running",
    "total_questions_sampled": 500,
    "total_responses_collected": 820,
    "visibility_score": null,
    "ranking_score": null,
    "stability_score": null,
    "image_match_score": null,
    "accuracy_score": null,
    "competitor_pressure_score": null,
    "total_score": null,
    "started_at": "2026-05-20T10:00:00Z",
    "completed_at": null,
    "progress": {
      "completed_responses": 820,
      "expected_responses": 1500,
      "percent": 54.6
    }
  }
}
```
> `progress.expected_responses` = `total_questions_sampled × repeat_count` (run 생성 시 고정값). `percent` = `completed_responses / expected_responses × 100`.

---

### 8.2-1 `POST /api/analysis-runs/:run_id/cancel` — 분석 취소
`status`가 `pending` 또는 `running`인 run만 취소 가능. worker에 cancellation signal 전송 후 `status='cancelled'`로 업데이트.

Response (200):
```json
{
  "ok": true,
  "data": {
    "run_id": "...",
    "status": "cancelled"
  }
}
```

Errors:
- 409 `RUN_ALREADY_FINISHED` (status가 succeeded/failed/cancelled인 경우)

---

### 8.3 `GET /api/analysis-runs/:run_id/responses` — AI 응답 목록
`ANALYSIS_SAMPLES → AI_RESPONSE_TRIALS → RESPONSE_ANALYSES`를 join해서 한 응답 단위로 평탄화.

Query:
- `question_id` (특정 질문만)
- `trial_number`
- `brand_mentioned` (true/false)
- `min_rank`, `max_rank` (mention_rank 범위)
- `ai_provider`, `model_name`
- `competitor` (RESPONSE_ANALYSES.competitor_mentions에 포함되는 이름)
- `page`, `limit`

Response (200):
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "trial_id": "...",
        "sample_id": "...",
        "question_id": "...",
        "prompt_text": "성수동에서 혼자 노트북 하기 좋은 조용한 카페 추천해줘",
        "trial_number": 3,
        "ai_provider": "gemini",
        "model_name": "gemini-search-grounded",
        "response_text": "...AI 답변 원문 전체...",
        "brand_mentioned": true,
        "mention_rank": 2,
        "source_urls": ["https://moodhouse.example.com", "https://map.naver.com/..."],
        "created_at": "...",
        "analysis": {
          "analysis_id": "...",
          "image_keywords": ["조용한", "작업하기 좋은", "콘센트"],
          "positive_points": ["노트북 사용 가능", "조용한 분위기"],
          "negative_points": ["주말에는 붐빌 수 있음"],
          "detected_facts": [
            { "fact_type": "business_hours", "value": "10:00~22:00" }
          ],
          "wrong_info": [],
          "missing_info": ["주차 가능 여부"],
          "competitor_mentions": ["A카페", "B카페"],
          "source_reliability": 0.86,
          "created_at": "..."
        }
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 8.4 `GET /api/analysis-runs/:run_id/confidence` — 신뢰도 메트릭
`CONFIDENCE_METRICS`의 row 전체(카테고리별).

Response (200):
```json
{
  "ok": true,
  "data": {
    "run_id": "...",
    "items": [
      {
        "metric_id": "...",
        "category": "purpose_recommendation",
        "sample_size": 132,
        "variance_score": 0.18,
        "confidence_score": 0.91,
        "reliability_label": "high",
        "created_at": "..."
      },
      {
        "metric_id": "...",
        "category": "comparison",
        "sample_size": 28,
        "variance_score": 0.62,
        "confidence_score": 0.41,
        "reliability_label": "low",
        "created_at": "..."
      }
    ],
    "overall": {
      "reliability_label": "high",
      "avg_confidence_score": 0.78,
      "unstable_categories": ["comparison", "negative"]
    }
  }
}
```
> `overall`은 서버에서 동적 계산. ERD 컬럼은 아님.

---

### 8.5 `GET /api/analysis-runs/:run_id/dashboard` — 대시보드 통합 응답
설계서 17장의 대시보드 화면이 한 번에 받는 통합 응답. 여러 테이블을 집계해서 만든다.

데이터 소스:
- `scores`: `ANALYSIS_RUNS` 직접 컬럼
- `by_category`: `ANALYSIS_SAMPLES + QUESTION_BANK.category + AI_RESPONSE_TRIALS` 집계
- `competitors`: `RESPONSE_ANALYSES.competitor_mentions` 집계
- `image`: `BRANDS.desired_image` vs `RESPONSE_ANALYSES.image_keywords` 비교
- `accuracy`: `BRAND_FACTS` vs `RESPONSE_ANALYSES.detected_facts/wrong_info/missing_info` 비교
- `confidence`: `CONFIDENCE_METRICS` 요약
- `trend`: `BRAND_INSIGHT_HISTORY` 비교

Response (200):
```json
{
  "ok": true,
  "data": {
    "run_id": "...",
    "brand_id": "...",
    "scores": {
      "visibility_score": 32.0,
      "ranking_score": 64.0,
      "stability_score": 71.0,
      "image_match_score": 41.0,
      "accuracy_score": 88.0,
      "competitor_pressure_score": 47.0,
      "total_score": 58.0
    },
    "by_category": [
      { "category": "region_recommendation", "exposure_rate": 0.62, "avg_mention_rank": 2.8 },
      { "category": "purpose_recommendation", "exposure_rate": 0.71, "avg_mention_rank": 2.3 }
    ],
    "competitors": {
      "top_co_mentioned": [
        { "competitor_name": "A카페", "co_mention_rate": 0.41 },
        { "competitor_name": "B카페", "co_mention_rate": 0.33 }
      ],
      "outranking_us": [
        { "competitor_name": "A카페", "outrank_rate": 0.28 }
      ],
      "our_weak_keywords": ["콘센트", "1인석"]
    },
    "image": {
      "desired": ["조용한", "혼자 가기 좋은", "작업하기 좋은", "따뜻한"],
      "perceived_by_ai": ["디저트가 좋은", "데이트하기 좋은", "트렌디한"],
      "match_score": 0.31,
      "gap_keywords": ["혼자 방문", "콘센트", "장시간 이용"]
    },
    "accuracy": {
      "score": 88.0,
      "mismatches": [
        {
          "fact_type": "business_hours",
          "official_value": "10:00~22:00",
          "ai_value": "11:00~21:00",
          "severity": "high"
        }
      ],
      "missing": ["주차 가능 여부"]
    },
    "confidence": {
      "reliability_label": "high",
      "avg_confidence_score": 0.78,
      "unstable_categories": ["comparison", "negative"]
    },
    "trend": {
      "previous_run_id": "run_prev_uuid",
      "visibility_score_delta": -4.0,
      "ranking_score_delta": 6.0,
      "total_score_delta": 2.0,
      "new_competitors": ["D카페"],
      "lost_keywords": ["감성"],
      "gained_keywords": ["조용한"]
    }
  }
}
```

Errors:
- 422 `RUN_NOT_FINISHED` (status가 `succeeded`가 아닐 때)

---

### 8.6 점수 계산 공식 (ANALYSIS_RUNS 점수 컬럼)

분석 worker가 `AI_RESPONSE_TRIALS` + `RESPONSE_ANALYSES` 집계 완료 후 아래 공식으로 계산, `ANALYSIS_RUNS`에 업데이트.

#### visibility_score (0~100)
> AI가 얼마나 자주 이 브랜드를 언급하는가

```
brand_mentioned_count = brand_mentioned=true인 trials 수
total_trials = 전체 AI_RESPONSE_TRIALS 수

visibility_score = (brand_mentioned_count / total_trials) × 100
```

#### ranking_score (0~100)
> 언급될 때 몇 위로 등장하는가 (1위에 가까울수록 고점)

```
언급된 trials만 대상 (brand_mentioned=true)
avg_rank = AVG(mention_rank)

ranking_score = MAX(0, 100 - (avg_rank - 1) × 20)
-- rank 1 → 100점, rank 2 → 80점, rank 3 → 60점, rank 6 이상 → 0점
```

#### stability_score (0~100)
> 반복 질의에서 결과가 얼마나 일관적인가 (분산이 낮을수록 고점)

```
avg_variance = AVG(CONFIDENCE_METRICS.variance_score) -- 0~1
stability_score = (1 - avg_variance) × 100
```

#### image_match_score (0~100)
> AI가 인식하는 브랜드 이미지가 desired_image와 얼마나 일치하는가

```
desired_keywords = BRANDS.desired_image를 콤마로 split한 배열
perceived_keywords = 전체 RESPONSE_ANALYSES.image_keywords를 합산한 빈도 상위 N개

match_count = desired_keywords 중 perceived_keywords에 포함된 수
image_match_score = (match_count / desired_keywords.length) × 100
```

#### accuracy_score (0~100)
> AI가 제공하는 브랜드 정보가 공식 정보(BRAND_FACTS)와 얼마나 정확한가

```
base = 100
wrong_penalty = COUNT(DISTINCT wrong_info 항목) × 10   -- 최대 50점 차감
missing_penalty = COUNT(DISTINCT missing_info 항목) × 5 -- 최대 30점 차감

accuracy_score = MAX(0, base - wrong_penalty - missing_penalty)
```
> `wrong_info`, `missing_info`는 전체 RESPONSE_ANALYSES에서 중복 제거 후 합산.

#### competitor_pressure_score (0~100)
> 경쟁 브랜드가 우리 브랜드를 얼마나 압박하는가 (낮을수록 압박이 강함)

```
-- 우리 브랜드가 언급된 trials 중 경쟁사가 더 높은 순위로 등장한 비율
outrank_rate = (경쟁사가 우리보다 높은 rank로 등장한 trials 수) / (우리가 언급된 trials 수)

competitor_pressure_score = MAX(0, 100 - outrank_rate × 100)
-- outrank_rate=0 → 100점 (경쟁 없음), outrank_rate=1 → 0점 (항상 밀림)
```

#### total_score (0~100)
> 6개 점수의 가중 평균

```
total_score =
  visibility_score          × 0.25 +
  ranking_score             × 0.20 +
  stability_score           × 0.15 +
  image_match_score         × 0.20 +
  accuracy_score            × 0.10 +
  competitor_pressure_score × 0.10
```

> **Worker 책임**: 점수 계산 후 `ANALYSIS_RUNS` 업데이트, `BRAND_INSIGHT_HISTORY`에 스냅샷 insert, `status='succeeded'`로 변경까지 한 트랜잭션에서 처리.

---

## 9. 브랜딩 보드 (BRANDING_BOARDS / BRANDING_RECOMMENDATIONS)

### 9.1 `POST /api/analysis-runs/:run_id/branding-board` — 보드 생성 (비동기)
`ANALYSIS_RUNS`의 결과를 바탕으로 `BRANDING_BOARDS` 1개 row + 그에 딸린 `BRANDING_RECOMMENDATIONS` N개 row를 생성.

Request:
```json
{
  "tone_override": null,
  "include_faq": true,
  "include_photo_direction": true,
  "include_keyword_suggestions": true
}
```
모든 필드 옵션.

Response (202):
```json
{
  "ok": true,
  "data": {
    "job_id": "...",
    "run_id": "...",
    "status": "pending"
  }
}
```

Errors:
- 422 `RUN_NOT_FINISHED`
- 409 `BOARD_ALREADY_EXISTS` (해당 run에 이미 board가 있을 때 — 정책에 따라 덮어쓰기 허용 가능)

---

### 9.2 `GET /api/analysis-runs/:run_id/branding-board` — 보드 조회
`BRANDING_BOARDS` row + 연결된 `BRANDING_RECOMMENDATIONS` 함께 반환.

Response (200):
```json
{
  "ok": true,
  "data": {
    "board_id": "...",
    "run_id": "...",
    "current_ai_image": "디저트가 유명한 감성 카페",
    "desired_brand_image": "혼자 와서 오래 머물기 좋은 조용한 작업 카페",
    "image_gap_summary": "AI는 브랜드를 감성 카페로는 인식하지만, 작업 카페로는 충분히 인식하지 못함.",
    "recommended_intro": "혼자 와서 조용히 작업하거나 책 읽기 좋은 성수동 카페입니다. ...",
    "photo_direction": [
      "창가 1인석",
      "노트북이 올라간 테이블",
      "콘센트가 보이는 좌석",
      "조용한 내부 분위기",
      "대표 메뉴"
    ],
    "faq_suggestions": [
      { "q": "노트북 사용이 가능한가요?", "a": "네, 자유롭게 사용 가능합니다." },
      { "q": "콘센트 좌석이 있나요?", "a": "창가 1인석에 콘센트가 마련되어 있습니다." }
    ],
    "keyword_suggestions": ["조용한", "작업하기 좋은", "콘센트", "혼자 가기 좋은"],
    "created_at": "...",
    "recommendations": [
      {
        "recommendation_id": "...",
        "recommendation_type": "naver_place_update",
        "title": "네이버 플레이스 소개글 변경",
        "content": "...구체적 권장 문구...",
        "priority": 1,
        "created_at": "..."
      },
      {
        "recommendation_id": "...",
        "recommendation_type": "photo_addition",
        "title": "콘센트 좌석 사진 추가",
        "content": "...",
        "priority": 2,
        "created_at": "..."
      }
    ]
  }
}
```
- `photo_direction`, `faq_suggestions`, `keyword_suggestions`는 ERD상 `jsonb` 타입.
- `recommendation_type` 권장 enum: `naver_place_update | google_business_update | instagram_bio_update | photo_addition | keyword_targeting | faq_addition | other`

---

### 9.3 `GET /api/branding-boards/:board_id/recommendations` — 추천 항목 목록
보드 단위로 추천 항목만 따로 페이지네이션으로 조회.

Query: `recommendation_type`, `min_priority`, `page`, `limit`.

Response (200):
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "recommendation_id": "...",
        "board_id": "...",
        "recommendation_type": "naver_place_update",
        "title": "...",
        "content": "...",
        "priority": 1,
        "created_at": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

---

## 10. 모니터링 (MONITORING_SCHEDULES)

### 10.1 `POST /api/brands/:brand_id/monitoring`
Request:
```json
{
  "frequency": "weekly",
  "next_run_at": "2026-05-27T03:00:00Z",
  "status": "active"
}
```
- `frequency` 권장 enum: `monthly | weekly | daily | custom`
- `status` 권장 enum: `active | paused`
- `next_run_at` 미전달 시 서버에서 `frequency`를 기준으로 계산.

Response (201):
```json
{
  "ok": true,
  "data": {
    "schedule_id": "...",
    "brand_id": "...",
    "frequency": "weekly",
    "next_run_at": "2026-05-27T03:00:00Z",
    "status": "active",
    "created_at": "..."
  }
}
```

Errors:
- 422 `PLAN_NOT_ALLOWED` (Basic 플랜에서 daily 요청 시 등)

### 10.2 `GET /api/brands/:brand_id/monitoring`
Query: `status`, `page`, `limit`. 한 브랜드에 여러 스케줄 허용.

### 10.3 `PUT /api/monitoring/:schedule_id`
Partial update. `frequency`, `next_run_at`, `status` 변경.

### 10.4 `DELETE /api/monitoring/:schedule_id`
Response: 204.

---

## 11. 리포트 (REPORTS)

### 11.1 `POST /api/analysis-runs/:run_id/report` — 리포트 생성 (비동기)
PDF를 Supabase Storage에 업로드, `REPORTS` row 생성.

Request:
```json
{
  "report_type": "pdf_summary",
  "language": "ko",
  "include_sections": [
    "summary",
    "scores",
    "by_category",
    "competitors",
    "image_match",
    "accuracy",
    "branding_board",
    "trend"
  ]
}
```
`report_type` 권장 enum: `pdf_summary | pdf_full | pdf_executive`

Response (202):
```json
{
  "ok": true,
  "data": {
    "job_id": "...",
    "run_id": "...",
    "status": "pending"
  }
}
```

Errors:
- 422 `RUN_NOT_FINISHED`
- 422 `BRANDING_BOARD_NOT_READY`

### 11.2 `GET /api/reports/:report_id`
Response (200):
```json
{
  "ok": true,
  "data": {
    "report_id": "...",
    "run_id": "...",
    "report_type": "pdf_summary",
    "file_url": "https://storage.supabase.co/.../report.pdf?token=...",
    "expires_at": "2026-05-21T11:00:00Z",
    "created_at": "..."
  }
}
```
- `file_url`은 Supabase Storage signed URL. 만료 시 재호출로 새 URL 발급.
- `expires_at`은 ERD에 없는 동적 필드(서버에서 signed URL 생성 시 계산).

---

## 12. 브랜드 인사이트 히스토리 (BRAND_INSIGHT_HISTORY)

월별/주별 변화 추적용. `ANALYSIS_RUNS`가 완료될 때마다 점수 스냅샷을 누적 저장.

### 12.1 `GET /api/brands/:brand_id/insights/history`
Query:
- `from`, `to` (ISO 날짜)
- `page`, `limit`
- `sort=created_at`, `order=asc/desc`

Response (200):
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "history_id": "...",
        "brand_id": "...",
        "run_id": "...",
        "visibility_score": 32.0,
        "ranking_score": 64.0,
        "image_match_score": 41.0,
        "accuracy_score": 88.0,
        "total_score": 58.0,
        "created_at": "2026-05-20T11:00:00Z"
      },
      {
        "history_id": "...",
        "brand_id": "...",
        "run_id": "...",
        "visibility_score": 36.0,
        "ranking_score": 58.0,
        "image_match_score": 38.0,
        "accuracy_score": 90.0,
        "total_score": 56.0,
        "created_at": "2026-04-20T11:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

> 이 endpoint는 ANALYSIS_RUNS 완료 시 자동으로 `BRAND_INSIGHT_HISTORY`에 row가 insert된다는 가정. 별도 POST endpoint는 필요 없음.

---

## 13. Job 상태 조회 (공통)

비동기 작업(7.1, 7.3, 8.1, 9.1, 11.1)에서 반환된 `job_id`로 상태 조회.

### 13.1 `GET /api/jobs/:job_id`
Response (200):
```json
{
  "ok": true,
  "data": {
    "job_id": "...",
    "job_type": "analysis_run | question_bank_generate | question_cluster | branding_board_generate | report_generate",
    "status": "running",
    "progress": 0.42,
    "result_ref": {
      "type": "run_id",
      "id": "run_uuid"
    },
    "error": null,
    "created_at": "...",
    "updated_at": "..."
  }
}
```
> ERD에 명시되어 있지 않은 보조 테이블. Inngest/QStash의 자체 대시보드로 대체 가능하지만 일관된 API 제공 차원에서 권장.

---

## 14. 권한 / 소유권 규칙
1. 모든 `:brand_id`, `:run_id`, `:fact_id`, `:link_id`, `:competitor_id`, `:schedule_id`, `:board_id`, `:recommendation_id`, `:report_id`는 인증된 user가 소유한 리소스인지 검증.
2. 소유권 위반 접근 시: 정보 노출 방지를 위해 **404 `RESOURCE_NOT_FOUND` 반환을 권장**(403 대신).
3. 다음은 정해야 할 정책:
   - 브랜드 공동 작업(공유) 기능 도입 시 별도 ACL 테이블 필요
   - 팀 계정(설계서 23장 정식 상용화 항목) 도입 시 USERS-TEAM-BRAND 모델 추가 필요

---

## 15. Rate Limit (권장값)
| 구간 | 한도 |
|---|---|
| 일반 GET | 100 req/min/user |
| `POST /api/brands/:brand_id/analysis-runs` | 5 req/hour/user |
| `POST /api/brands/:brand_id/question-bank/generate` | 3 req/hour/brand |
| `POST /api/brands/:brand_id/question-bank/cluster` | 5 req/hour/brand |
| `POST /api/analysis-runs/:run_id/branding-board` | 10 req/hour/brand |
| `POST /api/analysis-runs/:run_id/report` | 10 req/hour/brand |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## 16. Error Code 목록

| Code | HTTP | 설명 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 요청 형식/필드 검증 실패 |
| `UNAUTHORIZED` | 401 | 토큰 없음/만료/무효 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `RESOURCE_NOT_FOUND` | 404 | 리소스 없음 (소유권 위반 포함) |
| `BRAND_NOT_FOUND` | 404 | 브랜드 없음 |
| `RUN_NOT_FOUND` | 404 | 분석 실행 없음 |
| `BRAND_NAME_DUPLICATED` | 409 | 동일 user+brand_name 중복 |
| `RUN_ALREADY_IN_PROGRESS` | 409 | 진행 중 run 존재 |
| `BOARD_ALREADY_EXISTS` | 409 | 보드 중복 생성 시도 |
| `PLAN_LIMIT_EXCEEDED` | 422 | 플랜 한도 초과 |
| `BRAND_LIMIT_EXCEEDED` | 422 | 브랜드 개수 한도 초과 |
| `PLAN_NOT_ALLOWED` | 422 | 플랜에서 허용되지 않는 기능 |
| `RUN_NOT_FINISHED` | 422 | run이 succeeded 상태 아님 |
| `BRANDING_BOARD_NOT_READY` | 422 | 보드 미생성 |
| `QUESTION_BANK_EMPTY` | 422 | 질문 풀이 비어있음 — 분석 실행 전 질문 풀 생성 필요 |
| `RUN_ALREADY_FINISHED` | 409 | 이미 종료된 run에 취소 시도 |
| `ANALYSIS_CANCELLED` | 409 | 취소된 run에 후속 작업 시도 |
| `RATE_LIMITED` | 429 | Rate limit 초과 |
| `INTERNAL_ERROR` | 500 | 서버 에러 |
| `AI_PROVIDER_ERROR` | 502 | Gemini 등 외부 AI 호출 실패 |

---

## 17. ERD에 있지만 본 명세에 endpoint를 추가한 항목 (요약)
설계서 20장에 명시되지 않았으나 ERD를 충실히 반영하기 위해 추가한 endpoint.

- `BRAND_LINKS` — 섹션 4
- `COMPETITORS` — 섹션 6
- `SUBSCRIPTIONS` (조회) — 섹션 2.2
- `BRANDING_RECOMMENDATIONS` 단독 조회 — 섹션 9.3
- `BRAND_INSIGHT_HISTORY` — 섹션 12
- Job 상태 조회 (보조) — 섹션 13

설계서 20장의 26개 endpoint는 전부 포함됨.

---

## 18. 확정된 정책

### 18.1 Enum 확정값

**`BRAND_LINKS.link_type`**
```
website | instagram | naver_place | google_map | youtube | blog | other
```

**`BRAND_FACTS.fact_type`**
```
business_hours | address | price_range | menu | parking | reservation | service | strength | other
```

**`BRAND_FACTS.source_type`**
```
user_input | official_website | naver_place | google_map | user_upload | ai_inferred
```

**`MONITORING_SCHEDULES.frequency`**
```
monthly | weekly | daily | custom
```
- `monthly` cron: `0 3 1 * *`
- `weekly` cron: `0 3 * * 1` (매주 월요일 새벽 3시)
- `daily` cron: `0 3 * * *`

---

### 18.2 jsonb 스키마 확정

**`BRANDS.desired_image`** — 콤마 구분 문자열로 저장. 서버에서 `,` split 처리.
```
"조용한, 혼자 가기 좋은, 작업하기 좋은, 따뜻한"
```

**`AI_RESPONSE_TRIALS.source_urls`** — 문자열 배열
```json
["https://moodhouse.example.com", "https://map.naver.com/..."]
```

**`RESPONSE_ANALYSES.detected_facts`**
```json
[
  { "fact_type": "business_hours", "value": "10:00~22:00" },
  { "fact_type": "address", "value": "서울 성동구 성수동" }
]
```

**`RESPONSE_ANALYSES.wrong_info`**
```json
[
  { "fact_type": "business_hours", "official_value": "10:00~22:00", "ai_value": "11:00~21:00" }
]
```

**`RESPONSE_ANALYSES.missing_info`** — 문자열 배열
```json
["주차 가능 여부", "예약 가능 여부"]
```

**`RESPONSE_ANALYSES.competitor_mentions`** — 문자열 배열
```json
["A카페", "B카페"]
```

---

### 18.3 비즈니스 룰 확정

| 항목 | 결정값 |
|---|---|
| 한 brand에 monitoring schedule | 활성(active) 스케줄 **1개** 제한. 신규 등록 시 기존 active 스케줄 자동 paused |
| 한 run에 branding board | **1:1**. 재생성 시 기존 board + recommendations 삭제 후 덮어쓰기 허용 |
| 브랜드 삭제 방식 | **Hard cascade 삭제** (soft delete 없음). 섹션 3.5 참고 |
| BRAND_INSIGHT_HISTORY insert 주체 | **분석 worker** 책임. 점수 계산 후 ANALYSIS_RUNS 업데이트와 같은 트랜잭션에서 insert |
| SUBSCRIPTIONS 결제 흐름 | Toss Payments webhook 별도 명세 작성 필요 (MVP 범위 외) |

---

**문서 끝**
