## Goal

고양이 걷기 스프라이트 시트가 기존 캐릭터 크기와 비율로 보이도록 셀 크기를 다시 맞춘다.

## User-visible outcome

- 걷기 애니메이션은 유지된다.
- 캐릭터가 이전처럼 카드 위 기준 적정 크기로 보이고 세로로 늘어나지 않는다.

## In scope

- `public/companions/walk-cycle.png` 재생성
- 필요 시 `src/components/BoardCatCompanion.tsx` 또는 관련 스타일 보정

## Out of scope

- 고양이 행동 로직 변경
- 다른 보드 UI 수정

## Risks

- 셀 패딩이 잘못되면 발 위치가 카드 위선에서 어긋날 수 있다.

## Pass criteria

- 걷기 상태에서 `04,05,06,72,73,13` 6프레임 애니메이션이 유지된다.
- 캐릭터가 기존 대비 비정상적으로 커지거나 세로로 늘어나지 않는다.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
