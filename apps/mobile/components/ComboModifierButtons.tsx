import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface ComboModifierButtonsProps {
  onTransitionPress: (transition: string) => void;
  onStancePress: (stance: string) => void;
  disabled?: boolean;
}

// Common transitions in tricking
const TRANSITIONS = ["s/t", "round", "hyper", "punch", "cork"];

// Common landing stances in tricking
const STANCES = ["complete", "semi", "mega", "hyper"];

/**
 * Inline buttons for adding transitions and stances to the last trick
 * Displayed below the trick input as part of the form
 */
export default function ComboModifierButtons({
  onTransitionPress,
  onStancePress,
  disabled = false,
}: ComboModifierButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Transitions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Transitions</Text>
        <View style={styles.buttonRow}>
          {TRANSITIONS.map((transition) => (
            <TouchableOpacity
              key={transition}
              style={[
                styles.button,
                styles.transitionButton,
                disabled && styles.buttonDisabled,
              ]}
              onPress={() => onTransitionPress(transition)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buttonText,
                  styles.transitionText,
                  disabled && styles.buttonTextDisabled,
                ]}
              >
                {transition}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
                disabled && styles.buttonDisabled,
              ]}
              onPress={() => onStancePress(stance)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buttonText,
                  styles.stanceText,
                  disabled && styles.buttonTextDisabled,
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
