import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

interface KeyboardAccessoryBarProps {
  onTransitionPress: (transition: string) => void;
  onStancePress: (stance: string) => void;
}

// Common transitions in tricking
const TRANSITIONS = ["s/t", "round", "hyper", "punch", "step", "cork"];

// Common landing stances in tricking
const STANCES = ["complete", "semi", "mega", "hyper", "turbo"];

/**
 * Custom keyboard accessory bar with buttons for inserting transitions and stances
 * Displayed above the keyboard when composing combos
 */
export default function KeyboardAccessoryBar({
  onTransitionPress,
  onStancePress,
}: KeyboardAccessoryBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Transitions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Transitions</Text>
          <View style={styles.buttonGroup}>
            {TRANSITIONS.map((transition, index) => (
              <TouchableOpacity
                key={transition}
                style={[
                  styles.button,
                  styles.transitionButton,
                  index > 0 && styles.buttonSpacing,
                ]}
                onPress={() => onTransitionPress(transition)}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, styles.transitionText]}>
                  {transition}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stances Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Stances</Text>
          <View style={styles.buttonGroup}>
            {STANCES.map((stance, index) => (
              <TouchableOpacity
                key={stance}
                style={[
                  styles.button,
                  styles.stanceButton,
                  index > 0 && styles.buttonSpacing,
                ]}
                onPress={() => onStancePress(stance)}
              >
                <Text style={[styles.buttonText, styles.stanceText]}>
                  {stance}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F5F5F5",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingVertical: 8,
    height: 80,
  },
  scrollContent: {
    paddingHorizontal: 12,
    flexDirection: "row",
  },
  section: {
    marginRight: 16,
  },
  sectionLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  buttonGroup: {
    flexDirection: "row",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  buttonSpacing: {
    marginLeft: 6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "500",
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
