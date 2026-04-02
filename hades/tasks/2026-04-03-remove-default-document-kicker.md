## Goal

문서 섹션 위젯의 기본 kicker 텍스트를 제거한다.

## User-visible outcome

- 새 문서 섹션 위젯에 기본 `WZD MASTER` 텍스트가 보이지 않는다.
- 사용자가 kicker를 비워두면 카드 상단에 빈 라벨 줄이 남지 않는다.

## In scope

- `src/App.tsx` 문서 위젯 기본 kicker 값과 렌더링 조건

## Out of scope

- 랜딩 페이지용 문서 샘플 kicker 텍스트 변경

## Risks

- 기본 fallback을 비우면 기존 문서 카드 중 metadata가 없는 카드가 빈 상단으로 보일 수 있다.

## Pass criteria

- `981px+`: 새 문서 섹션 카드에 기본 `WZD MASTER` 텍스트가 보이지 않는다.
- `980px and below`: 모바일 문서 카드에서도 빈 kicker 줄이 생기지 않는다.
- 기존에 직접 입력된 kicker는 그대로 보인다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the document card no longer shows the default kicker.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
