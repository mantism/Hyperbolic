import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useCombos } from "@/contexts/CombosContext";
import { Stack } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";

export default function CombosScreen() {
  const { user } = useAuth();
  const { userCombos, loading } = useCombos();

  return (
    <View style={styles.container}>
      <PageHeader>
        <SearchBar placeholder="Search Combos..." onChangeText={() => {}} />
      </PageHeader>
      <FlatList
        data={userCombos}
        keyExtractor={(item) => item.id}
        renderItem={({ item: combo }) => {
          return (
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#eee",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {combo.name} {combo.trick_sequence.length}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
