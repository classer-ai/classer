interface Usage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}
interface ClassifyRequest {
    /** Text to classify */
    source: string;
    /** List of possible labels (1-26) */
    labels: string[];
    /** Maps label name to description for better accuracy. E.g., { "hot": "Ready to buy, asking for pricing" } */
    descriptions?: Record<string, string>;
    /** Model override */
    model?: string;
}
interface ClassifyResponse {
    label: string;
    confidence: number;
    latency_ms: number;
    usage?: Usage;
}
interface TagRequest {
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
interface TagResponse {
    tags: string[];
    confidences: number[];
    latency_ms: number;
    usage?: Usage;
}
interface MatchRequest {
    source: string;
    query: string;
    model?: string;
}
interface MatchResponse {
    score: number;
    latency_ms: number;
    usage?: Usage;
}
interface ScoreRequest {
    source: string;
    attribute: string;
    description?: string;
    model?: string;
}
interface ScoreResponse {
    score: number;
    latency_ms: number;
    usage?: Usage;
}
interface ClasserConfig {
    /** API key for authentication. Optional for local development, required for production. */
    apiKey?: string;
    /** Base URL for the API. Defaults to https://api.classer.ai */
    baseUrl?: string;
}
declare class ClasserError extends Error {
    status?: number | undefined;
    detail?: string | undefined;
    constructor(message: string, status?: number | undefined, detail?: string | undefined);
}
declare class ClasserClient {
    private apiKey;
    private baseUrl;
    constructor(config?: ClasserConfig);
    private request;
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
    classify(request: ClassifyRequest): Promise<ClassifyResponse>;
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
    tag(request: TagRequest): Promise<TagResponse>;
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
    match(request: MatchRequest): Promise<MatchResponse>;
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
    score(request: ScoreRequest): Promise<ScoreResponse>;
}

declare const classify: (request: ClassifyRequest) => Promise<ClassifyResponse>;
declare const tag: (request: TagRequest) => Promise<TagResponse>;
declare const match: (request: MatchRequest) => Promise<MatchResponse>;
declare const score: (request: ScoreRequest) => Promise<ScoreResponse>;
declare const _default: {
    ClasserClient: typeof ClasserClient;
    ClasserError: typeof ClasserError;
    classify: (request: ClassifyRequest) => Promise<ClassifyResponse>;
    tag: (request: TagRequest) => Promise<TagResponse>;
    match: (request: MatchRequest) => Promise<MatchResponse>;
    score: (request: ScoreRequest) => Promise<ScoreResponse>;
};

export { ClasserClient, type ClasserConfig, ClasserError, type ClassifyRequest, type ClassifyResponse, type MatchRequest, type MatchResponse, type ScoreRequest, type ScoreResponse, type TagRequest, type TagResponse, type Usage, classify, _default as default, match, score, tag };
