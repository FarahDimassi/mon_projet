// components/CoachNavBar.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
// @ts-ignore
import { useRouter, useFocusEffect } from "expo-router";
import {
  getUserIdFromToken,
  logout,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  getToken,
  getUsersById,
} from "../utils/authService";

export default function CoachNavBar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [username, setUsername] = useState<string>("Coach");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 🔄 À chaque fois que la barre devient active, on recharge le compteur
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const uid = await getUserIdFromToken();
          if (uid && isActive) {
            const count = await getUnreadNotificationsCount(uid);
            setUnreadCount(count);
          }
        } catch (e) {
          console.error("Notif count failed:", e);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          router.replace("/AuthScreen");
          return;
        }

        const userId = await getUserIdFromToken();
        if (userId) {
          const userData = await getUsersById(userId);
          setUsername(userData?.username || "Coach");
          // 🔔 le compteur sera mis à jour par useFocusEffect
        }
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/AuthScreen");
    } catch (error) {
      Alert.alert("Logout Error", "Failed to logout. Please try again.");
    }
  };

  // Navigation handlers
  const handleProfile = () => router.push("/profile");
  const handleCalendar = () => router.push("/CalendarUser");

  // 🛎️ Quand on clique la cloche, on marque tout comme lu et on navigue
  const handleNotifications = async () => {
    try {
      const coachId = await getUserIdFromToken();
      if (coachId) {
        await markAllNotificationsAsRead(coachId);
        setUnreadCount(0);
        router.push("/NotificationsScreen");
      }
    } catch (err) {
      Alert.alert("Error", "Impossible de récupérer ou marquer les notifications.");
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#F05454" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {username}
          </Text>
          <Image
            source={require("../assets/images/hand.png")}
            style={styles.avatar}
            accessibilityLabel="User avatar"
          />
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={handleCalendar}
            style={styles.iconButton}
            accessibilityLabel="Calendar"
            accessibilityRole="button"
          >
            <Ionicons name="calendar" size={22} color="rgba(195, 0, 0, 0.7)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.iconButton}
            accessibilityLabel={`Notifications: ${unreadCount} unread`}
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={22} color="rgba(195, 0, 0, 0.7)" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleProfile}
            style={styles.iconButton}
            accessibilityLabel="Profile"
            accessibilityRole="button"
          >
            <MaterialIcons name="account-circle" size={24} color="rgba(195, 0, 0, 0.7)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            accessibilityLabel="Logout"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color="#F05454" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    width: "100%",
  },
  loadingContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Platform.OS === "ios" ? 12 : 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.05)",
      },
    }),
    marginBottom: 5,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344955",
    marginRight: 4,
    maxWidth: 150,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 6,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 6,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#F05454",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
