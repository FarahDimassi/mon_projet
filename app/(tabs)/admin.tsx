import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Image } from "react-native";
// @ts-ignore
import { router } from "expo-router";
import { logout, getAllUsers, getToken, getDashboardStats } from "../../utils/authService";
import ProtectedRoute from "../../utils/ProtectedRoute";
import { LineChart } from "react-native-chart-kit";
// @ts-ignore
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";
import { jwtDecode } from "jwt-decode";

import { LinearGradient } from "expo-linear-gradient";
import FooterAdmin from "@/components/FooterAdmin";
import NavbarAdmin from "@/components/NavbarAdmin";
 import * as Notifications from 'expo-notifications';
 import { Platform, Alert } from 'react-native';
import { API_URL } from "@/utils/config";


// ✅ Dimensions de l'écran
const screenWidth = Dimensions.get("window").width;
const Tab = createBottomTabNavigator();
interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  active?: boolean;
}
// ✅ Composant pour chaque élément d'utilisateur
const UserListItem = ({ user, index }: { user: User; index: number }) => {
  // Générer une couleur de fond différente en fonction de l'index
  const bgColors = ['#FFF3E0', '#E3F2FD', '#E8F5E9', '#F3E5F5', '#E0F7FA'];
  const backgroundColor = bgColors[index % bgColors.length];
  
  return (
    <View style={styles.userListItem}>
      <View style={[styles.userAvatar, { backgroundColor }]}>
        <Text style={styles.userAvatarText}>{user.username ? user.username.charAt(0).toUpperCase() : "U"}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.username || "User " + (index + 1)}</Text>
        <Text style={styles.userRole}>{user.role || "Utilisateur"}</Text>
      </View>
      <View style={styles.userAction}>
        <Text style={styles.userActionText}>Profil {index + 1}x</Text>
      </View>
    </View>
  );
};

function AdminContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0); // Nombre de notifications (exemple)
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    usersByRole: {}
  });
  const [chartData, setChartData] = useState({
    labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    datasets: [
      {
        data: [10, 15, 20, 18, 23, 25, 30], // Données par défaut
        color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  });

  // Récupère la liste complète des utilisateurs
  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = await getToken();
        if (!token) {
          console.error("❌ Aucun token trouvé. Redirection vers l'authentification.");
          return;
        }

        const decoded: any = jwtDecode(token);
        console.log("✅ Token décodé :", decoded);

        if (decoded.role !== "ROLE_ADMIN") {
          console.error("❌ Accès refusé : rôle insuffisant.");
          return;
        }
        
        // Récupération des données
        const stats = await getDashboardStats();
        const fetched = await getAllUsers();
        setUsers(fetched);
        
        // Mise à jour des compteurs
        setUserCount(fetched.length);
        setNotificationCount(stats.totalNotifications || 0);
        
        // Calcul des statistiques utilisateurs
        const totalUsers = fetched.length;
        const usersByRole = fetched.reduce((acc: { [x: string]: any; }, user: { role: string; }) => {
          const role = user.role?.trim().toLowerCase();
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {});
        
        setUserStats({
          totalUsers,
          usersByRole
        });
        
        // Configuration du graphique
        if (stats.usersPerDay) {
          setChartData({
            labels: Object.keys(stats.usersPerDay),
            datasets: [
              {
                data: Object.values(stats.usersPerDay),
                color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
                strokeWidth: 3,
              },
            ],
          });
        }
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des utilisateurs :", error);
      }
    }

    fetchUsers();
  }, []);
