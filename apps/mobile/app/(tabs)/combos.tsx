import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useCombos } from "@/contexts/CombosContext";
import { Stack } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import ComboComposer from "@/components/ComboComposer";

export default function CombosScreen() {
  const { user } = useAuth();
  const { userCombos, loading, refreshing, refetchUserCombos } = useCombos();
  const [showComposer, setShowComposer] = useState(false);

  const handleSaveCombo = async () => {
    setShowComposer(false);
    await refetchUserCombos();
  };

  const handleCancelComposer = () => {
    setShowComposer(false);
  };

  // Prepare data for FlatList - add composer as first item if visible
  const listData = useMemo(() => {
    if (showComposer && user) {
      return [{ id: "__composer__", isComposer: true }, ...userCombos];
    }
    return userCombos;
  }, [showComposer, userCombos, user]);

  return (
    <View style={styles.container}>
      <PageHeader>
        <SearchBar
          placeholder="Search Combos..."
          onChangeText={() => {}}
          showFilterButton={false}
          showAddButton={true}
          onAddPress={() => setShowComposer(true)}
        />
      </PageHeader>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // Render composer
          if ("isComposer" in item && item.isComposer && user) {
            return (
              <ComboComposer
                userId={user.id}
                onSave={handleSaveCombo}
                onCancel={handleCancelComposer}
              />
            );
          }

          // Render combo item
          const combo = item as (typeof userCombos)[number];
          return (
            <View style={styles.comboCard}>
              <Text style={styles.comboName}>{combo.name}</Text>
              <Text style={styles.comboDetails}>
                {combo.trick_sequence.length} tricks • {combo.attempts} attempts
                • {combo.stomps} stomps
              </Text>
            </View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetchUserCombos}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          !showComposer ? (
            <View style={styles.emptyState}>
              <Ionicons name="albums-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No combos yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to create your first combo
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  comboCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  comboName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  comboDetails: {
    fontSize: 14,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
