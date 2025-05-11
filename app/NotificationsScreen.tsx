import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  Animated,
  Modal,
  Dimensions,
  Platform
} from "react-native";
// Importer Lottie avec condition pour éviter les erreurs web/mobile
import * as Notifications from 'expo-notifications';

import { getToken, getUserIdFromToken } from "../utils/authService";
import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useRouter } from "expo-router";
import { API_URL } from "@/utils/config";

// Import Lottie conditionnel
let LottieView: any = () => null;
if (Platform.OS !== 'web') {
  // Utiliser import dynamique pour éviter les erreurs sur la version web
  LottieView = require("lottie-react-native").default;
}

type Notification = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  read: boolean;
  sender: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBadgePopup, setShowBadgePopup] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [previousNotifications, setPreviousNotifications] = useState<Notification[]>([]);
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  // Animation values
  const popupScale = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const badgeRotate = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  const fetchNotifications = async () => {
    try {
      const userId = await getUserIdFromToken();
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/notifications/user/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      
      // Vérifier s'il y a de nouvelles notifications
      if (previousNotifications.length > 0) {
        const newNotifications = data.filter(
          (notification: Notification) => 
            !previousNotifications.some(prevNotif => prevNotif.id === notification.id)
        );
        
        // Envoyer une notification locale pour chaque nouvelle notification
        for (const newNotification of newNotifications) {
          triggerLocalNotification(newNotification);
        }
      }
      
      // Mettre à jour les états
      setPreviousNotifications(data);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();
  }, []);
  
  useEffect(() => {
    (async () => {
      // Permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Permissions notifications refusées');
      }
      // Canal Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    })();
  }, []);
  
  useEffect(() => {
        const sub = Notifications.addNotificationResponseReceivedListener(response => {
          if (response.notification.request.content.data.type === "hydration") {
           setShowHydrationModal(true);
          }
        });
        return () => sub.remove();
      }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const notificationId = response.notification.request.content.data?.notificationId;
      if (notificationId) {
        // Marquer comme lu et traiter la notification
        markAsRead(notificationId);
        
        // Si c'est une notification de badge, afficher le popup
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && containsBadgeWord(notification)) {
          setSelectedNotification(notification);
          setShowBadgePopup(true);
          animateBadgePopup();
        }
      }
    });

    return () => subscription.remove();
  }, [notifications]);
  
  const triggerLocalNotification = async (notif: Notification) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body: notif.content,
          data: { notificationId: notif.id },
        },
        trigger: null, // immédiat
      });
      console.log("Notification locale envoyée:", notif.title);
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification locale:", error);
    }
  };
    
  // Fonction pour vérifier si la notification contient le mot "badge"
  const containsBadgeWord = (notification: Notification): boolean => {
    return notification.content.toLowerCase().includes("badge") || 
           notification.title.toLowerCase().includes("badge");
  };

  // Animation sequence for badge popup
  const animateBadgePopup = () => {
    popupScale.setValue(0);
    popupOpacity.setValue(0);
    badgeRotate.setValue(0);
    badgePulse.setValue(1);

    Animated.sequence([
      // Fade in and scale up the popup
      Animated.parallel([
        Animated.timing(popupScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(popupOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Rotate the badge
      Animated.timing(badgeRotate, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Pulse the badge
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // Filtre les notifications contenant le mot "badge"
  const badgeNotifications = notifications.filter(containsBadgeWord);

  const handleBadgePress = async () => {
    const genericBadge: Notification = {
      id: Date.now(),
      title: 'Vous avez reçu un badge !',
      content: `Vous avez ${badgeNotifications.length} ${badgeNotifications.length > 1 ? 'badges disponibles' : 'badge disponible'}`,
      createdAt: new Date().toISOString(),
      read: false,
      sender: 'Système'
    };
    setSelectedNotification(null);
    setShowBadgePopup(true);
    animateBadgePopup();
    await triggerLocalNotification(genericBadge);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Marquer comme lu
    await markAsRead(notification.id);
    
    // Vérifier si la notification contient le mot "badge"
    if (containsBadgeWord(notification)) {
      // Afficher le popup de badge uniquement si la notification parle de badge
      setSelectedNotification(notification);
      setShowBadgePopup(true);
      animateBadgePopup();
    }
  };

  const closeBadgePopup = () => {
    Animated.timing(popupOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowBadgePopup(false);
      setSelectedNotification(null);
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const token = await getToken();
      await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isBadgeNotification = containsBadgeWord(item);
    
    return (
      <TouchableOpacity
        style={[styles.item, item.read ? styles.readItem : styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationIcon}>
          <View style={[styles.iconCircle, item.read ? styles.readIconCircle : styles.unreadIconCircle]}>
            <Text style={styles.iconText}>{isBadgeNotification ? "🏅" : "📌"}</Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, item.read ? styles.readText : styles.unreadText]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.senderContainer}>
            <Text style={styles.senderName} numberOfLines={1}>
              {item.sender || "Système"}
            </Text>
            <View style={styles.timeBadge}>
              <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.content}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../assets/images/empty.png')}
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyText}>Pas de notifications</Text>
        <Text style={styles.emptySubtext}>
          Vous serez notifié ici lorsque vous recevrez de nouveaux messages
        </Text>
      </View>
    );
  };

  const spin = badgeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}    
        >
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {badgeNotifications.length > 0 && (
          <TouchableOpacity
            onPress={handleBadgePress}
            style={styles.badgeContainer}
          >
            <Text style={styles.badgeText}>{badgeNotifications.length}</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        renderItem={renderNotificationItem}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={notifications.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4f46e5"]}
            tintColor="#4f46e5"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Badge Popup Modal */}
      <Modal
        visible={showBadgePopup}
        transparent={true}
        animationType="none"
        onRequestClose={closeBadgePopup}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeBadgePopup}
        >
          <Animated.View 
            style={[
              styles.badgePopup,
              {
                opacity: popupOpacity,
                transform: [
                  { scale: popupScale }
                ]
              }
            ]}
          >
            <View style={styles.badgePopupContent}>
              <Animated.View
                style={[
                  styles.badgeIconContainer,
                  {
                    transform: [
                      { rotate: spin },
                      { scale: badgePulse }
                    ]
                  }
                ]}
              >
                <View style={styles.badgeIconWrapper}>
                  <Ionicons name="ribbon" size={50} color="#4f46e5" />
                </View>
              </Animated.View>
              
              <Text style={styles.badgePopupTitle}>
                {selectedNotification 
                  ? selectedNotification.title 
                  : "Vous avez reçu un badge !"}
              </Text>
              
              <View style={styles.badgePopupSender}>
                <View style={styles.badgeSenderDot} />
                <Text style={styles.badgeSenderText}>
                  {selectedNotification?.sender || "Système"}
                </Text>
                <Text style={styles.badgeSenderTime}>
                  — décerné par {selectedNotification?.sender ? "jass" : "système"}
                </Text>
              </View>
              
              <Text style={styles.badgePopupText}>
                {selectedNotification 
                  ? selectedNotification.content 
                  : `Vous avez ${badgeNotifications.length} ${badgeNotifications.length > 1 ? 'badges disponibles' : 'badge disponible'}`}
              </Text>
              
              <TouchableOpacity 
                style={styles.badgePopupButton}
                onPress={closeBadgePopup}
              >
                <Text style={styles.badgePopupButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={showHydrationModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.hydrationModal}>
      {/* <LottieView
        source={require("../assets/Animation.json")}
        autoPlay
        loop={false}
        style={{ width: 200, height: 200 }}
      /> */}
      <Text style={styles.hydrationText}>
        C’est l’heure de boire un grand verre d’eau ! 💧
      </Text>
      <TouchableOpacity
        style={styles.hydrationButton}
        onPress={() => setShowHydrationModal(false)}
      >
        <Text style={styles.hydrationButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937"
  },
  badgeContainer: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    paddingBottom: 20
  },
  listEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
  },
  readItem: {
    backgroundColor: "#ffffff",
  },
  unreadItem: {
    backgroundColor: "#f0f9ff",
  },
  notificationIcon: {
    marginRight: 12,
    justifyContent: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  readIconCircle: {
    backgroundColor: "#e0e7ff",
  },
  unreadIconCircle: {
    backgroundColor: "#dbeafe",
  },
  iconText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  readText: {
    fontWeight: "500",
    color: "#374151",
  },
  unreadText: {
    fontWeight: "700",
    color: "#1f2937",
  },
  senderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4f46e5",
    marginRight: 5,
  },
  timeBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  message: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  time: {
    fontSize: 11,
    color: "#6b7280",
  },
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4f46e5",
    alignSelf: "center",
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  // Badge Popup Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePopup: {
    width: width * 0.85,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  badgePopupContent: {
    width: '100%',
    alignItems: 'center',
  },
  badgeIconContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(219, 234, 254, 0.8)', // Light blue background like in your screenshot
    padding: 20,
    borderRadius: 100,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIconWrapper: {
    backgroundColor: '#ffffff',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  badgePopupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  badgePopupSender: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeSenderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981', // Green dot as in your screenshot
    marginRight: 6,
  },
  badgeSenderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981', // Green text as in your screenshot
    marginRight: 4,
  },
  badgeSenderTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  badgePopupText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  badgePopupButton: {
    backgroundColor: '#4f46e5', // Indigo
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  badgePopupButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
hydrationModal: {
  width: 300,
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 20,
  alignItems: 'center',
},
hydrationText: {
  fontSize: 18,
  fontWeight: '600',
  marginVertical: 12,
  textAlign: 'center',
},
hydrationButton: {
  backgroundColor: '#4f46e5',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
},
hydrationButtonText: {
  color: '#fff',
  fontWeight: '600',
},

});