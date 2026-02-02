import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSession } from "@/contexts/SessionContext";
import {
  getSessionDuration,
  formatSessionDuration,
} from "@/lib/services/sessionService";

interface ActiveSessionBannerProps {
  onPress?: () => void;
}

export default function ActiveSessionBanner({ onPress }: ActiveSessionBannerProps) {
  const { activeSession, endSession, hasActiveSession } = useSession();
  const [duration, setDuration] = useState<string>("0m");
  const [ending, setEnding] = useState(false);

  // Update duration every minute
  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const updateDuration = () => {
      const minutes = getSessionDuration(activeSession);
      if (minutes !== null) {
        setDuration(formatSessionDuration(minutes));
      }
    };

    // Initial update
    updateDuration();

    // Update every 30 seconds
    const interval = setInterval(updateDuration, 30000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleEndSession = () => {
    Alert.alert(
      "End Session",
      "Are you sure you want to end this training session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: async () => {
            setEnding(true);
            try {
              await endSession();
            } catch (error) {
              console.error("Error ending session:", error);
              Alert.alert("Error", "Failed to end session. Please try again.");
            } finally {
              setEnding(false);
            }
          },
        },
      ]
    );
  };

  if (!hasActiveSession || !activeSession) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.leftSection}>
        <View style={styles.pulsingDot} />
        <View style={styles.info}>
          <Text style={styles.label}>Session Active</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {activeSession.location_name && (
          <View style={styles.locationChip}>
            <Ionicons name="location" size={12} color="#007AFF" />
            <Text style={styles.locationText} numberOfLines={1}>
              {activeSession.location_name}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndSession}
          disabled={ending}
        >
          <Ionicons name="stop" size={16} color="#fff" />
          <Text style={styles.endButtonText}>
            {ending ? "..." : "End"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F7FF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#D0E4FF",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
  },
  info: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  duration: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    maxWidth: 120,
  },
  locationText: {
    fontSize: 12,
    color: "#007AFF",
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
