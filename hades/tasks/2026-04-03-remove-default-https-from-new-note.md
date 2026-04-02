# Task Template

## Goal

새 메모 생성 시 본문에 기본으로 들어가는 `https://`를 제거한다.

## User-visible outcome

- 새 메모를 만들면 제목/본문 기본값에 불필요한 URL 플레이스홀더가 보이지 않는다.

## In scope

- `C:\Users\junho\Documents\code\wzd.com\src\App.tsx`의 새 메모 기본 본문
- 빈 새 메모 자동 정리 판정 로직

## Out of scope

- 링크 위젯 기본 URL 값
- 기존 메모 내용 마이그레이션

## Risks

- 빈 메모 자동 삭제 조건이 달라져 의도치 않게 메모가 남거나 지워질 수 있다.

## Pass criteria

- 새 메모 생성 시 본문 기본값에 `https://`가 없다
- 비어 있는 새 메모 정리 동작이 기존처럼 유지된다
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
- `/gstack-cso`
