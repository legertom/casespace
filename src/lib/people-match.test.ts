import { describe, expect, it } from "vitest";
import {
  creditsIdentity,
  foldName,
  makeIdentity,
  type CreditedRecord,
} from "./people-match";

// The real shape of the mismatch this guards: the org chart spells Tom with an
// accent, his login doesn't, and the credit box takes whatever was typed.
const tom = makeIdentity({
  personId: "person-tom",
  userId: "user-tom",
  names: ["Tom Léger", "Tom Leger"],
});

const record = (over: Partial<CreditedRecord> = {}): CreditedRecord => ({
  ownerPersonId: null,
  ownerUserId: null,
  ownerName: null,
  authors: [],
  ...over,
});

describe("folding a name for comparison", () => {
  it("ignores case, accents, and stray whitespace", () => {
    expect(foldName("Tom Léger")).toBe(foldName("  tom  LEGER "));
  });

  it("still tells different names apart", () => {
    expect(foldName("Tom Leger")).not.toBe(foldName("Tom Legere"));
  });
});

describe("who a record credits", () => {
  it("matches an owner linked by person id", () => {
    expect(
      creditsIdentity(
        record({ ownerPersonId: "person-tom", ownerName: "Tom Léger" }),
        tom,
      ),
    ).toBe(true);
  });

  it("matches an owner linked only to the login", () => {
    expect(
      creditsIdentity(
        record({ ownerUserId: "user-tom", ownerName: "Tom Leger" }),
        tom,
      ),
    ).toBe(true);
  });

  it("matches a hand-typed name that never got linked", () => {
    expect(
      creditsIdentity(
        record({
          authors: [
            { personId: null, userId: null, displayName: "Tom Leger" },
          ],
        }),
        tom,
      ),
    ).toBe(true);
  });

  it("leaves an explicit link alone when the name looks the same", () => {
    // Two Tom Legers is not our problem to solve by guessing: the record says
    // whose it is, and that answer wins.
    expect(
      creditsIdentity(
        record({ ownerPersonId: "person-other", ownerName: "Tom Leger" }),
        tom,
      ),
    ).toBe(false);
  });

  it("does not credit someone else", () => {
    expect(
      creditsIdentity(
        record({
          ownerName: "Katie Clarkson",
          authors: [
            { personId: "person-katie", userId: null, displayName: "Katie" },
          ],
        }),
        tom,
      ),
    ).toBe(false);
  });

  it("credits nobody when the identity has nothing to match on", () => {
    const empty = makeIdentity({});
    expect(
      creditsIdentity(record({ ownerName: "Tom Leger" }), empty),
    ).toBe(false);
  });
});
