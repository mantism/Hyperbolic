import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  PanResponder,
  Dimensions,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type SortBy = "name" | "difficulty" | "category";
type SortOrder = "asc" | "desc";

interface FilterSheetProps {
  visible: boolean;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  onClose: () => void;
}

export default function FilterSheet({
  visible,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
  onClose,
}: FilterSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          panY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 0.5) {
          onClose();
        }
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: Animated.add(slideAnim, panY) }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Sort & Order</Text>

            {/* Sort By Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Sort By</Text>
              <View style={styles.optionGroup}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    sortBy === "name" && styles.activeOption,
                  ]}
                  onPress={() => onSortByChange("name")}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sortBy === "name" && styles.activeOptionText,
                    ]}
                  >
                    Name
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.option,
                    sortBy === "category" && styles.activeOption,
                  ]}
                  onPress={() => onSortByChange("category")}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sortBy === "category" && styles.activeOptionText,
                    ]}
                  >
                    Category
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.option,
                    sortBy === "difficulty" && styles.activeOption,
                  ]}
                  onPress={() => onSortByChange("difficulty")}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sortBy === "difficulty" && styles.activeOptionText,
                    ]}
                  >
                    Difficulty
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sort Order Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Order</Text>
              <View style={styles.optionGroup}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    sortOrder === "asc" && styles.activeOption,
                  ]}
                  onPress={() => onSortOrderChange("asc")}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sortOrder === "asc" && styles.activeOptionText,
                    ]}
                  >
                    A → Z
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.option,
                    sortOrder === "desc" && styles.activeOption,
                  ]}
                  onPress={() => onSortOrderChange("desc")}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sortOrder === "desc" && styles.activeOptionText,
                    ]}
                  >
                    Z → A
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeOption: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  activeOptionText: {
    color: "#fff",
    fontWeight: "600",
  },
  applyButton: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
