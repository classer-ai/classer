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
  /** List of possible labels (2-26) */
  labels?: string[];
  /** Saved classifier name or "name@vN" reference */
  classifier?: string;
  /** Maps label name to description for better accuracy */
  descriptions?: Record<string, string>;
  /** Model override */
  model?: string;
  /** Confidence threshold (0-1). Default: 0.3 */
  threshold?: number;
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

  constructor(config: ClasserConfig = {}) {
    this.apiKey = config.apiKey || process.env.CLASSER_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.classer.ai";
  }

  private async request<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey && this.apiKey.length > 0) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let detail: string | undefined;
      try {
        const errorData = await response.json();
        detail = errorData.detail;
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
    return this.request<TagResponse>("/v1/tag", request);
  }
}

// Default instance
const defaultClient = new ClasserClient();

// Export both the class and convenience functions
export { ClasserClient, ClasserError };

export const classify = (request: ClassifyRequest) => defaultClient.classify(request);
export const tag = (request: TagRequest) => defaultClient.tag(request);

// Default export for `import Classer from "classer"`
export default {
  ClasserClient,
  ClasserError,
  classify: (request: ClassifyRequest) => defaultClient.classify(request),
  tag: (request: TagRequest) => defaultClient.tag(request),
};
