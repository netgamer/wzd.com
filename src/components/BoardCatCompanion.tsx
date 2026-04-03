import { useEffect, useRef, type RefObject } from "react";

type BoardCatCompanionProps = {
  active: boolean;
  boardRef: RefObject<HTMLElement | null>;
  compact: boolean;
  mobile: boolean;
  command: CatRemoteCommand | null;
};

export type CatRemoteAction = "jump-left" | "jump-right" | "sit" | "look-down" | "blink" | "drop";

export type CatRemoteCommand = {
  id: number;
  action: CatRemoteAction;
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

type WaitPose = "up" | "down" | "blink";

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
  waitPose: WaitPose;
};

type SpritePreset = {
  frameWidth: number;
  frameHeight: number;
  stepSpeed: number;
  gravity: number;
};

const CAT_ATLAS = "/companions/cat-atlas.png";
const CAT_ATLAS_ORDER = ["04", "05", "06", "72", "73", "13", "67", "21", "17", "18", "82", "78"] as const;
const CAT_FRAME_INDEX: Record<(typeof CAT_ATLAS_ORDER)[number], number> = {
  "04": 0,
  "05": 1,
  "06": 2,
  "72": 3,
  "73": 4,
  "13": 5,
  "67": 6,
  "21": 7,
  "17": 8,
  "18": 9,
  "82": 10,
  "78": 11
};

const CAT_FRAMES = {
  idle: ["67"],
  walk: ["04", "05", "06", "72", "73", "13"],
  waitUp: ["67"],
  waitDown: ["21"],
  blink: ["17", "18", "17", "18"],
  leapUp: ["82"],
  dropDown: ["78"]
} as const;

const FRAME_TIMINGS: Record<CatBehavior, number> = {
  walk: 110,
  wait: 240,
  leap: 120,
  drop: 140
};

