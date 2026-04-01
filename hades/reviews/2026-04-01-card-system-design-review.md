# WZD Card System Design Review

Date: 2026-04-01
Mode: gstack design-review follow-up

## Verdict

카드는 이 앱의 핵심 맞다.

그런데 현재 카드는 "종류가 많다"에 비해 "같은 시스템에서 설계됐다"는 느낌이 약하다. 세련됨은 그림자 한 번 더 넣는다고 생기지 않는다. 카드 패밀리 규칙이 있어야 나온다.

지금 상태는 10점 만점에 6점 정도다.

- note card: 6/10
- link card: 7/10
- image card: 7/10
- widget card: 5/10
- family consistency: 4/10

## What is working

1. 카드 라운드와 표면감은 기본값이 나쁘지 않다.
2. 링크 카드 메타 구조는 이미 usable 하다.
3. 이미지 카드는 hero surface로 확장 가능한 기반이 있다.
4. 홈/공유/보드 모드 분리가 시작돼서 카드 polish를 올릴 수 있는 구조가 생겼다.

## The actual problems

### 1. 카드 헤더 구조가 타입마다 흔들린다

`src/App.tsx` 안에서 카드 타입별로 `pin-card-head`, `pin-card-body`, `widget-header`, `link-preview-card`가 제각각 조합된다.

사용자 눈에는 이렇게 보인다.

- 어떤 카드는 상단 점이 있고
- 어떤 카드는 액션만 뜨고
- 어떤 카드는 배지가 먼저고
- 어떤 카드는 제목이 바로 시작한다

이건 작은 차이 같지만, 전체 보드가 "통일된 제품"보다 "기능 모음"처럼 보이게 만든다.

### 2. 색 카드가 세련되기보다 귀엽게 보일 때가 있다

`src/styles/main.css`의 `note-yellow`, `note-pink`, `note-blue`, `note-green`, `note-orange`, `note-purple`, `note-mint`는 전부 밝고 안전한 톤이다.

문제는 이 팔레트가 카드 표면의 재질 차이를 못 만든다는 점이다.

지금은 거의 다 비슷한 채도의 파스텔 박스라서:

- note 카드끼리 개성이 약하고
- 링크 카드의 정보 위계가 색보다 내용으로만 버텨야 하고
- 보드 전체가 가볍게만 보인다

### 3. 링크 카드는 가장 가치 있는 카드인데 브랜드 규칙이 덜 강하다

`src/styles/main.css:2532` 이후의 `link-preview-card`, `link-preview-meta`, `link-preview-title` 쪽은 구조는 좋다.

문제는 아직 "WZD 링크 카드"라는 느낌이 약하다.

현재는 일반적인 미리보기 카드에 가깝다.

필요한 건:

- 상단 accent bar 규칙 고정
- site/meta/title/description/url 리듬 고정
- image 유무와 관계없이 같은 브랜드 계열로 읽히게 만들기

### 4. 위젯 카드는 note/link/image 카드보다 한 단계 덜 정교해 보인다

`widget-header`, `widget-badge`, `widget-input`, `widget-textarea`, `checklist-widget-list` 계열이 동작은 한다.

그런데 표면적으로는 "내장 mini app"처럼 보여서 보드 안에서 이질감이 난다.

특히 문제는:

- 배지 스타일이 모든 위젯에 거의 같은 톤
- 콘텐츠 블록 패딩과 radius가 반복적이라 리듬이 평평함
- 카드 외곽은 세련되는데 내부 위젯 블록은 갑자기 utilitarian 하다

### 5. 이미지 카드는 hover reveal에 많이 의존한다

`src/styles/main.css:2434` 이후의 `pin-card.image-note .pin-card-body`는 hover 시 카피가 올라오는 구조다.

데스크톱에서는 괜찮다. 문제는 모바일과 빠른 스캔이다.

사용자는 썸네일을 훑을 때 최소한의 정체성을 바로 알아야 한다.

지금은 copy가 늦게 보이고, image-only인 경우 정보 밀도가 너무 낮아질 수 있다.

### 6. 액션 아이콘이 카드 미학을 끊는다

`note-color-toggle`, `pin-icon-button`가 흰 원형 버튼으로 카드 위에 떠 있다.

