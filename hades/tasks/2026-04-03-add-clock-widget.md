## Goal

작업공간에 디지털 시계와 아날로그 시계 옵션을 가진 시계 위젯을 추가한다.

## User-visible outcome

- 위젯 추가 메뉴에서 시계 위젯을 만들 수 있다.
- 시계 위젯은 디지털 시계와 아날로그 시계 중 하나를 선택해 표시한다.

## In scope

- `src/App.tsx` 위젯 타입, 메타데이터 헬퍼, 렌더링, 생성 함수, 메뉴 노출
- `src/styles/main.css` 시계 위젯 스타일

## Out of scope

- 타임존 선택 기능
- 초침 없는 정적 시계 또는 서버 시간 동기화

## Risks

- 초 단위 렌더링이 다른 위젯에 불필요한 리렌더를 유발할 수 있다.
- 아날로그 시계 스타일이 모바일에서 깨질 수 있다.

## Pass criteria

- `981px+`: 위젯 추가 메뉴에 시계 위젯이 보이고 생성된다.
- `981px+`: 시계 위젯은 디지털/아날로그 옵션을 편집기에서 전환할 수 있다.
- `980px and below`: 모바일 위젯 추가 메뉴에서도 시계 위젯이 보이고 생성된다.
- `980px and below`: 시계 위젯 레이아웃이 깨지지 않는다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies both clock variants render correctly.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
