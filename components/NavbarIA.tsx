// components/CoachNavBar.tsx
import React, { useState, useEffect } from "react";
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
import { useRouter } from 'expo-router';
import {
  getUserIdFromToken,
  logout,
  getUserByIdForCoach,
  getUnreadNotificationsCount,
  getUsersById,
  getToken,
} from "../utils/authService";

export default function CoachNavBar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [username, setUsername] = useState<string>("Coach");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Récupère le nom de l'utilisateur au montage
  useEffect(() => {
    const fetchUsername = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          router.replace("/AuthScreen");
          return;
        }
        
        const userId = await getUserIdFromToken();
        if (userId) {
          const response = await getUsersById(userId);
          setUsername(response?.username ?? "Coach");
          
          // Récupère également le nombre de notifications
          const count = await getUnreadNotificationsCount(userId);
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Impossible de décoder le token :", err);
        setError("Échec du chargement des données utilisateur");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsername();
  }, []);

  // Déconnexion
  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/AuthScreen");
    } catch (error) {
      Alert.alert("Erreur de déconnexion", "Échec de la déconnexion. Veuillez réessayer.");
    }
  };

  // Navigation vers le profil
  const handleProfile = () => router.push("/profile");
  
  // Navigation vers le calendrier
  const handleCalendar = () => router.push("/CalendarUserIA");

  // Affiche un alert avec le nombre de notifications non lues
  const handleNotifications = async () => {
    try {
      const coachId = await getUserIdFromToken();
      if (coachId) {
        Alert.alert(
          "Notifications",
          `Vous avez ${unreadCount} notification${unreadCount !== 1 ? "s" : ""} non lue${
            unreadCount !== 1 ? "s" : ""
          }.`
        );
      } else {
        Alert.alert("Notifications", "Impossible de récupérer votre ID.");
      }
    } catch (error) {
      console.error("Erreur récupération notifications :", error);
      Alert.alert("Erreur", "Impossible de récupérer les notifications.");
    }
  };

  // Affiche l'état de chargement
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
          <Text 
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {username}
          </Text>
          <Image
            source={require("../assets/images/hand.png")}
            style={styles.avatar}
            accessibilityLabel="Avatar utilisateur"
          />
        </View>
        
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={handleCalendar}
            style={styles.iconButton}
            accessibilityLabel="Calendrier"
            accessibilityRole="button"
          >
            <Ionicons
              name="calendar"
              size={22}
              color="rgba(195, 0, 0, 0.7)"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.iconButton}
            accessibilityLabel={`Notifications: ${unreadCount} non lues`}
            accessibilityRole="button"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color="rgba(195, 0, 0, 0.7)"
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleProfile} 
            style={styles.iconButton}
            accessibilityLabel="Profil"
            accessibilityRole="button"
          >
            <MaterialIcons
              name="account-circle"
              size={24}
              color="rgba(195, 0, 0, 0.7)"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            accessibilityLabel="Déconnexion"
            accessibilityRole="button"
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#F05454"
            />
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
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
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
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.05)',
      }
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
        cursor: 'pointer',
      }
    }),
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
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