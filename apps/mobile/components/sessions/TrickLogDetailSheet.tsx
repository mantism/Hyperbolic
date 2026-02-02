import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as VideoThumbnails from "expo-video-thumbnails";
import { getAllSurfaceTypes, getSurfaceTypeLabel } from "@/lib/surfaceTypes";
import { SelectedVideo, TrickVideo } from "@hyperbolic/shared-types";
import MediaSelector from "@/app/upload-video/components/MediaSelector";
import { VideoPlayerModal } from "@/components/video";
import SessionModal from "./SessionModal";

export interface TrickLogFormData {
  reps: number;
  rating: number | null;
  notes: string;
  surfaceType: string;
  video?: SelectedVideo | null;
  thumbnailUri?: string | null;
}

interface SessionInfo {
  startedAt: string;
  locationName?: string | null;
}

interface TrickLogDetailSheetProps {
  visible: boolean;
  trickName: string;
  sessionInfo: SessionInfo;
  /** If provided, we're editing; otherwise creating */
  existingLog?: {
    id: string;
    reps: number;
    rating?: number | null;
    notes?: string | null;
    surfaceType?: string | null;
    media?: TrickVideo | null;
  } | null;
  onClose: () => void;
  onSave: (data: TrickLogFormData) => Promise<void>;
  onDelete?: () => void;
}

const initialFormData: TrickLogFormData = {
  reps: 1,
  rating: null,
  notes: "",
  surfaceType: "",
  video: null,
  thumbnailUri: null,
};

export default function TrickLogDetailSheet({
  visible,
  trickName,
  sessionInfo,
  existingLog,
  onClose,
  onSave,
  onDelete,
}: TrickLogDetailSheetProps) {
  const [formData, setFormData] = useState<TrickLogFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const isEditing = !!existingLog;

  // Populate form with existing data when editing
  useEffect(() => {
    if (existingLog) {
      setFormData({
        reps: existingLog.reps || 1,
        rating: existingLog.rating ?? null,
        notes: existingLog.notes || "",
        surfaceType: existingLog.surfaceType || "",
        video: null,
        thumbnailUri: null,
      });
    } else {
      setFormData(initialFormData);
    }
    setUploadProgress(null);
  }, [existingLog, visible]);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (formData.reps < 1) {
      Alert.alert("Error", "Please enter at least 1 rep");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(formData);
      setFormData(initialFormData);
      onClose();
    } catch (error) {
      console.error("Error saving log:", error);
      Alert.alert("Error", "Failed to save log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setShowMediaSelector(false);
    setUploadProgress(null);
    onClose();
  };

  const handleVideoSelected = async (video: SelectedVideo) => {
    try {
      // Generate thumbnail from the video
      const thumbnail = await VideoThumbnails.getThumbnailAsync(video.uri, {
        time: 0,
        quality: 0.7,
      });

      setFormData((prev) => ({
        ...prev,
        video,
        thumbnailUri: thumbnail.uri,
      }));
      setShowMediaSelector(false);
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      // Still use the video even if thumbnail fails
      setFormData((prev) => ({
        ...prev,
        video,
        thumbnailUri: null,
      }));
      setShowMediaSelector(false);
    }
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
        onPress: () => {
          onDelete?.();
          onClose();
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

  // When showing media selector, render it instead of the form
  if (showMediaSelector) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowMediaSelector(false)}
      >
        <View style={styles.mediaSelectorContainer}>
          <View style={styles.mediaSelectorHeader}>
            <TouchableOpacity
              onPress={() => setShowMediaSelector(false)}
              style={styles.closeButton}
            >
              <Ionicons name="arrow-back" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.mediaSelectorTitle}>Select Video</Text>
            <View style={styles.placeholder} />
          </View>
          <MediaSelector
            onVideoSelected={handleVideoSelected}
            onCancel={() => setShowMediaSelector(false)}
          />
        </View>
      </Modal>
    );
  }

  return (
    <SessionModal
      visible={visible}
      title={trickName}
      sessionInfo={sessionInfo}
      onClose={handleClose}
      closeDisabled={submitting}
    >
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
          {isEditing && existingLog?.media && !formData.video && (
            <TouchableOpacity
              style={styles.existingVideoThumbnail}
              onPress={() => setShowVideoPlayer(true)}
              activeOpacity={0.8}
            >
              {existingLog.media.thumbnail_url ? (
                <Image
                  source={{ uri: existingLog.media.thumbnail_url }}
                  style={styles.existingThumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.existingThumbnailPlaceholder}>
                  <Ionicons name="videocam-outline" size={32} color="#999" />
                </View>
              )}
              {/* Play button overlay */}
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
              onPress={() => setShowMediaSelector(true)}
            >
              <Ionicons name="videocam-outline" size={24} color="#007AFF" />
              <Text style={styles.addVideoText}>
                {isEditing && existingLog?.media
                  ? "Replace Video"
                  : "Add Video"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delete button (below the fold) */}
        {isEditing && onDelete && (
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
        video={existingLog?.media ?? null}
        onClose={() => setShowVideoPlayer(false)}
      />
    </SessionModal>
  );
}

const styles = StyleSheet.create({
  // Used by MediaSelector modal
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  placeholder: {
    width: 44,
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
  mediaSelectorContainer: {
    padding: 16,
    flex: 1,
    backgroundColor: "#fff",
  },
  mediaSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  mediaSelectorTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
});
