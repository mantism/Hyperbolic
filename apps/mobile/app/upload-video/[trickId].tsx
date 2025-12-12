import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { View, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import { supabase } from "@/lib/supabase/supabase";
import { Trick } from "@hyperbolic/shared-types";
import { useAuth } from "@/contexts/AuthContext";
import MediaSelector from "./components/MediaSelector";
import VideoDetails from "./components/VideoDetails";
import UploadProgress from "./components/UploadProgress";

type UploadStep = "select" | "details" | "upload";

export default function VideoUploadScreen() {
  const { trickId } = useLocalSearchParams<{ trickId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [trick, setTrick] = useState<Trick | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload flow state
  const [currentStep, setCurrentStep] = useState<UploadStep>("select");
  const [selectedVideo, setSelectedVideo] = useState<MediaLibrary.Asset | null>(
    null
  );
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  // Configure header dynamically based on current step
  useLayoutEffect(() => {
    navigation.setOptions({
      title: trick ? `${trick.name} - ${getHeaderTitle()}` : getHeaderTitle(),
    });
  }, [currentStep, trick, navigation]);

  // Fetch trick data
  const fetchTrick = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("Tricks")
        .select("*")
        .eq("id", trickId)
        .single();

      if (error) throw error;
      setTrick(data);
    } catch (error) {
      console.error("Error fetching trick:", error);
      Alert.alert("Error", "Failed to load trick", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [trickId]);

  useEffect(() => {
    console.log(
      "[VideoUploadScreen] useEffect fired - trickId:",
      trickId,
      "user:",
      !!user
    );
    // Check authentication
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to upload videos", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }

    if (trickId) {
      console.log("[VideoUploadScreen] Calling fetchTrick");
      fetchTrick();
    }
  }, [trickId, user, fetchTrick]);

  // Step navigation handlers
  const handleVideoSelected = (video: MediaLibrary.Asset) => {
    setSelectedVideo(video);
    setCurrentStep("details");
  };

  const handleBackToSelect = () => {
    // TODO: Consider saving draft state before discarding
    setCurrentStep("select");
    setSelectedVideo(null);
    setThumbnailUri(null);
  };

  const handleProceedToUpload = (thumbnail: string) => {
    setThumbnailUri(thumbnail);
    setCurrentStep("upload");
  };

  const handleUploadComplete = () => {
    // Navigate back to trick page
    router.back();
  };

  const handleCancel = () => {
    // TODO: Consider saving draft state before discarding
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
        ]
      );
    }
  };

  // Configure header based on current step
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!trick || !user) {
    return null;
  }

  return (
    <View style={styles.container}>
      {currentStep === "select" && (
        <MediaSelector
          trick={trick}
          onVideoSelected={handleVideoSelected}
          onCancel={handleCancel}
        />
      )}

      {currentStep === "details" && selectedVideo && (
        <VideoDetails
          trick={trick}
          video={selectedVideo}
          onBack={handleBackToSelect}
          onProceedToUpload={handleProceedToUpload}
        />
      )}

      {currentStep === "upload" && selectedVideo && thumbnailUri && user && (
        <UploadProgress
          trick={trick}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
});
