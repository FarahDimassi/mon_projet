// components/NavbarIA.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  TouchableWithoutFeedback,
  BackHandler,
  LogBox,
  InteractionManager,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
// @ts-ignore
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getUserIdFromToken,
  logout,
  getUserByIdForCoach,
  getUnreadNotificationsCount,
  getUsersById,
  getToken,
} from "../utils/authService";

// Ignorer l'avertissement lié aux animations sur Android
LogBox.ignoreLogs([
  'Animated: `useNativeDriver`',
  'Animated.event now requires a second argument for options',
  'VirtualizedLists should never be nested',
]);

// Constantes pour les dimensions
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Hauteur du header adaptée à iOS et Android
const HEADER_HEIGHT = Platform.select({
  ios: 70,
  android: 70,
  default: 70
});

// Largeur du menu
const MENU_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 320);

export default function NavbarIA() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [username, setUsername] = useState<string>("Coach IA");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  
  // Animations avec useRef pour éviter les re-rendus
  const slideAnimation = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  // Gérer le bouton retour sur Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    const backAction = () => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [menuOpen]);

  // Animation pour le menu optimisée pour iOS
  useEffect(() => {
    // Utiliser une petite temporisation avant le démarrage de l'animation sur iOS
    const animationStartDelay = Platform.OS === 'ios' ? 50 : 0;
    
    setTimeout(() => {
      if (menuOpen) {
        // Ouvrir le menu
        Animated.parallel([
          Animated.timing(slideAnimation, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
            isInteraction: true,
          }),
          Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
            isInteraction: true,
          }),
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
            isInteraction: true,
          }),
        ]).start();
      } else {
        // Fermer le menu
        Animated.parallel([
          Animated.timing(slideAnimation, {
            toValue: -MENU_WIDTH,
            duration: 250,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
            isInteraction: true,
          }),
          Animated.timing(fadeAnimation, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
            isInteraction: true,
          }),
          Animated.timing(spinValue, {
            toValue: 0,
            duration: 250,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
            isInteraction: true,
          }),
        ]).start();
      }
    }, animationStartDelay);
  }, [menuOpen, slideAnimation, fadeAnimation, spinValue]);

  // Rotation pour l'icône du menu
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  // 🔄 À chaque fois que la barre devient active, on recharge le compteur
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      const fetchNotificationCount = async () => {
        try {
          const uid = await getUserIdFromToken();
          if (uid && isActive) {
            const count = await getUnreadNotificationsCount(uid);
            setUnreadCount(count);
          }
        } catch (e) {
          console.error("Notif count failed:", e);
        }
      };
      
      fetchNotificationCount();
      
      return () => {
        isActive = false;
      };
    }, [])
  );

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
          setUsername(response?.username ?? "Coach IA");
          
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
  const handleProfile = () => {
    setMenuOpen(false);
    setTimeout(() => {
      router.push("/profile");
    }, 100);
  };
  
  // Navigation vers le calendrier
  const handleCalendar = () => {
    setMenuOpen(false);
    setTimeout(() => {
      router.push("/CalendarUserIA");
    }, 100);
  };

  // Navigation vers l'écran des notifications
  const handleNotifications = async () => {
    try {
      setMenuOpen(false);
      console.log("🔔 Notification icon clicked");
      const userId = await getUserIdFromToken();
      if (userId) {
        console.log(`✓ User ID: ${userId} retrieved successfully`);
        // Mettre à jour le compteur de notifications non lues
        setUnreadCount(0); // Réinitialiser le compteur car on va voir les notifications
        console.log("✓ Notifications marked as read, navigating to NotificationsScreen...");
        setTimeout(() => {
          router.push("/NotificationsScreen");
        }, 100);
      } else {
        console.log("❌ No user ID found");
        Alert.alert("Notifications", "Impossible de récupérer votre ID.");
      }
    } catch (err) {
      console.error("❌ Error in handleNotifications:", err);
      Alert.alert("Erreur", "Impossible de récupérer ou de marquer les notifications.");
    }
  };
  const handleDailyChallenge = () => {
    setMenuOpen(false);
    setTimeout(() => {
      router.push("/DefisIA");
    }, 100);
  };
  // Toggle menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Affiche l'état de chargement
  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#F05454" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
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
            {/* Menu hamburger avec animation de rotation */}
            <TouchableOpacity
              onPress={toggleMenu}
              style={styles.menuButton}
              accessibilityLabel="Menu"
              accessibilityRole="button"
              hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
              activeOpacity={0.6}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Feather name={menuOpen ? "x" : "menu"} size={22} color="#344955" />
              </Animated.View>
            </TouchableOpacity>

            {/* Bouton de déconnexion */}
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              accessibilityLabel="Déconnexion"
              accessibilityRole="button"
              activeOpacity={0.6}
              hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
            >
              <Ionicons name="log-out-outline" size={20} color="#F05454" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Overlay pour fermer le menu quand on clique en dehors */}
      {menuOpen && (
        <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
          <Animated.View 
            style={[
              styles.overlay,
              { opacity: fadeAnimation }
            ]}
            accessibilityRole="button"
            accessibilityLabel="Fermer le menu"
          />
        </TouchableWithoutFeedback>
      )}

      {/* Menu déroulant avec animations - utilise la hauteur complète de l'écran */}
      <Animated.View 
        style={[
          styles.menuContainer,
          { 
            transform: [{ translateX: slideAnimation }],
            width: MENU_WIDTH,
          }
        ]}
        pointerEvents={menuOpen ? "auto" : "none"}
      >
        <SafeAreaView style={styles.menuSafeArea}>
          <View style={styles.userSection}>
            <View style={styles.profileImageContainer}>
              <Image
                source={require("../assets/images/hand.png")}
                style={styles.profileImage}
              />
            </View>
            <Text style={styles.userName}>{username}</Text>
            <Text style={styles.userRole}>Mode IA</Text>
          </View>
          
          <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={handleProfile}
              style={styles.menuItem}
              accessibilityLabel="Profil"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <MaterialIcons name="account-circle" size={22} color="#344955" />
              </View>
              <Text style={styles.menuText}>Profil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCalendar}
              style={styles.menuItem}
              accessibilityLabel="Calendrier"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={22} color="#344955" />
              </View>
              <Text style={styles.menuText}>Calendrier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNotifications}
              style={styles.menuItem}
              accessibilityLabel={`Notifications: ${unreadCount} non lues`}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <View style={styles.notificationIconContainer}>
                  <Ionicons name="notifications-outline" size={22} color="#344955" />
                  {unreadCount > 0 && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.menuText}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDailyChallenge}
              style={styles.menuItem}
              accessibilityLabel="Défis quotidiens"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <FontAwesome5 name="trophy" size={20} color="#344955" />
              </View>
              <Text style={styles.menuText}>Défis quotidiens</Text>
            </TouchableOpacity>

          </ScrollView>

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutMenuItem}
            accessibilityLabel="Déconnexion"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="log-out-outline" size={22} color="#F05454" />
            </View>
            <Text style={styles.logoutMenuText}>Déconnexion</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    zIndex: Platform.OS === 'ios' ? 9 : 999, // z-index plus petit sur iOS pour éviter les problèmes
  },
  safeArea: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    zIndex: 1,
  },
  menuSafeArea: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: HEADER_HEIGHT,
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
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.08)",
      },
    }),
    marginBottom: 5,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344955",
    marginRight: 8,
    maxWidth: 150,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 84, 84, 0.08)',
    marginRight: 12,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 84, 84, 0.12)',
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: Platform.OS === 'ios' ? 10 : 1000,
    height: Dimensions.get('window').height,
    width: SCREEN_WIDTH,
    // Removed cursor property to ensure compatibility with Animated.View
  },
  menuContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#FFFFFF",
    height: Platform.OS === 'web' ? undefined : SCREEN_HEIGHT,
    zIndex: Platform.OS === 'ios' ? 11 : 1001,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 15,
      },
      default: {
          boxShadow: "4px 0px 15px rgba(0, 0, 0, 0.2)",
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          cursor: 'auto', // Fixed cursor to only use acceptable values for Animated.View
        },
    }),
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  userSection: {
    paddingTop: Platform.select({
      ios: StatusBar.currentHeight ? StatusBar.currentHeight + 30 : 60,
      android: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
      default: 40,
    }),
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
    marginBottom: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344955",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#667883",
  },
  menuItems: {
    paddingTop: 20,
    paddingHorizontal: 15,
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    position: "relative",
  },
  menuText: {
    fontSize: 16,
    color: "#344955",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(240, 84, 84, 0.08)",
    borderRadius: 12,
    marginRight: 15,
  },
  notificationIconContainer: {
    position: "relative",
  },
  menuBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#F05454",
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  countBadge: {
    backgroundColor: "#F05454",
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  logoutMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: "auto",
    marginBottom: Platform.OS === "ios" ? 40 : 20, // Plus d'espace en bas sur iOS
  },
  logoutMenuText: {
    fontSize: 16,
    color: "#F05454",
    fontWeight: "500",
  },
});