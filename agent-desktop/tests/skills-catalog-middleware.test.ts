import { describe, expect, it } from "vitest";
import {
  createSkillsCatalogMiddleware,
  type BeforeModelContext,
  type ChatMessage,
} from "../src/main/chat-middleware";
import {
  buildSkillCatalog,
  type SkillCatalog,
  type SkillCatalogEntry,
} from "../src/main/skills-progressive";

// `skills-progressive.ts` shipped in 219f664 but nothing called it, so the
// 48 bundled skills never reached the model through the preferred
// progressive-disclosure path — the runtime only ever saw whatever the
// installer had copied to `<profileHome>/skills/` on disk. These tests pin
// the middleware that finally wires it in.

const ENTRIES: SkillCatalogEntry[] = [
  {
    name: "karpathy-guidelines",
    description: "Karpathy's four principles for non-trivial code work.",
    category: "coding",
    source: "bundled",
  },
  {
    name: "design-taste-frontend",
    description: "Anti-slop frontend rules for landing pages.",
    category: "design",
    source: "bundled",
  },
];

function catalogOf(entries: SkillCatalogEntry[] = ENTRIES): SkillCatalog {
  return buildSkillCatalog(entries);
}

function ctx(content: string): BeforeModelContext {
  const messages: ChatMessage[] = [
    { role: "system", content: "You are Cubecloud." },
    { role: "user", content },
  ];
  return {
    messages,
    model: "test-model",
    providerHint: "openai",
    hermesHome: "/tmp/hermes-test",
  };
}

const neverBody = (): string | null => {
  throw new Error("body() must not be called when nothing references a skill");
};

describe("createSkillsCatalogMiddleware", () => {
  it("injects the catalog without any skill bodies", async () => {
    const mw = createSkillsCatalogMiddleware(() => catalogOf(), neverBody);
    const result = await mw(ctx("how do I center a div?"));

    expect(result.applied).toBe(true);
    expect(result.label).toBe("skills:catalog(2)");

    const system = result.messages.find((m) => m.role === "system");
    expect(system?.content).toContain("## Available skills");
    expect(system?.content).toContain("**karpathy-guidelines**");
    expect(system?.content).toContain("**design-taste-frontend**");
    // The pre-existing system prompt is preserved, not replaced.
    expect(system?.content).toContain("You are Cubecloud.");
  });

  it("appends a full body only when the turn names that skill", async () => {
    const asked: string[] = [];
    const body = (name: string): string | null => {
      asked.push(name);
      return name === "design-taste-frontend" ? "RULE: no gradients." : null;
    };

    const result = await createSkillsCatalogMiddleware(() => catalogOf(), body)(
      ctx("please use the design-taste-frontend skill for this page"),
    );

    expect(result.applied).toBe(true);
    expect(result.label).toBe("skills:catalog(2)+bodies(1)");
    expect(asked).toContain("design-taste-frontend");

    const system = result.messages.find((m) => m.role === "system");
    expect(system?.content).toContain("## Skill: design-taste-frontend");
    expect(system?.content).toContain("RULE: no gradients.");
  });

  it("does not load bodies for a skill the turn mentions but that has no body", async () => {
    const result = await createSkillsCatalogMiddleware(
      () => catalogOf(),
      () => null,
    )(ctx("use the karpathy-guidelines skill"));

    expect(result.label).toBe("skills:catalog(2)");
  });

  it("skips cleanly when there are no skills (fresh install)", async () => {
    const result = await createSkillsCatalogMiddleware(
      () => catalogOf([]),
      neverBody,
    )(ctx("hello"));

    expect(result.applied).toBe(false);
    expect(result.label).toBe("skills:skip(empty)");
    expect(result.messages.find((m) => m.role === "system")?.content).toBe(
      "You are Cubecloud.",
    );
  });

  it("degrades to the input when the catalog builder throws", async () => {
    const input = ctx("hello");
    const result = await createSkillsCatalogMiddleware(() => {
      throw new Error("skills dir unreadable");
    }, neverBody)(input);

    expect(result.applied).toBe(false);
    expect(result.label).toBe("skills:skip(catalog-error)");
    // Never break the chat path — the messages must come back intact.
    expect(result.messages).toEqual(input.messages);
  });

  it("creates a system message when the conversation has none", async () => {
    const input: BeforeModelContext = {
      messages: [{ role: "user", content: "hello" }],
      model: "test-model",
      providerHint: "openai",
      hermesHome: "/tmp/hermes-test",
    };

    const result = await createSkillsCatalogMiddleware(() => catalogOf(), neverBody)(
      input,
    );

    expect(result.applied).toBe(true);
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[0].content).toContain("## Available skills");
  });
});
