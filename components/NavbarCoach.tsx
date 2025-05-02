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
  useWindowDimensions
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
// @ts-ignore
import { useRouter, useFocusEffect } from 'expo-router';  // ← ajouté useFocusEffect

import {
  getUserIdFromToken,
  logout,
  getUserByIdForCoach,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead   // ← ajouté pour marquer toutes les notif comme lues
} from "../utils/authService";

export default function CoachNavBar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [username, setUsername] = useState<string>("Coach");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1️⃣ On rafraîchit le nom & le compteur à chaque focus de ce composant
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        setIsLoading(true);
        try {
          const coachId = await getUserIdFromToken();
          if (!coachId) {
            router.replace("/AuthScreen");
            return;
          }
          const coachData = await getUserByIdForCoach(coachId);
          if (isActive) {
            setUsername(coachData?.username ?? "Coach");
            const count = await getUnreadNotificationsCount(coachId);
            setUnreadCount(count);
          }
        } catch (err) {
          console.error("Erreur fetch user/notifications:", err);
          if (isActive) setError("Échec du chargement");
        } finally {
          if (isActive) setIsLoading(false);
        }
      })();
      return () => { isActive = false; };
    }, [])
  );

  // Déconnexion
  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/AuthScreen");
    } catch {
      Alert.alert("Erreur de déconnexion", "Échec de la déconnexion. Veuillez réessayer.");
    }
  };

  const handleProfile = () => router.push("/CoachProfile");
  const handleCalendar = () => router.push("/CalendarScreen");

  // 2️⃣ Au clic sur la cloche, on navigue vers l'écran de notifications
  const handleNotifications = async () => {
    try {
      const coachId = await getUserIdFromToken();
      if (!coachId) {
        Alert.alert("Notifications", "Impossible de récupérer votre ID.");
        return;
      }
      // Marque toutes comme lues côté backend
      await markAllNotificationsAsRead(coachId);
      // Le badge passera à 0 au retour du focus (via useFocusEffect)
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {username}
          </Text>
          <Image
            source={require("../assets/images/hand.png")}
            style={styles.avatar}
            accessibilityLabel="Avatar utilisateur"
          />
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleCalendar} style={styles.iconButton}>
            <Ionicons name="calendar" size={22} color="rgba(195, 0, 0, 0.7)" />
          </TouchableOpacity>

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

          <TouchableOpacity onPress={handleProfile} style={styles.iconButton}>
            <MaterialIcons name="account-circle" size={24} color="rgba(195, 0, 0, 0.7)" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#F05454" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#FFF", width: "100%" },
  loadingContainer: {
    padding: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
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
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
      web: { boxShadow: '0px 2px 3px rgba(0,0,0,0.05)' }
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#344955", marginRight: 4, maxWidth: 150 },
  avatar: { width: 36, height: 36, borderRadius: 8 },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 6,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 6,
    ...Platform.select({ web: { cursor: 'pointer' } }),
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
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
});
