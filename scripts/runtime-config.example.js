// Copy to runtime-config.js for local testing, or let Pages deploy generate it.
// Never commit real secrets in runtime-config.js.
window.ROSTER_DISPATCH_CONFIG = {
  owner: "AkshDesai04",
  repo: "BOTC_Master",
  // Fine-grained PAT that can only create repository_dispatch on this repo.
  token: "",
  // Google AI Studio / Gemini API key (repository secret: GEMINI_KEY).
  geminiApiKey: ""
};
