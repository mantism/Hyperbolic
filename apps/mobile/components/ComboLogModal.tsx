import React from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase/supabase";
import { UserCombo } from "@hyperbolic/shared-types";
import { incrementComboAndTrickStats } from "@/lib/services/userComboService";
import BaseLogModal, { LogFormData } from "./BaseLogModal";

interface ComboLogModalProps {
  visible: boolean;
  userCombo: UserCombo;
  userId: string;
  comboName?: string;
  onClose: () => void;
  onLogAdded?: () => void;
}

export default function ComboLogModal({
  visible,
  userCombo,
  userId,
  comboName,
  onClose,
  onLogAdded,
}: ComboLogModalProps) {
  const handleSubmit = async (formData: LogFormData) => {
    try {
      // Update combo and trick stats (handles surfaces too)
      await incrementComboAndTrickStats(userId, userCombo.id, {
        landed: formData.landed,
        surfaceType: formData.surface_type || undefined,
      });

      // Insert the log
      const { error: logError } = await supabase.from("ComboLogs").insert({
        user_combo_id: userCombo.id,
        rating: formData.rating ? parseInt(formData.rating) : null,
        notes: formData.notes || null,
        location_name: formData.location_name || null,
        surface_type: formData.surface_type || null,
        landed: formData.landed,
      });

      if (logError) {
        throw logError;
      }

      onLogAdded?.();
      onClose();
    } catch (error) {
      console.error("Error adding combo log:", error);
      Alert.alert("Error", "Failed to add log. Please try again.");
      throw error;
    }
  };

  return (
    <BaseLogModal
      visible={visible}
      title={`Log ${comboName || "Combo"}`}
      showReps={false}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}
