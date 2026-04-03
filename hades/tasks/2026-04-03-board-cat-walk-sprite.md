## Goal

회사 PC에서도 보드 고양이 걷기 애니메이션이 첫 프레임에 고정되지 않도록 걷기 프레임을 스프라이트 시트로 전환한다.

## User-visible outcome

- 고양이 걷기 모션이 모든 PC에서 6프레임으로 반복된다.
- 대기, 점프, 낙하 포즈는 기존 지정 프레임을 유지한다.

## In scope

- `public/companions` 걷기 스프라이트 시트 자산 생성
- `src/components/BoardCatCompanion.tsx` 걷기 렌더링 방식 전환
- 필요 시 관련 스타일 보정

## Out of scope

- 고양이 동작 UX 자체 변경
- 다른 위젯/보드 기능 수정

## Risks

- 스프라이트 비율이 잘못 맞으면 픽셀이 번지거나 프레임이 어긋날 수 있다.
- 대기/점프 단일 프레임 렌더링이 걷기 렌더러 변경에 영향받을 수 있다.

## Pass criteria

- 걷기 상태에서 `04,05,06,72,73,13` 6프레임이 스프라이트 시트 기반으로 반복된다.
- 회사 PC처럼 개별 프레임 로드 이슈가 있어도 걷기 애니메이션은 한 장의 스프라이트로 보인다.
- 대기 상태 `67/21/17/18`, 위 점프 `82`, 아래 점프/낙하 `78`은 유지된다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies cat animation on the board.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
