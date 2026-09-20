module.exports = function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    ok: true,
    service: "padelstar-web",
    version: "0.9.2",
    timestamp: new Date().toISOString(),
  });
};
