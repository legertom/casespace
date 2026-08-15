import { describe, expect, it } from "vitest";
import { splitPost } from "./whats-new-prompt";

describe("splitPost", () => {
  it("lifts the h1 out of the body", () => {
    const { title, body } = splitPost(
      "# Three teams reach Qualified\n\nThe week in brief.\n",
      "2026-08-10",
    );
    expect(title).toBe("Three teams reach Qualified");
    expect(body).toBe("The week in brief.");
  });

  it("falls back to the week when there is no h1", () => {
    const { title, body } = splitPost("No heading here.\n", "2026-08-10");
    expect(title).toBe("Week of 2026-08-10");
    expect(body).toBe("No heading here.");
  });

  it("takes the first h1 and leaves later headings alone", () => {
    const { title, body } = splitPost(
      "# The headline\n\n## Movement\n\nSomething moved.",
      "2026-08-10",
    );
    expect(title).toBe("The headline");
    expect(body).toContain("## Movement");
    expect(body).not.toContain("# The headline");
  });

  it("survives leading whitespace before the heading", () => {
    expect(splitPost("\n\n# Quiet week\n\nBody.", "2026-08-10").title).toBe(
      "Quiet week",
    );
  });

  it("does not treat an h2 as the title", () => {
    const { title } = splitPost("## Movement\n\nBody.", "2026-08-10");
    expect(title).toBe("Week of 2026-08-10");
  });
});
