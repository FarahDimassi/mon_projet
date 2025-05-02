import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useRouter, usePathname } from "expo-router";

const FooterR = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (screen: string) => {
    router.push(screen);
  };

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/coach")}
      >
        <Ionicons
          name="home-outline"
          size={24}
          color={pathname === "/coach" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text
          style={[styles.iconText, pathname === "/coach" && styles.activeText]}
        >
          Dashboard
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/AnalyticsCoach")}
      >
        <Ionicons
          name="film-outline"
          size={24}
          color={pathname === "/AnalyticsCoach" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/AnalyticsCoach" && styles.activeText]}>
          Analytics
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/usecoach")}
      >
        <Ionicons
          name="person-outline"
          size={24}
          color={pathname === "/usecoach" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/usecoach" && styles.activeText]}>
          Reviews
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/Chconver")}
      >
        <Ionicons
          name="chatbubble-outline"
          size={24}
          color={pathname === "/Chconver" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/Chconver" && styles.activeText]}>
          Chat
        </Text>
      </TouchableOpacity>
      
    </View>
  );
};

export default FooterR;

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#eaeaea",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  iconText: {
    fontSize: 12,
    color: "gray",
    marginTop: 4,
  },
  activeText: {
    color: "rgba(195, 0, 0, 0.8)",
    fontWeight: "bold",
  },
});