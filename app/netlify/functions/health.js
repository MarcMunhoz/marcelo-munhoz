export const handler = async () => ({
  statusCode: 200,
  headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  body: "OK",
});
