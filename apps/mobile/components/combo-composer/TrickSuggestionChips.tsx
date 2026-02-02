import React, { useMemo, useCallback, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { useTricks } from "@/contexts/TricksContext";
import { Trick } from "@hyperbolic/shared-types";
import { searchTricks, hasExactTrickMatch } from "@/lib/utils/trickSearch";

interface TrickSuggestionChipsProps {
  searchText: string;
  onSelectTrick: (trick: Trick) => void;
  onCreateCustom?: (trickName: string) => void;
  onDragTrick?: (trick: Trick, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  maxResults?: number;
}

/**
 * Inline chip suggestions for trick selection
 */
export default function TrickSuggestionChips({
  searchText,
  onSelectTrick,
  onCreateCustom,
  onDragTrick,
  onDragMove,
  onDragEnd,
  maxResults = 8,
}: TrickSuggestionChipsProps) {
  const { allTricks } = useTricks();
  const chipRefsRef = useRef<Map<string, View>>(new Map());
  const filteredTricksRef = useRef<Trick[]>([]);

  const filteredTricks = useMemo(() => {
    const tricks = searchTricks(allTricks, searchText, maxResults);
    filteredTricksRef.current = tricks;
    return tricks;
  }, [allTricks, searchText, maxResults]);

  // Find which chip was tapped based on coordinates
  // Measures chips fresh each time to handle layout shifts
  const findTappedTrick = useCallback(
    (tapX: number, tapY: number): Promise<Trick | null> => {
      return new Promise((resolve) => {
        const tricks = filteredTricksRef.current;
        let remaining = tricks.length;
        let foundTrick: Trick | null = null;

        if (remaining === 0) {
          resolve(null);
          return;
        }

        tricks.forEach((trick) => {
          const view = chipRefsRef.current.get(trick.id);
          if (!view) {
            remaining--;
            if (remaining === 0) {
              resolve(foundTrick);
            }
            return;
          }

          view.measure((_x, _y, width, height, pageX, pageY) => {
            if (
              !foundTrick &&
              width > 0 &&
              height > 0 &&
              tapX >= pageX &&
              tapX <= pageX + width &&
              tapY >= pageY &&
              tapY <= pageY + height
            ) {
              foundTrick = trick;
            }
            remaining--;
            if (remaining === 0) {
              resolve(foundTrick);
            }
          });
        });
      });
    },
    []
  );

  // Handlers stored in refs for stable worklet access
  const handleDragStart = useCallback(
    async (tapX: number, tapY: number) => {
      if (!onDragTrick) return;

      const trick = await findTappedTrick(tapX, tapY);
      if (trick) {
        onDragTrick(trick, tapX, tapY);
      }
    },
    [onDragTrick, findTappedTrick]
  );

  // Capture latest handlers in refs for worklet access
  const handleDragStartRef = useRef(handleDragStart);
  handleDragStartRef.current = handleDragStart;

  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const onGestureStart = useCallback((x: number, y: number) => {
    handleDragStartRef.current(x, y);
  }, []);

  const onGestureUpdate = useCallback((x: number, y: number) => {
    onDragMoveRef.current?.(x, y);
  }, []);

  const onGestureEnd = useCallback((x: number, y: number) => {
    onDragEndRef.current?.(x, y);
  }, []);

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .minDistance(0)
    .onStart((event) => {
      const x = event.absoluteX;
      const y = event.absoluteY;
      scheduleOnRN(onGestureStart, x, y);
    })
    .onUpdate((event) => {
      const x = event.absoluteX;
      const y = event.absoluteY;
      scheduleOnRN(onGestureUpdate, x, y);
    })
    .onEnd((event) => {
      const x = event.absoluteX;
      const y = event.absoluteY;
      scheduleOnRN(onGestureEnd, x, y);
    });

  if (filteredTricks.length === 0) {
    return null;
  }

  // Check if search text is an exact match
  const hasExactMatch = hasExactTrickMatch(allTricks, searchText);

  const showCustomOption =
    searchText.length >= 2 && !hasExactMatch && onCreateCustom;

  return (
    <GestureDetector gesture={panGesture}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {filteredTricks.map((trick) => (
          <TouchableOpacity
            key={trick.id}
            ref={(ref) => {
              if (ref)
                chipRefsRef.current.set(trick.id, ref as unknown as View);
            }}
            style={styles.chip}
            onPress={() => onSelectTrick(trick)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{trick.name}</Text>
          </TouchableOpacity>
        ))}
        {showCustomOption && (
          <TouchableOpacity
            style={[styles.chip, styles.customChip]}
            onPress={() => onCreateCustom(searchText.trim())}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, styles.customChipText]}>
              + "{searchText.trim()}"
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginTop: 8,
  },
  container: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: "#2196F3",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    color: "#1976D2",
    fontSize: 14,
    fontWeight: "500",
  },
  customChip: {
    backgroundColor: "#F5F5F5",
    borderColor: "#999",
    borderStyle: "dashed",
  },
  customChipText: {
    color: "#666",
    fontStyle: "italic",
  },
});
