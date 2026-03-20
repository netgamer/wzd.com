const WEATHER_CODE_MAP = {
  0: "맑음",
  1: "대체로 맑음",
  2: "부분적으로 흐림",
  3: "흐림",
  45: "안개",
  48: "서리 안개",
  51: "이슬비",
  53: "약한 비",
  55: "강한 비",
  61: "비",
  63: "비",
  65: "강한 비",
  71: "눈",
  73: "눈",
  75: "강한 눈",
  80: "소나기",
  81: "강한 소나기",
  82: "폭우",
  95: "뇌우"
};

const WEATHER_EMOJI_MAP = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌧️",
  55: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "❄️",
  80: "🌦️",
  81: "🌧️",
  82: "⛈️",
  95: "⛈️"
};

const getWeatherLabel = (code) => WEATHER_CODE_MAP[code] || "날씨 정보 없음";
const getWeatherEmoji = (code) => WEATHER_EMOJI_MAP[code] || "🌤️";

export const onRequestGet = async ({ request }) => {
  try {
    const requestUrl = new URL(request.url);
    const query = requestUrl.searchParams.get("query")?.trim() || "";
    const lat = Number(requestUrl.searchParams.get("lat"));
    const lon = Number(requestUrl.searchParams.get("lon"));

    let latitude = Number.isFinite(lat) ? lat : null;
    let longitude = Number.isFinite(lon) ? lon : null;
    let resolvedName = query || "현재 위치";

    if (latitude === null || longitude === null) {
      const geocodeQuery = query || "서울";
      const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geoUrl.searchParams.set("name", geocodeQuery);
      geoUrl.searchParams.set("count", "1");
      geoUrl.searchParams.set("language", "ko");
      geoUrl.searchParams.set("format", "json");

      const geoResponse = await fetch(geoUrl.toString(), {
        headers: {
          "user-agent": "WZD Weather Widget/1.0"
        }
      });

      if (!geoResponse.ok) {
        return Response.json({ ok: false, error: `geocoding request failed: ${geoResponse.status}` }, { status: 502 });
      }

      const geoData = await geoResponse.json();
      const firstResult = geoData?.results?.[0];
      if (!firstResult) {
        return Response.json({ ok: false, error: "location not found" }, { status: 404 });
      }

      latitude = firstResult.latitude;
      longitude = firstResult.longitude;
      resolvedName =
        firstResult.name +
        (firstResult.admin1 ? ` ${firstResult.admin1}` : "") +
        (firstResult.country ? `, ${firstResult.country}` : "");
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(latitude));
    forecastUrl.searchParams.set("longitude", String(longitude));
    forecastUrl.searchParams.set("timezone", "Asia/Seoul");
    forecastUrl.searchParams.set("current", "temperature_2m,weather_code");
    forecastUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
    forecastUrl.searchParams.set("forecast_days", "4");

    const forecastResponse = await fetch(forecastUrl.toString(), {
      headers: {
        "user-agent": "WZD Weather Widget/1.0"
      }
    });

    if (!forecastResponse.ok) {
      return Response.json(
        { ok: false, error: `forecast request failed: ${forecastResponse.status}` },
        { status: 502 }
      );
    }

    const forecast = await forecastResponse.json();
    const currentCode = forecast?.current?.weather_code ?? 0;
    const days = (forecast?.daily?.time || []).map((date, index) => ({
      date,
      label: index === 0 ? "오늘" : index === 1 ? "내일" : new Date(date).toLocaleDateString("ko-KR", { weekday: "short" }),
      weatherCode: forecast.daily.weather_code?.[index] ?? 0,
      weatherLabel: getWeatherLabel(forecast.daily.weather_code?.[index] ?? 0),
      emoji: getWeatherEmoji(forecast.daily.weather_code?.[index] ?? 0),
      tempMax: Math.round(forecast.daily.temperature_2m_max?.[index] ?? 0),
      tempMin: Math.round(forecast.daily.temperature_2m_min?.[index] ?? 0)
    }));

    return Response.json({
      ok: true,
      weather: {
        location: resolvedName,
        latitude,
        longitude,
        current: {
          temperature: Math.round(forecast?.current?.temperature_2m ?? 0),
          weatherCode: currentCode,
          weatherLabel: getWeatherLabel(currentCode),
          emoji: getWeatherEmoji(currentCode)
        },
        days
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
};