const getFrameSequenceKey = (state: MotionState, surface: CatSurface) => {
  if (state.behavior === "walk") {
    return "walk";
  }

  if (state.behavior === "wait") {
    if (state.waitPose === "blink") {
      return "wait-blink";
    }

    return state.waitPose === "down" || surface.kind === "ground" ? "wait-down" : "wait-up";
  }

  if (state.behavior === "leap") {
    return state.jumpTarget && state.jumpTarget.y > state.leapFromY ? "leap-down" : "leap-up";
  }

  if (state.behavior === "drop") {
    return "drop";
  }

  return "idle";
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getSpritePreset = (compact: boolean, mobile: boolean): SpritePreset => {
  if (mobile) {
    return { frameWidth: 42, frameHeight: 76, stepSpeed: 34, gravity: 640 };
  }

  if (compact) {
    return { frameWidth: 48, frameHeight: 86, stepSpeed: 36, gravity: 700 };
  }

  return { frameWidth: 56, frameHeight: 101, stepSpeed: 40, gravity: 760 };
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
        // Keep the full walking body on the card cap line, not inside the note body.
        surfaceY: top - preset.frameHeight - 12
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

  const visibleCardSurfaces = measuredCards
    .filter((card) => card.surfaceY >= 4)
    .map((card) => ({
      id: card.id,
      left: card.left + 10,
      right: card.right - 10,
      y: card.surfaceY,
      kind: "card" as const
    }));

  return {
    width: overlayRect.width,
    height: overlayRect.height,
    groundY,
    cards: measuredCards,
    surfaces: [
      ...visibleCardSurfaces,
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

const getDisplayFrames = (state: MotionState, surface: CatSurface) => {
  if (state.behavior === "walk") {
    return CAT_FRAMES.walk;
  }

  if (state.behavior === "wait") {
    if (state.waitPose === "blink") {
      return CAT_FRAMES.blink;
    }

    return state.waitPose === "down" || surface.kind === "ground" ? CAT_FRAMES.waitDown : CAT_FRAMES.waitUp;
  }

  if (state.behavior === "leap") {
    return state.jumpTarget && state.jumpTarget.y > state.leapFromY ? CAT_FRAMES.dropDown : CAT_FRAMES.leapUp;
  }

  if (state.behavior === "drop") {
    return CAT_FRAMES.dropDown;
  }

  return CAT_FRAMES.idle;
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

  // Favor lateral movement first so the pet explores adjacent cards before
  // making bigger vertical jumps up or down the board.
  const preferredCandidates =
    candidates.filter((candidate) => Math.abs(candidate.y - surface.y) <= 140) || candidates;
  const activeCandidates = preferredCandidates.length > 0 ? preferredCandidates : candidates;

  const scored = activeCandidates
    .map((candidate) => {
      const x =
        state.direction === 1
          ? clamp(candidate.left + 12, candidate.left, candidate.right - preset.frameWidth)
          : clamp(candidate.right - preset.frameWidth - 12, candidate.left, candidate.right - preset.frameWidth);
      const forwardDistance = state.direction === 1 ? x - state.x : state.x - x;
      const behindPenalty = forwardDistance < 0 ? 220 + Math.abs(forwardDistance) * 2.2 : forwardDistance;
      const verticalDistance = Math.abs(candidate.y - surface.y);
      const groundPenalty = candidate.kind === "ground" ? 90 : 0;
      const laneBonus = verticalDistance <= 64 ? -120 : verticalDistance <= 140 ? -50 : 0;
      return {
        surfaceId: candidate.id,
        x,
        y: candidate.y,
        direction: state.direction,
        kind: candidate.kind,
        score: behindPenalty + verticalDistance * 1.8 + groundPenalty + laneBonus
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

const pickDirectedCommandTarget = (
  layout: CatLayout,
  state: MotionState,
  surface: CatSurface,
  preset: SpritePreset,
  direction: -1 | 1
): JumpTarget | null => {
  const limit = surface.right - preset.frameWidth;
  const directedCandidates = layout.surfaces
    .filter(
      (candidate) =>
        candidate.id !== surface.id &&
        candidate.right - candidate.left > preset.frameWidth + 12 &&
        (direction === -1 ? candidate.right < state.x + preset.frameWidth * 0.7 : candidate.left > state.x + preset.frameWidth * 0.3)
    )
    .map((candidate) => {
      const anchorX =
        direction === -1
          ? clamp(candidate.right - preset.frameWidth - 12, candidate.left, candidate.right - preset.frameWidth)
          : clamp(candidate.left + 12, candidate.left, candidate.right - preset.frameWidth);
      const dx = Math.abs(anchorX - state.x);
      const dy = Math.abs(candidate.y - surface.y);
      return {
        surfaceId: candidate.id,
        x: anchorX,
        y: candidate.y,
        direction,
        kind: candidate.kind,
        score: dx + dy * 1.8 + (candidate.kind === "ground" ? 80 : 0)
      };
    })
    .sort((a, b) => a.score - b.score);

  const candidate = directedCandidates[0];
  if (candidate) {
    return candidate;
  }

  const hopX = clamp(state.x + direction * Math.max(48, preset.frameWidth * 1.35), surface.left, limit);
  if (Math.abs(hopX - state.x) < 8) {
    return null;
  }

  return {
    surfaceId: surface.id,
    x: hopX,
    y: surface.y,
    direction,
    kind: surface.kind
  };
};

export default function BoardCatCompanion({ active, boardRef, compact, mobile, command }: BoardCatCompanionProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const actorRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<CatLayout | null>(null);
  const stateRef = useRef<MotionState | null>(null);
  const readyAtRef = useRef(0);
  const introducedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const frameRef = useRef({ behavior: "walk" as CatBehavior, sequenceKey: "walk", cursor: 0, at: 0 });
  const renderedFrameRef = useRef({ sequenceKey: "", cursor: -1, frame: "" });
  const pendingCommandRef = useRef<CatRemoteCommand | null>(null);
  const handledCommandIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!command || handledCommandIdRef.current === command.id) {
      return;
    }

    pendingCommandRef.current = command;
  }, [command]);

  useEffect(() => {
    const atlas = new Image();
    atlas.decoding = "sync";
    atlas.src = CAT_ATLAS;
    void atlas.decode?.().catch(() => {});

    return () => {
      atlas.src = "";
    };
  }, []);

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
    introducedRef.current = false;
    readyAtRef.current = performance.now() + 420;
    stateRef.current = null;
    pendingCommandRef.current = null;
    handledCommandIdRef.current = null;
    lastTickRef.current = 0;
    frameRef.current = { behavior: "walk", sequenceKey: "walk", cursor: 0, at: 0 };
    renderedFrameRef.current = { sequenceKey: "", cursor: -1, frame: "" };

    const syncLayout = () => {
      const now = performance.now();
      const layout = measureLayout(overlay, board, preset);
      layoutRef.current = layout;
      if (!introducedRef.current) {
        readyAtRef.current = now + 420;
        return;
      }

      const current = stateRef.current;
      if (!current) {
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

    const startWait = (now: number, target: JumpTarget | null, duration = 400, waitPose: WaitPose = "up") => {
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
      state.waitPose = waitPose;
      if (target) {
        state.direction = target.x >= state.x ? 1 : -1;
      }
    };

    const executePendingCommand = (now: number) => {
      const queued = pendingCommandRef.current;
      const layout = layoutRef.current;
      const state = stateRef.current;
      if (!queued || !layout || !state) {
        return;
      }

      const surface = findSurfaceById(layout, state.surfaceId);
      pendingCommandRef.current = null;
      handledCommandIdRef.current = queued.id;

      switch (queued.action) {
        case "jump-left": {
          const target = pickDirectedCommandTarget(layout, state, surface, preset, -1);
          if (target) {
            state.direction = -1;
            startWait(now, target, 260, target.y > surface.y ? "down" : "up");
          } else {
            startWait(now, null, 480, "up");
          }
          break;
        }
        case "jump-right": {
          const target = pickDirectedCommandTarget(layout, state, surface, preset, 1);
          if (target) {
            state.direction = 1;
            startWait(now, target, 260, target.y > surface.y ? "down" : "up");
          } else {
            startWait(now, null, 480, "up");
          }
          break;
        }
        case "sit":
          startWait(now, null, 1400, "up");
          break;
        case "look-down":
          startWait(now, null, 1400, "down");
          break;
        case "blink":
          startWait(now, null, 960, "blink");
          break;
        case "drop":
          if (surface.kind !== "ground") {
            state.direction = state.direction || 1;
            startDrop(now);
          } else {
            startWait(now, null, 720, "down");
          }
          break;
        default:
          break;
      }
    };

    const tick = (now: number) => {
      const layout = layoutRef.current;
      if (!layout) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!introducedRef.current) {
        actor.style.opacity = "0";
        shadow.style.opacity = "0";

        if (now >= readyAtRef.current) {
          const spawnSurface = layout.surfaces
            .filter((surface) => surface.kind === "card")
            .sort((a, b) => a.y - b.y)[0] ?? layout.surfaces[layout.surfaces.length - 1];
          const spawnX = clamp(
            spawnSurface.left + (spawnSurface.right - spawnSurface.left - preset.frameWidth) / 2,
            8,
            layout.width - preset.frameWidth - 8
          );
          stateRef.current = {
            x: spawnX,
            y: -preset.frameHeight - 12,
            direction: 1,
            behavior: "drop",
            surfaceId: "ground",
            vy: 40,
            vx: 0,
            actionStartedAt: now,
            actionDuration: 0,
            nextDecisionAt: now + 900,
            leapFromX: spawnX,
            leapFromY: -preset.frameHeight - 12,
            jumpTarget: null,
            waitPose: "up"
          };
          introducedRef.current = true;
          actor.style.opacity = "1";
        }

        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const state = stateRef.current;
      if (!state) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const lastTick = lastTickRef.current || now;
      const dt = Math.min(0.032, (now - lastTick) / 1000);
      lastTickRef.current = now;
      executePendingCommand(now);
      const currentSurface = findSurfaceById(layout, state.surfaceId);
      const actionElapsed = now - state.actionStartedAt;
      actor.style.opacity = "1";

      if (state.behavior === "walk") {
        const walkSpeed = currentSurface.kind === "ground" ? preset.stepSpeed : preset.stepSpeed * 0.84;
        state.x += state.direction * walkSpeed * dt;
        state.y = currentSurface.y;

        if (state.x <= currentSurface.left) {
          state.x = currentSurface.left;
          state.direction = 1;
          const target = currentSurface.kind === "ground" ? null : pickJumpTarget(layout, state, currentSurface, preset);
          const waitPose: WaitPose = target && target.y > currentSurface.y ? "down" : "up";
          startWait(now, target, 380, waitPose);
        } else if (state.x >= currentSurface.right - preset.frameWidth) {
          state.x = currentSurface.right - preset.frameWidth;
          state.direction = -1;
          const target = currentSurface.kind === "ground" ? null : pickJumpTarget(layout, state, currentSurface, preset);
          const waitPose: WaitPose = target && target.y > currentSurface.y ? "down" : "up";
          startWait(now, target, 380, waitPose);
        } else if (now >= state.nextDecisionAt) {
          if (Math.random() < 0.24) {
            startWait(now, null, 960, "blink");
          } else if (currentSurface.kind === "ground") {
            const target = pickJumpTarget(layout, state, currentSurface, preset);
            if (target) {
              startWait(now, target, 340, target.y > currentSurface.y ? "down" : "up");
            } else {
              state.direction = state.direction === 1 ? -1 : 1;
              state.nextDecisionAt = now + 1000 + Math.random() * 1200;
            }
          } else {
            state.nextDecisionAt = now + 1400 + Math.random() * 1400;
          }
        }
      } else if (state.behavior === "wait") {
        state.y = currentSurface.y;

        if (actionElapsed >= state.actionDuration) {
          if (state.jumpTarget) {
            state.direction = state.jumpTarget.x >= state.x ? 1 : -1;
            state.behavior = "leap";
            state.leapFromX = state.x;
            state.leapFromY = state.y;
            state.actionStartedAt = now;
            state.actionDuration = 700;
            state.waitPose = "up";
          } else {
            state.behavior = "walk";
            state.nextDecisionAt = now + 1100 + Math.random() * 1200;
            state.waitPose = "up";
          }
        }
      } else if (state.behavior === "leap" && state.jumpTarget) {
        const jumpTarget = state.jumpTarget;
        const progress = clamp(actionElapsed / state.actionDuration, 0, 1);
        const distanceX = jumpTarget.x - state.leapFromX;
        state.direction = distanceX >= 0 ? 1 : -1;
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
            state.waitPose = "up";
          }
        }
      } else if (state.behavior === "drop") {
        const previousY = state.y;
        state.vy += preset.gravity * dt;
        state.y += state.vy * dt;
        state.x = clamp(state.x + state.vx * dt, 4, layout.width - preset.frameWidth - 4);
        state.direction = state.vx >= 0 ? 1 : -1;

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
          state.waitPose = "up";
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
          state.waitPose = "down";
        }
      }

      actor.dataset.behavior = state.behavior;
      actor.dataset.direction = state.direction === 1 ? "right" : "left";
      actor.style.setProperty("--board-cat-direction-scale", state.direction === 1 ? "-1" : "1");

      const behaviorFrames = getDisplayFrames(state, currentSurface);
      const frameSequenceKey = getFrameSequenceKey(state, currentSurface);
      const frameDuration = FRAME_TIMINGS[state.behavior];
      if (frameRef.current.behavior !== state.behavior || frameRef.current.sequenceKey !== frameSequenceKey) {
        frameRef.current.behavior = state.behavior;
        frameRef.current.sequenceKey = frameSequenceKey;
        frameRef.current.cursor = 0;
        frameRef.current.at = now;
      } else if (now - frameRef.current.at >= frameDuration) {
        frameRef.current.cursor = (frameRef.current.cursor + 1) % behaviorFrames.length;
        frameRef.current.at = now;
      }

      const currentFrame = behaviorFrames[frameRef.current.cursor] ?? CAT_FRAMES.idle[0];
      const frameIndex = CAT_FRAME_INDEX[currentFrame as keyof typeof CAT_FRAME_INDEX] ?? CAT_FRAME_INDEX["67"];
      if (
        renderedFrameRef.current.sequenceKey !== frameSequenceKey ||
        renderedFrameRef.current.cursor !== frameRef.current.cursor ||
        renderedFrameRef.current.frame !== currentFrame
      ) {
        image.style.backgroundPosition = `${-frameIndex * preset.frameWidth}px bottom`;

        renderedFrameRef.current = {
          sequenceKey: frameSequenceKey,
          cursor: frameRef.current.cursor,
          frame: currentFrame
        };
      }

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
          <div
            className="board-cat-image"
            ref={imageRef}
            style={{
              backgroundImage: `url("${CAT_ATLAS}")`,
              backgroundSize: "calc(var(--board-cat-frame-w) * 12) var(--board-cat-frame-h)",
              backgroundPosition: "0px 0px"
            }}
          />
        </div>
      </div>
    </div>
  );
}
