import { useEffect, useRef, type RefObject } from "react";

type BoardCatCompanionProps = {
  active: boolean;
  boardRef: RefObject<HTMLElement | null>;
  compact: boolean;
  mobile: boolean;
};

type CatBehavior = "walk" | "leap" | "cling" | "drop";
type CatSurface = {
  id: string;
  left: number;
  right: number;
  y: number;
  kind: "ground" | "card";
};
type CatCard = {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  surfaceY: number;
};
type CatLayout = {
  width: number;
  height: number;
  groundY: number;
  surfaces: CatSurface[];
  cards: CatCard[];
};
type ClingTarget = {
  cardId: string;
  x: number;
  y: number;
  direction: -1 | 1;
};
type MotionState = {
  x: number;
  y: number;
  direction: -1 | 1;
  behavior: CatBehavior;
  surfaceId: string;
  vy: number;
  vx: number;
  actionStartedAt: number;
  actionDuration: number;
  nextDecisionAt: number;
  leapFromX: number;
  leapFromY: number;
  clingTarget: ClingTarget | null;
};
type SpritePreset = {
  frameWidth: number;
  frameHeight: number;
  stepSpeed: number;
  gravity: number;
};

const SPRITE_COLUMNS = 24;
const WALK_FRAMES = [24, 25, 26, 27, 28, 29];
const CLING_FRAMES = [2, 3, 4, 5, 4, 3];
const DROP_FRAMES = [43, 44, 45, 46];
const IDLE_FRAMES = [18, 19, 20, 19];
const FRAME_TIMINGS: Record<CatBehavior, number> = {
  walk: 120,
  leap: 90,
  cling: 130,
  drop: 95
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getSpritePreset = (compact: boolean, mobile: boolean): SpritePreset => {
  if (mobile) {
    return { frameWidth: 42, frameHeight: 76, stepSpeed: 52, gravity: 640 };
  }

  if (compact) {
    return { frameWidth: 48, frameHeight: 86, stepSpeed: 56, gravity: 700 };
  }

  return { frameWidth: 56, frameHeight: 101, stepSpeed: 62, gravity: 760 };
};

const getFramesForBehavior = (behavior: CatBehavior) => {
  switch (behavior) {
    case "cling":
      return CLING_FRAMES;
    case "drop":
      return DROP_FRAMES;
    case "leap":
      return DROP_FRAMES;
    case "walk":
    default:
      return WALK_FRAMES;
  }
};

const pickCardTarget = (layout: CatLayout, state: MotionState, preset: SpritePreset): ClingTarget | null => {
  if (layout.cards.length === 0) {
    return null;
  }

  const viable = layout.cards.filter((card) => card.height > preset.frameHeight * 0.95);
  const candidates = (viable.length > 0 ? viable : layout.cards).sort((a, b) => Math.abs(a.left - state.x) - Math.abs(b.left - state.x));
  const target = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))] ?? candidates[0];
  if (!target) {
    return null;
  }

  const targetCenter = (target.left + target.right) / 2;
  const direction = state.x <= targetCenter ? 1 : -1;
  const x = direction === 1 ? target.left - preset.frameWidth * 0.2 : target.right - preset.frameWidth * 0.8;
  const y = clamp(
    target.top + Math.min(54, target.height * 0.24) - preset.frameHeight * 0.16,
    10,
    layout.height - preset.frameHeight - 12
  );

  return {
    cardId: target.id,
    x: clamp(x, 4, layout.width - preset.frameWidth - 4),
    y,
    direction
  };
};

const measureLayout = (overlay: HTMLDivElement, board: HTMLElement, preset: SpritePreset): CatLayout => {
  const overlayRect = overlay.getBoundingClientRect();
  const cards = Array.from(board.querySelectorAll<HTMLElement>(".pin-card:not(.pin-drop-preview)"));
  const measuredCards = cards
    .map((card, index) => {
      const rect = card.getBoundingClientRect();
      const left = rect.left - overlayRect.left;
      const right = rect.right - overlayRect.left;
      const top = rect.top - overlayRect.top;
      const bottom = rect.bottom - overlayRect.top;
      return {
        id: card.dataset.noteId || `${index}`,
        left,
        right,
        top,
        bottom,
        width: rect.width,
        height: rect.height,
        surfaceY: top - preset.frameHeight + 14
      };
    })
    .filter((card) => card.bottom > -20 && card.top < overlayRect.height + 40);

  const boardRect = board.getBoundingClientRect();
  const boardBottom = boardRect.bottom - overlayRect.top;
  const groundY = clamp(
    Math.max(boardBottom - preset.frameHeight + 8, overlayRect.height - preset.frameHeight - 6),
    12,
    overlayRect.height - preset.frameHeight - 6
  );

  return {
    width: overlayRect.width,
    height: overlayRect.height,
    groundY,
    cards: measuredCards,
    surfaces: [
      ...measuredCards.map((card) => ({
        id: card.id,
        left: card.left + 10,
        right: card.right - 10,
        y: card.surfaceY,
        kind: "card" as const
      })),
      {
        id: "ground",
        left: 8,
        right: overlayRect.width - 8,
        y: groundY,
        kind: "ground" as const
      }
    ]
  };
};

