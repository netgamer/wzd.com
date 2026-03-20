export const onRequestGet = async ({ request }) => {
  try {
    const requestUrl = new URL(request.url);
    const mode = requestUrl.searchParams.get("mode")?.trim() || "track";

    if (mode === "carriers") {
      const carrierResponse = await fetch("https://apis.tracker.delivery/carriers", {
        headers: {
          "user-agent": "WZD Delivery Widget/1.0"
        }
      });

      if (!carrierResponse.ok) {
        return Response.json({ ok: false, error: `carrier request failed: ${carrierResponse.status}` }, { status: 502 });
      }

      const carriers = await carrierResponse.json();
      return Response.json({ ok: true, carriers });
    }

    const carrierId = requestUrl.searchParams.get("carrierId")?.trim() || "";
    const trackingNumber = requestUrl.searchParams.get("trackingNumber")?.trim() || "";

    if (!carrierId || !trackingNumber) {
      return Response.json({ ok: false, error: "carrierId and trackingNumber are required" }, { status: 400 });
    }

    const endpoint = `https://apis.tracker.delivery/carriers/${encodeURIComponent(carrierId)}/tracks/${encodeURIComponent(
      trackingNumber
    )}`;
    const trackingResponse = await fetch(endpoint, {
      headers: {
        "user-agent": "WZD Delivery Widget/1.0"
      }
    });

    if (!trackingResponse.ok) {
      return Response.json({ ok: false, error: `tracking request failed: ${trackingResponse.status}` }, { status: 502 });
    }

    const data = await trackingResponse.json();
    return Response.json({ ok: true, tracking: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
};
