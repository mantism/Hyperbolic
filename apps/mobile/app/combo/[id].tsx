import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { UserCombo } from "@hyperbolic/shared-types";
import { getUserCombo } from "@/lib/services/userComboService";
import { useCombos } from "@/contexts/CombosContext";
import ComboDetailPage from "@/components/ComboDetailPage";

export default function ComboScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refetchUserCombos } = useCombos();
  const [combo, setCombo] = useState<UserCombo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCombo = useCallback(async () => {
    try {
      const data = await getUserCombo(id);
      if (!data) {
        throw new Error("Combo not found");
      }
      setCombo(data);
    } catch (error) {
      console.error("Error fetching combo:", error);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) {
      fetchCombo();
    }
  }, [id, fetchCombo]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!combo) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 200,
        }}
      />
      <ComboDetailPage
        combo={combo}
        onClose={() => router.back()}
        onComboUpdated={(updatedCombo) => {
          setCombo(updatedCombo);
          refetchUserCombos();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
