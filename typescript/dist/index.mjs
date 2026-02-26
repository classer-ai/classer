// src/index.ts
var ClasserError = class extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.name = "ClasserError";
  }
};
var ClasserClient = class {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.CLASSER_API_KEY || "";
    this.baseUrl = config.baseUrl || process.env.CLASSER_BASE_URL || "https://api.classer.ai";
  }
  async request(endpoint, body) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.apiKey && this.apiKey.length > 0) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      let detail;
      try {
        const errorData = await response.json();
        detail = errorData.detail;
      } catch {
      }
      throw new ClasserError(
        `Request failed with status ${response.status}`,
        response.status,
        detail
      );
    }
    return response.json();
  }
  /**
   * Classify text into one or more of the provided labels.
   *
   * @example
   * ```ts
   * // Single-label classification (default)
   * const result = await classer.classify({
   *   text: "I can't log in",
   *   labels: ["billing", "technical_support", "sales"]
   * });
   * console.log(result.label); // "technical_support"
   *
   * // Using a saved classifier
   * const result = await classer.classify({
   *   text: "I can't log in",
   *   classifier: "support-tickets"
   * });
   * console.log(result.label); // "technical_support"
   *
   * // Multi-label classification
   * const result = await classer.classify({
   *   text: "Breaking: Tech stocks surge amid AI boom",
   *   labels: ["politics", "technology", "finance", "sports"],
   *   mode: "multi",
   *   threshold: 0.3
   * });
   * console.log(result.labels); // ["technology", "finance"]
   * ```
   */
  async classify(request) {
    return this.request("/v1/classify", request);
  }
};
var defaultClient = new ClasserClient();
var classify = (request) => defaultClient.classify(request);
var index_default = {
  ClasserClient,
  ClasserError,
  classify: (request) => defaultClient.classify(request)
};
export {
  ClasserClient,
  ClasserError,
  classify,
  index_default as default
};
