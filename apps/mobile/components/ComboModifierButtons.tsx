import React, { useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

interface ComboModifierButtonsProps {
  onTransitionPress: (transition: string) => void;
  onStancePress: (stance: string) => void;
  transitionsDisabled?: boolean;
  stancesDisabled?: boolean;
  onDragTransition?: (
    transition: string,
    absoluteX: number,
    absoluteY: number
  ) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
}

// Common transitions in tricking
const TRANSITIONS = ["s/t", "vs", "fs", "w/t", "reverse", "pop", "misleg"];

// Common landing stances in tricking
const STANCES = ["complete", "semi", "mega", "hyper"];

/**
 * Inline buttons for adding transitions and stances to the last trick
 * Displayed below the trick input as part of the form
 */
export default function ComboModifierButtons({
  onTransitionPress,
  onStancePress,
  transitionsDisabled = false,
  stancesDisabled = false,
  onDragTransition,
  onDragMove,
  onDragEnd,
}: ComboModifierButtonsProps) {
  // Store refs for each transition button (for measurement)
  const buttonRefsRef = useRef<Map<string, View>>(new Map());

  // Find which transition button was tapped based on coordinates
  const findTappedTransition = useCallback(
    (tapX: number, tapY: number): Promise<string | null> => {
      return new Promise((resolve) => {
        const entries = Array.from(buttonRefsRef.current.entries());
        if (entries.length === 0) {
          resolve(null);
          return;
        }

        let remaining = entries.length;
        let foundTransition: string | null = null;

        entries.forEach(([transition, view]) => {
          view.measure((_x, _y, width, height, pageX, pageY) => {
            if (
              !foundTransition &&
              width > 0 &&
              height > 0 &&
              tapX >= pageX &&
              tapX <= pageX + width &&
              tapY >= pageY &&
              tapY <= pageY + height
            ) {
              foundTransition = transition;
            }
            remaining--;
            if (remaining === 0) {
              resolve(foundTransition);
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
      if (!onDragTransition) return;

      const transition = await findTappedTransition(tapX, tapY);
      if (transition) {
        onDragTransition(transition, tapX, tapY);
      }
    },
    [onDragTransition, findTappedTransition]
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

  return (
    <View style={styles.container}>
      {/* Transitions Section */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Transitions</Text>
          <View style={styles.buttonRow}>
            {TRANSITIONS.map((transition) => (
              <TouchableOpacity
                key={transition}
                ref={(ref) => {
                  if (ref)
                    buttonRefsRef.current.set(
                      transition,
                      ref as unknown as View
                    );
                  else buttonRefsRef.current.delete(transition);
                }}
                style={[
                  styles.button,
                  styles.transitionButton,
                  transitionsDisabled && styles.buttonDisabled,
                ]}
                onPress={() => onTransitionPress(transition)}
                disabled={transitionsDisabled}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    styles.transitionText,
                    transitionsDisabled && styles.buttonTextDisabled,
                  ]}
                >
                  {transition}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </GestureDetector>

      {/* Stances Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Stances</Text>
        <View style={styles.buttonRow}>
          {STANCES.map((stance) => (
            <TouchableOpacity
              key={stance}
              style={[
                styles.button,
                styles.stanceButton,
                stancesDisabled && styles.buttonDisabled,
              ]}
              onPress={() => onStancePress(stance)}
              disabled={stancesDisabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buttonText,
                  styles.stanceText,
                  stancesDisabled && styles.buttonTextDisabled,
                ]}
              >
                {stance}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 12,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },

  // Transition button styling
  transitionButton: {
    backgroundColor: "#FFF3E0",
    borderColor: "#FF9800",
  },
  transitionText: {
    color: "#F57C00",
  },

  // Stance button styling
  stanceButton: {
    backgroundColor: "#F3E5F5",
    borderColor: "#9C27B0",
  },
  stanceText: {
    color: "#7B1FA2",
  },
});
