import {
  removeSequenceItem,
  comboTricksToSequence,
  sequenceToComboTricks,
} from "./comboRendering";
import {
  SequenceItem,
  TrickItem,
  ArrowItem,
  ComboTrick,
} from "@hyperbolic/shared-types";

// Helper functions to create test items
const createTrick = (id: string): TrickItem => ({
  id,
  type: "trick",
  data: { trick_id: id },
});

const createArrow = (id: string, transition?: string): ArrowItem => ({
  id,
  type: "arrow",
  transition,
});

describe("removeSequenceItem", () => {
  describe("edge cases", () => {
    it("returns original sequence for negative index", () => {
      const sequence = [createTrick("t1")];
      expect(removeSequenceItem(sequence, -1)).toEqual(sequence);
    });

    it("returns original sequence for index out of bounds", () => {
      const sequence = [createTrick("t1")];
      expect(removeSequenceItem(sequence, 5)).toEqual(sequence);
    });

    it("returns empty array when removing only item", () => {
      const sequence = [createTrick("t1")];
      expect(removeSequenceItem(sequence, 0)).toEqual([]);
    });
  });

  describe("removing tricks", () => {
    it("removes first trick and cleans up following arrow", () => {
      // [trick] [arrow] [trick] -> [trick]
      const sequence: SequenceItem[] = [
        createTrick("t1"),
        createArrow("a1"),
        createTrick("t2"),
      ];

      const result = removeSequenceItem(sequence, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t2");
    });

    it("removes last trick and cleans up preceding arrow", () => {
      // [trick] [arrow] [trick] -> [trick]
      const sequence: SequenceItem[] = [
        createTrick("t1"),
        createArrow("a1"),
        createTrick("t2"),
      ];

      const result = removeSequenceItem(sequence, 2);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t1");
    });

    it("removes middle trick and cleans up one adjacent arrow", () => {
      // [trick] [arrow] [trick] [arrow] [trick] -> [trick] [arrow] [trick]
      const sequence: SequenceItem[] = [
        createTrick("t1"),
        createArrow("a1", "vs"),
        createTrick("t2"),
        createArrow("a2", "s/t"),
        createTrick("t3"),
      ];

      const result = removeSequenceItem(sequence, 2);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("t1");
      expect(result[1].type).toBe("arrow");
      expect(result[2].id).toBe("t3");
    });

    it("keeps the first arrow when removing middle trick", () => {
      // When we have [t1] [a1:vs] [t2] [a2:s/t] [t3] and remove t2,
      // we should get [t1] [a1:vs] [t3] (keeping the first transition)
      const sequence: SequenceItem[] = [
        createTrick("t1"),
        createArrow("a1", "vs"),
        createTrick("t2"),
        createArrow("a2", "s/t"),
        createTrick("t3"),
      ];

      const result = removeSequenceItem(sequence, 2);

      expect(result).toHaveLength(3);
      expect((result[1] as ArrowItem).transition).toBe("vs");
    });
  });

  describe("removing arrows", () => {
    it("removes arrow without additional cleanup", () => {
      // [trick] [arrow] [trick] -> [trick] [trick]
      const sequence: SequenceItem[] = [
        createTrick("t1"),
        createArrow("a1"),
        createTrick("t2"),
      ];

      const result = removeSequenceItem(sequence, 1);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("t1");
      expect(result[1].id).toBe("t2");
    });
  });

  describe("complex sequences", () => {
    it("handles sequence with transitions correctly", () => {
      // [t1] [a1:vs] [t2] [a2:s/t] [t3] [a3:round] [t4]
      // Remove t3 -> [t1] [a1:vs] [t2] [a2:s/t] [t4]
      const sequence: SequenceItem[] = [
        createTrick("t1"),
        createArrow("a1", "vs"),
        createTrick("t2"),
        createArrow("a2", "s/t"),
        createTrick("t3"),
        createArrow("a3", "round"),
        createTrick("t4"),
      ];

      const result = removeSequenceItem(sequence, 4);

      expect(result).toHaveLength(5);
      expect(result.map((r) => r.id)).toEqual(["t1", "a1", "t2", "a2", "t4"]);
    });

    it("handles removing second trick in three-trick sequence", () => {
      // [t1] [a1] [t2] [a2] [t3] -> [t1] [a1] [t3]
      const sequence: SequenceItem[] = [
        createTrick("t1"),
        createArrow("a1"),
        createTrick("t2"),
        createArrow("a2"),
        createTrick("t3"),
      ];

      const result = removeSequenceItem(sequence, 2);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe("trick");
      expect(result[1].type).toBe("arrow");
      expect(result[2].type).toBe("trick");
    });
  });
});

describe("comboTricksToSequence", () => {
  it("returns empty array for empty input", () => {
    expect(comboTricksToSequence([])).toEqual([]);
  });

  it("converts single trick without arrow", () => {
    const tricks: ComboTrick[] = [{ trick_id: "btwist" }];

    const result = comboTricksToSequence(tricks);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("trick");
    expect((result[0] as TrickItem).data.trick_id).toBe("btwist");
  });

  it("converts two tricks with arrow between", () => {
    const tricks: ComboTrick[] = [{ trick_id: "btwist" }, { trick_id: "cork" }];

    const result = comboTricksToSequence(tricks);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("trick");
    expect(result[1].type).toBe("arrow");
    expect(result[2].type).toBe("trick");
  });

  it("preserves landing stance", () => {
    const tricks: ComboTrick[] = [
      { trick_id: "btwist", landing_stance: "complete" },
    ];

    const result = comboTricksToSequence(tricks);

    expect((result[0] as TrickItem).data.landing_stance).toBe("complete");
  });

  it("places transition on arrow before the trick", () => {
    const tricks: ComboTrick[] = [
      { trick_id: "btwist" },
      { trick_id: "cork", transition: "s/t" },
    ];

    const result = comboTricksToSequence(tricks);

    expect(result).toHaveLength(3);
    expect((result[1] as ArrowItem).transition).toBe("s/t");
  });

  it("handles complex sequence with transitions and stances", () => {
    const tricks: ComboTrick[] = [
      { trick_id: "btwist", landing_stance: "complete" },
      { trick_id: "cork", transition: "s/t" },
      { trick_id: "gainer", transition: "round", landing_stance: "mega" },
    ];

    const result = comboTricksToSequence(tricks);

    expect(result).toHaveLength(5);
    // First trick
    expect((result[0] as TrickItem).data.trick_id).toBe("btwist");
    expect((result[0] as TrickItem).data.landing_stance).toBe("complete");
    // First arrow with transition
    expect((result[1] as ArrowItem).transition).toBe("s/t");
    // Second trick
    expect((result[2] as TrickItem).data.trick_id).toBe("cork");
    // Second arrow with transition
    expect((result[3] as ArrowItem).transition).toBe("round");
    // Third trick
    expect((result[4] as TrickItem).data.trick_id).toBe("gainer");
    expect((result[4] as TrickItem).data.landing_stance).toBe("mega");
  });
});

describe("sequenceToComboTricks", () => {
  it("returns empty array for empty input", () => {
    expect(sequenceToComboTricks([])).toEqual([]);
  });

  it("converts single trick", () => {
    const sequence: SequenceItem[] = [createTrick("btwist")];

    const result = sequenceToComboTricks(sequence);

    expect(result).toHaveLength(1);
    expect(result[0].trick_id).toBe("btwist");
  });

  it("converts sequence ignoring arrows without transitions", () => {
    const sequence: SequenceItem[] = [
      createTrick("btwist"),
      createArrow("a1"),
      createTrick("cork"),
    ];

    const result = sequenceToComboTricks(sequence);

    expect(result).toHaveLength(2);
    expect(result[0].trick_id).toBe("btwist");
    expect(result[1].trick_id).toBe("cork");
    expect(result[1].transition).toBeUndefined();
  });

  it("includes transition from preceding arrow", () => {
    const sequence: SequenceItem[] = [
      createTrick("btwist"),
      createArrow("a1", "s/t"),
      createTrick("cork"),
    ];

    const result = sequenceToComboTricks(sequence);

    expect(result).toHaveLength(2);
    expect(result[0].transition).toBeUndefined();
    expect(result[1].transition).toBe("s/t");
  });

  it("preserves landing stance", () => {
    const trickWithStance: TrickItem = {
      id: "t1",
      type: "trick",
      data: { trick_id: "btwist", landing_stance: "complete" },
    };
    const sequence: SequenceItem[] = [trickWithStance];

    const result = sequenceToComboTricks(sequence);

    expect(result[0].landing_stance).toBe("complete");
  });

  it("roundtrips correctly with comboTricksToSequence", () => {
    const original: ComboTrick[] = [
      { trick_id: "btwist", landing_stance: "complete" },
      { trick_id: "cork", transition: "s/t" },
      { trick_id: "gainer", transition: "round", landing_stance: "mega" },
    ];

    const sequence = comboTricksToSequence(original);
    const result = sequenceToComboTricks(sequence);

    expect(result).toEqual(original);
  });
});
