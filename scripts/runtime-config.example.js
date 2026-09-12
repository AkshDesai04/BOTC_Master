// Copy to runtime-config.js and provide an HTTPS endpoint that accepts the email envelope.
// Keep service credentials at the endpoint; never place secrets in browser-delivered files.
window.GRIMOIRE_RUNTIME_CONFIG = {
  emailEndpoint: "https://example.invalid/grimoire-email"
};
