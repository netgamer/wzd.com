# agent.md

## 프로젝트 미션
개인화 대시보드(`wzd.kr`)에서 사용자별 반복작업 에이전트를 만들고, 채팅으로 지시하면 n8n 워크플로우를 자동 생성/실행/검증하는 서비스를 구축한다.

## 핵심 방향
- 에이전트 채팅 모델: Groq API
- 반복작업 실행 엔진: GCP의 n8n 서버
- 사용자 인증/데이터 분리: Supabase Auth + RLS
- 어떤 환경에서 로그인해도 상태/이력 동일 복원

## 현재 구현 상태
- 위젯 대시보드(3컬럼 DnD/리사이즈/클라우드 동기화)
- 에이전트 위젯(개발자/기획자/PM)
- 에이전트 채팅 UI 및 실행 버튼
- 백엔드 API 서버 골격(`server/`)
  - Groq 채팅 호출
  - n8n 워크플로우 생성 API 호출

## 최종 아키텍처
1. Frontend (Cloudflare Pages)
- 대시보드/위젯/에이전트 채팅 UI
- `/api/agent/chat` 호출

2. Agent API Server (GCP)
- `POST /api/agent/chat`
- Groq로 계획/응답 생성
- 스케줄 요청 시 n8n 워크플로우 생성/활성화

3. Supabase
- 사용자 인증(Google)
- 위젯/레이아웃/에이전트 실행 이력 저장
- RLS로 사용자 단위 격리

4. n8n (GCP)
- 워크플로우 저장/스케줄 실행
- 작업 로그 반환

## 운영 환경변수 정책

### Frontend
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENV`
- `VITE_AGENT_API_BASE_URL`

### Agent API Server
- `PORT`
- `ALLOWED_ORIGIN`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `N8N_BASE_URL`
- `N8N_API_KEY`

## 보안 원칙 (필수)
- Groq 키는 서버 환경변수로만 저장 (클라이언트 금지)
- n8n API 키는 서버 환경변수로만 저장
- Supabase service_role 키는 서버 전용
- 사용자별 요청은 user_id로 강제 검증

## 실행 플랜 (확정)

### Phase 1: 백엔드 실전 연결
1. `server/.env` 구성
2. `npm run server`로 API 서버 실행
3. GCP n8n API 연결 테스트(`/api/v1/workflows`)
4. CORS를 `wzd.kr`로 제한

### Phase 2: 에이전트 채팅 고도화
1. 에이전트별 시스템 프롬프트 정교화(개발자/기획자/PM)
2. 응답 구조 표준화(실행계획/즉시작업/검증방법)
3. 오류 메시지/재시도 정책 강화

### Phase 3: n8n 자동화 고도화
1. 크론식 입력 -> 워크플로우 생성
2. 워크플로우 실행 결과를 에이전트 채팅에 반영
3. 사용자별 워크플로우 매핑 테이블 저장

### Phase 4: 데이터 모델 확장
1. `agent_runs`, `agent_steps`, `user_workflows` 테이블 추가
2. 실행 이력/실패 원인/재실행 기록 저장
3. 브라우저 간 실시간 반영

## 완료 기준 (DoD)
1. 사용자가 에이전트에 요청하면 Groq 응답이 채팅에 기록된다.
2. 스케줄이 포함된 요청이면 n8n 워크플로우가 생성된다.
3. 같은 사용자 계정으로 다른 브라우저 로그인 시 동일한 채팅/결과/상태가 보인다.
4. 사용자 A 데이터가 사용자 B에게 노출되지 않는다.
5. 실패 시 원인 로그와 재시도 수단이 제공된다.

## 즉시 다음 작업
1. GCP 서버에 `server/` 배포
2. n8n API Key 연결 및 워크플로우 생성 실검증
3. Supabase에 `agent_runs`/`agent_steps` 저장 로직 연결
