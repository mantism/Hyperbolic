import {
  removeSequenceItem,
  comboGraphToSequence,
  sequenceToComboGraph,
  reorderSequenceItem,
  moveTrickToPosition,
} from "./comboRendering";
import {
  SequenceItem,
  TrickItem,
  ArrowItem,
  ComboGraph,
} from "@hyperbolic/shared-types";

// Helper functions to create test items
const createTrick = (id: string, trickId?: string): TrickItem => ({
  id,
  type: "trick",
  data: { trick_id: trickId ?? id },
});

const createArrow = (id: string, transitionId?: string): ArrowItem => ({
  id,
  type: "arrow",
  transition_id: transitionId,
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
      expect((result[1] as ArrowItem).transition_id).toBe("vs");
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

describe("comboGraphToSequence", () => {
  it("returns empty array for empty graph", () => {
    const graph: ComboGraph = { tricks: [], transitions: [] };
    expect(comboGraphToSequence(graph)).toEqual([]);
  });

  it("converts single trick without arrow", () => {
    const graph: ComboGraph = {
      tricks: [{ trick_id: "btwist" }],
      transitions: [],
    };

    const result = comboGraphToSequence(graph);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("trick");
    expect((result[0] as TrickItem).data.trick_id).toBe("btwist");
  });

  it("converts two tricks with arrow between", () => {
    const graph: ComboGraph = {
      tricks: [{ trick_id: "btwist" }, { trick_id: "cork" }],
      transitions: [],
    };

    const result = comboGraphToSequence(graph);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("trick");
    expect(result[1].type).toBe("arrow");
    expect(result[2].type).toBe("trick");
  });

  it("preserves landing stance", () => {
    const graph: ComboGraph = {
      tricks: [{ trick_id: "btwist", landing_stance: "complete" }],
      transitions: [],
    };

    const result = comboGraphToSequence(graph);

    expect((result[0] as TrickItem).data.landing_stance).toBe("complete");
  });

  it("places transition_id on arrow from edge", () => {
    const graph: ComboGraph = {
      tricks: [{ trick_id: "btwist" }, { trick_id: "cork" }],
      transitions: [{ from_index: 0, to_index: 1, transition_id: "s/t" }],
    };

    const result = comboGraphToSequence(graph);

    expect(result).toHaveLength(3);
    expect((result[1] as ArrowItem).transition_id).toBe("s/t");
  });

  it("handles complex graph with multiple transitions and stances", () => {
    const graph: ComboGraph = {
      tricks: [
        { trick_id: "btwist", landing_stance: "complete" },
        { trick_id: "cork" },
        { trick_id: "gainer", landing_stance: "mega" },
      ],
      transitions: [
        { from_index: 0, to_index: 1, transition_id: "s/t" },
        { from_index: 1, to_index: 2, transition_id: "round" },
      ],
    };

    const result = comboGraphToSequence(graph);

    expect(result).toHaveLength(5);
    // First trick
    expect((result[0] as TrickItem).data.trick_id).toBe("btwist");
    expect((result[0] as TrickItem).data.landing_stance).toBe("complete");
    // First arrow with transition
    expect((result[1] as ArrowItem).transition_id).toBe("s/t");
    // Second trick
    expect((result[2] as TrickItem).data.trick_id).toBe("cork");
    // Second arrow with transition
    expect((result[3] as ArrowItem).transition_id).toBe("round");
    // Third trick
    expect((result[4] as TrickItem).data.trick_id).toBe("gainer");
    expect((result[4] as TrickItem).data.landing_stance).toBe("mega");
  });
});

describe("sequenceToComboGraph", () => {
  it("returns empty graph for empty input", () => {
    const result = sequenceToComboGraph([]);
    expect(result).toEqual({ tricks: [], transitions: [] });
  });

  it("converts single trick", () => {
    const sequence: SequenceItem[] = [createTrick("t1", "btwist")];

    const result = sequenceToComboGraph(sequence);

    expect(result.tricks).toHaveLength(1);
    expect(result.tricks[0].trick_id).toBe("btwist");
    expect(result.transitions).toHaveLength(0);
  });

  it("converts sequence ignoring arrows without transition_id", () => {
    const sequence: SequenceItem[] = [
      createTrick("t1", "btwist"),
      createArrow("a1"),
      createTrick("t2", "cork"),
    ];

    const result = sequenceToComboGraph(sequence);

    expect(result.tricks).toHaveLength(2);
    expect(result.tricks[0].trick_id).toBe("btwist");
    expect(result.tricks[1].trick_id).toBe("cork");
    expect(result.transitions).toHaveLength(0);
  });

  it("includes transition edge from arrow with transition_id", () => {
    const sequence: SequenceItem[] = [
      createTrick("t1", "btwist"),
      createArrow("a1", "s/t"),
      createTrick("t2", "cork"),
    ];

    const result = sequenceToComboGraph(sequence);

    expect(result.tricks).toHaveLength(2);
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0]).toEqual({
      from_index: 0,
      to_index: 1,
      transition_id: "s/t",
    });
  });

  it("preserves landing stance", () => {
    const trickWithStance: TrickItem = {
      id: "t1",
      type: "trick",
      data: { trick_id: "btwist", landing_stance: "complete" },
    };
    const sequence: SequenceItem[] = [trickWithStance];

    const result = sequenceToComboGraph(sequence);

    expect(result.tricks[0].landing_stance).toBe("complete");
  });

  it("roundtrips correctly with comboGraphToSequence", () => {
    const original: ComboGraph = {
      tricks: [
        { trick_id: "btwist", landing_stance: "complete" },
        { trick_id: "cork" },
        { trick_id: "gainer", landing_stance: "mega" },
      ],
      transitions: [
        { from_index: 0, to_index: 1, transition_id: "s/t" },
        { from_index: 1, to_index: 2, transition_id: "round" },
      ],
    };

    const sequence = comboGraphToSequence(original);
    const result = sequenceToComboGraph(sequence);

    expect(result.tricks).toEqual(original.tricks);
    expect(result.transitions).toEqual(original.transitions);
  });
});

