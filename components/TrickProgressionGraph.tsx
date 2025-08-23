import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabase/supabase";
import { Database } from "@/lib/supabase/database.types";
import { getCategoryColor } from "@/lib/categoryColors";

type Trick = Database["public"]["Tables"]["TricksTable"]["Row"];

interface TrickProgressionGraphProps {
  trick: Trick;
  onTrickPress?: (trick: Trick) => void;
}

export default function TrickProgressionGraph({
  trick,
  onTrickPress,
}: TrickProgressionGraphProps) {
  const [prereqTricks, setPrereqTricks] = useState<Trick[]>([]);
  const [progressionTricks, setProgressionTricks] = useState<Trick[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const primaryCategory = trick.categories?.[0];
  const categoryColor = getCategoryColor(primaryCategory);

  // Calculate initial scroll position to center current trick
  const currentTrickX = 250;
  const viewportWidth = 350; // approximate viewport width
  const nodeWidth = 100;
  const initialScrollX = Math.max(
    0,
    currentTrickX - viewportWidth / 2 + nodeWidth / 2
  );

  // Fetch prerequisite and progression tricks
  useEffect(() => {
    const fetchRelatedTricks = async () => {
      try {
        // Fetch prerequisites if they exist
        if (trick.prereqs && trick.prereqs.length > 0) {
          const { data: prereqs } = await supabase
            .from("TricksTable")
            .select("*")
            .in("name", trick.prereqs);
          if (prereqs) setPrereqTricks(prereqs);
        }

        // Fetch progressions if they exist
        if (trick.progressions && trick.progressions.length > 0) {
          const { data: progressions } = await supabase
            .from("TricksTable")
            .select("*")
            .in("name", trick.progressions);
          if (progressions) setProgressionTricks(progressions);
        }
      } catch (error) {
        console.error("Error fetching related tricks:", error);
      }
    };

    fetchRelatedTricks();
  }, [trick]);

  // Don't render if no prereqs or progressions
  if (
    (!trick.prereqs || trick.prereqs.length === 0) &&
    (!trick.progressions || trick.progressions.length === 0)
  ) {
    return null;
  }

  return (
    <View style={styles.graphContainer}>
      <View style={styles.graphHeader}>
        <Text style={styles.graphTitle}>TRICK PROGRESSION</Text>
      </View>
      <View style={styles.graphViewport}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.graphCanvas}
          style={styles.graphScrollView}
          contentOffset={{ x: initialScrollX, y: 0 }}
        >
          {/* Grid Background */}
          <View style={styles.graphGrid}>
            {[...Array(15)].map((_, i) => (
              <View
                key={`h-${i}`}
                style={[
                  styles.gridLine,
                  styles.gridLineHorizontal,
                  { top: i * 20 },
                ]}
              />
            ))}
            {[...Array(30)].map((_, i) => (
              <View
                key={`v-${i}`}
                style={[
                  styles.gridLine,
                  styles.gridLineVertical,
                  { left: i * 20 },
                ]}
              />
            ))}
          </View>

          {/* Prerequisite Nodes */}
          {(trick.prereqs || []).map((prereqName, index) => {
            const xOffset =
              (index - ((trick.prereqs?.length || 1) - 1) / 2) * 120;
            // Find the loaded trick data or use placeholder
            const prereqData = prereqTricks.find((t) => t.name === prereqName);
            const prereqColor = prereqData
              ? getCategoryColor(prereqData.categories?.[0])
              : "#999";

            return (
              <View key={prereqName}>
                {/* Connection Line */}
                <View
                  style={[
                    styles.connectionLine,
                    {
                      position: "absolute",
                      width: 2,
                      height: 60,
                      backgroundColor: "#999",
                      left: 300 + xOffset,
                      top: 70,
                    },
                  ]}
                />
                {/* Node */}
                <TouchableOpacity
                  style={[
                    styles.trickNode,
                    prereqData ? styles.loadedNode : styles.placeholderNode,
                    {
                      position: "absolute",
                      left: 250 + xOffset,
                      top: 20,
                      backgroundColor: prereqData
                        ? prereqColor + "20"
                        : "#f0f0f0",
                      borderColor: prereqData ? prereqColor : "#ccc",
                    },
                  ]}
                  onPress={() => prereqData && onTrickPress?.(prereqData)}
                  disabled={!prereqData}
                >
                  <Text style={styles.nodeText} numberOfLines={2}>
                    {prereqName}
                  </Text>
                  {!prereqData && (
                    <View style={styles.loadingIndicator}>
                      <ActivityIndicator size="small" color="#999" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Current Trick Node (Center) */}
          <TouchableOpacity
            style={[
              styles.trickNode,
              styles.currentNode,
              {
                position: "absolute",
                left: 250,
                top: 100,
                backgroundColor: categoryColor,
              },
            ]}
            onPress={() => onTrickPress?.(trick)}
          >
            <Text style={[styles.nodeText, styles.currentNodeText]}>
              {trick.name}
            </Text>
          </TouchableOpacity>

          {/* Family Tree Branching for Progressions */}
          {trick.progressions && trick.progressions.length > 0 && (
            <>
              {/* Main vertical stem from current trick */}
              <View
                style={[
                  styles.connectionLine,
                  {
                    position: "absolute",
                    width: 2,
                    height: 30,
                    backgroundColor: "#999",
                    left: 300,
                    top: 150,
                  },
                ]}
              />
              {/* Horizontal branch line */}
              <View
                style={[
                  styles.connectionLine,
                  {
                    position: "absolute",
                    width: Math.max(
                      120,
                      (trick.progressions.length - 1) * 120 + 4
                    ),
                    height: 2,
                    backgroundColor: "#999",
                    left:
                      300 -
                      Math.max(60, ((trick.progressions.length - 1) * 120) / 2),
                    top: 180,
                  },
                ]}
              />
            </>
          )}

          {/* Progression Nodes */}
          {(trick.progressions || []).map((progressionName, index) => {
            const xOffset =
              (index - ((trick.progressions?.length || 1) - 1) / 2) * 120;
            // Find the loaded trick data or use placeholder
            const progressionData = progressionTricks.find(
              (t) => t.name === progressionName
            );
            const progressionColor = progressionData
              ? getCategoryColor(progressionData.categories?.[0])
              : "#999";

            return (
              <View key={progressionName}>
                {/* Connection Line */}
                <View
                  style={[
                    styles.connectionLine,
                    {
                      position: "absolute",
                      width: 2,
                      height: 60,
                      backgroundColor: "#999",
                      left: 300 + xOffset,
                      top: 180,
                    },
                  ]}
                />
                {/* Node */}
                <TouchableOpacity
                  style={[
                    styles.trickNode,
                    progressionData
                      ? styles.loadedNode
                      : styles.placeholderNode,
                    {
                      position: "absolute",
                      left: 250 + xOffset,
                      top: 240,
                      backgroundColor: progressionData
                        ? progressionColor + "20"
                        : "#f0f0f0",
                      borderColor: progressionData ? progressionColor : "#ccc",
                    },
                  ]}
                  onPress={() =>
                    progressionData && onTrickPress?.(progressionData)
                  }
                  disabled={!progressionData}
                >
                  <Text style={styles.nodeText} numberOfLines={2}>
                    {progressionName}
                  </Text>
                  {!progressionData && (
                    <View style={styles.loadingIndicator}>
                      <ActivityIndicator size="small" color="#999" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Graph styles
  graphContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  graphHeader: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  graphTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  graphViewport: {
    height: 200,
    overflow: "hidden",
  },
  graphScrollView: {
    flex: 1,
  },
  graphCanvas: {
    width: 600,
    height: 300,
    position: "relative",
  },
  graphGrid: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 600,
    height: 300,
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "#E5E5E5",
  },
  gridLineHorizontal: {
    width: "100%",
    height: 1,
  },
  gridLineVertical: {
    height: "100%",
    width: 1,
  },
  trickNode: {
    width: 100,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  currentNode: {
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nodeText: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
  },
  currentNodeText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  connectionLine: {
    backgroundColor: "#999",
  },
  placeholderNode: {
    opacity: 0.7,
  },
  loadedNode: {
    opacity: 1,
  },
  loadingIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
  },
});