동작은 명확하다. 대신 카드가 고급스럽게 보이기보다 편집 도구가 얹힌 느낌이 난다.

세련된 카드 시스템에서는 액션도 카드 재질 안에서 해결돼야 한다.

## What a 10/10 card system would feel like

사용자는 카드를 볼 때 이렇게 느껴야 한다.

- 아, 이건 note 카드구나
- 아, 이건 link 카드구나
- 아, 이건 image 카드구나
- 아, 이건 todo 카드구나

그리고 동시에 이렇게 느껴야 한다.

- 전부 같은 앱에서 나온 카드다
- 같은 표면 규칙을 공유한다
- 같은 손맛이 있다

그게 안 되면 카드가 많아질수록 제품이 더 싸 보인다.

## Recommended card rules

### Rule 1. 카드 패밀리를 4개로 고정

P0 패밀리:

1. Note
2. Link
3. Image
4. Todo

RSS와 document는 secondary family로 둔다.

이유는 간단하다. 핵심 카드가 먼저 완성돼야 앱이 비싸 보인다.

### Rule 2. 공통 card skeleton을 만든다

모든 카드가 공유해야 할 것:

- outer radius
- surface treatment
- header zone height
- body padding rhythm
- action reveal behavior
- selected state

지금은 공통 class는 있지만 실제 시각 규칙은 타입별 예외가 너무 많다.

### Rule 3. 링크 카드는 WZD의 시그니처 카드로 키운다

가장 중요한 카드다.

반드시 고정할 것:

- accent strip
- site row
- title size
- description clamp rule
- url placement
- image ratio fallback

이 카드는 썸네일이 있든 없든 고급스럽게 보여야 한다.

### Rule 4. note 색상을 줄이고 재질감을 늘린다

추천:

- 색 수는 유지해도 채도를 낮춘다
- 카드마다 아주 얕은 gradient나 paper grain 느낌을 준다
- border와 inset highlight를 카드 재질의 일부로 사용한다

지금은 색이 먼저 보이고 재질이 안 보인다.

세련된 카드는 그 반대다.

### Rule 5. widget 카드를 note family에 더 가깝게 붙인다

위젯은 앱 안의 또 다른 앱처럼 보이면 안 된다.

해야 할 것:

- badge 규칙 재정의
- 내부 블록 radius/padding 체계 재통일
- 위젯 타입별 hero row를 단순화
- utility UI보다 board UI처럼 보이게 만들기

### Rule 6. image card는 항상 최소 정체성을 보여준다

hover에만 기대지 말아야 한다.

추천:

- 작은 site chip 또는 title strip 항상 노출
- hover 시 description 확장
- image-only mode를 줄이고 low-info overlay를 기본화

## Concrete design fixes to make next

### P0

1. Link card visual spec 고정
- accent strip
- site row weight
- title hierarchy
- description clamp
- url styling

2. Note palette retune
- 채도 낮추기
- tone 간 차이를 surface 질감으로 만들기
- 흰 카드도 정보 카드처럼 보이게 하기

3. Action chrome 정리
- 흰 원형 floating 버튼을 덜 튀게
- card edge 안으로 붙이기
- hover/focus motion 절제

### P1

4. Widget card internal rhythm 통일
5. Image card 최소 정보 overlay 기본화
6. Empty/loading states도 같은 card language로 정리

## Engineering implication

이 작업을 잘 하려면 `src/App.tsx`에서 카드 렌더를 계속 inline branch로 두면 안 된다.

최소 분리 대상:

- `CardRenderer.tsx`
- `NoteCard.tsx`
- `LinkCard.tsx`
- `ImageCard.tsx`
- `TodoCard.tsx`

그래야 디자인 규칙을 타입별로 정확히 관리할 수 있다.

## Decision

다음 카드 polish는 `링크 카드 시그니처화`부터 들어가는 게 맞다.

왜냐면:

- WZD의 wedge가 capture -> organize -> publish 이고
- 그중 가장 제품 가치를 크게 올리는 카드는 링크 카드이기 때문이다.

링크 카드가 고급스러워 보이면, 앱 전체가 더 비싸 보인다.
