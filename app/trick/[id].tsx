import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "@/lib/supabase/supabase";
import { Database } from "@/lib/supabase/database.types";
import TrickDetailPage from "@/components/TrickDetailPage";

type Trick = Database["public"]["Tables"]["TricksTable"]["Row"];

export default function TrickScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [trick, setTrick] = useState<Trick | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTrick();
    }
  }, [id]);

  const fetchTrick = async () => {
    try {
      const { data, error } = await supabase
        .from("TricksTable")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTrick(data);
    } catch (error) {
      console.error("Error fetching trick:", error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!trick) {
    return null;
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerBackTitle: "Back",
          headerTitle: ""
        }} 
      />
      <TrickDetailPage 
        trick={trick} 
        onClose={() => router.back()} 
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