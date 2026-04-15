## Goal

워크스페이스 모바일 레이아웃이 전체 폭으로 정상 렌더되고 위젯 편집 확인 버튼이 다크 테마에서도 읽히도록 고친다.

## User-visible outcome

- 모바일 `980px 이하`에서 좌측 레일이 레이아웃을 밀어내지 않고 보드가 화면 폭에 맞게 표시된다.
- 위젯 편집 상태의 `확인/저장` 버튼 텍스트가 라이트/다크 테마 모두에서 선명하게 보인다.

## In scope

- `src/styles/main.css`의 모바일 워크스페이스 레이아웃 규칙
- `src/styles/main.css`의 `pin-confirm-button` 대비 규칙

## Out of scope

- RSS `502` 서버 오류 수정
- 위젯 편집 액션 구조 변경
- 모바일 보드 메뉴 동작 변경

## Risks

- 모바일 전용 override가 데스크톱 보드 레이아웃에 영향을 주면 안 된다.
- 편집 버튼 대비를 고정하면서 다크 테마 카드 톤과 부딪히면 안 된다.

## Pass criteria

- `981px+`: 데스크톱 보드 레이아웃과 좌측 레일 동작이 기존과 동일하다.
- `980px and below`: 워크스페이스 보드가 좌측 레일 폭만큼 밀리지 않고 화면 폭에 맞게 표시된다.
- `980px and below`: 고정 `+` 플로팅 버튼이 화면 안쪽에서 정상 위치를 유지한다.
- 라이트/다크 보드 테마에서 위젯 편집 `확인/저장` 버튼 텍스트가 읽힌다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
