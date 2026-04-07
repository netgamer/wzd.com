## Goal

로그인된 사용자 기준으로 홈, 보드 전환, 작업공간 핵심 액션을 실제 브라우저에서 QA하고 재현되는 문제를 수정한다.

## User-visible outcome

- 로그인 후 기본 진입 화면과 작업공간이 콘솔 에러 없이 정상 렌더링된다.
- 보드 전환, 새 메모, 위젯 추가, 보드 추가/설정 등 핵심 액션이 깨지지 않는다.
- 모바일과 데스크톱에서 인증된 작업공간 레이아웃이 무너지지 않는다.

## In scope

- 인증된 사용자 상태에서 `https://wzd.kr/`와 `/#` 핵심 사용자 플로우 QA
- 재현되는 UI/상태 버그 수정
- 필요한 경우 `src/App.tsx`, `src/styles/main.css`, 관련 로직 파일

## Out of scope

- 외부 OAuth 공급자 자체 문제
- 실제 메일 발송, 외부 공유 대상의 수신 검증
- 관리자 전용 백오피스나 미사용 실험 기능

## Risks

- 실계정 세션을 써서 실제 데이터가 바뀔 수 있음
- 프로덕션 데이터 상태에 따라 일시적 이슈와 코드 이슈가 섞일 수 있음
- 공유/초대 기능은 외부 상태에 따라 재현성이 달라질 수 있음

## Pass criteria

- 로그인된 홈 `https://wzd.kr/`: 보드 리스트, 상단 계정 UI, 템플릿 액션이 정상 표시된다.
- 로그인된 작업공간 `https://wzd.kr/#`: 보드 전환, 새 메모, 위젯 추가, 보드 추가, 설정 진입 중 치명적 오류가 없다.
- `1280px+`와 `375px`에서 인증된 작업공간이 가로 깨짐 없이 보인다.
- QA 중 확인한 콘솔 에러가 없다.
- `npm run build` passes
- `/gstack-review` finds no blocking issues

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
