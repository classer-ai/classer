// Types
export interface ClassifyRequest {
  /** Text to classify. Optional if image or file is provided. */
  text?: string;
  /** List of possible labels (1-200) */
  labels?: string[];
  /** Saved classifier name or "name@vN" reference */
  classifier?: string;
  /** Maps label name to description for better accuracy */
  descriptions?: Record<string, string>;
  /** Priority tier: "standard" (default, <1s) or "fast" (<200ms) */
  priority?: "fast" | "standard";
  /** Set to false to bypass cache. Default: true */
  cache?: boolean;
  /** Image URL or base64 string (or array). Max 20 images. */
  image?: string | string[];
  /** PDF or DOCX file — URL or base64 string. Max 20 pages. */
  file?: string;
}

export interface ClassifyResponse {
  /** Selected label */
  label?: string;
  /** Confidence score */
  confidence?: number;
  /** Total tokens used */
  tokens: number;
  /** Visual (image) tokens used. Present when image or file is provided. */
  visual_tokens?: number;
  /** Processing time in milliseconds */
  latency_ms: number;
  /** Whether the response was served from cache */
  cached: boolean;
}

export interface TagRequest {
  /** Text to tag. Optional if image or file is provided. */
  text?: string;
  /** List of possible labels (1-200) */
  labels?: string[];
  /** Saved classifier name or "name@vN" reference */
  classifier?: string;
  /** Maps label name to description for better accuracy */
  descriptions?: Record<string, string>;
  /** Confidence threshold (0-1). Default: 0.5 */
  threshold?: number;
  /** Priority tier: "standard" (default, <1s) or "fast" (<200ms) */
  priority?: "fast" | "standard";
  /** Set to false to bypass cache. Default: true */
  cache?: boolean;
  /** Image URL or base64 string (or array). Max 20 images. */
  image?: string | string[];
  /** PDF or DOCX file — URL or base64 string. Max 20 pages. */
  file?: string;
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
  /** Visual (image) tokens used. Present when image or file is provided. */
  visual_tokens?: number;
  /** Processing time in milliseconds */
  latency_ms: number;
  /** Whether the response was served from cache */
  cached: boolean;
}

export interface BatchClassifyRequest {
  /** List of texts to classify (1-1000) */
  texts: string[];
  /** List of possible labels (1-200) */
  labels?: string[];
  /** Saved classifier name or "name@vN" reference */
  classifier?: string;
  /** Maps label name to description for better accuracy */
  descriptions?: Record<string, string>;
  /** Set to false to bypass cache. Default: true */
  cache?: boolean;
  /** Shared image for all texts — URL or base64 string (or array). Max 20 images. */
  image?: string | string[];
  /** Shared PDF or DOCX file — URL or base64 string. Max 20 pages. */
  file?: string;
}

export interface BatchClassifyResult {
  label?: string;
  confidence?: number;
  tokens: number;
  visual_tokens?: number;
  error?: string;
  cached: boolean;
}

export interface BatchClassifyResponse {
  results: BatchClassifyResult[];
  total_tokens: number;
  latency_ms: number;
}

export interface BatchTagRequest {
  /** List of texts to tag (1-1000) */
  texts: string[];
  /** List of possible labels (1-200) */
  labels?: string[];
  /** Saved classifier name or "name@vN" reference */
  classifier?: string;
  /** Maps label name to description for better accuracy */
  descriptions?: Record<string, string>;
  /** Confidence threshold (0-1). Default: 0.5 */
  threshold?: number;
  /** Set to false to bypass cache. Default: true */
  cache?: boolean;
  /** Shared image for all texts — URL or base64 string (or array). Max 20 images. */
  image?: string | string[];
  /** Shared PDF or DOCX file — URL or base64 string. Max 20 pages. */
  file?: string;
}

export interface BatchTagResult {
  labels?: TagLabel[];
  tokens: number;
  visual_tokens?: number;
  error?: string;
  cached: boolean;
}

