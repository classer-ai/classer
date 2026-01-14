import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ClasserClient,
  ClasserError,
  classify,
  tag,
  match,
  score,
  type ClassifyRequest,
  type ClassifyResponse,
  type TagRequest,
  type TagResponse,
  type MatchRequest,
  type MatchResponse,
  type ScoreRequest,
  type ScoreResponse,
} from "./index";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ClasserClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use default base URL", () => {
      const client = new ClasserClient();
      expect(client).toBeDefined();
    });

    it("should accept custom config", () => {
      const client = new ClasserClient({
        apiKey: "test-key",
        baseUrl: "https://custom.api.com",
      });
      expect(client).toBeDefined();
    });

    it("should read API key from environment", () => {
      const originalEnv = process.env.CLASSER_API_KEY;
      process.env.CLASSER_API_KEY = "env-api-key";

      const client = new ClasserClient();
      expect(client).toBeDefined();

      process.env.CLASSER_API_KEY = originalEnv;
    });
  });

  describe("classify", () => {
    it("should classify text successfully", async () => {
      const mockResponse: ClassifyResponse = {
        label: "technical_support",
        confidence: 0.94,
        latency_ms: 45,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.classify({
        source: "I can't log in",
        labels: ["billing", "technical_support", "sales"],
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.classer.ai/v1/classify",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-key",
          },
        })
      );
    });

    it("should include descriptions when provided", async () => {
      const mockResponse: ClassifyResponse = {
        label: "hot",
        confidence: 0.92,
        latency_ms: 38,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const request: ClassifyRequest = {
        source: "I need enterprise pricing for 500 users",
        labels: ["hot", "warm", "cold"],
        descriptions: {
          hot: "Ready to buy",
          warm: "Interested but exploring",
          cold: "Just browsing",
        },
      };

      await client.classify(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.descriptions).toEqual(request.descriptions);
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "labels cannot be empty" }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });

      await expect(
        client.classify({
          source: "test",
          labels: [],
        })
      ).rejects.toThrow(ClasserError);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const client = new ClasserClient({ apiKey: "test-key" });

      await expect(
        client.classify({
          source: "test",
          labels: ["a", "b"],
        })
      ).rejects.toThrow("Network error");
    });
  });

  describe("tag", () => {
    it("should tag text with multiple labels", async () => {
      const mockResponse: TagResponse = {
        tags: ["technology", "finance"],
        confidences: [0.65, 0.42],
        latency_ms: 52,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.tag({
        source: "Tech stocks surge amid AI boom",
        labels: ["politics", "technology", "finance", "sports"],
        threshold: 0.3,
      });

      expect(result).toEqual(mockResponse);
      expect(result.tags).toContain("technology");
      expect(result.tags).toContain("finance");
    });

    it("should use default threshold when not provided", async () => {
      const mockResponse: TagResponse = {
        tags: ["technology"],
        confidences: [0.85],
        latency_ms: 48,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.tag({
        source: "AI is transforming industries",
        labels: ["technology", "sports"],
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.threshold).toBeUndefined(); // Server uses default
    });

    it("should return empty tags when nothing matches threshold", async () => {
      const mockResponse: TagResponse = {
        tags: [],
        confidences: [],
        latency_ms: 35,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.tag({
        source: "Random unrelated text",
        labels: ["sports", "politics"],
        threshold: 0.9,
      });

      expect(result.tags).toHaveLength(0);
    });
  });

  describe("match", () => {
    it("should return high score for relevant content", async () => {
      const mockResponse: MatchResponse = {
        score: 0.98,
        latency_ms: 42,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.match({
        source: "Our return policy allows refunds within 30 days.",
        query: "Can I get a refund?",
      });

      expect(result.score).toBeGreaterThan(0.9);
    });

    it("should return low score for irrelevant content", async () => {
      const mockResponse: MatchResponse = {
        score: 0.05,
        latency_ms: 38,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.match({
        source: "The weather is sunny today.",
        query: "How do I reset my password?",
      });

      expect(result.score).toBeLessThan(0.2);
    });

    it("should send correct request body", async () => {
      const mockResponse: MatchResponse = {
        score: 0.75,
        latency_ms: 40,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const request: MatchRequest = {
        source: "Document content here",
        query: "Search query",
      };

      await client.match(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.source).toBe(request.source);
      expect(body.query).toBe(request.query);
    });
  });

  describe("score", () => {
    it("should score text on urgency", async () => {
      const mockResponse: ScoreResponse = {
        score: 0.92,
        latency_ms: 35,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.score({
        source: "URGENT! System is down! Need immediate help!",
        attribute: "urgency",
      });

      expect(result.score).toBeGreaterThan(0.8);
    });

    it("should score text on toxicity", async () => {
      const mockResponse: ScoreResponse = {
        score: 0.15,
        latency_ms: 32,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.score({
        source: "Thank you for your help, I appreciate it!",
        attribute: "toxicity",
      });

      expect(result.score).toBeLessThan(0.3);
    });

    it("should include description when provided", async () => {
      const mockResponse: ScoreResponse = {
        score: 0.65,
        latency_ms: 40,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const request: ScoreRequest = {
        source: "This product is okay, nothing special.",
        attribute: "satisfaction",
        description: "Customer satisfaction level",
      };

      await client.score(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.description).toBe(request.description);
    });
  });
});

describe("Default exports", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("classify function should work", async () => {
    const mockResponse: ClassifyResponse = {
      label: "greeting",
      confidence: 0.95,
      latency_ms: 30,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await classify({
      source: "Hello there!",
      labels: ["greeting", "question", "complaint"],
    });

    expect(result.label).toBe("greeting");
  });

  it("tag function should work", async () => {
    const mockResponse: TagResponse = {
      tags: ["news", "technology"],
      confidences: [0.8, 0.6],
      latency_ms: 45,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await tag({
      source: "Apple announces new iPhone",
      labels: ["news", "technology", "sports"],
    });

    expect(result.tags).toContain("news");
  });

  it("match function should work", async () => {
    const mockResponse: MatchResponse = {
      score: 0.88,
      latency_ms: 38,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await match({
      source: "Python is a programming language",
      query: "What programming languages exist?",
    });

    expect(result.score).toBeGreaterThan(0.5);
  });

  it("score function should work", async () => {
    const mockResponse: ScoreResponse = {
      score: 0.25,
      latency_ms: 33,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await score({
      source: "The meeting is scheduled for next week",
      attribute: "urgency",
    });

    expect(result.score).toBeLessThan(0.5);
  });
});

describe("ClasserError", () => {
  it("should contain status and detail", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: "Validation error" }),
    });

    const client = new ClasserClient({ apiKey: "test-key" });

    try {
      await client.classify({
        source: "",
        labels: ["a"],
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ClasserError);
      expect((error as ClasserError).status).toBe(422);
      expect((error as ClasserError).detail).toBe("Validation error");
    }
  });

  it("should handle non-JSON error responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    const client = new ClasserClient({ apiKey: "test-key" });

    try {
      await client.classify({
        source: "test",
        labels: ["a", "b"],
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ClasserError);
      expect((error as ClasserError).status).toBe(500);
      expect((error as ClasserError).detail).toBeUndefined();
    }
  });
});

describe("Request headers", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should include Authorization header when API key is set", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const client = new ClasserClient({ apiKey: "my-secret-key" });
    await client.classify({ source: "test", labels: ["a", "b"] });

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers.Authorization).toBe("Bearer my-secret-key");
  });

  it("should not include Authorization header when API key is empty", async () => {
    const originalEnv = process.env.CLASSER_API_KEY;
    delete process.env.CLASSER_API_KEY;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const client = new ClasserClient({ apiKey: "" });
    await client.classify({ source: "test", labels: ["a", "b"] });

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers.Authorization).toBeUndefined();

    process.env.CLASSER_API_KEY = originalEnv;
  });

  it("should always include Content-Type header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const client = new ClasserClient();
    await client.classify({ source: "test", labels: ["a", "b"] });

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers["Content-Type"]).toBe("application/json");
  });
});

describe("Custom base URL", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should use custom base URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const client = new ClasserClient({
      baseUrl: "https://custom.classer.ai",
    });
    await client.classify({ source: "test", labels: ["a", "b"] });

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toBe("https://custom.classer.ai/v1/classify");
  });

  it("should read base URL from environment", async () => {
    const originalEnv = process.env.CLASSER_BASE_URL;
    process.env.CLASSER_BASE_URL = "https://env.classer.ai";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const client = new ClasserClient();
    await client.classify({ source: "test", labels: ["a", "b"] });

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toBe("https://env.classer.ai/v1/classify");

    process.env.CLASSER_BASE_URL = originalEnv;
  });
});
