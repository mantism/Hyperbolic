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
import { createUserTrick, getUserTrick } from "@/lib/services/userTrickService";
import { useSession } from "@/contexts/SessionContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trick,
  SequenceItem,
  VideoType,
  TrickVideo,
} from "@hyperbolic/shared-types";
import { File } from "expo-file-system";
import {
  uploadVideo,
  uploadThumbnail,
  linkVideoToTrickLog,
} from "@/lib/services/videoService";
import { sequenceToComboGraph } from "@/lib/utils/comboRendering";
import SessionTrickCard, {
  TrickWithLogs,
  TrickLogItem,
} from "./SessionTrickCard";
import SessionComboCard from "./SessionComboCard";
import SessionTrickInput from "./SessionTrickInput";
import ComboComposer from "./ComboComposer";
import TrickLogDetailSheet, { TrickLogFormData } from "./TrickLogDetailSheet";
import VideoPlayerModal from "./VideoPlayerModal";

interface SessionDetailPageProps {
  sessionId: string;
  onClose: () => void;
}

interface RawTrickLog {
  id: string;
  trickId: string;
  trickName: string;
  userTrickId: string;
  reps: number;
  rating?: number | null;
  notes?: string | null;
  surfaceType?: string | null;
  media?: TrickVideo | null;
  logged_at: string;
}