export interface BatchTagResponse {
  results: BatchTagResult[];
  total_tokens: number;
  latency_ms: number;
}

export interface ClasserConfig {
  /** API key for authentication. Optional for local development, required for production. */
  apiKey?: string;
  /** Request timeout in seconds for classify/tag. Default: 30 */
  timeout?: number;
  /** Request timeout in seconds for batch methods. Default: 600 (10 min) */
  batchTimeout?: number;
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
  private timeout: number;
  private batchTimeout: number;
  private static readonly BASE_URL = "https://api.classer.ai";

  constructor(config: ClasserConfig = {}) {
    this.apiKey = config.apiKey || process.env.CLASSER_API_KEY || "";
    this.timeout = config.timeout ?? 30;
    this.batchTimeout = config.batchTimeout ?? 600;
  }

  private async request<T>(endpoint: string, body: unknown, timeoutSeconds?: number): Promise<T> {
    const url = `${ClasserClient.BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey && this.apiKey.length > 0) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const effectiveTimeout = timeoutSeconds ?? this.timeout;
    const controller = new AbortController();
    const timeoutMs = effectiveTimeout * 1000;
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
        detail = typeof errorData === "object" && errorData !== null && "detail" in errorData && errorData.detail != null
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
   *   threshold: 0.5
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

  /**
   * Classify multiple texts in a single request (single-label).
   *
   * @example
   * ```ts
   * const result = await classer.classifyBatch({
   *   texts: ["I can't log in", "What's the pricing?"],
   *   labels: ["billing", "technical", "sales"]
   * });
   * for (const r of result.results) {
   *   console.log(`${r.label}: ${r.confidence}`);
   * }
   * ```
   */
  async classifyBatch(request: BatchClassifyRequest): Promise<BatchClassifyResponse> {
    if (!request.labels && !request.classifier) {
      throw new ClasserError("Either 'labels' or 'classifier' must be provided");
    }
    const data = await this.request<{ results: any[]; total_tokens: number; latency_ms: number }>("/v1/classify/batch", request, this.batchTimeout);
    return {
      results: (data.results || []).map((item) => ({
        label: item.label,
        confidence: item.confidence,
        tokens: item.tokens ?? 0,
        visual_tokens: item.visual_tokens,
        error: item.error,
        cached: item.cache?.hit ?? false,
      })),
      total_tokens: data.total_tokens ?? 0,
      latency_ms: data.latency_ms ?? 0,
    };
  }

  /**
   * Tag multiple texts in a single request (multi-label).
   *
   * @example
   * ```ts
   * const result = await classer.tagBatch({
   *   texts: ["Tech stocks surge", "Election results"],
   *   labels: ["politics", "technology", "finance"],
   *   threshold: 0.5
   * });
   * for (const r of result.results) {
   *   console.log(r.labels);
   * }
   * ```
   */
  async tagBatch(request: BatchTagRequest): Promise<BatchTagResponse> {
    if (!request.labels && !request.classifier) {
      throw new ClasserError("Either 'labels' or 'classifier' must be provided");
    }
    const data = await this.request<{ results: any[]; total_tokens: number; latency_ms: number }>("/v1/tag/batch", request, this.batchTimeout);
    return {
      results: (data.results || []).map((item) => ({
        labels: item.labels,
        tokens: item.tokens ?? 0,
        visual_tokens: item.visual_tokens,
        error: item.error,
        cached: item.cache?.hit ?? false,
      })),
      total_tokens: data.total_tokens ?? 0,
      latency_ms: data.latency_ms ?? 0,
    };
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
export const classifyBatch = (request: BatchClassifyRequest) => getDefaultClient().classifyBatch(request);
export const tagBatch = (request: BatchTagRequest) => getDefaultClient().tagBatch(request);

// Default export for `import Classer from "classer"`
export default {
  ClasserClient,
  ClasserError,
  classify,
  classifyBatch,
  tag,
  tagBatch,
};
