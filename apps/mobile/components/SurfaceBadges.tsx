import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  SurfaceType,
  getSurfaceTypeColor,
  getSurfaceTypeLabel,
} from "@/lib/surfaceTypes";

interface SurfaceBadgesProps {
  landedSurfaces: Set<string>;
  showTitle?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
}

export default function SurfaceBadges({
  landedSurfaces,
  showTitle = true,
  showLabels: initialShowLabels = false,
  interactive = true,
}: SurfaceBadgesProps) {
  const [showLabels, setShowLabels] = useState(initialShowLabels);

  const content = (
    <View style={[styles.container, !showTitle && styles.containerNoMargin]}>
      {showTitle && <Text style={styles.title}>SURFACES</Text>}
      {landedSurfaces.size > 0 ? (
        <View style={styles.badges}>
          {Array.from(landedSurfaces).map((surfaceType) => (
            <View key={surfaceType} style={styles.badgeContainer}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: getSurfaceTypeColor(
                      surfaceType as SurfaceType
                    ),
                  },
                ]}
              >
                {/* TODO: Add icons for each surface type */}
              </View>
              {showLabels && (
                <Text style={styles.badgeLabel}>
                  {getSurfaceTypeLabel(surfaceType as SurfaceType)}
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Log a trick in detail to earn your first surface badge
        </Text>
      )}
    </View>
  );

  if (interactive && landedSurfaces.size > 0) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowLabels(!showLabels)}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 12,
  },
  containerNoMargin: {
    marginTop: 0,
    marginBottom: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: "500",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  badgeContainer: {
    alignItems: "center",
    minHeight: 40,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeLabel: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
    maxWidth: 30,
    marginTop: 0,
    position: "absolute",
    bottom: -15,
  },
  emptyText: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
});
