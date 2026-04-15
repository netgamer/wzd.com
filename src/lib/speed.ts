export type InternetSpeedPreview = {
  latencyMs: number | null;
  downloadMbps: number | null;
  effectiveType: string | null;
  downlinkMbps: number | null;
  measuredAt: string;
  error?: string;
};

type NetworkInformationLike = {
  effectiveType?: string;
  downlink?: number;
};

const SPEED_SAMPLE_URL = "/companions/original-frames/index.png";

const nowIso = () => new Date().toISOString();

const roundMetric = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const readConnection = (): NetworkInformationLike | null => {
  if (typeof navigator === "undefined") {
    return null;
  }

  const candidate = (
    navigator as Navigator & {
      connection?: NetworkInformationLike;
      mozConnection?: NetworkInformationLike;
      webkitConnection?: NetworkInformationLike;
    }
  ).connection ??
    (navigator as Navigator & { mozConnection?: NetworkInformationLike }).mozConnection ??
    (navigator as Navigator & { webkitConnection?: NetworkInformationLike }).webkitConnection ??
    null;

  return candidate;
};

const measureLatency = async () => {
  const startedAt = performance.now();
  const response = await fetch(`${SPEED_SAMPLE_URL}?ping=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`ping failed: ${response.status}`);
  }

  await response.arrayBuffer();
  return roundMetric(performance.now() - startedAt, 0);
};

const measureDownload = async () => {
  const startedAt = performance.now();
  const response = await fetch(`${SPEED_SAMPLE_URL}?download=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const elapsedMs = performance.now() - startedAt;

  if (elapsedMs <= 0 || blob.size <= 0) {
    return null;
  }

  const bitsLoaded = blob.size * 8;
  const megabitsPerSecond = bitsLoaded / (elapsedMs / 1000) / 1_000_000;
  return roundMetric(megabitsPerSecond, 1);
};

export const measureInternetSpeed = async (): Promise<InternetSpeedPreview> => {
  const connection = readConnection();

  try {
    const [latencyMs, downloadMbps] = await Promise.all([measureLatency(), measureDownload()]);

    return {
      latencyMs,
      downloadMbps,
      effectiveType: connection?.effectiveType ?? null,
      downlinkMbps: typeof connection?.downlink === "number" ? roundMetric(connection.downlink, 1) : null,
      measuredAt: nowIso()
    };
  } catch (error) {
    return {
      latencyMs: null,
      downloadMbps: null,
      effectiveType: connection?.effectiveType ?? null,
      downlinkMbps: typeof connection?.downlink === "number" ? roundMetric(connection.downlink, 1) : null,
      measuredAt: nowIso(),
      error: error instanceof Error ? error.message : "speed test failed"
    };
  }
};
