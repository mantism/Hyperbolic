import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { File } from "expo-file-system";
import { getAllSurfaceTypes, getSurfaceTypeLabel } from "@/lib/surfaceTypes";
import { SelectedVideo, VideoType } from "@hyperbolic/shared-types";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import {
  getSelectedVideo,
  clearSelectedVideo,
} from "@/lib/stores/selectedVideoStore";
import {
  createTrickLog,
  updateTrickLog,
  deleteTrickLog,
  getTrickLog,
} from "@/lib/services/trickLogService";
import {
  uploadVideo,
  uploadThumbnail,
  linkVideoToTrickLog,
} from "@/lib/services/videoService";
import { useAuth } from "@/contexts/AuthContext";

interface TrickLogFormData {
  reps: number;
  rating: number | null;
  notes: string;
  surfaceType: string;
  video?: SelectedVideo | null;
  thumbnailUri?: string | null;
}

// Simplified media type for display purposes
interface LogMedia {
  id: string;
  url: string;
  thumbnail_url?: string | null;
}

const initialFormData: TrickLogFormData = {
  reps: 1,
  rating: null,
  notes: "",
  surfaceType: "",
  video: null,
  thumbnailUri: null,
};

export default function TrickLogScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id: string; // session ID
    trickName: string;
    trickId: string;
    userTrickId: string;
    logId?: string; // if editing
    sessionStartedAt: string;
    sessionLocationName?: string;
  }>();

  const {
    id: sessionId,
    trickName,
    trickId,
    userTrickId,
    logId,
    sessionStartedAt,
    sessionLocationName,
  } = params;

  const [formData, setFormData] = useState<TrickLogFormData>(initialFormData);
  const [existingMedia, setExistingMedia] = useState<LogMedia | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [loading, setLoading] = useState(!!logId);

  const isEditing = !!logId;

  // Load existing log data when editing
  useEffect(() => {
    if (logId) {
      loadExistingLog();
    }
  }, [logId]);

  // Check for selected video from store when screen gains focus
  useFocusEffect(
    useCallback(() => {
      const selectedVideoData = getSelectedVideo();
      if (selectedVideoData) {
        setFormData((prev) => ({
          ...prev,
          video: selectedVideoData.video,
          thumbnailUri: selectedVideoData.thumbnailUri,
        }));
        clearSelectedVideo();
      }
    }, []),
  );

  const loadExistingLog = async () => {
    if (!logId) return;
    try {
      const log = await getTrickLog(logId);
      if (log) {
        setFormData({
          reps: log.reps || 1,
          rating: log.rating ?? null,
          notes: log.notes || "",
          surfaceType: log.surface_type || "",
          video: null,
          thumbnailUri: null,
        });
        setExistingMedia(log.media?.[0] || null);
      }
    } catch (error) {
      console.error("Error loading log:", error);
      Alert.alert("Error", "Failed to load log data");
    } finally {
      setLoading(false);
    }
  };

  // Format session info for breadcrumb
  const startDate = new Date(sessionStartedAt);
  const dateStr = startDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const breadcrumb = sessionLocationName
    ? `${dateStr} • ${sessionLocationName} • ${timeStr}`
    : `${dateStr} • ${timeStr}`;

  const handleSubmit = async () => {
    if (formData.reps < 1) {
      Alert.alert("Error", "Please enter at least 1 rep");
      return;
    }

    if (!user) return;

    setSubmitting(true);
    try {
      let savedLogId = logId;

      if (isEditing && logId) {
        // Update existing log
        await updateTrickLog(logId, {
          reps: formData.reps,
          rating: formData.rating ?? undefined,
          notes: formData.notes || undefined,
          surfaceType: formData.surfaceType || undefined,
        });
      } else {
        // Create new log
        const log = await createTrickLog({
          userTrickId,
          reps: formData.reps,
          rating: formData.rating ?? undefined,
          notes: formData.notes || undefined,
          surfaceType: formData.surfaceType || undefined,
          sessionId,
        });
        savedLogId = log.id;
      }

      // Upload video if selected
      if (formData.video && savedLogId) {
        await uploadVideoForLog(savedLogId, formData);
      }

      router.back();
    } catch (error) {
      console.error("Error saving log:", error);
      Alert.alert("Error", "Failed to save log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadVideoForLog = async (
    logId: string,
    formData: TrickLogFormData,
  ): Promise<string | null> => {
    if (!formData.video || !user) return null;

    try {
      setUploadProgress("Uploading video...");

      const file = new File(formData.video.uri);
      const fileSize = await file.size;

      const videoId = await uploadVideo(
        formData.video.uri,
        {
          fileName: formData.video.filename,
          fileSize,
          mimeType: "video/mp4",
          parentId: trickId,
          userId: user.id,
          duration: formData.video.duration,
          type: VideoType.Trick,
        },
        (progress) => {
          setUploadProgress(`Uploading video... ${Math.round(progress)}%`);
        },
      );

      setUploadProgress("Linking video...");
      await linkVideoToTrickLog(videoId, logId);

      if (formData.thumbnailUri) {
        setUploadProgress("Uploading thumbnail...");
        await uploadThumbnail(videoId, formData.thumbnailUri, VideoType.Trick);
      }

      setUploadProgress(null);
      return videoId;
    } catch (error) {
      console.error("Error uploading video:", error);
      setUploadProgress(null);
      Alert.alert(
        "Video Upload Failed",
        "The log was saved but the video failed to upload.",
      );
      return null;
    }
  };

  const handleClose = () => {
    router.back();
  };

  const navigateToSelectVideo = () => {
    router.push({
      pathname: `/session/[id]/select-video`,
      params: {
        id: sessionId,
      },
    });
  };

  const handleRemoveVideo = () => {
    setFormData((prev) => ({
      ...prev,
      video: null,
      thumbnailUri: null,
    }));
  };

  const handleDelete = () => {
    Alert.alert("Delete Log", "Are you sure you want to delete this log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!logId) return;
          try {
            await deleteTrickLog(logId);
            router.back();
          } catch (error) {
            console.error("Error deleting log:", error);
            Alert.alert("Error", "Failed to delete log");
          }
        },
      },
    ]);
  };

  const handleRepsChange = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      reps: Math.max(1, prev.reps + delta),
    }));
  };

  const surfaceTypes = getAllSurfaceTypes();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.breadcrumbRow}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={submitting}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#666" />
          </TouchableOpacity>
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {breadcrumb}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {trickName}
        </Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Reps */}
        <View style={styles.formRow}>
          <Text style={styles.label}>Reps</Text>
          <View style={styles.repsStepper}>
            <TouchableOpacity
              onPress={() => handleRepsChange(-1)}
              style={[
                styles.repsButton,
                formData.reps <= 1 && styles.repsButtonDisabled,
              ]}
              disabled={formData.reps <= 1}
            >
              <Ionicons
                name="remove"
                size={24}
                color={formData.reps <= 1 ? "#ccc" : "#333"}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.repsInput}
              value={formData.reps.toString()}
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                if (!isNaN(num) && num >= 1) {
                  setFormData({ ...formData, reps: num });
                } else if (text === "") {
                  setFormData({ ...formData, reps: 1 });
                }
              }}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              onPress={() => handleRepsChange(1)}
              style={styles.repsButton}
            >
              <Ionicons name="add" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Surface Type */}
        <View style={styles.formRow}>
          <Text style={styles.label}>Surface Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.surfaceScroll}
          >
            {surfaceTypes.map((surface) => (
              <TouchableOpacity
                key={surface}
                style={[
                  styles.surfaceChip,
                  formData.surfaceType === surface && styles.surfaceChipActive,
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    surfaceType:
                      formData.surfaceType === surface ? "" : surface,
                  })
                }
              >
                <Text
                  style={[
                    styles.surfaceChipText,
                    formData.surfaceType === surface &&
                      styles.surfaceChipTextActive,
                  ]}
                >
                  {getSurfaceTypeLabel(surface)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Rating */}
        <View style={styles.formRow}>
          <Text style={styles.label}>Rating (1-10)</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  formData.rating === rating && styles.ratingButtonActive,
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    rating: formData.rating === rating ? null : rating,
                  })
                }
              >
                <Text
                  style={[
                    styles.ratingText,
                    formData.rating === rating && styles.ratingTextActive,
                  ]}
                >
                  {rating}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.formRow}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Any notes about this log..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Video section */}
        <View style={styles.formRow}>
          <Text style={styles.label}>Video</Text>

          {/* Show existing video thumbnail if editing */}
          {isEditing && existingMedia && !formData.video && (
            <TouchableOpacity
              style={styles.existingVideoThumbnail}
              onPress={() => setShowVideoPlayer(true)}
              activeOpacity={0.8}
            >
              {existingMedia.thumbnail_url ? (
                <Image
                  source={{ uri: existingMedia.thumbnail_url }}
                  style={styles.existingThumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.existingThumbnailPlaceholder}>
                  <Ionicons name="videocam-outline" size={32} color="#999" />
                </View>
              )}
              <View style={styles.playOverlay}>
                <View style={styles.playButtonCircle}>
                  <Ionicons name="play" size={20} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Show selected video thumbnail */}
          {formData.video && (
            <View style={styles.selectedVideoContainer}>
              <View style={styles.thumbnailWrapper}>
                {formData.thumbnailUri ? (
                  <Image
                    source={{ uri: formData.thumbnailUri }}
                    style={styles.videoThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.videoThumbnailPlaceholder}>
                    <Ionicons name="videocam" size={32} color="#999" />
                  </View>
                )}
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>
                    {Math.round(formData.video.duration)}s
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeVideoButton}
                onPress={handleRemoveVideo}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}

          {/* Add video button (only if no video selected) */}
          {!formData.video && (
            <TouchableOpacity
              style={styles.addVideoButton}
              onPress={navigateToSelectVideo}
            >
              <Ionicons name="videocam-outline" size={24} color="#007AFF" />
              <Text style={styles.addVideoText}>
                {isEditing && existingMedia ? "Replace Video" : "Add Video"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delete button (below the fold) */}
        {isEditing && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={submitting}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={styles.deleteButtonText}>Delete Log</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {uploadProgress ? (
          <View style={styles.uploadProgressContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                submitting && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Save Changes" : "Add Log"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={showVideoPlayer}
        video={existingMedia}
        onClose={() => setShowVideoPlayer(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  body: {
    flex: 1,
    padding: 16,
  },
  formRow: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  repsStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  repsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  repsButtonDisabled: {
    opacity: 0.5,
  },
  repsInput: {
    width: 80,
    height: 56,
    fontSize: 32,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  surfaceScroll: {
    flexDirection: "row",
  },
  surfaceChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  surfaceChipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  surfaceChipText: {
    fontSize: 14,
    color: "#666",
  },
  surfaceChipTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  ratingContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ratingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  ratingButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
  },
  ratingTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  existingVideoThumbnail: {
    width: 108,
    height: 192,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    position: "relative",
    marginBottom: 8,
  },
  existingThumbnailImage: {
    width: "100%",
    height: "100%",
  },
  existingThumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E5E5",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  playButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 2,
  },
  selectedVideoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbnailWrapper: {
    position: "relative",
  },
  videoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  videoThumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "500",
  },
  removeVideoButton: {
    padding: 4,
  },
  addVideoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  addVideoText: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "500",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  deleteButtonText: {
    fontSize: 15,
    color: "#FF3B30",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  saveButtonText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadProgressContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
  },
  uploadProgressText: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "500",
  },
});
