## Goal

작업공간 첫 진입 시 마지막으로 본 보드가 없으면 홈 보드로 지정된 보드를 먼저 연다.

## User-visible outcome

- 저장된 마지막 보드가 없는 첫 작업공간 진입에서는 홈 보드가 먼저 열린다.
- 마지막으로 본 보드가 저장되어 있으면 기존처럼 그 보드를 우선 복원한다.

## In scope

- `src/App.tsx`의 초기 작업공간 보드 선택 fallback

## Out of scope

- 홈 랜딩 라우트 동작 변경
- 공유/읽기 전용 보드 선택 규칙 변경

## Risks

- 홈 보드가 휴지통 상태이거나 존재하지 않을 때 fallback 순서가 꼬일 수 있다.
- 마지막 본 보드 복원 규칙을 깨면 기존 사용성이 바뀔 수 있다.

## Pass criteria

- `981px+`: 저장된 마지막 보드가 없고 홈 보드가 지정돼 있으면 작업공간 첫 진입 시 그 홈 보드가 열린다.
- `981px+`: 저장된 마지막 보드가 있으면 홈 보드보다 마지막 보드를 우선 복원한다.
- `980px and below`: 모바일 작업공간에도 같은 우선순위가 적용된다.
- 홈 보드가 없으면 기존처럼 첫 활성 보드로 fallback 된다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
