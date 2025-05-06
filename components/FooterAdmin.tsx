import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useRouter, usePathname } from "expo-router";

const DashboardFooter = () => {
  const router = useRouter();
  const pathname = usePathname();


  const handleNavigation = (screen: string) => {
    router.push(screen as any);
  };

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/admin")}
      >
        <Ionicons
          name="stats-chart-outline"
          size={24}
          color={pathname === "/admin" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text
          style={[styles.iconText, pathname === "/admin" && styles.activeText]}
        >
          Dashboard
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/analytics")}
      >
        <Ionicons
          name="pie-chart-outline"
          size={24}
          color={pathname === "/analytics" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/analytics" && styles.activeText]}>
          Analytics
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/Users")}
      >
        <Ionicons
          name="person-outline"
          size={24}
          color={pathname === "/Users" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/Users" && styles.activeText]}>
          Users
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/demandes")}
      >
        <Ionicons
          name="mail-unread-outline"
          size={24}
          color={pathname === "/demandes" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/demandes" && styles.activeText]}>
          Demandes
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default DashboardFooter;

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#eaeaea",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  iconText: {
    fontSize: 11,
    color: "gray",
    marginTop: 2,
  },
  activeText: {
    color: "rgba(195, 0, 0, 0.8)",
    fontWeight: "bold",
  },
});