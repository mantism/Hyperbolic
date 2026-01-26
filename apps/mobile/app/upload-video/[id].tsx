import React, { useState, useEffect, useLayoutEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { SelectedVideo, VideoType } from "@hyperbolic/shared-types";
import { useAuth } from "@/contexts/AuthContext";
import MediaSelector from "./components/MediaSelector";
import VideoDetails from "./components/VideoDetails";
import UploadProgress from "./components/UploadProgress";

type UploadStep = "select" | "details" | "upload";

export default function VideoUploadScreen() {
  const {
    id,
    name,
    type: typeParam,
  } = useLocalSearchParams<{
    id: string;
    name: string;
    type: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();

  const type = typeParam === "combo" ? VideoType.Combo : VideoType.Trick;

  // Upload flow state
  const [currentStep, setCurrentStep] = useState<UploadStep>("select");
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(
    null,
  );
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  // Configure header dynamically based on current step
  useLayoutEffect(() => {
    navigation.setOptions({
      title: name ? `${name} - ${getHeaderTitle()}` : getHeaderTitle(),
    });
  }, [currentStep, name, navigation]);

  useEffect(() => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to upload videos", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }

    if (!id || !name) {
      Alert.alert("Error", "Missing required parameters", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [id, name, user]);

  // Step navigation handlers
  const handleVideoSelected = (video: SelectedVideo) => {
    setSelectedVideo(video);
    setCurrentStep("details");
  };

  const handleBackToSelect = () => {
    setCurrentStep("select");
    setSelectedVideo(null);
    setThumbnailUri(null);
  };

  const handleProceedToUpload = (thumbnail: string) => {
    setThumbnailUri(thumbnail);
    setCurrentStep("upload");
  };

  const handleUploadComplete = () => {
    router.back();
  };

  const handleCancel = () => {
    if (currentStep === "select") {
      router.back();
    } else {
      Alert.alert(
        "Discard Upload?",
        "Are you sure you want to cancel? Your progress will be lost.",
        [
          { text: "Continue Uploading", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    }
  };

  const getHeaderTitle = () => {
    switch (currentStep) {
      case "select":
        return "Select Video";
      case "details":
        return "Video Details";
      case "upload":
        return "Uploading...";
      default:
        return "Upload Video";
    }
  };

  if (!id || !name || !user) {
    return null;
  }

  return (
    <View style={styles.container}>
      {currentStep === "select" && (
        <MediaSelector
          onVideoSelected={handleVideoSelected}
          onCancel={handleCancel}
        />
      )}

      {currentStep === "details" && selectedVideo && (
        <VideoDetails
          video={selectedVideo}
          onBack={handleBackToSelect}
          onProceedToUpload={handleProceedToUpload}
        />
      )}

      {currentStep === "upload" && selectedVideo && thumbnailUri && (
        <UploadProgress
          parentId={id}
          name={name}
          type={type}
          video={selectedVideo}
          thumbnailUri={thumbnailUri}
          userId={user.id}
          onComplete={handleUploadComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
});