describe("reorderSequenceItem", () => {
  it("returns original sequence for negative index", () => {
    const sequence = [createTrick("t1"), createArrow("a1"), createTrick("t2")];
    expect(reorderSequenceItem(sequence, -1, 1)).toEqual(sequence);
  });

  it("returns original sequence for out of bounds index", () => {
    const sequence = [createTrick("t1"), createArrow("a1"), createTrick("t2")];
    expect(reorderSequenceItem(sequence, 10, 0)).toEqual(sequence);
  });

  it("returns original sequence if item is not a trick", () => {
    const sequence = [createTrick("t1"), createArrow("a1"), createTrick("t2")];
    expect(reorderSequenceItem(sequence, 1, 0)).toEqual(sequence);
  });

  it("returns original sequence if moving to same position", () => {
    const sequence = [createTrick("t1"), createArrow("a1"), createTrick("t2")];
    expect(reorderSequenceItem(sequence, 0, 0)).toEqual(sequence);
  });

  it("moves first trick to second position", () => {
    const sequence: SequenceItem[] = [
      createTrick("t1"),
      createArrow("a1"),
      createTrick("t2"),
    ];

    const result = reorderSequenceItem(sequence, 0, 1);

    // Should result in [t2, t1] with cleaned up structure
    expect(result.filter((i) => i.type === "trick").length).toBe(2);
    const tricks = result.filter((i) => i.type === "trick") as TrickItem[];
    expect(tricks[0].id).toBe("t2");
    expect(tricks[1].id).toBe("t1");
  });
});

describe("moveTrickToPosition", () => {
  it("returns original for negative index", () => {
    const sequence = [createTrick("t1"), createArrow("a1"), createTrick("t2")];
    const { sequence: result, newIndex } = moveTrickToPosition(sequence, -1, 1);
    expect(result).toEqual(sequence);
    expect(newIndex).toBe(-1);
  });

  it("returns original for out of bounds index", () => {
    const sequence = [createTrick("t1"), createArrow("a1"), createTrick("t2")];
    const { sequence: result, newIndex } = moveTrickToPosition(sequence, 10, 0);
    expect(result).toEqual(sequence);
    expect(newIndex).toBe(10);
  });

  it("returns original if item is not a trick", () => {
    const sequence = [createTrick("t1"), createArrow("a1"), createTrick("t2")];
    const { sequence: result, newIndex } = moveTrickToPosition(sequence, 1, 0);
    expect(result).toEqual(sequence);
    expect(newIndex).toBe(1);
  });

  it("returns original if moving to same position", () => {
    const sequence = [createTrick("t1"), createArrow("a1"), createTrick("t2")];
    const { sequence: result } = moveTrickToPosition(sequence, 0, 0);
    expect(result).toEqual(sequence);
  });

  it("moves trick and returns new index", () => {
    const sequence: SequenceItem[] = [
      createTrick("t1"),
      createArrow("a1"),
      createTrick("t2"),
      createArrow("a2"),
      createTrick("t3"),
    ];

    const { sequence: result, newIndex } = moveTrickToPosition(sequence, 0, 2);

    // t1 should now be at the end (after t2 and t3)
    const tricks = result.filter((i) => i.type === "trick") as TrickItem[];
    expect(tricks[2].id).toBe("t1");
    expect(newIndex).toBeGreaterThan(0);
  });
});
