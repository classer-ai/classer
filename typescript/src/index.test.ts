import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ClasserClient,
  ClasserError,
  classify,
  tag,
  type ClassifyRequest,
  type ClassifyResponse,
  type TagRequest,
  type TagResponse,
  type TagLabel,
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

    it("should use default base URL when none provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.classify({ text: "test", labels: ["a", "b"] });

      expect(mockFetch.mock.calls[0][0]).toBe("https://api.classer.ai/v1/classify");
    });
  });

  describe("classify", () => {
    it("should classify text successfully", async () => {
      const mockResponse: ClassifyResponse = {
        label: "technical_support",
        confidence: 0.94,
        tokens: 101,
        latency_ms: 45,
        cached: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.classify({
        text: "I can't log in",
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ label: "hot", confidence: 0.92, latency_ms: 38 }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.classify({
        text: "I need enterprise pricing for 500 users",
        labels: ["hot", "warm", "cold"],
        descriptions: {
          hot: "Ready to buy",
          warm: "Interested but exploring",
          cold: "Just browsing",
        },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.descriptions).toEqual({
        hot: "Ready to buy",
        warm: "Interested but exploring",
        cold: "Just browsing",
      });
    });

    it("should send classifier instead of labels when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ label: "billing", confidence: 0.88, latency_ms: 42 }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.classify({
        text: "test",
        classifier: "support-tickets@v2",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.classifier).toBe("support-tickets@v2");
      expect(body.labels).toBeUndefined();
      expect(result.label).toBe("billing");
    });

    it("should send model when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.classify({
        text: "test",
        labels: ["a", "b"],
        model: "openai/gpt-4o-mini",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe("openai/gpt-4o-mini");
    });

    it("should not send mode or threshold", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.classify({ text: "test", labels: ["a", "b"] });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.mode).toBeUndefined();
      expect(body.threshold).toBeUndefined();
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "labels cannot be empty" }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });

      await expect(
        client.classify({ text: "test", labels: [] })
      ).rejects.toThrow(ClasserError);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const client = new ClasserClient({ apiKey: "test-key" });

      await expect(
        client.classify({ text: "test", labels: ["a", "b"] })
      ).rejects.toThrow("Network error");
    });
  });

  describe("tag", () => {
    it("should tag text with multiple labels", async () => {
      const mockResponse: TagResponse = {
        labels: [
          { label: "technology", confidence: 0.65 },
          { label: "finance", confidence: 0.42 },
        ],
        tokens: 200,
        latency_ms: 52,
        cached: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.tag({
        text: "Tech stocks surge amid AI boom",
        labels: ["politics", "technology", "finance", "sports"],
        threshold: 0.3,
      });

      expect(result.labels).toHaveLength(2);
      expect(result.labels[0].label).toBe("technology");
      expect(result.labels[0].confidence).toBe(0.65);
      expect(result.labels[1].label).toBe("finance");
      expect(result.latency_ms).toBe(52);

      expect(mockFetch.mock.calls[0][0]).toBe("https://api.classer.ai/v1/tag");
    });

    it("should send threshold when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          labels: [{ label: "technology", confidence: 0.85 }],
          latency_ms: 48,
        }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.tag({
        text: "AI is transforming industries",
        labels: ["technology", "sports"],
        threshold: 0.5,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.threshold).toBe(0.5);
    });

    it("should omit threshold when not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          labels: [{ label: "a", confidence: 0.8 }],
          latency_ms: 30,
        }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.tag({ text: "test", labels: ["a", "b"] });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.threshold).toBeUndefined();
    });

    it("should not send mode in the request body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          labels: [{ label: "a", confidence: 0.8 }],
          latency_ms: 30,
        }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.tag({ text: "test", labels: ["a", "b"] });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.mode).toBeUndefined();
    });

    it("should return empty labels when nothing matches", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ labels: [], latency_ms: 35 }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.tag({
        text: "Random unrelated text",
        labels: ["sports", "politics"],
        threshold: 0.9,
      });

      expect(result.labels).toHaveLength(0);
    });

    it("should send classifier instead of labels when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          labels: [{ label: "urgent", confidence: 0.91 }],
          latency_ms: 55,
        }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      const result = await client.tag({
        text: "test",
        classifier: "priority-tagger",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.classifier).toBe("priority-tagger");
      expect(body.labels).toBeUndefined();
      expect(result.labels[0].label).toBe("urgent");
    });

    it("should send descriptions when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          labels: [{ label: "tech", confidence: 0.85 }],
          latency_ms: 40,
        }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.tag({
        text: "test",
        labels: ["tech", "sports"],
        descriptions: { tech: "Technology news", sports: "Sports news" },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.descriptions).toEqual({
        tech: "Technology news",
        sports: "Sports news",
      });
    });

    it("should send model when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          labels: [{ label: "a", confidence: 0.8 }],
          latency_ms: 30,
        }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });
      await client.tag({
        text: "test",
        labels: ["a", "b"],
        model: "openai/gpt-4o-mini",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe("openai/gpt-4o-mini");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ detail: "At least 2 labels required" }),
      });

      const client = new ClasserClient({ apiKey: "test-key" });

      try {
        await client.tag({ text: "test", labels: ["only_one"] });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ClasserError);
        expect((error as ClasserError).status).toBe(422);
        expect((error as ClasserError).detail).toBe("At least 2 labels required");
      }
    });

    it("should use correct endpoint with custom base URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          labels: [{ label: "a", confidence: 0.9 }],
          latency_ms: 30,
        }),
      });

      const client = new ClasserClient({ baseUrl: "https://custom.classer.ai" });
      await client.tag({ text: "test", labels: ["a", "b"] });

      expect(mockFetch.mock.calls[0][0]).toBe("https://custom.classer.ai/v1/tag");
    });
  });
});

