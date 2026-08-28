// src/__tests__/assistants/config.test.ts
import { describe, expect, it } from "vitest";
import { ASSISTANT_CONTEXTS, getAssistantContext } from "@/src/lib/assistants/config";

describe("getAssistantContext", () => {
  it("resolves known slugs", () => {
    expect(getAssistantContext("ejecucion")?.slug).toBe("ejecucion");
    expect(getAssistantContext("operacion")?.slug).toBe("operacion");
  });

  it("returns null for unknown slugs", () => {
    expect(getAssistantContext("mercado")).toBeNull();
    expect(getAssistantContext("")).toBeNull();
    expect(getAssistantContext("toString")).toBeNull();
    expect(getAssistantContext("constructor")).toBeNull();
  });

  it("every context has a non-empty system prompt and welcome message", () => {
    for (const context of Object.values(ASSISTANT_CONTEXTS)) {
      expect(context.systemPrompt.length).toBeGreaterThan(0);
      expect(context.mensajeBienvenida.length).toBeGreaterThan(0);
    }
  });
});
