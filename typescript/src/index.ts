// Types
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ClassifyRequest {
  /** Text to classify */
  source: string;
  /** List of possible labels (1-26) */
  labels: string[];
  /** Maps label name to description for better accuracy. E.g., { "hot": "Ready to buy, asking for pricing" } */
  descriptions?: Record<string, string>;
  /** Model override */
  model?: string;
}

export interface ClassifyResponse {
  label: string;
  confidence: number;
  latency_ms: number;
  usage?: Usage;
}

export interface TagRequest {
  /** Text to tag */
  source: string;
  /** List of possible labels (2-26) */
  labels: string[];
  /** Maps label name to description for better accuracy. E.g., { "urgent": "Needs immediate attention" } */
  descriptions?: Record<string, string>;
  /** Minimum confidence threshold (0-1). Default: 0.3 */
  threshold?: number;
  /** Model override */
  model?: string;
}

export interface TagResponse {
  tags: string[];
  confidences: number[];
  latency_ms: number;
  usage?: Usage;
}

export interface MatchRequest {
  source: string;
  query: string;
  model?: string;
}

export interface MatchResponse {
  score: number;
  latency_ms: number;
  usage?: Usage;
}

export interface ScoreRequest {
  source: string;
  attribute: string;
  description?: string;
  model?: string;
}

export interface ScoreResponse {
  score: number;
  latency_ms: number;
  usage?: Usage;
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
    this.baseUrl = config.baseUrl || process.env.CLASSER_BASE_URL || "https://api.classer.ai";
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
  async classify(request: ClassifyRequest): Promise<ClassifyResponse> {
    return this.request<ClassifyResponse>("/v1/classify", request);
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
  async tag(request: TagRequest): Promise<TagResponse> {
    return this.request<TagResponse>("/v1/tag", request);
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
  async match(request: MatchRequest): Promise<MatchResponse> {
    return this.request<MatchResponse>("/v1/match", request);
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
  async score(request: ScoreRequest): Promise<ScoreResponse> {
    return this.request<ScoreResponse>("/v1/score", request);
  }
}

// Default instance
const defaultClient = new ClasserClient();

// Export both the class and convenience functions
export { ClasserClient, ClasserError };

export const classify = (request: ClassifyRequest) => defaultClient.classify(request);
export const tag = (request: TagRequest) => defaultClient.tag(request);
export const match = (request: MatchRequest) => defaultClient.match(request);
export const score = (request: ScoreRequest) => defaultClient.score(request);

// Default export for `import Classer from "classer"`
export default {
  ClasserClient,
  ClasserError,
  classify: (request: ClassifyRequest) => defaultClient.classify(request),
  tag: (request: TagRequest) => defaultClient.tag(request),
  match: (request: MatchRequest) => defaultClient.match(request),
  score: (request: ScoreRequest) => defaultClient.score(request),
};
