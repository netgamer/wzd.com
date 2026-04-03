## Goal

walk-cycle 스프라이트의 4번째 프레임 높이 오차를 1px 내려서 걷기 모션 튐을 없앤다.

## User-visible outcome

- 고양이 걷기 모션에서 4번째 프레임 진입 시 위아래 튐이 사라진다.

## In scope

- `public/companions/walk-cycle.png` 재생성
- 필요 시 생성 스크립트 좌표 보정

## Out of scope

- 고양이 행동 로직 변경
- 다른 UI 변경

## Risks

- 잘못 내리면 다른 프레임과 바닥선이 다시 어긋날 수 있다.

## Pass criteria

- walk-cycle의 4번째 프레임이 기존보다 1px 아래로 정렬된다.
- 걷기 6프레임의 바닥선이 시각적으로 더 일관된다.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
