## Goal

다크 테마의 2차 표면들(RSS 항목, 위젯 메뉴, 캣 리모콘, 사이드바 칩) 대비를 보정한다.

## User-visible outcome

- Midnight Ops와 Neon Lab에서 RSS 항목 카드가 읽힌다.
- 위젯 추가 메뉴와 캣 리모콘 버튼이 다크 테마에서도 선명하게 보인다.
- 사이드바의 비활성 보드 칩과 아이콘이 흐려지지 않는다.

## In scope

- `src/styles/main.css`의 다크 테마 전용 secondary surface override

## Out of scope

- 테마 구조 변경
- 새 위젯 추가

## Risks

- 다크 테마 전용 오버라이드가 모바일/데스크톱 공용 메뉴에 같이 적용되므로 hover 대비를 같이 확인해야 한다.

## Pass criteria

- Midnight Ops, Neon Lab에서 RSS 아이템 제목/날짜/배경이 읽힌다.
- 위젯 메뉴와 캣 리모콘이 어두운 배경에서 선명하다.
- 사이드바 비활성 칩/아이콘 라벨이 읽힌다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
