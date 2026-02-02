import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TrickVideo } from "@hyperbolic/shared-types";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SWIPE_THRESHOLD = -80;
const DELETE_WIDTH = 80;

export interface TrickLogItem {
  id: string;
  reps: number;
  surfaceType?: string | null;
  media?: TrickVideo | null;
  logged_at: string;
}

export interface TrickWithLogs {
  trickId: string;
  trickName: string;
  userTrickId: string;
  logs: TrickLogItem[];
}

interface SessionTrickCardProps {
  trickWithLogs: TrickWithLogs;
  onAddLog: () => void;
  onLogPress: (log: TrickLogItem) => void;
  onDeleteLog: (logId: string) => void;
  onDeleteAllLogs: () => void;
  onPlayVideo?: (video: TrickVideo) => void;
}

/**
 * Expandable trick card that groups multiple logs for the same trick.
 * Collapsed: shows trick name and log count
 * Expanded: shows individual log rows with controls
 */
export default function SessionTrickCard({
  trickWithLogs,
  onAddLog,
  onLogPress,
  onDeleteLog,
  onDeleteAllLogs,
  onPlayVideo,
}: SessionTrickCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipedOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        translateX.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0 || isSwipedOpen.current) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();

        if (gestureState.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
          }).start();
          isSwipedOpen.current = true;
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          isSwipedOpen.current = false;
        }
      },
    }),
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    isSwipedOpen.current = false;
  };

  const handleDeleteAll = () => {
    closeSwipe();
    onDeleteAllLogs();
  };

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const logCount = trickWithLogs.logs.length;

  return (
    <View style={styles.container}>
      {/* Delete button behind the card (for collapsed state - deletes all logs) */}
      <View style={styles.deleteButton}>
        <TouchableOpacity onPress={handleDeleteAll} style={styles.deleteInner}>
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.deleteText}>Delete All</Text>
        </TouchableOpacity>
      </View>

      {/* Main card content */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...(isExpanded ? {} : panResponder.panHandlers)}
      >
        {/* Header (always visible) */}
        <TouchableOpacity
          style={styles.header}
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <Text style={styles.trickName} numberOfLines={1}>
            {trickWithLogs.trickName}
          </Text>
          <View style={styles.headerRight}>
            <Text style={styles.logCount}>
              {logCount} {logCount === 1 ? "log" : "logs"}
            </Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#999"
            />
          </View>
        </TouchableOpacity>

        {/* Expanded content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {trickWithLogs.logs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                onPress={() => onLogPress(log)}
                onDelete={() => onDeleteLog(log.id)}
                onPlayVideo={onPlayVideo}
              />
            ))}

            {/* Add Another Log button */}
            <TouchableOpacity style={styles.addLogButton} onPress={onAddLog}>
              <Ionicons name="add" size={18} color="#007AFF" />
              <Text style={styles.addLogText}>Add Another Log</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Individual log row within expanded card
 * Tappable to open detail sheet, swipeable to delete
 */
interface LogRowProps {
  log: TrickLogItem;
  onPress: () => void;
  onDelete: () => void;
  onPlayVideo?: (video: TrickVideo) => void;
}

function LogRow({ log, onPress, onDelete, onPlayVideo }: LogRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipedOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        translateX.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0 || isSwipedOpen.current) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();

        if (gestureState.dx < -60) {
          Animated.spring(translateX, {
            toValue: -60,
            useNativeDriver: true,
          }).start();
          isSwipedOpen.current = true;
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          isSwipedOpen.current = false;
        }
      },
    }),
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    isSwipedOpen.current = false;
  };

  const handleDelete = () => {
    closeSwipe();
    onDelete();
  };

  return (
    <View style={styles.logRowContainer}>
      {/* Delete button */}
      <View style={styles.logDeleteButton}>
        <TouchableOpacity onPress={handleDelete} style={styles.logDeleteInner}>
          <Ionicons name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[styles.logRow, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.logRowContent}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {/* Reps display */}
          <View style={styles.repsDisplay}>
            <Text style={styles.repsValue}>{log.reps}</Text>
            <Text style={styles.repsLabel}>reps</Text>
          </View>

          {/* Surface type badge */}
          {log.surfaceType ? (
            <View style={styles.surfaceBadge}>
              <Text style={styles.surfaceText}>{log.surfaceType}</Text>
            </View>
          ) : null}

          {/* Spacer */}
          <View style={styles.logRowSpacer} />

          {/* Video indicator */}
          {log.media ? (
            <TouchableOpacity
              style={styles.playButton}
              onPress={(e) => {
                e.stopPropagation();
                onPlayVideo?.(log.media!);
              }}
            >
              <Ionicons name="play" size={16} color="#007AFF" />
            </TouchableOpacity>
          ) : null}

          {/* Chevron to indicate tappable */}
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>
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
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  trickName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginRight: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logCount: {
    fontSize: 13,
    color: "#999",
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    paddingVertical: 8,
  },
  logRowContainer: {
    overflow: "hidden",
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 6,
  },
  logDeleteButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  logDeleteInner: {
    padding: 8,
  },
  logRow: {
    backgroundColor: "#fff",
    borderRadius: 6,
  },
  logRowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  logRowSpacer: {
    flex: 1,
  },
  repsDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  repsValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  repsLabel: {
    fontSize: 12,
    color: "#999",
  },
  surfaceBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  surfaceText: {
    fontSize: 12,
    color: "#1976D2",
  },
  playButton: {
    padding: 6,
    backgroundColor: "#E3F2FD",
    borderRadius: 4,
  },
  addLogButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
    marginTop: 4,
  },
  addLogText: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "500",
  },
});