async function registerForPushNotificationsAsync(): Promise<string|undefined> {
    let token: string | undefined;
  
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Notifications', 'Permission refusée pour les notifications.');
      return;
    }
  
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
    console.log('🔔 Expo push token:', token);
    return token;
  }
   
  
  
  // Calcule les compteurs
  const totalUsers = userStats.totalUsers;
  const roleUserCount = users.filter(u => u.role?.trim().toLowerCase() === "user").length;
  const coachCount = users.filter(u => u.role?.trim().toLowerCase() === "coach").length;

  // Exemple de données pour utilisateurs tendance
  const trendingUsers = users.slice(0, 3).map((user, index) => {
    return {
      ...user,
      // Ajout de propriétés pour l'affichage
      actions: Math.floor(Math.random() * 100) + 1  // Nombre aléatoire entre 1-100
    };
  });
  useEffect(() => {
       registerForPushNotificationsAsync().then(async token => {
         if (!token) return;
         // TODO : remplacer l’URL et payload par votre endpoint
         await fetch( `${API_URL}/api/admin/save-push-token`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ expoPushToken: token })
         });
       });
     }, []);
  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        {/* ✅ Cartes Statistiques Utilisateurs */}
        <View style={styles.statsCardsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.statIcon, { color: '#FF9800' }]}>👥</Text>
            </View>
            <Text style={styles.statValue}>{totalUsers}</Text>
            <Text style={styles.statLabel}>Utilisateurs</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.statIcon, { color: '#2196F3' }]}>🧑‍🤝‍🧑</Text>
            </View>
            <Text style={styles.statValue}>{roleUserCount}</Text>
            <Text style={styles.statLabel}>Rôle : User</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.statIcon, { color: '#4CAF50' }]}>🏋️‍♂️</Text>
            </View>
            <Text style={styles.statValue}>{coachCount}</Text>
            <Text style={styles.statLabel}>Rôle : Coach</Text>
          </View>
        </View>

        {/* ✅ Graphique des utilisateurs par jour */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>📈 Nombre d'utilisateurs par jour</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 10 },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#007bff",
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* ✅ Section utilisateurs tendance (comme dans la capture d'écran) */}
        <View style={styles.trendingContainer}>
  <View style={styles.trendingHeader}>
    <View>
      <Text style={styles.trendingTitle}>Utilisateurs Récents</Text>
     {/*  <Text style={styles.trendingSubtitle}>Aperçu rapide des derniers utilisateurs inscrits.</Text> */}
    </View>
    <FontAwesome5 name="users" size={22} color="rgba(195, 0, 0, 0.6)" style={styles.trendingIcon} />
  </View>
  
  <View style={styles.trendingList}>
    {users.slice(0, 3).map((user, index) => (
      <TouchableOpacity 
        key={index} 
        style={styles.userListItem}
        onPress={() => router.push({
          pathname: "/Users", // Replace with a valid route
          params: { userId: user.id }
        })}
      >
        <View style={[styles.userAvatar, { backgroundColor: getAvatarColor(index).bg }]}>
          <Text style={styles.userAvatarText}>{user.username ? user.username.charAt(0).toUpperCase() : "U"}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.username || "User " + (index + 1)}</Text>
          <Text style={styles.userRole}>{user.role || "Utilisateur"}</Text>
        </View>
        <View style={styles.userAction}>
          <Text style={styles.userActionText}>Profil {89 - index}x</Text>
          <FontAwesome5 name="chevron-right" size={12} color="#999" style={styles.userActionIcon} />
        </View>
      </TouchableOpacity>
    ))}
  </View>
  
  <View style={styles.divider} />
  
  <TouchableOpacity
    style={styles.viewAllButton}
    onPress={() => router.push("/Users")}
  >
    <Text style={styles.viewAllText}>Voir tous les utilisateurs</Text>
    <FontAwesome5 name="arrow-right" size={14} color="rgba(195, 0, 0, 0.6)" style={styles.viewAllIcon} />
  </TouchableOpacity>
</View>

        </View>
      </ScrollView>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <NavbarAdmin />
      <AdminContent />
      <FooterAdmin />
    </ProtectedRoute>
  );
}
const getAvatarColor = (index: number) => {
  const colors = [
    '#E3F2FD', // bleu clair
    '#FFF3E0', // orange clair
    '#E8F5E9', // vert clair
    '#F3E5F5', // violet clair
    '#FBE9E7', // rouge clair
  ];
  
  // Texte des avatars avec des couleurs contrastées
  const textColors = [
    '#1976D2', // bleu foncé
    '#F57C00', // orange foncé
    '#388E3C', // vert foncé
    '#8E24AA', // violet foncé
    '#D84315', // rouge foncé
  ];
  
  return {
    bg: colors[index % colors.length],
    text: textColors[index % textColors.length],
  };
};

// ✅ Styles améliorés
const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  container: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    marginBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  statCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "30%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCardWide: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    width: "48%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },
  statText: {
    fontSize: 14,
    marginTop: 8,
    color: "#555",
    textAlign: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
    color: "#f39c12",
  },
  viewMore: {
    fontSize: 14,
    color: "#007bff",
    marginTop: 5,
    fontWeight: "500",
  },
  chartContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  chart: {
    marginVertical: 10,
    borderRadius: 10,
    left:-25,
  },
  tabBar: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    height: 60,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    elevation: 5,
  },
  trendingContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  
  trendingIcon: {
    backgroundColor: '#EDF2FF',
    padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  trendingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
  },
  
  trendingSubtitle: {
    fontSize: 14,
    color: "#777",
    marginBottom: 5,
  },
  
  trendingList: {
    width: "100%",
    paddingHorizontal: 12,
  },
  
  userListItem: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: '#FAFAFA',
  },
  
  userAvatar: {
    width: 54,
    height: 54,
    borderRadius: 12,
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  
  userAvatarText: {
    fontSize: 22,
    fontWeight: "bold",
  },
  
  userInfo: {
    flex: 1,
  },
  
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  
  userRole: {
    fontSize: 14,
    color: "#777",
  },
  
  userAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  
  userActionText: {
    color: "rgba(195, 0, 0, 0.6)",
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  
  userActionIcon: {
    marginLeft: 2,
  },
  
  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginHorizontal: 20,
    marginVertical: 15,
  },
  
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(195, 0, 0, 0.6)',
    marginRight: 8,
  },
  
  viewAllIcon: {
    marginLeft: 2,
  },
  
  // Bouton Suite amélioré
  nextButton: {
    width: "60%",
    height: 54,
    marginVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "rgba(195, 0, 0, 0.6)",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  
  nextButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
    marginRight: 8,
  },
  
  arrowIcon: {
    marginLeft: 6,
  },
});