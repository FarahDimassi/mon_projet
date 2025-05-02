import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  SafeAreaView,
  useWindowDimensions,
  Image,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useRouter, useFocusEffect } from 'expo-router';

import {
  getUserIdFromToken,
  logout,
  getUserById,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead
} from "../utils/authService";

export default function AdminNavBar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [username, setUsername] = useState<string>("Admin");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const adminId = await getUserIdFromToken();
          if (!adminId) {
            router.replace("/AuthScreen");
            return;
          }
          const userData = await getUserById(adminId);
          if (isActive) setUsername(userData?.username ?? "Admin");

          const count = await getUnreadNotificationsCount(adminId);
          if (isActive) setUnreadCount(count);
        } catch (err) {
          console.error("Erreur fetch admin/nav:", err);
        } finally {
          if (isActive) setIsLoading(false);
        }
      })();
      return () => { isActive = false; };
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/AuthScreen");
  };

  const handleNotifications = async () => {
    try {
      const adminId = await getUserIdFromToken();
      if (!adminId) {
        Alert.alert("Notifications", "Impossible de récupérer votre ID.");
        return;
      }
      await markAllNotificationsAsRead(adminId);
      router.push("/NotificationsScreen");
    } catch (err) {
      console.error("Erreur handleNotifications:", err);
      Alert.alert("Erreur", "Impossible d'ouvrir les notifications.");
    }
  };

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
        <View style={styles.headerTitle}>
          <Text style={[styles.welcomeText, width < 360 && styles.welcomeTextSmall]}>
            Hi, <Text style={styles.usernameText}>{username}</Text>
          </Text>
          <Image
            source={require("../assets/images/hand.png")}
            style={styles.avatar}
            accessibilityLabel="Avatar utilisateur"
          />
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.iconButton}
            accessibilityLabel={`Notifications: ${unreadCount} non lues`}
          >
            <Ionicons name="notifications-outline" size={22} color="rgba(195, 0, 0, 0.7)" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
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
    backgroundColor: "#FFF",
    width: "100%",
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
  },
  loadingContainer: {
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginLeft: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
      web: { boxShadow: '0px 2px 3px rgba(0,0,0,0.05)' }
    }),
    marginBottom: Platform.OS === 'ios' ? 8 : 5,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 8,
    position: 'relative',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 8,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  welcomeText: {
    fontSize: 18,
    color: "#344955",
    fontWeight: "700",
  },
  welcomeTextSmall: {
    fontSize: 16,
  },
  usernameText: {
    fontWeight: "700",
    color: "#344955",
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
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
