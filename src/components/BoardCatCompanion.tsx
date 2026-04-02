import { useEffect, useRef, type RefObject } from "react";

type BoardCatCompanionProps = {
  active: boolean;
  boardRef: RefObject<HTMLElement | null>;
  compact: boolean;
  mobile: boolean;
};

type CatBehavior = "walk" | "wait" | "leap" | "drop";

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

type JumpTarget = {
  surfaceId: string;
  x: number;
  y: number;
  direction: -1 | 1;
  kind: "ground" | "card";
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
  jumpTarget: JumpTarget | null;
};

type SpritePreset = {
  frameWidth: number;
  frameHeight: number;
  stepSpeed: number;
  gravity: number;
};

const CAT_FRAMES = {
  idle: ["/companions/blue-cat.png"],
  walk: [
    "/companions/frames/walk-1.png",
    "/companions/frames/walk-2.png",
    "/companions/frames/walk-3.png",
    "/companions/frames/walk-4.png"
  ],
  wait: ["/companions/blue-cat.png"],
  leap: ["/companions/frames/leap-1.png", "/companions/frames/walk-2.png"],
  drop: ["/companions/frames/drop-1.png", "/companions/frames/walk-3.png"]
} as const;

const FRAME_TIMINGS: Record<CatBehavior, number> = {
  walk: 110,
  wait: 240,
  leap: 120,
  drop: 140
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

const pickJumpTarget = (
  layout: CatLayout,
  state: MotionState,
  surface: CatSurface,
  preset: SpritePreset
): JumpTarget | null => {
  const candidates = layout.surfaces.filter(
    (candidate) => candidate.id !== surface.id && candidate.right - candidate.left > preset.frameWidth + 12
  );

  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates
    .map((candidate) => {
      const x =
        state.direction === 1
          ? clamp(candidate.left + 12, candidate.left, candidate.right - preset.frameWidth)
          : clamp(candidate.right - preset.frameWidth - 12, candidate.left, candidate.right - preset.frameWidth);
      const forwardDistance = state.direction === 1 ? x - state.x : state.x - x;
      const behindPenalty = forwardDistance < 0 ? 220 + Math.abs(forwardDistance) * 2.2 : forwardDistance;
      const verticalDistance = Math.abs(candidate.y - surface.y);
      const groundPenalty = candidate.kind === "ground" ? 90 : 0;
      return {
        surfaceId: candidate.id,
        x,
        y: candidate.y,
        direction: state.direction,
        kind: candidate.kind,
        score: behindPenalty + verticalDistance * 0.7 + groundPenalty
      };
    })
    .sort((a, b) => a.score - b.score);

  const pick = scored[Math.floor(Math.random() * Math.min(2, scored.length))] ?? scored[0];
  if (!pick) {
    return null;
  }

  return {
    surfaceId: pick.surfaceId,
    x: pick.x,
    y: pick.y,
    direction: pick.direction,
    kind: pick.kind
  };
};

export default function BoardCatCompanion({ active, boardRef, compact, mobile }: BoardCatCompanionProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const actorRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<CatLayout | null>(null);
  const stateRef = useRef<MotionState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const frameRef = useRef({ behavior: "walk" as CatBehavior, cursor: 0, at: 0 });

  useEffect(() => {
    if (!active) {
      return;
    }

    const overlay = overlayRef.current;
    const board = boardRef.current;
    const actor = actorRef.current;
    const image = imageRef.current;
    const shadow = shadowRef.current;

    if (!overlay || !board || !actor || !image || !shadow) {
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
          actionDuration: 0,
          nextDecisionAt: performance.now() + 1100,
          leapFromX: 0,
          leapFromY: 0,
          jumpTarget: null
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
      state.jumpTarget = null;
      state.nextDecisionAt = now + 900;
    };

    const startWait = (now: number, target: JumpTarget | null, duration = 400) => {
      const state = stateRef.current;
      if (!state) {
        return;
      }

      state.behavior = "wait";
      state.vx = 0;
      state.vy = 0;
      state.actionStartedAt = now;
      state.actionDuration = duration;
      state.jumpTarget = target;
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
        state.y = surface.y;

        if (state.x <= surface.left) {
          state.x = surface.left;
          state.direction = 1;
          const target = surface.kind === "ground" ? null : pickJumpTarget(layout, state, surface, preset);
          startWait(now, target, 380);
        } else if (state.x >= surface.right - preset.frameWidth) {
          state.x = surface.right - preset.frameWidth;
          state.direction = -1;
          const target = surface.kind === "ground" ? null : pickJumpTarget(layout, state, surface, preset);
          startWait(now, target, 380);
        } else if (surface.kind === "ground" && now >= state.nextDecisionAt) {
          const target = pickJumpTarget(layout, state, surface, preset);
          if (target) {
            startWait(now, target, 340);
          } else {
            state.direction = state.direction === 1 ? -1 : 1;
            state.nextDecisionAt = now + 1000 + Math.random() * 1200;
          }
        }
      } else if (state.behavior === "wait") {
        state.y = surface.y;

        if (actionElapsed >= state.actionDuration) {
          if (state.jumpTarget) {
            state.behavior = "leap";
            state.leapFromX = state.x;
            state.leapFromY = state.y;
            state.actionStartedAt = now;
            state.actionDuration = 700;
          } else {
            state.behavior = "walk";
            state.nextDecisionAt = now + 1100 + Math.random() * 1200;
          }
        }
      } else if (state.behavior === "leap" && state.jumpTarget) {
        const jumpTarget = state.jumpTarget;
        const progress = clamp(actionElapsed / state.actionDuration, 0, 1);
        const distanceX = jumpTarget.x - state.leapFromX;
        const arc = Math.max(26, Math.abs(distanceX) * 0.22 + Math.max(0, state.leapFromY - jumpTarget.y) * 0.16);
        state.x = state.leapFromX + distanceX * progress;
        state.y = state.leapFromY + (jumpTarget.y - state.leapFromY) * progress - Math.sin(progress * Math.PI) * arc;

        if (progress >= 1) {
          const targetSurface = layout.surfaces.find((candidate) => candidate.id === jumpTarget.surfaceId);
          if (!targetSurface) {
            startDrop(now);
          } else {
            state.behavior = "walk";
            state.surfaceId = jumpTarget.surfaceId;
            state.x = jumpTarget.x;
            state.y = targetSurface.y;
            state.direction = jumpTarget.direction;
            state.vx = preset.stepSpeed * jumpTarget.direction;
            state.vy = 0;
            state.nextDecisionAt = now + 900 + Math.random() * 900;
            state.jumpTarget = null;
          }
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
          state.jumpTarget = null;
        } else if (state.y >= layout.groundY + 24) {
          const groundDirection = state.vx >= 0 ? 1 : -1;
          state.y = layout.groundY;
          state.behavior = "walk";
          state.surfaceId = "ground";
          state.vy = 0;
          state.vx = preset.stepSpeed * groundDirection;
          state.direction = groundDirection;
          state.nextDecisionAt = now + 800 + Math.random() * 1000;
          state.jumpTarget = null;
        }
      }

      actor.dataset.behavior = state.behavior;
      actor.dataset.direction = state.direction === 1 ? "right" : "left";

      const behaviorFrames = CAT_FRAMES[state.behavior] ?? CAT_FRAMES.idle;
      const frameDuration = FRAME_TIMINGS[state.behavior];
      if (frameRef.current.behavior !== state.behavior) {
        frameRef.current.behavior = state.behavior;
        frameRef.current.cursor = 0;
        frameRef.current.at = now;
      } else if (now - frameRef.current.at >= frameDuration) {
        frameRef.current.cursor = (frameRef.current.cursor + 1) % behaviorFrames.length;
        frameRef.current.at = now;
      }

      image.src = behaviorFrames[frameRef.current.cursor] ?? CAT_FRAMES.idle[0];

      actor.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
      const shadowScale = state.behavior === "leap" ? 0.7 : state.behavior === "drop" ? 0.62 : 1;
      const shadowOpacity = state.behavior === "leap" ? 0.18 : state.behavior === "drop" ? 0.22 : 0.28;
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
        <div className="board-cat-pose">
          <img className="board-cat-image" src="/companions/frames/walk-1.png" alt="" ref={imageRef} />
        </div>
      </div>
    </div>
  );
}