const findSurfaceById = (layout: CatLayout, surfaceId: string) =>
  layout.surfaces.find((surface) => surface.id === surfaceId) ?? layout.surfaces[layout.surfaces.length - 1]!;

const findLandingSurface = (layout: CatLayout, x: number, previousY: number, nextY: number, frameWidth: number) => {
  const center = x + frameWidth / 2;
  return layout.surfaces
    .filter((surface) => center >= surface.left && center <= surface.right)
    .sort((a, b) => a.y - b.y)
    .find((surface) => previousY <= surface.y && nextY >= surface.y);
};

export default function BoardCatCompanion({ active, boardRef, compact, mobile }: BoardCatCompanionProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const actorRef = useRef<HTMLDivElement | null>(null);
  const spriteRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<CatLayout | null>(null);
  const stateRef = useRef<MotionState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const frameRef = useRef({ behavior: "walk" as CatBehavior, frameCursor: 0, frameAt: 0, direction: 1 as -1 | 1 });

  useEffect(() => {
    if (!active) {
      return;
    }

    const overlay = overlayRef.current;
    const board = boardRef.current;
    const actor = actorRef.current;
    const sprite = spriteRef.current;
    const shadow = shadowRef.current;

    if (!overlay || !board || !actor || !sprite || !shadow) {
      return;
    }

    const preset = getSpritePreset(compact, mobile);
    overlay.style.setProperty("--board-cat-frame-w", `${preset.frameWidth}px`);
    overlay.style.setProperty("--board-cat-frame-h", `${preset.frameHeight}px`);

    const syncLayout = () => {
      const layout = measureLayout(overlay, board, preset);
      layoutRef.current = layout;
      const current = stateRef.current;
      if (!current) {
        stateRef.current = {
          x: clamp(24, 8, layout.width - preset.frameWidth - 8),
          y: layout.groundY,
          direction: 1,
          behavior: "walk",
          surfaceId: "ground",
          vy: 0,
          vx: preset.stepSpeed,
          actionStartedAt: performance.now(),
          actionDuration: 1400,
          nextDecisionAt: performance.now() + 1100,
          leapFromX: 0,
          leapFromY: 0,
          clingTarget: null
        };
        return;
      }

      current.x = clamp(current.x, 4, layout.width - preset.frameWidth - 4);
      current.y = clamp(current.y, 4, layout.height - preset.frameHeight - 4);
    };

    syncLayout();

    const resizeObserver = new ResizeObserver(() => syncLayout());
    resizeObserver.observe(overlay);
    resizeObserver.observe(board);

    const applyFrame = (frameIndex: number, direction: -1 | 1, behavior: CatBehavior) => {
      const frameColumn = frameIndex % SPRITE_COLUMNS;
      const frameRow = Math.floor(frameIndex / SPRITE_COLUMNS);
      sprite.style.backgroundPosition = `-${frameColumn * preset.frameWidth}px -${frameRow * preset.frameHeight}px`;
      sprite.style.transform = `scaleX(${direction})`;
      actor.dataset.behavior = behavior;
    };

    const startDrop = (now: number) => {
      const state = stateRef.current;
      const layout = layoutRef.current;
      if (!state || !layout) {
        return;
      }

      state.behavior = "drop";
      state.vy = 80;
      state.vx = state.direction * 18;
      state.actionStartedAt = now;
      state.actionDuration = 0;
      state.surfaceId = "ground";
      state.clingTarget = null;
      state.nextDecisionAt = now + 900;
    };

    const tick = (now: number) => {
      const layout = layoutRef.current;
      const state = stateRef.current;
      if (!layout || !state) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const lastTick = lastTickRef.current || now;
      const dt = Math.min(0.032, (now - lastTick) / 1000);
      lastTickRef.current = now;
      const surface = findSurfaceById(layout, state.surfaceId);
      const actionElapsed = now - state.actionStartedAt;

      if (state.behavior === "walk") {
        const walkSpeed = surface.kind === "ground" ? preset.stepSpeed : preset.stepSpeed * 0.84;
        state.x += state.direction * walkSpeed * dt;
        state.y = surface.y + Math.sin(now / 120) * 1.6;

        if (state.x <= surface.left) {
          state.x = surface.left;
          state.direction = 1;
        }

        if (state.x >= surface.right - preset.frameWidth) {
          state.x = surface.right - preset.frameWidth;
          if (surface.kind === "card") {
            startDrop(now);
          } else {
            state.direction = -1;
          }
        }

        if (now >= state.nextDecisionAt) {
          if (Math.random() < 0.58) {
            const clingTarget = pickCardTarget(layout, state, preset);
            if (clingTarget) {
              state.behavior = "leap";
              state.leapFromX = state.x;
              state.leapFromY = state.y;
              state.clingTarget = clingTarget;
              state.direction = clingTarget.direction;
              state.actionStartedAt = now;
              state.actionDuration = 720;
            } else {
              state.nextDecisionAt = now + 1200 + Math.random() * 1400;
            }
          } else if (surface.kind === "card") {
            startDrop(now);
          } else {
            state.direction = state.direction === 1 ? -1 : 1;
            state.nextDecisionAt = now + 1000 + Math.random() * 1200;
          }
        }
      } else if (state.behavior === "leap" && state.clingTarget) {
        const progress = clamp(actionElapsed / state.actionDuration, 0, 1);
        state.x = state.leapFromX + (state.clingTarget.x - state.leapFromX) * progress;
        const arc = Math.sin(progress * Math.PI) * Math.max(18, Math.abs(state.clingTarget.x - state.leapFromX) * 0.18);
        state.y = state.leapFromY + (state.clingTarget.y - state.leapFromY) * progress - arc;

        if (progress >= 1) {
          state.behavior = "cling";
          state.actionStartedAt = now;
          state.actionDuration = 1200 + Math.random() * 900;
          state.nextDecisionAt = now + state.actionDuration;
          state.x = state.clingTarget.x;
          state.y = state.clingTarget.y;
        }
      } else if (state.behavior === "cling") {
        const sway = Math.sin(actionElapsed / 120) * 2.4;
        state.x = clamp((state.clingTarget?.x ?? state.x) + sway * state.direction, 4, layout.width - preset.frameWidth - 4);
        state.y = (state.clingTarget?.y ?? state.y) + Math.cos(actionElapsed / 160) * 1.5;

        if (actionElapsed >= state.actionDuration) {
          startDrop(now);
        }
      } else if (state.behavior === "drop") {
        const previousY = state.y;
        state.vy += preset.gravity * dt;
        state.y += state.vy * dt;
        state.x = clamp(state.x + state.vx * dt, 4, layout.width - preset.frameWidth - 4);

        const landingSurface = findLandingSurface(layout, state.x, previousY, state.y, preset.frameWidth);
        if (landingSurface) {
          const landedDirection = state.vx >= 0 ? 1 : -1;
          state.behavior = "walk";
          state.surfaceId = landingSurface.id;
          state.y = landingSurface.y;
          state.vy = 0;
          state.vx = preset.stepSpeed * landedDirection;
          state.direction = landedDirection;
          state.actionStartedAt = now;
          state.actionDuration = 0;
          state.nextDecisionAt = now + 900 + Math.random() * 900;
        } else if (state.y >= layout.groundY + 24) {
          const groundDirection = state.vx >= 0 ? 1 : -1;
          state.y = layout.groundY;
          state.behavior = "walk";
          state.surfaceId = "ground";
          state.vy = 0;
          state.vx = preset.stepSpeed * groundDirection;
          state.direction = groundDirection;
          state.nextDecisionAt = now + 800 + Math.random() * 1000;
        }
      }

      const actorBehavior = state.behavior;
      const sequence = actorBehavior === "walk" ? WALK_FRAMES : getFramesForBehavior(actorBehavior);
      const frameDuration = FRAME_TIMINGS[actorBehavior];

      if (frameRef.current.behavior !== actorBehavior || frameRef.current.direction !== state.direction) {
        frameRef.current.behavior = actorBehavior;
        frameRef.current.direction = state.direction;
        frameRef.current.frameCursor = 0;
        frameRef.current.frameAt = now;
      } else if (now - frameRef.current.frameAt >= frameDuration) {
        frameRef.current.frameCursor = (frameRef.current.frameCursor + 1) % sequence.length;
        frameRef.current.frameAt = now;
      }

      const activeFrame = sequence[frameRef.current.frameCursor] ?? IDLE_FRAMES[0];
      applyFrame(activeFrame, state.direction, actorBehavior);

      actor.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
      const shadowScale = state.behavior === "cling" ? 0.4 : state.behavior === "drop" ? 0.62 : 1;
      const shadowOpacity = state.behavior === "cling" ? 0.14 : state.behavior === "drop" ? 0.22 : 0.28;
      shadow.style.transform = `translate3d(${state.x + preset.frameWidth * 0.16}px, ${layout.groundY + preset.frameHeight - 18}px, 0) scale(${shadowScale})`;
      shadow.style.opacity = `${shadowOpacity}`;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [active, boardRef, compact, mobile]);

  if (!active) {
    return null;
  }

  return (
    <div className="board-cat-companion" aria-hidden="true" ref={overlayRef}>
      <div className="board-cat-shadow" ref={shadowRef} />
      <div className="board-cat-actor" ref={actorRef}>
        <div className="board-cat-sprite-sheet" ref={spriteRef} />
        <span className="board-cat-spark">✦</span>
      </div>
    </div>
  );
}
