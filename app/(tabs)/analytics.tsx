import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import {
  getAllUsers,
  getDashboardStats,
  getUsersProgress,
  getProgressChartData,
  getUserIdFromToken,
  getIaCoachedUsers,     
  getRealCoachedUsers,
} from "../../utils/authService";
import FooterAdmin from "@/components/FooterAdmin";
import ProtectedRoute from "@/utils/ProtectedRoute";
import NavbarAdmin from "@/components/NavbarAdmin";

const screenWidth = Dimensions.get("window").width;

// (Optionnel) structure de chaque résumé de progression
interface UserProgressSummary {
  userId: number;
  coachType: string;
  bmi: number;
  avis: string;
  progressPercent: number;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"day" | "week" | "month">("day");
  const [userPerDay, setUserPerDay] = useState<number[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [iaUsers, setIaUsers]     = useState<any[]>([]);
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    usersPerYear: 0,
  });

  // progression individuelle
  const [userId, setUserId] = useState<number | null>(null);
  const [latestProgress, setLatestProgress] = useState<UserProgressSummary | null>(null);
  const [chartData, setChartData] = useState<{
    dates: string[];
    ia: number[];
    reel: number[];
  } | null>(null);
  const [showProgressChart, setShowProgressChart] = useState(false);

  // 👉 nouvelle liste de **tous** les progrès
  const [allProgress, setAllProgress] = useState<UserProgressSummary[]>([]);
  // État pour gérer la visibilité de la modal
  const [modalVisible, setModalVisible] = useState(false);

  // 1️⃣ Dashboard stats
  useEffect(() => {
    (async () => {
      try {
        const stats = await getDashboardStats();
        setUserPerDay(Object.values(stats.usersPerDay));
        setUserStats({
          totalUsers: stats.totalUsers,
          usersPerYear: stats.totalUsers / 5,
        });
      } catch (error) {
        console.error("❌ Erreur stats :", error);
      }
    })();
  }, []);
  // ➋ Chargement des listes IA vs Réel
  useEffect(() => {
    getIaCoachedUsers()
      .then(setIaUsers)
      .catch(err => setError(err.message));

    getRealCoachedUsers()
      .then(setRealUsers)
      .catch(err => setError(err.message));
  }, []);

  // 2️⃣ Tous les utilisateurs
  useEffect(() => {
    (async () => {
      try {
        const fetched = await getAllUsers();
        setUsers(fetched);
      } catch (error) {
        console.error("❌ Erreur users :", error);
      }
    })();
  }, []);
  useEffect(() => {
    getProgressChartData()
      .then(setChartData)
      .catch((err) => console.error("Erreur getProgressChartData :", err));
  }, []);
  // 3️⃣ Récupérer l'userId depuis le token
  useEffect(() => {
    getUserIdFromToken()
      .then((id) => setUserId(id))
      .catch((err) => console.error("Impossible de lire userId :", err));
  }, []);

  // 4️⃣ Récupérer le % de progression pour l'utilisateur connecté
  useEffect(() => {
    if (userId != null) {
      getUsersProgress() // si vous préférez un fetch individuel, utiliser getUserProgress(userId)
     
        .then((data) => {
          if (Array.isArray(data)) {
            setLatestProgress(data[0] ); // ou data.find((p) => p.userId === userId)?.progressPercent
            console.log("Progression individuelle :",latestProgress);
          } else {
            console.error("Unexpected data format for getUsersProgress:", data);
          }
        })
        .catch((err) => {
          console.error("Erreur récupération progression individuelle :", err);
          setLatestProgress(null);
        }); 
        const usersProgress = getUsersProgress();
        console.log("usersProgress", usersProgress);
    }
  }, [userId]);

  // 5️⃣ Récupérer le chart IA vs réel


  // 6️⃣ Récupérer **tous** les résumés de progression
  useEffect(() => {
    getUsersProgress()
      .then((progress) => {
        if (Array.isArray(progress)) {
          setAllProgress(progress as UserProgressSummary[]);
        } else {
          console.error("Unexpected data format for getUsersProgress:", progress);
        }
      })
      .catch((err) =>
        console.error("Erreur getUsersProgress :", err)
      );
  }, []);

  // compteurs
  const totalUsers = userStats.totalUsers;
  const userCount = users.filter(
    (u) => u.role.trim().toLowerCase() === "user"
  ).length;
  const coachCount = users.filter(
    (u) => u.role.trim().toLowerCase() === "coach"
  ).length;
    // ➌ pourcentage de comptes de rôle "Coach"
    const coachPercentage = totalUsers > 0
    ? Math.round((userCount / totalUsers) * 100)
    : 0;


  const renderTabButton = (
    title: string,
    value: "day" | "week" | "month"
  ) => (
    <TouchableOpacity
      key={value}
      style={[styles.tabButton, activeTab === value && styles.activeTabButton]}
      onPress={() => setActiveTab(value)}
    >
      <Text style={[styles.tabText, activeTab === value && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  // Fonction pour obtenir le nom d'utilisateur
  const getUserName = (userId : number) => {
    const user = users.find(user => user.id === userId);
    return user ? user.username : "Inconnu";
  };
// ─── Répartition brute ───
/* const repartitionRaw = [
  { name: "IA",    population: iaUsers.length,  color: "rgba(195,0,0,0.5)", legendFontColor: "#333" },
  { name: "Réel",  population: realUsers.length, color: "rgba(195,0,0,0.8)", legendFontColor: "#333" },
  { name: "Users", population: userCount,        color: "rgba(195,0,0,0.2)", legendFontColor: "#333" },
];

// ─── On enlève les valeurs à 0 ───
const repartitionData = repartitionRaw.filter(item => item.population > 0);
 */
  return (
    <View style={styles.mainContainer}>
      <NavbarAdmin />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>Vue d'ensemble des performances</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsCardsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#FFF3E0" }]}>
              <Text style={[styles.statIcon, { color: "#FF9800" }]}>👥</Text>
            </View>
            <Text style={styles.statValue}>{totalUsers}</Text>
            <Text style={styles.statLabel}>Utilisateurs</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#E3F2FD" }]}>
              <Text style={[styles.statIcon, { color: "#2196F3" }]}>🧑‍🤝‍🧑</Text>
            </View>
            <Text style={styles.statValue}>{userCount}</Text>
            <Text style={styles.statLabel}>Rôle : User</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#E8F5E9" }]}>
              <Text style={[styles.statIcon, { color: "#4CAF50" }]}>🏋️‍♂️</Text>
            </View>
            <Text style={styles.statValue}>{coachCount}</Text>
            <Text style={styles.statLabel}>Rôle : Coach</Text>
          </View>
        </View>

        {/* Utilisateurs par jour */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Utilisateurs par jour</Text>
          </View>
          <LineChart
            data={{
              labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
              datasets: [{ data: userPerDay, strokeWidth: 3 }],
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
              labelColor: () => `rgba(75, 75, 75, 1)`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#fff" },
              propsForBackgroundLines: {
                strokeDasharray: "",
                strokeWidth: 1,
                stroke: "rgba(0,0,0,0.1)",
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
       {/* Répartition des utilisateurs par type */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Répartition IA vs Réel vs Coachs</Text>
          
          {/* Affichage des légendes */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "rgba(195, 0, 0, 0.5)" }]} />
              <Text style={styles.legendText}>CoachType IA</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "rgba(195, 0, 0, 0.8)" }]} />
              <Text style={styles.legendText}>CoachType Reel</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "rgba(195, 0, 0, 0.2)" }]} />
              <Text style={styles.legendText}>Users</Text>
            </View>
          </View>
          
          {/* Affichage éventuel d'erreur */}
          {iaUsers.length === 0 && realUsers.length === 0 && userCount === 0 ? (
            <Text style={styles.errorText}>Chargement des données...</Text>
          ) : (
            <PieChart
              data={[
                {
                  name: "IA",
                  population: iaUsers.length,
                  color: "rgba(195, 0, 0, 0.5)",
                  legendFontColor: "#333",
                },
                {
                  name: "Reel",
                  population: realUsers.length,
                  color: "rgba(195, 0, 0, 0.8)",
                  legendFontColor: "#333",
                },
                {
                  name: "Users",
                  population: userCount,
                  color: "rgba(195, 0, 0, 0.2)",
                  legendFontColor: "#333",
                },
              ]}
              width={screenWidth - 40}
              height={180}
              chartConfig={{
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: () => `rgba(0, 123, 255, 1)`,
                labelColor: () => `rgba(0, 0, 0, 1)`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="10"
              style={styles.chart}
            />
          )}
          
          {/* Affichage du pourcentage de coachs */}
        
          {/* Affichage des statistiques détaillées */}
          <View style={styles.statsInfoContainer}>
            {iaUsers.length + realUsers.length + userCount > 0 && (
              <>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{iaUsers.length}</Text>
                    <Text style={styles.statText}>Users IA</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{realUsers.length}</Text>
                    <Text style={styles.statText}>Users Réel</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{userCount}</Text>
                    <Text style={styles.statText}>Users</Text>
                  </View>
                </View>
                <View style={styles.percentageBar}>
                  <View 
                    style={[
                      styles.percentageFill, 
                      { 
                        width: `${Math.round((iaUsers.length / (iaUsers.length + realUsers.length + userCount)) * 100)}%`,
                        backgroundColor: "rgba(195, 0, 0, 0.5)" 
                      }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.percentageFill, 
                      { 
                        width: `${Math.round((realUsers.length / (iaUsers.length + realUsers.length + userCount)) * 100)}%`,
                        backgroundColor: "rgba(195, 0, 0, 0.8)" 
                      }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.percentageFill, 
                      { 
                        width: `${Math.round((userCount / (iaUsers.length + realUsers.length + userCount)) * 100)}%`,
                        backgroundColor: "rgba(195, 0, 0, 0.2)" 
                      }
                    ]} 
                  />
                </View>
                <View style={styles.percentageLabels}>
                  <Text style={styles.percentageText}>
                    {Math.round((iaUsers.length / (iaUsers.length + realUsers.length + userCount)) * 100)}%
                  </Text>
                  <Text style={styles.percentageText}>
                    {Math.round((realUsers.length / (iaUsers.length + realUsers.length + userCount)) * 100)}%
                  </Text>
                  <Text style={styles.percentageText}>
                    {Math.round((userCount / (iaUsers.length + realUsers.length + userCount)) * 100)}%
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Ma progression - PARTIE MODIFIÉE */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Ma progression</Text>
          
          {/* Carte principale montrant la dernière progression */}
          <View style={styles.progressCard}>
            <View style={styles.progressInfoContainer}>
              <View style={styles.progressCircle}>
              <Text style={styles.smallText}>
          {latestProgress != null
              ? `${latestProgress.progressPercent.toPrecision(3)}%` // 3 chiffres significatifs
              : "Chargement..."}
        </Text>
              </View>
              
              <View style={styles.progressDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Avis:</Text>
                  <Text style={styles.detailValue}>{latestProgress ? latestProgress.avis : "Chargement..."}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Coach:</Text>
                  <Text style={styles.detailValue}>{latestProgress ? latestProgress.coachType : "Chargement..."}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>BMI:</Text>
                  <Text style={styles.detailValue}>{latestProgress ? latestProgress.bmi : "Chargement..."}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Utilisateur:</Text>
                  <Text style={styles.detailValue}>
                    {latestProgress ? getUserName(latestProgress.userId) : "Chargement..."}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.expandButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal pour afficher toutes les progressions */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Historique des progressions</Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)} 
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.progressList}>
                {allProgress.map((progress, index) => (
                  <View key={index} style={styles.progressHistoryCard}>
                    <View style={styles.progressCardHeader}>
                      <View style={styles.smallProgressCircle}>
                          <Text style={styles.smallProgressPercentage}>
                          {progress.progressPercent.toPrecision(3)}%
                          </Text>
                      </View>
                      <Text style={styles.progressUser}>
                        {getUserName(progress.userId)}
                      </Text>
                    </View>
                    
                    <View style={styles.progressCardDetails}>
                      <View style={styles.progressCardRow}>
                        <Text style={styles.cardLabel}>Avis:</Text>
                        <Text style={styles.cardValue}>{progress.avis}</Text>
                      </View>
                      
                      <View style={styles.progressCardRow}>
                        <Text style={styles.cardLabel}>Coach:</Text>
                        <Text style={styles.cardValue}>{progress.coachType}</Text>
                      </View>
                      
                      <View style={styles.progressCardRow}>
                        <Text style={styles.cardLabel}>BMI:</Text>
                        <Text style={styles.cardValue}>{progress.bmi}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <View style={styles.chartContainer}>
    <Text style={styles.chartTitle}>Comparaison Coach IA vs Réel</Text>
    
  {/*   <View style={styles.tabContainer}>
      {renderTabButton("Jour", "day")}
      {renderTabButton("Semaine", "week")}
      {renderTabButton("Mois", "month")}
    </View>
    */}
    {chartData && (
      <>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "rgba(195, 0, 0, 0.5)" }]} />
            <Text style={styles.legendText}>Coach IA</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "rgba(195, 0, 0, 0.7)" }]} />
            <Text style={styles.legendText}>Coach Réel</Text>
          </View>
        </View>
        
        <LineChart
          data={{
            labels: chartData.dates.slice(0, 6),
            datasets: [
              {
                data: chartData.ia.slice(0, 6),
                color: (opacity = 1) => `rgba(195, 0, 0, ${opacity * 0.5})`,
                strokeWidth: 3,
              },
              {
                data: chartData.reel.slice(0, 6),
                color: (opacity = 1) => `rgba(195, 0, 0, ${opacity * 0.7})`,
                strokeWidth: 3,
              },
            ],
            legend: ["Coach IA", "Coach Réel"],
          }}
          width={screenWidth - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(90, 90, 90, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(75, 75, 75, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: "5",
              strokeWidth: "2",
              stroke: "#fff",
            },
            propsForBackgroundLines: {
              strokeDasharray: "",
              strokeWidth: 1,
              stroke: "rgba(0,0,0,0.05)",
            },
          }}
          bezier
          style={styles.chart}
        />
        <View style={styles.comparisonStatsContainer}>
        <View style={styles.comparisonStat}>
        <Text style={styles.comparisonValue}>
          {Math.round((chartData.ia.reduce((a, b) => a + b, 0) / chartData.ia.length) / 
                     ((chartData.ia.reduce((a, b) => a + b, 0) / chartData.ia.length) + 
                      (chartData.reel.reduce((a, b) => a + b, 0) / chartData.reel.length)) * 100)}%
        </Text> 
        <Text style={styles.comparisonLabel}>Moyenne IA</Text>
      </View>
      <View style={styles.comparisonStatDivider} />
      <View style={styles.comparisonStat}>
        <Text style={styles.comparisonValue}>
          {Math.round((chartData.reel.reduce((a, b) => a + b, 0) / chartData.reel.length) / 
                     ((chartData.ia.reduce((a, b) => a + b, 0) / chartData.ia.length) + 
                      (chartData.reel.reduce((a, b) => a + b, 0) / chartData.reel.length)) * 100)}%  
        </Text>
        <Text style={styles.comparisonLabel}>Moyenne Réel</Text>
      </View>

        </View>
      </>
    )}
  </View> 
      </ScrollView>
      <FooterAdmin />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  errorText: {
    fontSize: 14,
    color: "red",
    textAlign: "center",
    marginTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 25,
    marginBottom: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "30%",
    paddingVertical: 15,
    paddingHorizontal: 5,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    marginTop: 5,
    marginBottom: 15,
    padding: 15,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  chart: {
    borderRadius: 16,
    marginTop: 10,
    left: -15,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: "#2196F3",
  },
  tabText: {
    fontSize: 12,
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "500",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  smallCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
  },
  smallText: {
    fontSize: 16,
    color: "#333",
  },
  expandButton: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(195, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
   top:-39,
    left: 280,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  expandButtonText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 20,
  },
  // Nouveaux styles pour la partie progression
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    position: "relative",
  },
  progressInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(195, 0, 0, 0.5)",
    marginRight: 16,
  },
  progressPercentage: {
    fontSize: 22,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.5)",
  },
  progressDetails: {
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  detailLabel: {
    fontWeight: "700",
    color: "#666",
    width: 80,
  },
  detailValue: {
    flex: 1,
    color: "#333",
  },
  // Styles pour la modal
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(195, 0, 0, 0.5)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#333",
    fontWeight: "bold",
    lineHeight: 20,
  },
  progressList: {
    maxHeight: 500,
  },
  progressHistoryCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
  },
  progressCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  smallProgressCircle: {
    width: 43,
    height: 43,
    borderRadius: 20,
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(195, 0, 0, 0.5)",
    marginRight: 12,
  },
  smallProgressPercentage: {
    fontSize: 14,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.5)",
  },
  progressUser: {
    color: "#666",
    fontSize: 14,
    fontWeight: "700",
  },
  progressCardDetails: {
    paddingLeft: 8,
  },
  progressCardRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  cardLabel: {
    fontWeight: "500",
    color: "#666",
    width: 60,
  },
  cardValue: {
    flex: 1,
    color: "#333",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 4,
    alignSelf: "center",
  },
  comparisonStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
  },
  comparisonStat: {
    alignItems: "center",
    flex: 1,
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.6)",
  },
  comparisonLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  comparisonStatDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 10,
  },
  statsInfoContainer: {
    marginTop: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statText: {
    fontSize: 12,
    color: "#666",
  },
  percentageBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "#e0e0e0",
    marginBottom: 10,
  },
  percentageFill: {
    height: "100%",
  },
  percentageLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  percentageText: {
    fontSize: 12,
    color: "#666",
  },
});