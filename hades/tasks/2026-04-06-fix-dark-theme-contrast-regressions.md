## Goal

Midnight Ops와 Neon Lab 적용 시 생긴 가독성/레이아웃 회귀를 정리한다.

## User-visible outcome

- 다크 테마에서도 메모, 링크 카드, 문서 카드, 위젯 내부 텍스트가 읽힌다.
- 긴 보드 제목이 헤더 버튼을 밀어내지 않고 말줄임 처리된다.
- 기존 문서 카드에 남아 있던 `WZD MASTER` 기본 kicker가 더 이상 보이지 않는다.

## In scope

- `src/App.tsx`의 레거시 문서 kicker 처리
- `src/styles/main.css`의 다크 테마 카드/위젯/헤더 대비 보정

## Out of scope

- 새 테마 추가
- 마켓 연동
- 홈/공유 랜딩 스타일 변경

## Risks

- 다크 테마 전용 오버라이드가 일반 테마까지 번지면 밝은 테마 색이 깨질 수 있다.
- 링크/문서 카드에 선택 상태 스타일과 충돌할 수 있다.

## Pass criteria

- Midnight Ops, Neon Lab에서 일반 메모/링크 메모/RSS/DOC/D-day/TODO 카드 텍스트가 읽힌다.
- 긴 보드 제목이 버튼과 겹치지 않는다.
- `WZD MASTER` 레거시 kicker가 작업공간 문서 카드에서 숨겨진다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