describe("Default exports", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("classify function should work", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "greeting", confidence: 0.95, latency_ms: 30 }),
    });

    const result = await classify({
      text: "Hello there!",
      labels: ["greeting", "question", "complaint"],
    });

    expect(result.label).toBe("greeting");
  });

  it("tag function should work", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        labels: [
          { label: "news", confidence: 0.8 },
          { label: "technology", confidence: 0.6 },
        ],
        latency_ms: 45,
      }),
    });

    const result = await tag({
      text: "Apple announces new iPhone",
      labels: ["news", "technology", "sports"],
    });

    expect(result.labels).toHaveLength(2);
    expect(result.labels[0].label).toBe("news");
    expect(result.labels[0].confidence).toBe(0.8);
  });
});

describe("ClasserError", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should contain status and detail", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: "Validation error" }),
    });

    const client = new ClasserClient({ apiKey: "test-key" });

    try {
      await client.classify({ text: "", labels: ["a"] });
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
      json: async () => { throw new Error("Invalid JSON"); },
    });

    const client = new ClasserClient({ apiKey: "test-key" });

    try {
      await client.classify({ text: "test", labels: ["a", "b"] });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ClasserError);
      expect((error as ClasserError).status).toBe(500);
      expect((error as ClasserError).detail).toBeUndefined();
    }
  });

  it("should have name ClasserError", () => {
    const err = new ClasserError("test", 400, "detail");
    expect(err.name).toBe("ClasserError");
    expect(err.message).toBe("test");
    expect(err.status).toBe(400);
    expect(err.detail).toBe("detail");
  });

  it("should be an instance of Error", () => {
    const err = new ClasserError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBeUndefined();
    expect(err.detail).toBeUndefined();
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
    await client.classify({ text: "test", labels: ["a", "b"] });

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer my-secret-key");
  });

  it("should not include Authorization header when API key is empty", async () => {
    const originalEnv = process.env.CLASSER_API_KEY;
    delete process.env.CLASSER_API_KEY;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const client = new ClasserClient({ apiKey: "" });
    await client.classify({ text: "test", labels: ["a", "b"] });

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined();

    process.env.CLASSER_API_KEY = originalEnv;
  });

  it("should always include Content-Type header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const client = new ClasserClient();
    await client.classify({ text: "test", labels: ["a", "b"] });

    expect(mockFetch.mock.calls[0][1].headers["Content-Type"]).toBe("application/json");
  });
});

describe("Timeout", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should default to 30 seconds", () => {
    const client = new ClasserClient();
    // Verify the default timeout is used in abort signal
    mockFetch.mockImplementation((_url: string, init: RequestInit) => {
      expect(init.signal).toBeDefined();
      return Promise.resolve({
        ok: true,
        json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
      });
    });

    return client.classify({ text: "test", labels: ["a", "b"] });
  });

  it("should accept custom timeout in seconds", async () => {
    const client = new ClasserClient({ timeout: 5 });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const result = await client.classify({ text: "test", labels: ["a", "b"] });
    expect(result.label).toBe("a");
  });

  it("should throw ClasserError with seconds in message on timeout", async () => {
    const client = new ClasserClient({ timeout: 2 });

    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    try {
      await client.classify({ text: "test", labels: ["a", "b"] });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ClasserError);
      expect((error as ClasserError).message).toBe("Request timed out after 2s");
    }
  });
});

describe("Custom base URL", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should use custom base URL for classify", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: "a", confidence: 0.9, latency_ms: 30 }),
    });

    const client = new ClasserClient({ baseUrl: "https://custom.classer.ai" });
    await client.classify({ text: "test", labels: ["a", "b"] });

    expect(mockFetch.mock.calls[0][0]).toBe("https://custom.classer.ai/v1/classify");
  });

  it("should use custom base URL for tag", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        labels: [{ label: "a", confidence: 0.9 }],
        latency_ms: 30,
      }),
    });

    const client = new ClasserClient({ baseUrl: "https://custom.classer.ai" });
    await client.tag({ text: "test", labels: ["a", "b"] });

    expect(mockFetch.mock.calls[0][0]).toBe("https://custom.classer.ai/v1/tag");
  });
});
