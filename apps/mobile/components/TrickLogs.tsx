import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "@/lib/supabase/supabase";
import { Database, UserTrick } from "@hyperbolic/shared-types";
import { format } from "date-fns";
import {
  SurfaceType,
  getSurfaceTypeLabel,
} from "@/lib/surfaceTypes";

type TrickLog = Database["public"]["Tables"]["TrickLogs"]["Row"];

interface TrickLogsProps {
  userTrick?: UserTrick | null;
  onAddPress?: () => void;
}

export default function TrickLogs({
  userTrick,
  onAddPress,
}: TrickLogsProps) {
  const [logs, setLogs] = useState<TrickLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [userTrick?.id]);

  const fetchLogs = async () => {
    if (!userTrick?.id) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("TrickLogs")
        .select("*")
        .eq("user_trick_id", userTrick.id)
        .order("logged_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#333" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>RECENT LOGS</Text>
        {onAddPress && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
            <Ionicons name="add" size={20} color="#333" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No detailed logs yet</Text>
          <Text style={styles.emptySubtext}>
            Tap "Add Log" to record a trick with notes and details
          </Text>
        </View>
      ) : (
        <View style={styles.logsList}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.logDate}>
                  {format(new Date(log.logged_at), "MMM d, yyyy")}
                </Text>
                {log.rating && (
                  <View style={styles.rating}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>{log.rating}/10</Text>
                  </View>
                )}
              </View>

              <View style={styles.logDetails}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Reps:</Text>
                  <Text style={styles.statValue}>{log.reps}</Text>
                </View>
                {log.landed !== null && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Landed:</Text>
                    <Ionicons
                      name={log.landed ? "checkmark-circle" : "close-circle"}
                      size={18}
                      color={log.landed ? "#10B981" : "#EF4444"}
                    />
                  </View>
                )}
                {log.surface_type && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Surface:</Text>
                    <Text style={styles.statValue}>
                      {getSurfaceTypeLabel(log.surface_type as SurfaceType)}
                    </Text>
                  </View>
                )}
              </View>

              {log.location_name && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.locationText}>{log.location_name}</Text>
                </View>
              )}

              {log.notes && <Text style={styles.notes}>{log.notes}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    borderRadius: 0,
    marginBottom: 32,
    overflow: "hidden",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  header: {
    backgroundColor: "transparent",
    paddingVertical: 0,
    paddingHorizontal: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#999",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "400",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#D0D0D0",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#CCC",
    textAlign: "center",
  },
  logsList: {
    padding: 0,
  },
  logItem: {
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#D0D0D0",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logDate: {
    fontSize: 13,
    fontWeight: "400",
    color: "#000",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: "#999",
  },
  logDetails: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#999",
  },
  notes: {
    fontSize: 13,
    color: "#666",
    fontStyle: "normal",
    lineHeight: 20,
  },
});
