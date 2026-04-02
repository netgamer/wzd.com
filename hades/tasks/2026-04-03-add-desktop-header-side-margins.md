## Goal

작업공간 데스크톱 헤더에 좌우 마진을 넣어 보드 영역 라인과 맞춘다.

## User-visible outcome

- 데스크톱 작업공간 헤더 카드가 화면 양끝에 붙지 않고 좌우 여백을 가진다.

## In scope

- `src/styles/main.css`의 데스크톱 `board-page .pin-topbar` 폭 계산

## Out of scope

- 모바일 헤더 인셋 규칙 변경
- 보드 패널 내부 레이아웃 변경

## Risks

- 헤더 최대 폭 계산을 잘못 바꾸면 중간 해상도에서 검색창과 액션 버튼이 과하게 압축될 수 있다.

## Pass criteria

- `981px+`: 작업공간 헤더 카드 양쪽에 명확한 화면 여백이 생긴다.
- `981px+`: 헤더 시작선이 보드 패널 시작선과 자연스럽게 맞는다.
- `980px and below`: 모바일 헤더 레이아웃은 유지된다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
