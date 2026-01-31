import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  PanResponder,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const SWIPE_THRESHOLD = -80;
const DELETE_WIDTH = 80;

interface SessionComboCardProps {
  comboLog: {
    id: string;
    name: string;
    reps: number;
    landed: boolean;
  };
  onRepsChange: (reps: number) => void;
  onDelete: () => void;
}

export default function SessionComboCard({
  comboLog,
  onRepsChange,
  onDelete,
}: SessionComboCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comboLog.reps.toString());
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipedOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        // Store current position
        translateX.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx)
        if (gestureState.dx < 0 || isSwipedOpen.current) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();

        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Swipe far enough - open delete button
          Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
          }).start();
          isSwipedOpen.current = true;
        } else {
          // Not far enough - snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          isSwipedOpen.current = false;
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    isSwipedOpen.current = false;
  };

  const handleDecrement = () => {
    if (comboLog.reps > 1) {
      onRepsChange(comboLog.reps - 1);
    }
  };

  const handleIncrement = () => {
    onRepsChange(comboLog.reps + 1);
  };

  const handleRepsPress = () => {
    setEditValue(comboLog.reps.toString());
    setIsEditing(true);
  };

  const handleEditSubmit = () => {
    const newReps = parseInt(editValue, 10);
    if (!isNaN(newReps) && newReps >= 1) {
      onRepsChange(newReps);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    closeSwipe();
    onDelete();
  };

  return (
    <View style={styles.container}>
      {/* Delete button behind the card */}
      <View style={styles.deleteButton}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteInner}>
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Main card content */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.content}>
          <View style={styles.nameContainer}>
            <Ionicons name="list" size={14} color="#666" style={styles.icon} />
            <Text style={styles.name} numberOfLines={1}>
              {comboLog.name}
            </Text>
          </View>

          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={handleDecrement}
              style={[
                styles.stepperButton,
                comboLog.reps <= 1 && styles.stepperButtonDisabled,
              ]}
              disabled={comboLog.reps <= 1}
            >
              <Ionicons
                name="remove"
                size={18}
                color={comboLog.reps <= 1 ? "#ccc" : "#666"}
              />
            </TouchableOpacity>

            {isEditing ? (
              <TextInput
                style={styles.repsInput}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                onBlur={handleEditSubmit}
                onSubmitEditing={handleEditSubmit}
              />
            ) : (
              <TouchableOpacity onPress={handleRepsPress}>
                <Text style={styles.repsText}>{comboLog.reps}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleIncrement}
              style={styles.stepperButton}
            >
              <Ionicons name="add" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    overflow: "hidden",
  },
  deleteButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  deleteInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: "#F0F4FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    marginRight: 6,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  stepperButton: {
    padding: 8,
  },
  stepperButtonDisabled: {
    opacity: 0.5,
  },
  repsText: {
    minWidth: 32,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 4,
  },
  repsInput: {
    minWidth: 40,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    padding: 4,
    backgroundColor: "#fff",
  },
});
