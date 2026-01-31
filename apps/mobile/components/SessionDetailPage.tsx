import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Session,
  getSessionWithStats,
  getSessionLogs,
  getSessionDuration,
  formatSessionDuration,
  deleteSession,
  SessionWithStats,
} from "@/lib/services/sessionService";
import { useSession } from "@/contexts/SessionContext";

interface SessionDetailPageProps {
  sessionId: string;
  onClose: () => void;
}

interface SessionLog {
  id: string;
  type: "trick" | "combo";
  name: string;
  landed: boolean;
  logged_at: string;
  surface_type?: string | null;
  notes?: string | null;
  reps?: number;
}

export default function SessionDetailPage({
  sessionId,
  onClose,
}: SessionDetailPageProps) {
  const { endSession, activeSession } = useSession();
  const [session, setSession] = useState<SessionWithStats | null>(null);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);

  const isActive = activeSession?.id === sessionId;

  const fetchSessionData = useCallback(async () => {
    try {
      const [sessionData, logsData] = await Promise.all([
        getSessionWithStats(sessionId),
        getSessionLogs(sessionId),
      ]);

      setSession(sessionData);

      // Combine and sort logs by time
      const combinedLogs: SessionLog[] = [
        ...logsData.trickLogs.map((log: any) => ({
          id: log.id,
          type: "trick" as const,
          name: log.user_trick?.trick?.name || "Unknown Trick",
          landed: log.landed ?? false,
          logged_at: log.logged_at,
          surface_type: log.surface_type,
          notes: log.notes,
          reps: log.reps,
        })),
        ...logsData.comboLogs.map((log: any) => ({
          id: log.id,
          type: "combo" as const,
          name: log.user_combo?.name || "Unknown Combo",
          landed: log.landed ?? false,
          logged_at: log.logged_at,
          surface_type: log.surface_type,
          notes: log.notes,
        })),
      ].sort(
        (a, b) =>
          new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
      );

      setLogs(combinedLogs);
    } catch (error) {
      console.error("Error fetching session data:", error);
      Alert.alert("Error", "Failed to load session data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessionData();
  };

  const handleEndSession = async () => {
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
              fetchSessionData(); // Refresh to show ended state
            } catch (error) {
              console.error("Error ending session:", error);
              Alert.alert("Error", "Failed to end session");
            } finally {
              setEnding(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteSession = () => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session? The logs will remain but won't be associated with any session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSession(sessionId);
              onClose();
            } catch (error) {
              console.error("Error deleting session:", error);
              Alert.alert("Error", "Failed to delete session");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Session</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Session</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const duration = getSessionDuration(session);
  const durationText = duration !== null ? formatSessionDuration(duration) : "--";

  const startDate = new Date(session.started_at);
  const dateText = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeText = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Session Details</Text>
        {!isActive && (
          <TouchableOpacity onPress={handleDeleteSession} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
        )}
        {isActive && <View style={styles.placeholder} />}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Status Banner */}
        {isActive && (
          <View style={styles.activeBanner}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBannerText}>Session in progress</Text>
          </View>
        )}

        {/* Session Info */}
        <View style={styles.infoSection}>
          <Text style={styles.dateText}>{dateText}</Text>
          <Text style={styles.timeText}>Started at {timeText}</Text>

          {session.location_name && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.locationText}>{session.location_name}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{durationText}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{session.trickLogCount}</Text>
              <Text style={styles.statLabel}>Tricks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{session.comboLogCount}</Text>
              <Text style={styles.statLabel}>Combos</Text>
            </View>
          </View>
          <View style={[styles.statRow, styles.statRowSecond]}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{session.totalLands}</Text>
              <Text style={styles.statLabel}>Lands</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{session.totalAttempts}</Text>
              <Text style={styles.statLabel}>Attempts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {session.totalAttempts > 0
                  ? `${Math.round((session.totalLands / session.totalAttempts) * 100)}%`
                  : "--"}
              </Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {session.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}

        {/* Logs */}
        <View style={styles.logsSection}>
          <Text style={styles.sectionTitle}>
            Activity ({logs.length} {logs.length === 1 ? "log" : "logs"})
          </Text>

          {logs.length === 0 ? (
            <View style={styles.emptyLogs}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyLogsText}>No logs yet</Text>
              <Text style={styles.emptyLogsSubtext}>
                Start logging tricks and combos!
              </Text>
            </View>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logIcon}>
                  <Ionicons
                    name={log.type === "trick" ? "flash" : "list"}
                    size={16}
                    color="#666"
                  />
                </View>
                <View style={styles.logContent}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logName} numberOfLines={1}>
                      {log.name}
                    </Text>
                    <View
                      style={[
                        styles.landedBadge,
                        log.landed ? styles.landedSuccess : styles.landedFail,
                      ]}
                    >
                      <Text
                        style={[
                          styles.landedText,
                          log.landed
                            ? styles.landedTextSuccess
                            : styles.landedTextFail,
                        ]}
                      >
                        {log.landed ? "Landed" : "Missed"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.logMeta}>
                    <Text style={styles.logTime}>
                      {new Date(log.logged_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                    {log.reps && log.reps > 1 && (
                      <Text style={styles.logReps}>×{log.reps}</Text>
                    )}
                    {log.surface_type && (
                      <Text style={styles.logSurface}>{log.surface_type}</Text>
                    )}
                  </View>
                  {log.notes && (
                    <Text style={styles.logNotes} numberOfLines={2}>
                      {log.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* End Session Button */}
      {isActive && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndSession}
            disabled={ending}
          >
            {ending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="stop" size={20} color="#fff" />
                <Text style={styles.endButtonText}>End Session</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 30,
  },
  deleteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 10,
    gap: 8,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  activeBannerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2E7D32",
  },
  infoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dateText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: "#666",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
  },
  statsCard: {
    margin: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    overflow: "hidden",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statRowSecond: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E0E0E0",
  },
  notesSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  logsSection: {
    padding: 16,
  },
  emptyLogs: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyLogsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginTop: 12,
  },
  emptyLogsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  logItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  logName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  landedBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  landedSuccess: {
    backgroundColor: "#E8F5E9",
  },
  landedFail: {
    backgroundColor: "#FFEBEE",
  },
  landedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  landedTextSuccess: {
    color: "#2E7D32",
  },
  landedTextFail: {
    color: "#C62828",
  },
  logMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logTime: {
    fontSize: 12,
    color: "#999",
  },
  logReps: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  logSurface: {
    fontSize: 12,
    color: "#666",
  },
  logNotes: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
    marginTop: 6,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  endButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
