## Goal

비로그인 랜딩 페이지에서 WZD의 모든 위젯 종류를 샘플 형태로 한눈에 훑어볼 수 있게 만든다.

## User-visible outcome

- 비로그인 사용자가 첫 화면에서 WZD가 제공하는 위젯 종류를 즉시 이해할 수 있다.
- 랜딩 중간에 위젯 샘플 갤러리가 보여서 메모 앱이 아니라 보드형 워크스페이스라는 점이 분명해진다.
- 일반 메모, 링크가 들어간 메모, 이미지가 들어간 메모 예시도 함께 보여서 기본 카드 동작까지 이해할 수 있다.
- 홈 화면의 카드 배치가 작업공간처럼 Pinterest식 컬럼 흐름으로 붙어서, 큰 빈 공간이 덜 보인다.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`의 랜딩 페이지 스타일

## Out of scope

- 로그인 이후 작업공간 UI 변경
- 실제 위젯 로직 연결
- 신규 데이터 저장 또는 인증 플로우 수정

## Risks

- 카드 수가 많아지면서 모바일에서 밀도가 과해질 수 있다.
- 시각 요소가 늘어나면서 랜딩 CTA가 묻힐 수 있다.

## Pass criteria

- 비로그인 랜딩 페이지에 모든 위젯 타입 샘플이 카드 형태로 노출된다.
- 일반 메모 샘플, 하이퍼링크가 포함된 메모 샘플, 이미지가 포함된 메모 샘플이 함께 노출된다.
- `1280px+` 홈 화면에서 카드가 작업공간처럼 컬럼 단위로 위에서 아래로 촘촘하게 쌓이고, 대형 빈 구획이 눈에 띄지 않는다.
- `1280px+`, `768px`, `375px`에서 위젯 갤러리가 잘려 보이거나 가로 스크롤이 생기지 않는다.
- 랜딩 상단 CTA와 로그인 버튼은 유지된다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
