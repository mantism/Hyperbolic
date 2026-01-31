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
  getSessionWithStats,
  getSessionLogs,
  getSessionDuration,
  formatSessionDuration,
  deleteSession,
  SessionWithStats,
} from "@/lib/services/sessionService";
import {
  createTrickLog,
  updateTrickLog,
  deleteTrickLog,
} from "@/lib/services/trickLogService";
import {
  createComboLog,
  updateComboLog,
  deleteComboLog,
} from "@/lib/services/comboLogService";
import {
  createUserTrick,
  getUserTrick,
} from "@/lib/services/userTrickService";
import { useSession } from "@/contexts/SessionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Trick, SequenceItem } from "@hyperbolic/shared-types";
import { sequenceToComboGraph } from "@/lib/utils/comboRendering";
import SessionTrickCard from "./SessionTrickCard";
import SessionComboCard from "./SessionComboCard";
import SessionTrickInput from "./SessionTrickInput";
import ComboComposer from "./ComboComposer";

interface SessionDetailPageProps {
  sessionId: string;
  onClose: () => void;
}

interface TrickLogItem {
  id: string;
  name: string;
  reps: number;
  landed: boolean;
  logged_at: string;
}

interface ComboLogItem {
  id: string;
  name: string;
  reps: number;
  landed: boolean;
  logged_at: string;
}

