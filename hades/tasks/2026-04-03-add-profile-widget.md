## Goal

이름, 생년월일, 직업, 프로필 사진을 담는 기본 프로필 카드 위젯을 추가한다.

## User-visible outcome

- 위젯 추가 메뉴에서 내 정보 위젯을 만들 수 있다.
- 프로필 카드에 이름, 생년월일, 한국나이, 직업, 프로필 사진이 표시된다.

## In scope

- `src/App.tsx` 위젯 타입, 메타데이터 헬퍼, 렌더링, 생성 함수, 메뉴 노출
- `src/styles/main.css` 프로필 위젯 스타일

## Out of scope

- 서버 프로필 동기화
- 사진 업로드 기능

## Risks

- 잘못된 날짜 입력 시 나이 계산이 어색할 수 있다.
- 긴 이름이나 직업명이 카드 레이아웃을 밀 수 있다.

## Pass criteria

- `981px+`: 위젯 추가 메뉴에 내 정보 위젯이 보이고 생성된다.
- `981px+`: 이름, 생년월일, 직업, 프로필 사진 URL을 편집할 수 있고 카드에 반영된다.
- `981px+`: 생년월일을 입력하면 카드에 한국나이가 표시된다.
- `980px and below`: 모바일 위젯 추가 메뉴에서도 내 정보 위젯이 보이고 생성된다.
- `980px and below`: 프로필 카드 레이아웃이 깨지지 않는다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the profile widget renders correctly.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
