// Types
export interface ClassifyRequest {
  /** Text to classify */
  text: string;
  /** List of possible labels (1-100) */
  labels?: string[];
  /** Saved classifier name or "name@vN" reference */
  classifier?: string;
  /** Maps label name to description for better accuracy */
  descriptions?: Record<string, string>;
  /** Model override */
  model?: string;
  /** Speed tier: "fast" (default, <200ms) or "standard" (<1s) */
  speed?: "fast" | "standard";
  /** Set to false to bypass cache. Default: true */
  cache?: boolean;
}

export interface ClassifyResponse {
  /** Selected label */
  label?: string;
  /** Confidence score */
  confidence?: number;
  /** Total tokens used */
  tokens: number;
  /** Processing time in milliseconds */
  latency_ms: number;
  /** Whether the response was served from cache */
  cached: boolean;
}

export interface TagRequest {
  /** Text to tag */
  text: string;
  /** List of possible labels (1-100) */
  labels?: string[];
  /** Saved classifier name or "name@vN" reference */
  classifier?: string;
  /** Maps label name to description for better accuracy */
  descriptions?: Record<string, string>;
  /** Model override */
  model?: string;
  /** Confidence threshold (0-1). Default: 0.3 */
  threshold?: number;
  /** Speed tier: "fast" (default, <200ms) or "standard" (<1s) */
  speed?: "fast" | "standard";
  /** Set to false to bypass cache. Default: true */
  cache?: boolean;
}

export interface TagLabel {
  label: string;
  confidence: number;
}

export interface TagResponse {
  /** Labels above threshold, each with label and confidence */
  labels: TagLabel[];
  /** Total tokens used */
  tokens: number;
  /** Processing time in milliseconds */
  latency_ms: number;
  /** Whether the response was served from cache */
  cached: boolean;
}

export interface ClasserConfig {
  /** API key for authentication. Optional for local development, required for production. */
  apiKey?: string;
  /** Base URL for the API. Defaults to https://api.classer.ai */
  baseUrl?: string;
  /** Request timeout in seconds. Default: 30 */
  timeout?: number;
}

class ClasserError extends Error {
  constructor(
    message: string,
    public status?: number,
    public detail?: string
  ) {
    super(message);
    this.name = "ClasserError";
  }
}

class ClasserClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: ClasserConfig = {}) {
    this.apiKey = config.apiKey || process.env.CLASSER_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.classer.ai";
    this.timeout = config.timeout ?? 30;
  }

  private async request<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey && this.apiKey.length > 0) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutMs = this.timeout * 1000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new ClasserError(`Request timed out after ${this.timeout}s`);
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new ClasserError(`Request failed: ${message}`);
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail: string | undefined;
      try {
        const errorData = await response.json();
        detail = typeof errorData === "object" && errorData !== null && "detail" in errorData
          ? String(errorData.detail)
          : undefined;
      } catch {
        // ignore parse errors
      }
      throw new ClasserError(
        `Request failed with status ${response.status}`,
        response.status,
        detail
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Classify text into one of the provided labels (single-label).
   *
   * @example
   * ```ts
   * const result = await classer.classify({
   *   text: "I can't log in",
   *   labels: ["billing", "technical_support", "sales"]
   * });
   * console.log(result.label); // "technical_support"
   * ```
   */
  async classify(request: ClassifyRequest): Promise<ClassifyResponse> {
    if (!request.labels && !request.classifier) {
      throw new ClasserError("Either 'labels' or 'classifier' must be provided");
    }
    return this.request<ClassifyResponse>("/v1/classify", request);
  }

  /**
   * Tag text with multiple labels that exceed a confidence threshold (multi-label).
   *
   * @example
   * ```ts
   * const result = await classer.tag({
   *   text: "Breaking: Tech stocks surge amid AI boom",
   *   labels: ["politics", "technology", "finance", "sports"],
   *   threshold: 0.3
   * });
   * for (const tag of result.labels) {
   *   console.log(`${tag.label}: ${tag.confidence}`);
   * }
   * ```
   */
  async tag(request: TagRequest): Promise<TagResponse> {
    if (!request.labels && !request.classifier) {
      throw new ClasserError("Either 'labels' or 'classifier' must be provided");
    }
    return this.request<TagResponse>("/v1/tag", request);
  }
}

// Lazy default instance
let defaultClient: ClasserClient | null = null;

function getDefaultClient(): ClasserClient {
  if (!defaultClient) {
    defaultClient = new ClasserClient();
  }
  return defaultClient;
}

// Export both the class and convenience functions
export { ClasserClient, ClasserError };

export const classify = (request: ClassifyRequest) => getDefaultClient().classify(request);
export const tag = (request: TagRequest) => getDefaultClient().tag(request);

// Default export for `import Classer from "classer"`
export default {
  ClasserClient,
  ClasserError,
  classify,
  tag,
};
