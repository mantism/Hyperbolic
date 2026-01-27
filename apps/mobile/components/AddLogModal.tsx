import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AddLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTrick: () => void;
  onSelectCombo: () => void;
}

export default function AddLogModal({
  visible,
  onClose,
  onSelectTrick,
  onSelectCombo,
}: AddLogModalProps) {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleComingSoon = () => {
    // Could show an alert or toast
    console.log("Coming soon!");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Log</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.options}>
            <TouchableOpacity
              style={styles.option}
              onPress={onSelectTrick}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="flash" size={28} color="#007AFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Log Trick</Text>
                <Text style={styles.optionSubtitle}>
                  Record a trick attempt or stomp
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={onSelectCombo}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="link" size={28} color="#007AFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Log Combo</Text>
                <Text style={styles.optionSubtitle}>
                  Record a combo attempt or stomp
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, styles.disabledOption]}
              onPress={handleComingSoon}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="calendar" size={28} color="#999" />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, styles.disabledText]}>
                  Log Session
                </Text>
                <Text style={styles.optionSubtitle}>Coming soon</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#DDD" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    minHeight: 400,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  options: {
    padding: 20,
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  disabledText: {
    color: "#999",
  },
});
