// Mock minimal de next/server (non résolvable en ESM sous `node --test`).
// NextResponse.json(data, init) → vraie Response Web, suffisant pour la route.
export const NextResponse = {
  json(data, init) {
    return new Response(JSON.stringify(data), {
      status: init?.status || 200,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
    });
  },
};
