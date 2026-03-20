export interface DeliveryCarrier {
  id: string;
  name: string;
  tel?: string;
}

export interface DeliveryTrackingProgress {
  time: string | null;
  status: {
    id: string;
    text: string;
  };
  location: {
    name: string;
  } | null;
  description: string | null;
}

export interface DeliveryTrackingPreview {
  carrier: DeliveryCarrier;
  from: {
    name: string;
    time: string | null;
  } | null;
  to: {
    name: string;
    time: string | null;
  } | null;
  state: {
    id: string;
    text: string;
  };
  progress: DeliveryTrackingProgress[];
}

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

export const fetchDeliveryCarriers = async (): Promise<DeliveryCarrier[]> => {
  const endpoint = `${API_BASE}/api/delivery?mode=carriers`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`delivery carriers request failed: ${response.status}`);
  }

  const data = (await response.json()) as { ok?: boolean; carriers?: DeliveryCarrier[]; error?: string };
  if (!data.ok || !data.carriers) {
    throw new Error(data.error || "carrier response missing data");
  }

  return data.carriers;
};

export const fetchDeliveryTracking = async (
  carrierId: string,
  trackingNumber: string
): Promise<DeliveryTrackingPreview> => {
  const endpoint =
    `${API_BASE}/api/delivery?mode=track&carrierId=${encodeURIComponent(carrierId)}` +
    `&trackingNumber=${encodeURIComponent(trackingNumber)}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`delivery tracking request failed: ${response.status}`);
  }

  const data = (await response.json()) as { ok?: boolean; tracking?: DeliveryTrackingPreview; error?: string };
  if (!data.ok || !data.tracking) {
    throw new Error(data.error || "tracking response missing data");
  }

  return data.tracking;
};
