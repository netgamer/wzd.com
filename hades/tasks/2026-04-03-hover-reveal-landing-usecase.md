## Goal

랜딩 위젯 샘플 카드의 `이럴 때 씁니다` 설명을 기본 노출이 아닌 hover 설명으로 바꾼다.

## User-visible outcome

- 데스크톱에서는 위젯 샘플 카드가 더 깔끔하게 보이고, 마우스를 올렸을 때만 사용 설명이 나타난다.
- 모바일에서는 hover가 없으므로 설명이 계속 보인다.

## In scope

- `src/styles/main.css` 위젯 샘플 카드 hover 설명 스타일
- `src/features/landing/LandingPage.tsx` 변경이 필요할 경우 위젯 샘플 마크업 조정

## Out of scope

- 다른 랜딩 섹션 레이아웃 변경
- 메모 샘플 카드 변경

## Risks

- hover 오버레이가 카드 본문 가독성을 과도하게 가릴 수 있다.
- 모바일에서 설명이 숨겨지면 정보가 줄어들 수 있다.

## Pass criteria

- `981px+`: 위젯 샘플 카드의 `이럴 때 씁니다` 설명은 기본으로 보이지 않고 hover 시에만 나타난다.
- `981px+`: hover 시 카드 레이아웃이 크게 흔들리거나 내용이 잘리지 않는다.
- `980px and below`: 모바일에서는 설명이 계속 보인다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies desktop hover and mobile visibility behavior.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
