import { describe, expect, it } from "vitest";
import { rwCanChangeActive } from "./rw-removal";

describe("permissions de retrait et réactivation", () => {
  it("un coach peut retirer son propre apprenant", () => {
    expect(rwCanChangeActive({ isStaff: false, kind: "learner", active: false, ownLearner: true })).toBe(true);
  });
  it("un coach ne peut pas réactiver son propre apprenant", () => {
    expect(rwCanChangeActive({ isStaff: false, kind: "learner", active: true, ownLearner: true })).toBe(false);
  });
  it("un administrateur peut réactiver un apprenant", () => {
    expect(rwCanChangeActive({ isStaff: true, kind: "learner", active: true })).toBe(true);
  });
  it("un coach ne peut pas retirer un apprenant qui ne lui est pas affecté", () => {
    expect(rwCanChangeActive({ isStaff: false, kind: "learner", active: false, ownLearner: false })).toBe(false);
  });
  it("un coach ne peut pas retirer un autre coach", () => {
    expect(rwCanChangeActive({ isStaff: false, kind: "coach", active: false })).toBe(false);
  });
  it("un administrateur peut retirer un coach avec réaffectation", () => {
    expect(rwCanChangeActive({ isStaff: true, kind: "coach", active: false })).toBe(true);
  });
});
