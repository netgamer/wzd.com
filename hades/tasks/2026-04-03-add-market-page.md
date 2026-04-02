## Goal

`/market` 경로에 배경 테마, 위젯, 펫을 사고팔 수 있는 마켓 MVP를 추가한다.

## User-visible outcome

- `wzd.kr/market`에서 마켓 페이지가 열린다.
- 사용자는 배경 테마, 위젯, 펫 카테고리를 탐색할 수 있다.
- 사용자는 상품을 구매해 보유함에 추가할 수 있다.
- 사용자는 판매 등록 폼으로 새 상품을 올릴 수 있다.

## In scope

- `src/App.tsx` 라우트 연결
- `src/features/market/MarketPage.tsx` 마켓 UI와 로컬 구매/판매 흐름
- `src/styles/main.css` 마켓 페이지 스타일

## Out of scope

- 실제 결제 연동
- 서버 저장 및 다중 사용자 간 실시간 거래
- 구매한 상품을 보드 편집기와 연동하는 기능

## Risks

- 로컬 스토리지 기반이라 브라우저별 상태가 다를 수 있다.
- 마켓 페이지 스타일이 기존 랜딩/보드 스타일과 충돌할 수 있다.

## Pass criteria

- `981px+`: `/market`에서 마켓 페이지가 열리고 3개 카테고리 상품이 보인다.
- `981px+`: 상품 구매 후 보유함에 반영되고 잔액이 갱신된다.
- `981px+`: 판매 등록 후 목록에 새 상품이 보인다.
- `980px and below`: 모바일에서도 카테고리, 상품 카드, 판매 등록, 보유함 레이아웃이 깨지지 않는다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the market page flows.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-cso`
