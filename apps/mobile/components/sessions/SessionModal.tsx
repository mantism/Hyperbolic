import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface SessionInfo {
  startedAt: string;
  locationName?: string | null;
}

interface SessionModalProps {
  visible: boolean;
  title: string;
  sessionInfo: SessionInfo;
  onClose: () => void;
  /** Whether closing is disabled (e.g., during submission) */
  closeDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * Shared modal wrapper for session-related sheets.
 * Includes a session context banner showing date/location/time.
 */
export default function SessionModal({
  visible,
  title,
  sessionInfo,
  onClose,
  closeDisabled,
  children,
}: SessionModalProps) {
  const startDate = new Date(sessionInfo.startedAt);

  // Format: MM/DD/YY
  const dateStr = startDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });

  // Format: 2:30 PM
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Build breadcrumb text
  const breadcrumb = sessionInfo.locationName
    ? `${dateStr} • ${sessionInfo.locationName} • ${timeStr}`
    : `${dateStr} • ${timeStr}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {/* Breadcrumb row: back button + session info */}
          <View style={styles.breadcrumbRow}>
            <TouchableOpacity
              onPress={onClose}
              disabled={closeDisabled}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color="#666" />
            </TouchableOpacity>
            <Text style={styles.breadcrumbText} numberOfLines={1}>
              {breadcrumb}
            </Text>
          </View>
          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  breadcrumbText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
});
