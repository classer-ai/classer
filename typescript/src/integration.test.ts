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
        source: "I can't log into my account, password reset not working",
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
        source: "I want to upgrade to enterprise plan for 500 users",
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
        source: "Buy cheap viagra now! Click here!",
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
        source: "Apple stock surges as new AI-powered iPhone breaks sales records",
        labels: ["politics", "technology", "finance", "sports", "entertainment"],
        threshold: 0.2,
      });

      console.log("Tag result:", result);

      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.confidences).toBeDefined();
      expect(result.tags.length).toBe(result.confidences.length);
      expect(result.latency_ms).toBeGreaterThan(0);
    }, 30000);

    it("should return empty tags for unrelated content with high threshold", async () => {
      const result = await client.tag({
        source: "The quick brown fox jumps over the lazy dog",
        labels: ["urgent", "critical", "emergency"],
        threshold: 0.9,
      });

      console.log("High threshold tag result:", result);

      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    }, 30000);
  });

  describe("match endpoint", () => {
    it("should return high score for relevant document-query pair", async () => {
      const result = await client.match({
        source: "Our return policy allows full refunds within 30 days of purchase. Items must be unused and in original packaging.",
        query: "Can I get a refund?",
      });

      console.log("Match (relevant) result:", result);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.latency_ms).toBeGreaterThan(0);
    }, 30000);

    it("should return low score for irrelevant document-query pair", async () => {
      const result = await client.match({
        source: "The Eiffel Tower is located in Paris, France. It was built in 1889.",
        query: "How do I reset my password?",
      });

      console.log("Match (irrelevant) result:", result);

      expect(result.score).toBeLessThan(0.5);
    }, 30000);
  });

  describe("score endpoint", () => {
    it("should score high urgency text", async () => {
      const result = await client.score({
        source: "CRITICAL: Production server is DOWN! All customers affected! Need immediate fix!",
        attribute: "urgency",
      });

      console.log("Score (high urgency) result:", result);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.latency_ms).toBeGreaterThan(0);
    }, 30000);

    it("should score low urgency text", async () => {
      const result = await client.score({
        source: "When you get a chance, could you review my pull request? No rush.",
        attribute: "urgency",
      });

      console.log("Score (low urgency) result:", result);

      expect(result.score).toBeLessThan(0.5);
    }, 30000);

    it("should score toxicity", async () => {
      const result = await client.score({
        source: "Thank you so much for your help! I really appreciate your patience.",
        attribute: "toxicity",
      });

      console.log("Score (toxicity) result:", result);

      expect(result.score).toBeLessThan(0.3);
    }, 30000);

    it("should score with custom description", async () => {
      const result = await client.score({
        source: "I've been waiting for 3 weeks and still no response from support!",
        attribute: "frustration",
        description: "Level of customer frustration or dissatisfaction",
      });

      console.log("Score (frustration) result:", result);

      expect(result.score).toBeGreaterThan(0.3);
    }, 30000);
  });

  describe("error handling", () => {
    it("should handle empty labels error", async () => {
      await expect(
        client.classify({
          source: "test",
          labels: [],
        })
      ).rejects.toThrow();
    }, 30000);

    it("should handle empty source error", async () => {
      await expect(
        client.classify({
          source: "",
          labels: ["a", "b"],
        })
      ).rejects.toThrow();
    }, 30000);
  });
});