interface TrickLogSheetContext {
  mode: "create" | "edit";
  trickName: string;
  userTrickId: string;
  trickId: string;
  existingLog?: TrickLogItem & {
    rating?: number | null;
    notes?: string | null;
  };
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
  const [rawTrickLogs, setRawTrickLogs] = useState<RawTrickLog[]>([]);
  const [comboLogs, setComboLogs] = useState<ComboLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showTrickInput, setShowTrickInput] = useState(false);
  const [showComboInput, setShowComboInput] = useState(false);
  const [comboSequence, setComboSequence] = useState<SequenceItem[]>([]);
  const [savingCombo, setSavingCombo] = useState(false);

  // Trick log detail sheet state
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [logSheetContext, setLogSheetContext] =
    useState<TrickLogSheetContext | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<string | null>(
    null,
  );

  // Video player state
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState<TrickVideo | null>(null);

  // Group trick logs by trick for the expandable cards
  const tricksWithLogs: TrickWithLogs[] = React.useMemo(() => {
    const grouped = new Map<string, TrickWithLogs>();

    for (const log of rawTrickLogs) {
      const key = log.trickId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          trickId: log.trickId,
          trickName: log.trickName,
          userTrickId: log.userTrickId,
          logs: [],
        });
      }
      grouped.get(key)!.logs.push({
        id: log.id,
        reps: log.reps,
        surfaceType: log.surfaceType,
        media: log.media,
        logged_at: log.logged_at,
      });
    }

    return Array.from(grouped.values());
  }, [rawTrickLogs]);

  // Get trick IDs for filtering autocomplete
  const addedTrickIds = tricksWithLogs.map((t) => t.trickId);

  const isActive = activeSession?.id === sessionId;

  const fetchSessionData = useCallback(async () => {
    try {
      const [sessionData, logsData] = await Promise.all([
        getSessionWithStats(sessionId),
        getSessionLogs(sessionId),
      ]);

      setSession(sessionData);

      // Map trick logs with full data for grouping
      const mappedTrickLogs: RawTrickLog[] = logsData.trickLogs.map(
        (log: any) => ({
          id: log.id,
          trickId: log.user_trick?.trick?.id || "",
          trickName: log.user_trick?.trick?.name || "Unknown Trick",
          userTrickId: log.user_trick_id || "",
          reps: log.reps || 1,
          rating: log.rating,
          notes: log.notes,
          surfaceType: log.surface_type,
          media: log.media?.[0] || null,
          logged_at: log.logged_at,
        }),
      );

      // Map combo logs
      const mappedComboLogs: ComboLogItem[] = logsData.comboLogs.map(
        (log: any) => ({
          id: log.id,
          name: log.user_combo?.name || "Unknown Combo",
          reps: log.reps || 1,
          landed: log.landed ?? true,
          logged_at: log.logged_at,
        }),
      );

      setRawTrickLogs(mappedTrickLogs);
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
      ],
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
      ],
    );
  };

  // Trick handlers

  // When user selects a trick from autocomplete, open the sheet to create a log
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

      // Open sheet in create mode
      setLogSheetContext({
        mode: "create",
        trickName: trick.name,
        userTrickId: userTrick.id,
        trickId: trick.id,
      });
      setShowLogSheet(true);
    } catch (error) {
      console.error("Error preparing trick:", error);
      Alert.alert("Error", "Failed to add trick");
    }
  };

  // Open sheet to add another log for an existing trick
  const handleAddLogToTrick = (
    userTrickId: string,
    trickId: string,
    trickName: string,
  ) => {
    setLogSheetContext({
      mode: "create",
      trickName,
      userTrickId,
      trickId,
    });
    setShowLogSheet(true);
  };

  // Open sheet to edit an existing log
  const handleLogPress = (trickWithLogs: TrickWithLogs, log: TrickLogItem) => {
    // Find the raw log to get rating/notes
    const rawLog = rawTrickLogs.find((l) => l.id === log.id);

    setLogSheetContext({
      mode: "edit",
      trickName: trickWithLogs.trickName,
      userTrickId: trickWithLogs.userTrickId,
      trickId: trickWithLogs.trickId,
      existingLog: {
        ...log,
        rating: rawLog?.rating,
        notes: rawLog?.notes,
      },
    });
    setShowLogSheet(true);
  };

  // Helper to upload video for a trick log
  const uploadVideoForLog = async (
    logId: string,
    trickId: string,
    formData: TrickLogFormData,
  ): Promise<string | null> => {
    if (!formData.video || !user) return null;

    try {
      setVideoUploadProgress("Uploading video...");

      const file = new File(formData.video.uri);
      const fileSize = await file.size;

      const videoId = await uploadVideo(
        formData.video.uri,
        {
          fileName: formData.video.filename,
          fileSize,
          mimeType: "video/mp4",
          parentId: trickId, // trick ID (slug), not userTrickId
          userId: user.id,
          duration: formData.video.duration,
          type: VideoType.Trick,
        },
        (progress) => {
          setVideoUploadProgress(`Uploading video... ${Math.round(progress)}%`);
        },
      );

      // Link the video to the trick log
      setVideoUploadProgress("Linking video...");
      await linkVideoToTrickLog(videoId, logId);

      // Upload thumbnail if we have one
      if (formData.thumbnailUri) {
        setVideoUploadProgress("Uploading thumbnail...");
        await uploadThumbnail(videoId, formData.thumbnailUri, VideoType.Trick);
      }

      setVideoUploadProgress(null);
      return videoId;
    } catch (error) {
      console.error("Error uploading video:", error);
      setVideoUploadProgress(null);
      Alert.alert(
        "Video Upload Failed",
        "The log was saved but the video failed to upload.",
      );
      return null;
    }
  };

  // Save handler for the sheet (create or update)
  const handleSaveLog = async (formData: TrickLogFormData) => {
    if (!logSheetContext || !user) return;

    if (logSheetContext.mode === "create") {
      // Create new log
      const log = await createTrickLog({
        userTrickId: logSheetContext.userTrickId,
        reps: formData.reps,
        rating: formData.rating ?? undefined,
        notes: formData.notes || undefined,
        surfaceType: formData.surfaceType || undefined,
        sessionId,
      });

      // Upload video if selected
      if (formData.video) {
        await uploadVideoForLog(log.id, logSheetContext.trickId, formData);
      }

      // Refetch to get fresh data (including video URL if uploaded)
      fetchSessionData();
    } else if (logSheetContext.mode === "edit" && logSheetContext.existingLog) {
      // Update existing log
      const logId = logSheetContext.existingLog.id;
      await updateTrickLog(logId, {
        reps: formData.reps,
        rating: formData.rating ?? undefined,
        notes: formData.notes || undefined,
        surfaceType: formData.surfaceType || undefined,
      });

      // Upload video if newly selected
      if (formData.video) {
        await uploadVideoForLog(logId, logSheetContext.trickId, formData);
        fetchSessionData();
        return; // Don't do local state update - fetchSessionData handles it
      }

      // Only do local state update if no video was uploaded
      setRawTrickLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                reps: formData.reps,
                rating: formData.rating,
                notes: formData.notes,
                surfaceType: formData.surfaceType || null,
              }
            : log,
        ),
      );
    }
  };

  // Delete handler for the sheet
  const handleDeleteLogFromSheet = async () => {
    if (!logSheetContext?.existingLog) return;

    const logId = logSheetContext.existingLog.id;
    await deleteTrickLog(logId);
    setRawTrickLogs((prev) => prev.filter((log) => log.id !== logId));
    fetchSessionData();
  };

  const handleDeleteTrickLog = async (logId: string) => {
    try {
      await deleteTrickLog(logId);
      setRawTrickLogs((prev) => prev.filter((log) => log.id !== logId));
      fetchSessionData();
    } catch (error) {
      console.error("Error deleting trick log:", error);
      Alert.alert("Error", "Failed to delete log");
    }
  };

  const handleDeleteAllTrickLogs = async (trickWithLogs: TrickWithLogs) => {
    try {
      // Delete all logs for this trick
      await Promise.all(
        trickWithLogs.logs.map((log) => deleteTrickLog(log.id)),
      );
      setRawTrickLogs((prev) =>
        prev.filter((log) => log.trickId !== trickWithLogs.trickId),
      );
      fetchSessionData();
    } catch (error) {
      console.error("Error deleting trick logs:", error);
      Alert.alert("Error", "Failed to delete logs");
    }
  };

  const handlePlayVideo = (video: TrickVideo) => {
    setVideoToPlay(video);
    setShowVideoPlayer(true);
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
        prev.map((log) => (log.id === logId ? { ...log, reps } : log)),
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
              TRICKS ({tricksWithLogs.length})
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
              excludeTrickIds={addedTrickIds}
            />
          )}

          {tricksWithLogs.length === 0 && !showTrickInput ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No tricks logged yet</Text>
            </View>
          ) : (
            tricksWithLogs.map((twl) => (
              <SessionTrickCard
                key={twl.trickId}
                trickWithLogs={twl}
                onAddLog={() =>
                  handleAddLogToTrick(
                    twl.userTrickId,
                    twl.trickId,
                    twl.trickName,
                  )
                }
                onLogPress={(log) => handleLogPress(twl, log)}
                onDeleteLog={handleDeleteTrickLog}
                onDeleteAllLogs={() => handleDeleteAllTrickLogs(twl)}
                onPlayVideo={handlePlayVideo}
              />
            ))
          )}
        </View>

        {/* Combos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>COMBOS ({comboLogs.length})</Text>
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

      {/* Trick Log Detail Sheet */}
      <TrickLogDetailSheet
        visible={showLogSheet}
        trickName={logSheetContext?.trickName || ""}
        sessionInfo={{
          startedAt: session.started_at,
          locationName: session.location_name,
        }}
        existingLog={logSheetContext?.existingLog}
        onClose={() => {
          setShowLogSheet(false);
          setLogSheetContext(null);
        }}
        onSave={handleSaveLog}
        onDelete={
          logSheetContext?.mode === "edit"
            ? handleDeleteLogFromSheet
            : undefined
        }
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={showVideoPlayer}
        video={videoToPlay}
        onClose={() => {
          setShowVideoPlayer(false);
          setVideoToPlay(null);
        }}
      />
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
