## Goal

개인화 작업공간 보드에 프리셋 테마 6종을 추가하고 보드 설정에서 선택 적용할 수 있게 만든다.

## User-visible outcome

- 보드 설정에서 테마 프리셋 6종을 보고 선택할 수 있다.
- 테마를 바꾸면 작업공간의 사이드바, 헤더, 패널, 기본 카드 톤이 함께 바뀐다.
- 선택한 테마는 보드별로 저장되고 다시 들어와도 유지된다.

## In scope

- `src/App.tsx`의 테마 프리셋 정의, 선택 UI, 보드 settings 저장
- `src/features/shared/PageShell.tsx`와 page wrappers의 테마 class 전달
- `src/styles/main.css`의 작업공간 테마 변수와 프리셋 스타일

## Out of scope

- `/market` 테마 구매 연동
- 사용자 정의 색상/세부 커스터마이즈
- 공유 페이지/랜딩 페이지의 테마화

## Risks

- 기존 배경 스타일과 새 themeId가 충돌해 일부 보드가 예상과 다르게 보일 수 있음
- CSS 변수 적용 범위가 넓어 작업공간 기본 스타일이 일부 깨질 수 있음

## Pass criteria

- `981px+`: 보드 설정에서 6개 테마 카드가 보이고 선택 즉시 작업공간 톤이 바뀐다.
- `980px and below`: 모바일에서도 같은 테마 선택 UI가 보이고 적용 상태가 유지된다.
- 선택한 테마는 보드 settings에 저장돼 새로고침 후에도 유지된다.
- 홈/공유/랜딩 페이지는 기존 스타일을 유지한다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