export default function SessionDetailPage({
  sessionId,
  onClose,
}: SessionDetailPageProps) {
  const { user } = useAuth();
  const { endSession, activeSession } = useSession();
  const [session, setSession] = useState<SessionWithStats | null>(null);
  const [trickLogs, setTrickLogs] = useState<TrickLogItem[]>([]);
  const [comboLogs, setComboLogs] = useState<ComboLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showTrickInput, setShowTrickInput] = useState(false);
  const [showComboInput, setShowComboInput] = useState(false);
  const [comboSequence, setComboSequence] = useState<SequenceItem[]>([]);
  const [savingCombo, setSavingCombo] = useState(false);

  const isActive = activeSession?.id === sessionId;

  const fetchSessionData = useCallback(async () => {
    try {
      const [sessionData, logsData] = await Promise.all([
        getSessionWithStats(sessionId),
        getSessionLogs(sessionId),
      ]);

      setSession(sessionData);

      // Map trick logs
      const mappedTrickLogs: TrickLogItem[] = logsData.trickLogs.map(
        (log: any) => ({
          id: log.id,
          name: log.user_trick?.trick?.name || "Unknown Trick",
          reps: log.reps || 1,
          landed: log.landed ?? true,
          logged_at: log.logged_at,
        })
      );

      // Map combo logs
      const mappedComboLogs: ComboLogItem[] = logsData.comboLogs.map(
        (log: any) => ({
          id: log.id,
          name: log.user_combo?.name || "Unknown Combo",
          reps: log.reps || 1,
          landed: log.landed ?? true,
          logged_at: log.logged_at,
        })
      );

      setTrickLogs(mappedTrickLogs);
      setComboLogs(mappedComboLogs);
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
              fetchSessionData();
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

  // Trick handlers
  const handleAddTrick = async (trick: Trick) => {
    if (!user) return;

    try {
      // Get or create UserTrick
      let userTrick = await getUserTrick(user.id, trick.id);
      if (!userTrick) {
        userTrick = await createUserTrick({
          userId: user.id,
          trickId: trick.id,
          landed: true,
        });
      }

      // Create trick log
      const log = await createTrickLog({
        userTrickId: userTrick.id,
        landed: true,
        reps: 1,
        sessionId,
      });

      // Add to local state
      setTrickLogs((prev) => [
        {
          id: log.id,
          name: trick.name,
          reps: 1,
          landed: true,
          logged_at: log.logged_at,
        },
        ...prev,
      ]);

      // Refresh stats
      fetchSessionData();
    } catch (error) {
      console.error("Error adding trick:", error);
      Alert.alert("Error", "Failed to add trick");
    }
  };

  const handleUpdateTrickReps = async (logId: string, reps: number) => {
    try {
      await updateTrickLog(logId, { reps });
      setTrickLogs((prev) =>
        prev.map((log) => (log.id === logId ? { ...log, reps } : log))
      );
    } catch (error) {
      console.error("Error updating trick reps:", error);
      Alert.alert("Error", "Failed to update reps");
    }
  };

  const handleDeleteTrickLog = async (logId: string) => {
    try {
      await deleteTrickLog(logId);
      setTrickLogs((prev) => prev.filter((log) => log.id !== logId));
      fetchSessionData();
    } catch (error) {
      console.error("Error deleting trick log:", error);
      Alert.alert("Error", "Failed to delete log");
    }
  };

  // Combo handlers
  const handleAddCombo = async (sequence: SequenceItem[]) => {
    if (!user || sequence.length === 0) return;

    setSavingCombo(true);
    try {
      const comboGraph = sequenceToComboGraph(sequence);

      const log = await createComboLog({
        userId: user.id,
        comboGraph,
        landed: true,
        reps: 1,
        sessionId,
      });

      // Generate combo name from sequence
      const trickNames = sequence
        .filter((item) => item.type === "trick")
        .map((item) => item.data.trick_id)
        .join(" → ");

      // Add to local state
      setComboLogs((prev) => [
        {
          id: log.id,
          name: trickNames || "Combo",
          reps: 1,
          landed: true,
          logged_at: log.logged_at,
        },
        ...prev,
      ]);

      // Clear composer and hide input
      setComboSequence([]);
      setShowComboInput(false);
      fetchSessionData();
    } catch (error) {
      console.error("Error adding combo:", error);
      Alert.alert("Error", "Failed to add combo");
    } finally {
      setSavingCombo(false);
    }
  };

  const handleUpdateComboReps = async (logId: string, reps: number) => {
    try {
      await updateComboLog(logId, { reps });
      setComboLogs((prev) =>
        prev.map((log) => (log.id === logId ? { ...log, reps } : log))
      );
    } catch (error) {
      console.error("Error updating combo reps:", error);
      Alert.alert("Error", "Failed to update reps");
    }
  };

  const handleDeleteComboLog = async (logId: string) => {
    try {
      await deleteComboLog(logId);
      setComboLogs((prev) => prev.filter((log) => log.id !== logId));
      fetchSessionData();
    } catch (error) {
      console.error("Error deleting combo log:", error);
      Alert.alert("Error", "Failed to delete log");
    }
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
  const durationText =
    duration !== null ? formatSessionDuration(duration) : "--";

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
          <TouchableOpacity
            onPress={handleDeleteSession}
            style={styles.deleteButton}
          >
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
        keyboardShouldPersistTaps="handled"
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
        </View>

        {/* Notes */}
        {session.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}

        {/* Tricks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              TRICKS ({trickLogs.length})
            </Text>
            {isActive && (
              <TouchableOpacity
                onPress={() => setShowTrickInput(!showTrickInput)}
                style={styles.addButton}
              >
                <Ionicons
                  name={showTrickInput ? "close" : "add"}
                  size={24}
                  color="#007AFF"
                />
              </TouchableOpacity>
            )}
          </View>

          {showTrickInput && (
            <SessionTrickInput
              onSelect={handleAddTrick}
              onDismiss={() => setShowTrickInput(false)}
            />
          )}

          {trickLogs.length === 0 && !showTrickInput ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No tricks logged yet</Text>
            </View>
          ) : (
            trickLogs.map((log) => (
              <SessionTrickCard
                key={log.id}
                trickLog={log}
                onRepsChange={(reps) => handleUpdateTrickReps(log.id, reps)}
                onDelete={() => handleDeleteTrickLog(log.id)}
              />
            ))
          )}
        </View>

        {/* Combos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              COMBOS ({comboLogs.length})
            </Text>
            {isActive && (
              <TouchableOpacity
                onPress={() => setShowComboInput(!showComboInput)}
                style={styles.addButton}
              >
                <Ionicons
                  name={showComboInput ? "close" : "add"}
                  size={24}
                  color="#007AFF"
                />
              </TouchableOpacity>
            )}
          </View>

          {showComboInput && (
            <View style={styles.comboInputContainer}>
              <ComboComposer
                initialSequence={comboSequence}
                onSequenceChange={setComboSequence}
                onSave={handleAddCombo}
                onCancel={() => {
                  setComboSequence([]);
                  setShowComboInput(false);
                }}
                saving={savingCombo}
                saveButtonText="Add Combo"
              />
            </View>
          )}

          {comboLogs.length === 0 && !showComboInput ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No combos logged yet</Text>
            </View>
          ) : (
            comboLogs.map((log) => (
              <SessionComboCard
                key={log.id}
                comboLog={log}
                onRepsChange={(reps) => handleUpdateComboReps(log.id, reps)}
                onDelete={() => handleDeleteComboLog(log.id)}
              />
            ))
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
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
  notesText: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addButton: {
    padding: 4,
  },
  emptySection: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptySectionText: {
    fontSize: 14,
    color: "#999",
  },
  comboInputContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FAFAFA",
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
