import { describe, expect, it } from "vitest";
import { rankCommunity, publicDisplayName, type CommunityLearner, type CommunitySubmission } from "./rw-community";

const L = (id: string, extra: Partial<CommunityLearner> = {}): CommunityLearner => ({ id, full_name: `Jean ${id} Dupont`, level: "B1", is_active: true, community_visible: true, ...extra });
const subs = (learner: string, n: number, status = "validated", score = 16): CommunitySubmission[] =>
  Array.from({ length: n }, (_, i) => ({ learner_id: learner, lesson_id: `${learner}-${i}`, status, score, reviewed_at: `2026-11-0${(i % 9) + 1}T10:00:00Z` }));

describe("Reading community ranking", () => {
  it("requires at least 4 validated readings; submitted or redo do not count", () => {
    const r = rankCommunity([L("a"), L("b")], [...subs("a", 3), ...subs("a", 5, "submitted"), ...subs("b", 4)], 120);
    expect(r.map((x) => x.id)).toEqual(["b"]);
  });
  it("counts one reading per lesson", () => {
    const dup = [...subs("a", 3), ...subs("a", 3)];
    expect(rankCommunity([L("a")], dup, 120)).toEqual([]);
  });
  it("shows at most 7 and never invents profiles", () => {
    const ls = Array.from({ length: 9 }, (_, i) => L(`l${i}`));
    expect(rankCommunity(ls, ls.flatMap((l, i) => subs(l.id, 4 + i)), 120)).toHaveLength(7);
    expect(rankCommunity([L("a")], subs("a", 4), 120)).toHaveLength(1);
  });
  it("ranks by validated then average, deterministically", () => {
    const r = rankCommunity([L("a"), L("b"), L("c")], [...subs("a", 5, "validated", 15), ...subs("b", 5, "validated", 18), ...subs("c", 6)], 120);
    expect(r.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("excludes hidden or inactive learners", () => {
    expect(rankCommunity([L("a", { community_visible: false }), L("b", { is_active: false })], [...subs("a", 5), ...subs("b", 5)], 120)).toEqual([]);
  });
  it("computes progress from validated readings over all lessons", () => {
    expect(rankCommunity([L("a")], subs("a", 12), 120)[0]!.progress).toBe(10);
  });
  it("shows only first name and initial", () => {
    expect(publicDisplayName("Marie Claire Nzé")).toBe("Marie N.");
  });
});
