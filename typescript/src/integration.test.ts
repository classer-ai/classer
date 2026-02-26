/**
 * Integration tests against api.classer.ai
 * Run with: npx vitest run integration.test.ts
 */
import { describe, it, expect } from "vitest";
import { ClasserClient } from "./index";

const client = new ClasserClient({
  baseUrl: "https://api.classer.ai",
});

describe("Integration tests against api.classer.ai", () => {
  describe("classify endpoint", () => {
    it("should classify support ticket", async () => {
      const result = await client.classify({
        text: "I can't log into my account, password reset not working",
        labels: ["billing", "technical_support", "sales", "spam"],
      });

      console.log("Classify result:", result);

      expect(result.label).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.latency_ms).toBeGreaterThan(0);
      expect(["billing", "technical_support", "sales", "spam"]).toContain(result.label);
    }, 30000);

    it("should classify with descriptions", async () => {
      const result = await client.classify({
        text: "I want to upgrade to enterprise plan for 500 users",
        labels: ["hot", "warm", "cold"],
        descriptions: {
          hot: "Ready to buy, asking for pricing or contracts",
          warm: "Interested but still exploring options",
          cold: "Just browsing, no clear buying intent",
        },
      });

      console.log("Classify with descriptions result:", result);

      expect(result.label).toBeDefined();
      expect(["hot", "warm", "cold"]).toContain(result.label);
    }, 30000);

    it("should handle single label (detection mode)", async () => {
      const result = await client.classify({
        text: "Buy cheap viagra now! Click here!",
        labels: ["spam"],
      });

      console.log("Detection mode result:", result);

      expect(result.label).toBe("spam");
      expect(result.confidence).toBeGreaterThan(0);
    }, 30000);
  });

  describe("tag endpoint", () => {
    it("should tag news article with multiple labels", async () => {
      const result = await client.tag({
        text: "Apple stock surges as new AI-powered iPhone breaks sales records",
        labels: ["politics", "technology", "finance", "sports", "entertainment"],
        threshold: 0.2,
      });

      console.log("Tag result:", result);

      expect(result.labels).toBeDefined();
      expect(Array.isArray(result.labels)).toBe(true);
      expect(result.latency_ms).toBeGreaterThan(0);

      for (const t of result.labels) {
        expect(t.label).toBeDefined();
        expect(t.confidence).toBeGreaterThan(0);
        expect(t.confidence).toBeLessThanOrEqual(1);
      }
    }, 30000);

    it("should return empty labels for unrelated content with high threshold", async () => {
      const result = await client.tag({
        text: "The quick brown fox jumps over the lazy dog",
        labels: ["urgent", "critical", "emergency"],
        threshold: 0.9,
      });

      console.log("High threshold tag result:", result);

      expect(result.labels).toBeDefined();
      expect(Array.isArray(result.labels)).toBe(true);
    }, 30000);
  });

  describe("error handling", () => {
    it("should handle empty labels error", async () => {
      await expect(
        client.classify({
          text: "test",
          labels: [],
        })
      ).rejects.toThrow();
    }, 30000);

    it("should handle empty text error", async () => {
      await expect(
        client.classify({
          text: "",
          labels: ["a", "b"],
        })
      ).rejects.toThrow();
    }, 30000);
  });
});
