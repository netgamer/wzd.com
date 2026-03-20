export interface WeatherDayPreview {
  date: string;
  label: string;
  weatherCode: number;
  weatherLabel: string;
  emoji: string;
  tempMax: number;
  tempMin: number;
}

export interface WeatherPreview {
  location: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    weatherCode: number;
    weatherLabel: string;
    emoji: string;
  };
  days: WeatherDayPreview[];
}

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

export const fetchWeatherPreview = async (params: {
  query?: string;
  lat?: number;
  lon?: number;
}): Promise<WeatherPreview> => {
  const endpoint = new URL(`${API_BASE}/api/weather`);
  if (params.query) endpoint.searchParams.set("query", params.query);
  if (typeof params.lat === "number") endpoint.searchParams.set("lat", String(params.lat));
  if (typeof params.lon === "number") endpoint.searchParams.set("lon", String(params.lon));

  const response = await fetch(endpoint.toString());
  if (!response.ok) {
    throw new Error(`weather request failed: ${response.status}`);
  }

  const data = (await response.json()) as { ok?: boolean; weather?: WeatherPreview; error?: string };
  if (!data.ok || !data.weather) {
    throw new Error(data.error || "weather response missing data");
  }

  return data.weather;
};
