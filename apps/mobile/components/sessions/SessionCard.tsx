import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Session,
  SessionWithStats,
  getSessionDuration,
  formatSessionDuration,
} from "@/lib/services/sessionService";

interface SessionCardProps {
  session: Session | SessionWithStats;
  onPress?: (session: Session) => void;
  onDelete?: (sessionId: string) => void;
}

function isSessionWithStats(
  session: Session | SessionWithStats
): session is SessionWithStats {
  return "trickLogCount" in session;
}

export default function SessionCard({
  session,
  onPress,
  onDelete,
}: SessionCardProps) {
  const isActive = session.ended_at === null;
  const duration = getSessionDuration(session);
  const durationText = duration !== null ? formatSessionDuration(duration) : "--";

  // Format date
  const startDate = new Date(session.started_at);
  const dateText = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeText = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const handlePress = () => {
    onPress?.(session);
  };

  const handleDelete = () => {
    onDelete?.(session.id);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.dateSection}>
          {isActive && <View style={styles.activeDot} />}
          <View>
            <Text style={styles.dateText}>{dateText}</Text>
            <Text style={styles.timeText}>{timeText}</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.durationChip}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.durationText}>{durationText}</Text>
          </View>
          {onDelete && !isActive && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {session.location_name && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.locationText}>{session.location_name}</Text>
        </View>
      )}

      {isSessionWithStats(session) && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{session.trickLogCount}</Text>
            <Text style={styles.statLabel}>Tricks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{session.comboLogCount}</Text>
            <Text style={styles.statLabel}>Combos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{session.totalLands}</Text>
            <Text style={styles.statLabel}>Lands</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {session.totalAttempts > 0
                ? `${Math.round((session.totalLands / session.totalAttempts) * 100)}%`
                : "--"}
            </Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
      )}

      {session.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {session.notes}
        </Text>
      )}

      {isActive && (
        <View style={styles.activeLabel}>
          <Text style={styles.activeLabelText}>In Progress</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeContainer: {
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "#D0E4FF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  timeText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  durationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  deleteButton: {
    padding: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: "#666",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E0E0E0",
  },
  notes: {
    fontSize: 13,
    color: "#666",
    marginTop: 12,
    fontStyle: "italic",
  },
  activeLabel: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#4CAF50",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  activeLabelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
    textTransform: "uppercase",
  },
});
