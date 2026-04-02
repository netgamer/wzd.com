# Task Template

## Goal

모바일 햄버거 메뉴에서 중복된 보드 선택 목록을 제거한다.

## User-visible outcome

- 모바일 햄버거 메뉴를 열어도 보드 목록은 나오지 않고 액션만 보인다.

## In scope

- `C:\Users\junho\Documents\code\wzd.com\src\App.tsx`의 모바일 햄버거 메뉴 JSX

## Out of scope

- 상단 가로 보드 탭
- 데스크톱 사이드바 보드 목록

## Risks

- 모바일 햄버거 메뉴 레이아웃이 비어 보이거나 액션 간격이 어색해질 수 있다.

## Pass criteria

- 모바일 햄버거 메뉴에 보드 선택 목록이 없다
- 상단 가로 보드 탭으로는 계속 보드 전환이 가능하다
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
- `/gstack-cso`
