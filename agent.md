# agent.md

## 프로젝트 미션
개인화 대시보드(`wzd.kr`) 안에서 회원별 에이전트(개발자/기획자/PM)를 생성하고 실행할 수 있는 서비스를 구축한다.
핵심은 "사용자별 상태 분리"와 "어떤 환경에서 로그인해도 동일한 상태 복원"이다.

## 제품 범위 (MVP)
- 기존 위젯 대시보드 유지
- 에이전트 위젯 제공
  - 개발자 에이전트
  - 기획자 에이전트
  - PM 에이전트
- 에이전트 실행 요청/응답/이력 저장
- 회원별 데이터 완전 분리(RLS)
- 브라우저/기기 간 동기화

## 최종 아키텍처

### 1) 프론트엔드 (Cloudflare Pages)
- React + TypeScript + Vite
- 대시보드 UI, 위젯 배치/저장
- 에이전트 실행 UI(질문 입력, 상태, 결과)
- 인증: Supabase Auth (Google)

### 2) API 서버 (GCP)
- FastAPI 또는 Node(Express/Fastify)
- 역할:
  - `/agent/run`: 에이전트 실행 시작
  - `/agent/runs`: 실행 이력 조회
  - `/agent/run/:id`: 상세 조회
- LLM 호출: Groq API
- 툴 연동: 필요 시 Composio(2차)

### 3) 데이터/인증 (Supabase)
- Auth: 사용자 식별
- Postgres: 대시보드 상태 + 에이전트 실행 결과 저장
- RLS: `auth.uid() = user_id` 강제

## 에이전트 실행 모델
- 단일 요청/응답이 아니라 "루프 기반"으로 설계
1. 사용자 목표 입력
2. 모델이 간단한 계획 수립
3. 계획 단계별 실행(필요 시 검색/도구 호출)
4. 중간 결과 검증
5. 목표 충족 또는 제한 횟수 도달 시 종료
6. 전체 로그/결과 저장

### 에이전트별 역할 정의
- 개발자: 구현안, 코드 제안, 디버깅 우선
- 기획자: 요구사항 구조화, 유저플로우/기능명세 우선
- PM: 일정/리스크/우선순위/결정사항 요약 우선

## 데이터 모델 (확정)

```sql
-- 기존: dashboard_layouts, widgets 유지

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type text not null check (agent_type in ('developer','planner','pm')),
  goal text not null,
  status text not null check (status in ('queued','running','completed','failed')),
  plan_json jsonb,
  result_text text,
  error_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_steps (
  id bigserial primary key,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  step_no int not null,
  action_type text not null,
  input_json jsonb,
  output_json jsonb,
  created_at timestamptz not null default now()
);

alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;

create policy "agent_runs_owner"
on public.agent_runs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "agent_steps_owner"
on public.agent_steps
for select
using (
  exists (
    select 1 from public.agent_runs r
    where r.id = run_id and r.user_id = auth.uid()
  )
);
```

## 실행 플랜 (확정)

### Phase 1: 기반 안정화 (완료/진행)
- 대시보드 위젯 추가/이동/리사이즈
- Supabase 로그인/저장/동기화
- 에이전트 위젯 UI(개발자/기획자/PM) 추가

### Phase 2: 에이전트 API 서버 구축 (최우선)
1. GCP 서버 프로젝트 생성
2. `/health`, `/agent/run`, `/agent/runs`, `/agent/run/:id` 구현
3. Groq API 연결
4. Supabase Service Role로 `agent_runs`, `agent_steps` 저장
5. CORS를 `https://wzd.kr`만 허용

### Phase 3: 프론트 연동
1. 에이전트 위젯에서 목표 입력
2. 실행 요청 후 `running` 상태 표시
3. 완료 시 결과/단계 로그 표시
4. 다른 브라우저에서 같은 계정 로그인 시 동일 이력 복원

### Phase 4: 루프형 에이전트 고도화
1. 계획(JSON) 생성 프롬프트 추가
2. 단계 실행 루프(최대 step 제한)
3. 실패 재시도/중단 로직
4. 실행 시간/토큰 사용량 기록

### Phase 5: 운영 준비
1. 에러 모니터링(서버 로그 + 프론트 에러)
2. 요청 제한(사용자별 rate limit)
3. 운영 대시보드(최근 실패, 평균 응답시간)

## Groq 모델 전략
- 기본: `openai/gpt-oss-20b` 또는 `llama-3.1-8b-instant` (속도)
- 고품질: `llama-3.3-70b-versatile` 또는 `openai/gpt-oss-120b`
- Deprecated 모델은 사용 금지

## 보안 원칙
- Groq API 키는 서버에만 저장(클라이언트 금지)
- Supabase `service_role` 키는 서버에만 저장
- 클라이언트는 Supabase anon key만 사용
- 모든 조회/수정은 user_id 기준 검증

## 완료 기준 (Definition of Done)
1. 로그인 사용자 A가 생성한 에이전트 실행 결과가 사용자 B에게 보이지 않는다.
2. 같은 사용자로 브라우저/기기 변경 시 에이전트 실행 이력이 동일하게 보인다.
3. 에이전트 실행 중 상태(`queued/running/completed/failed`)가 UI에서 보인다.
4. 실행 실패 시 원인 로그가 남고 재실행이 가능하다.
5. 대시보드 위젯 배치/데이터와 에이전트 이력이 모두 서버 기준으로 복원된다.

## 즉시 다음 작업
1. `supabase/schema.sql`에 `agent_runs`, `agent_steps` 추가
2. GCP 에이전트 API 서버 초기 코드 생성
3. 프론트 에이전트 위젯에 실행 버튼/결과 패널 연결
