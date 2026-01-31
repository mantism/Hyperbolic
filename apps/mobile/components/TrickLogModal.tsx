import React from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase/supabase";
import { UserTrick } from "@hyperbolic/shared-types";
import {
  createUserTrick,
  updateUserTrickStats,
  addLandedSurface,
} from "@/lib/services/userTrickService";
import BaseLogModal, { LogFormData } from "./BaseLogModal";

interface TrickLogModalProps {
  visible: boolean;
  userTrick?: UserTrick | null;
  trickId: string;
  userId: string;
  trickName?: string;
  sessionId?: string | null;
  onClose: () => void;
  onLogAdded?: () => void;
}

export default function TrickLogModal({
  visible,
  userTrick,
  trickId,
  userId,
  trickName,
  sessionId,
  onClose,
  onLogAdded,
}: TrickLogModalProps) {
  const handleSubmit = async (formData: LogFormData) => {
    if (!formData.reps || parseInt(formData.reps) < 1) {
      Alert.alert("Error", "Please enter a valid number of reps");
      throw new Error("Invalid reps");
    }

    try {
      const reps = parseInt(formData.reps);
      let currentUserTrick = userTrick;

      // Create UserTrick record if it doesn't exist
      if (!currentUserTrick) {
        const newAttempts = reps;
        const newStomps = formData.landed ? reps : 0;
        const landedSurfaces =
          formData.surface_type && formData.landed
            ? [formData.surface_type]
            : [];

        currentUserTrick = await createUserTrick({
          userId,
          trickId,
          attempts: newAttempts,
          stomps: newStomps,
          landed: newStomps > 0,
          landedSurfaces,
        });
      } else {
        // Update existing UserTrick stats
        const currentAttempts = currentUserTrick.attempts || 0;
        const currentStomps = currentUserTrick.stomps || 0;

        const newAttempts = currentAttempts + reps;
        const newStomps = formData.landed
          ? currentStomps + reps
          : currentStomps;

        currentUserTrick = await updateUserTrickStats(currentUserTrick.id, {
          attempts: newAttempts,
          stomps: newStomps,
          landed: newStomps > 0,
        });

        // Update landedSurfaces if surface was provided and trick was landed
        if (formData.surface_type && formData.landed) {
          try {
            currentUserTrick = await addLandedSurface(
              currentUserTrick.id,
              formData.surface_type
            );
          } catch (error) {
            console.error("Error updating landed surfaces:", error);
          }
        }
      }

      if (!currentUserTrick) {
        throw new Error("Failed to create or retrieve UserTrick record");
      }

      // Insert the log
      const { error: logError } = await supabase.from("TrickLogs").insert({
        user_trick_id: currentUserTrick.id,
        reps: reps,
        rating: formData.rating ? parseInt(formData.rating) : null,
        notes: formData.notes || null,
        location_name: formData.location_name || null,
        surface_type: formData.surface_type || null,
        landed: formData.landed,
        session_id: sessionId || null,
      });

      if (logError) {
        throw logError;
      }

      onLogAdded?.();
      onClose();
    } catch (error) {
      console.error("Error adding log:", error);
      Alert.alert("Error", "Failed to add log. Please try again.");
      throw error;
    }
  };

  return (
    <BaseLogModal
      visible={visible}
      title={`Log ${trickName || "Trick"}`}
      showReps={true}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}
