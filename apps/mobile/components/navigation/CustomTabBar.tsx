import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { QuickLogFlow } from "@/components/logs";

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const [showQuickLog, setShowQuickLog] = useState(false);
  const midPoint = Math.floor(state.routes.length / 2);

  return (
    <>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = options.tabBarIcon
            ? (options.tabBarIcon as any)({
                focused: isFocused,
                color: "",
                size: 0,
              }).props.name
            : undefined;

          return (
            <React.Fragment key={route.key}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.tab}
              >
                <Ionicons
                  name={iconName}
                  size={24}
                  color={isFocused ? "#007AFF" : "#999"}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? "#007AFF" : "#999" },
                  ]}
                >
                  {label as string}
                </Text>
              </TouchableOpacity>

              {/* Render Center Add Button in the middle */}
              {index === midPoint - 1 && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowQuickLog(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Add log"
                >
                  <Ionicons name="add" size={32} color="#007AFF" />
                  <Text style={styles.addLabel}>Add</Text>
                </TouchableOpacity>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {showQuickLog && <QuickLogFlow onClose={() => setShowQuickLog(false)} />}
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopColor: "#f0f0f0",
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 8,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
  },
  addButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  addLabel: {
    fontSize: 10,
    marginTop: 4,
    color: "#007AFF",
    fontWeight: "600",
  },
});
