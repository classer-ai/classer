"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ClasserClient: () => ClasserClient,
  ClasserError: () => ClasserError,
  classify: () => classify,
  default: () => index_default,
  match: () => match,
  score: () => score,
  tag: () => tag
});
module.exports = __toCommonJS(index_exports);
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
   * Classify text into one of the provided labels.
   *
   * @example
   * ```ts
   * const result = await classer.classify({
   *   source: "I can't log in",
   *   labels: ["billing", "technical_support", "sales"]
   * });
   * console.log(result.label); // "technical_support"
   * ```
   */
  async classify(request) {
    return this.request("/v1/classify", request);
  }
  /**
   * Tag text with multiple labels above a confidence threshold.
   *
   * @example
   * ```ts
   * const result = await classer.tag({
   *   source: "Breaking: Tech stocks surge amid AI boom",
   *   labels: ["politics", "technology", "finance", "sports"],
   *   threshold: 0.3
   * });
   * console.log(result.tags); // ["technology", "finance"]
   * ```
   */
  async tag(request) {
    return this.request("/v1/tag", request);
  }
  /**
   * Calculate semantic similarity between source and query (for RAG retrieval).
   *
   * @example
   * ```ts
   * const result = await classer.match({
   *   source: "Our return policy allows refunds within 30 days.",
   *   query: "Can I get a refund?"
   * });
   * console.log(result.score); // 0.95
   * ```
   */
  async match(request) {
    return this.request("/v1/match", request);
  }
  /**
   * Score text on a specific attribute (0-1 scale).
   *
   * @example
   * ```ts
   * const result = await classer.score({
   *   source: "This is URGENT! We need help immediately!",
   *   attribute: "urgency"
   * });
   * console.log(result.score); // 0.92
   * ```
   */
  async score(request) {
    return this.request("/v1/score", request);
  }
};
var defaultClient = new ClasserClient();
var classify = (request) => defaultClient.classify(request);
var tag = (request) => defaultClient.tag(request);
var match = (request) => defaultClient.match(request);
var score = (request) => defaultClient.score(request);
var index_default = {
  ClasserClient,
  ClasserError,
  classify: (request) => defaultClient.classify(request),
  tag: (request) => defaultClient.tag(request),
  match: (request) => defaultClient.match(request),
  score: (request) => defaultClient.score(request)
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ClasserClient,
  ClasserError,
  classify,
  match,
  score,
  tag
});
