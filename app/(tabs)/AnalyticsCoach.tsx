// DashboardCoachScreen.tsx with added badge system
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from "react-native";
import {
  getUserIdFromToken,
  getCoachInvitations,
  getReviewsByCoachId,
  getCoachDailyPlans,
  acceptInvitation,
  getAcceptedInvitationsForCoach,
} from "../../utils/authService";
import { getMealPlan, sendBadgeToUser } from "../../utils/authService"; // Added sendBadgeToUser
import { Ionicons } from "@expo/vector-icons";
import NavbarCoach from "@/components/NavbarCoach";
import FooterC from "@/components/FooterC";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Invitation {
  id: number;
  userId: number;
  username: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  sender?: {
    id: number;
    username: string;
    photoUrl?: string;
  };
}

interface Subscriber {
  id: number;
  username: string;
  photoUrl?: string;
}

interface DailyPlan {
  userId: number;
  username: string;
  planType?: string;
}

interface MealPlan {
  id?: number;
  date?: string;
  meals?: {
    id: number;
    name: string;
    time: string;
    foods: {
      id: number;
      name: string;
      quantity: string;
      calories?: number;
    }[];
  }[];
}

// New Badge interface
interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// Interface for API response format
interface ApiMealPlan {
  id: number;
  coachId: number;
  userId: number;
  date: string;
  breakfast?: string;
  breakfastTick?: boolean;
  lunch?: string;
  lunchTick?: boolean;
  dinner?: string;
  dinnerTick?: boolean;
  snacks?: string;
  snacksTick?: boolean;
  sport?: string;
  sportTick?: boolean;
  water?: string;
  waterTick?: boolean;
}

export default function DashboardCoachScreen() {
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [todayInvitations, setTodayInvitations] = useState<Invitation[]>([]);
  const [plansToday, setPlansToday] = useState<DailyPlan[]>([]);
  const [activeCoachDays] = useState(47);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<number[]>([]);
  const [acceptedInvitations, setAcceptedInvitations] = useState<Invitation[]>([]);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [dailyStats, setDailyStats] = useState<number[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUserPlan, setSelectedUserPlan] = useState<MealPlan | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [coachId, setCoachId] = useState<number | null>(null);
  
  // New state for badge system
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [badgeSelectionConfirmVisible, setBadgeSelectionConfirmVisible] = useState(false);

  // Badge data - nutrition/fitness themed
  const badges: Badge[] = [
    { 
      id: "water-master", 
      name: "Water Master", 
      icon: "💧", 
      description: "Awarded for excellent hydration habits" 
    },
    { 
      id: "protein-king", 
      name: "Protein King", 
      icon: "🥩", 
      description: "Consistently hitting protein targets" 
    },
    { 
      id: "veggie-champion", 
      name: "Veggie Champion", 
      icon: "🥦", 
      description: "Excellent vegetable consumption" 
    },
    { 
      id: "meal-prepper", 
      name: "Meal Prep Pro", 
      icon: "🍱", 
      description: "Master of meal preparation" 
    },
    { 
      id: "workout-warrior", 
      name: "Workout Warrior", 
      icon: "💪", 
      description: "Consistent training achievement" 
    },
    { 
      id: "macro-master", 
      name: "Macro Master", 
      icon: "📊", 
      description: "Perfect macro balance achieved" 
    },
    { 
      id: "sleep-optimizer", 
      name: "Sleep Optimizer", 
      icon: "😴", 
      description: "Excellence in sleep management" 
    },
    { 
      id: "progress-tracker", 
      name: "Progress Tracker", 
      icon: "📈", 
      description: "Consistent tracking of progress" 
    }
  ];

  /* ──────────────────────────
   *  Helpers ─────────────────
   * ────────────────────────── */
  const buildUniqueByUser = (invites: Invitation[]) => {
    const map = new Map<number, Invitation>();
    invites.forEach((inv) => {
      const uid = inv.sender?.id ?? inv.userId;
      if (!map.has(uid)) map.set(uid, inv);
    });
    return Array.from(map.values());
  };

  /* ──────────────────────────
   *  AsyncStorage persistance
   * ────────────────────────── */
  const saveAcceptedIds = async (ids: number[]) => {
    try {
      await AsyncStorage.setItem("acceptedInvitationIds", JSON.stringify(ids));
    } catch (error) {
      console.error("Error saving accepted IDs:", error);
    }
  };

  const loadAcceptedIds = async () => {
    try {
      const savedIds = await AsyncStorage.getItem("acceptedInvitationIds");
      if (savedIds) setAcceptedIds(JSON.parse(savedIds));
    } catch (error) {
      console.error("Error loading accepted IDs:", error);
    }
  };

  /* ──────────────────────────
   *  Fetch functions
   * ────────────────────────── */
  const fetchInvitations = async () => {
    try {
      const coachId = await getUserIdFromToken();
      if (!coachId) return;

      const data = await getCoachInvitations(coachId);
      const pendingInv = data.filter((inv: Invitation) => inv.status === "PENDING");
      setInvitations(pendingInv);

      // Invitations créées aujourd'hui
      const today = new Date().toISOString().slice(0, 10);
      setTodayInvitations(pendingInv.filter((i) => i.createdAt.startsWith(today)));
    } catch (error) {
      console.error("Erreur lors de la récupération des invitations:", error);
    }
  };

  const fetchAcceptedInvitations = async () => {
    try {
      const coachId = await getUserIdFromToken();
      if (!coachId) return;

      const accepted = await getAcceptedInvitationsForCoach(coachId);
      const total = accepted.length;
      setTotal(total);
      const uniqueAccepted = buildUniqueByUser(accepted);

      setAcceptedInvitations(uniqueAccepted);
      setAcceptedCount(uniqueAccepted.length);

      // Construire la liste d'abonnés sans doublons
      const subs: Subscriber[] = uniqueAccepted.map((inv) => ({
        id: inv.sender?.id ?? inv.userId,
        username: inv.sender?.username ?? inv.username,
        photoUrl: inv.sender?.photoUrl,
      }));
      setSubscribers(subs);
    } catch (err) {
      console.error("Erreur chargement invitations ACCEPTED:", err);
    }
  };

  const fetchUserPlan = async (userId: number, username: string) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const coachIdValue = coachId!;
      
      // Fetch the meal plan from API
      const planData: ApiMealPlan = await getMealPlan(today, userId, coachIdValue);
      console.log("Plan API response:", planData);
      
      // Transform API data to expected format
      const transformedPlan: MealPlan = {
        id: planData.id,
        date: planData.date,
        meals: []
      };
      
      // Add breakfast if exists
      if (planData.breakfast) {
        transformedPlan.meals!.push({
          id: 1,
          name: "Petit déjeuner",
          time: "08:00",
          foods: [{ 
            id: 1, 
            name: planData.breakfast, 
            quantity: "1 portion",
            calories: 300 // You can add default calories or omit this
          }]
        });
      }
      
      // Add lunch if exists
      if (planData.dinner) {
        transformedPlan.meals!.push({
          id: 2,
          name: "Déjeuner",
          time: "12:00",
          foods: [{ 
            id: 2, 
            name: planData.dinner, 
            quantity: "1 portion",
            calories: 500
          }]
        });
      }
      
      // Add dinner if exists
      if (planData.lunch) {
        transformedPlan.meals!.push({
          id: 3,
          name: "Dîner",
          time: "19:00",
          foods: [{ 
            id: 3, 
            name: planData.lunch, 
            quantity: "1 portion",
            calories: 450
          }]
        });
      }
      
      // Add snacks if exists
      if (planData.snacks) {
        transformedPlan.meals!.push({
          id: 4,
          name: "Collations",
          time: "16:00",
          foods: [{ 
            id: 4, 
            name: planData.snacks, 
            quantity: "1 portion",
            calories: 150
          }]
        });
      }
      if (planData.sport) {
        transformedPlan.meals!.push({
          id: 4,
          name: "Activités",
          time: "17:00",
          foods: [{ 
            id: 5, 
            name: planData.sport, 
            quantity: "10 minutes",
          }]
        });
      }
      if (planData.water) {
        transformedPlan.meals!.push({
          id: 4,
          name: "Hydratation",
          time: "1 day",
          foods: [{ 
            id: 5, 
            name: planData.water, 
            quantity: "tochrbou lkol",
          }]
        });
      }
      console.log("Transformed plan:", transformedPlan);
      setSelectedUserPlan(transformedPlan);
      setSelectedUserName(username);
      setModalVisible(true);
    } catch (error) {
      console.error("Erreur lors de la récupération du plan:", error);
      Alert.alert("Erreur", "Impossible de charger le plan de l'utilisateur");
    } finally {
      setLoading(false);
    }
  };

  /* ──────────────────────────
   *  Handlers
   * ────────────────────────── */
  const handleAccept = async (invitationId: number) => {
    try {
      await acceptInvitation(invitationId);
      Alert.alert("Invitation acceptée");

      const acceptedInvitation = invitations.find((inv) => inv.id === invitationId);
      if (acceptedInvitation) {
        // Ajout du nouvel abonné (si non présent)
        const newSubscriber: Subscriber = {
          id: acceptedInvitation.sender?.id ?? acceptedInvitation.userId,
          username: acceptedInvitation.sender?.username ?? acceptedInvitation.username,
          photoUrl: acceptedInvitation.sender?.photoUrl,
        };
        setSubscribers((prev) => {
          if (prev.find((s) => s.id === newSubscriber.id)) return prev;
          return [...prev, newSubscriber];
        });

        // Mémoriser l'ID accepté
        const newAcceptedIds = [...acceptedIds, invitationId];
        setAcceptedIds(newAcceptedIds);
        await saveAcceptedIds(newAcceptedIds);

        // Mettre à jour les listes locales
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        setTodayInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));

        // Re‑calculer la liste unique des invitations acceptées
        setAcceptedInvitations((prev) => buildUniqueByUser([...prev, acceptedInvitation]));
        setAcceptedCount((prev) => prev + 1);
      }
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'accepter l'invitation");
      console.error("Erreur lors de l'acceptation:", err);
    }
  };

  const handleReject = async (invitationId: number) => {
    try {
      Alert.alert("Invitation refusée");
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      setTodayInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      Alert.alert("Erreur", "Impossible de refuser l'invitation");
      console.error("Erreur lors du refus:", err);
    }
  };

  // New handler for opening badge modal
  const handleOpenBadgeModal = (userId: number, username: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(username);
    setBadgeModalVisible(true);
  };

  // New handler for selecting a badge
  const handleSelectBadge = (badge: Badge) => {
    setSelectedBadge(badge);
    setBadgeSelectionConfirmVisible(true);
  };

  // New handler for confirming and sending a badge
  const handleSendBadge = async () => {
    try {
      if (!selectedUserId || !selectedBadge || !coachId) {
        Alert.alert("Erreur", "Informations manquantes pour envoyer le badge");
        return;
      }

      // Call API to send badge (you'll need to implement this in authService.ts)
      const response = await sendBadgeToUser(
        selectedUserId,
        selectedBadge.id,
        coachId,
        selectedBadge.name,
        selectedBadge.icon
      );
      
      // vous pouvez récupérer icon + name en retour si besoin :
      console.log(response.badgeIcon, response.badgeName);
      Alert.alert(
        `Badge ${response.badgeIcon} ${response.badgeName}`,
        `envoyé à ${selectedUserName} !`
      );
      
      // Close modals and show success message
      setBadgeSelectionConfirmVisible(false);
      setBadgeModalVisible(false);
      Alert.alert(
        "Badge envoyé !",
        `Le badge "${selectedBadge.name}" a été envoyé à ${selectedUserName} avec succès !`
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi du badge:", error);
      Alert.alert("Erreur", "Impossible d'envoyer le badge");
    }
  };

  // Génére un graphique basé sur les données réelles
  const generateDailyStats = (total: number, acceptedCount: number, reviewsCount: number) => {
    // Créer un tableau de 7 jours avec des données dynamiques basées sur nos métriques
    // Les valeurs seront des proportions des métriques réelles pour simuler l'évolution
    const weekStats = [];
    const baseStat = Math.max(5, Math.min(total, acceptedCount, reviewsCount) / 3);
    
    for (let i = 0; i < 7; i++) {
      // Générer une valeur basée sur nos métriques avec une petite variation
      let value;
      if (i < 3) {
        // 3 premiers jours basés sur proportion de revues
        value = baseStat + (reviewsCount / 10) * (1 + (i * 0.2));
      } else if (i < 5) {
        // 2 jours basés sur abonnés
        value = baseStat + (acceptedCount / 8) * (1 + ((i-3) * 0.25));
      } else {
        // 2 derniers jours basés sur total users
        value = baseStat + (total / 6) * (1 + ((i-5) * 0.3));
      }
      
      // Arrondir à l'entier et s'assurer que la valeur est au moins 5
      weekStats.push(Math.max(5, Math.round(value)));
    }
    
    return weekStats;
  };

  /* ──────────────────────────
   *  Initial load
   * ────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        await loadAcceptedIds();
        
        const fetchedCoachId = await getUserIdFromToken();
        if (!fetchedCoachId) return;
        setCoachId(fetchedCoachId);
        
        await fetchInvitations();
        await fetchAcceptedInvitations();

        // Reviews
        if (fetchedCoachId) {
          const revs = await getReviewsByCoachId(fetchedCoachId);
          setReviewsCount(revs.length);

          // Plans du jour
          const today = new Date().toISOString().slice(0, 10);
          const plans = await getCoachDailyPlans(today, fetchedCoachId);
          setPlansToday(plans);
        }
      } catch (err) {
        console.error("Erreur dashboard coach :", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Mettre à jour les statistiques quotidiennes quand nous avons les données
  useEffect(() => {
    if (total > 0 || acceptedCount > 0 || reviewsCount > 0) {
      const stats = generateDailyStats(total, acceptedCount, reviewsCount);
      setDailyStats(stats);
    }
  }, [total, acceptedCount, reviewsCount]);

  /* ──────────────────────────
   *  Rendering
   * ────────────────────────── */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff5a87" />
      </View>
    );
  }

  const pendingCount = invitations.length;
  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];
  
  // Utiliser dailyStats pour les hauteurs de barres s'il est disponible, sinon valeurs par défaut
  const chartHeights = dailyStats.length === 7 
    ? dailyStats.map(val => Math.min(60, Math.max(10, val))) 
    : [20, 25, 30, 35, 27, 40, 33];

  return (
    <SafeAreaView style={styles.container}>
      <NavbarCoach />
      <ScrollView contentContainerStyle={styles.content}>
        {/* — STATISTIQUES — */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Statistiques</Text>
          </View>

          {/* Carte principale */}
          <View style={styles.statsCard}>
            <View style={styles.statsLeftColumn}>
              <Text style={styles.bigNumber}>{total}</Text>
              <Text style={styles.statsLabel}>Users</Text>
            </View>
            <View style={styles.statsRightColumn}>
              <View style={styles.chartContainer}>
                {weekDays.map((d, i) => (
                  <View key={i} style={styles.chartColumn}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: 20 + Math.random() * 30 },
                        i % 2 === 0 ? styles.purpleBar : styles.orangeBar,
                      ]}
                    />
                    <Text style={styles.chartLabel}>{d}</Text>
                  </View>
                ))}
              </View>
          </View>
          </View>

          {/* Métriques */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{pendingCount}</Text>
              <Text style={styles.metricLabel}>Invitations</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: "#ff5a87" }]}>
                {acceptedCount}
              </Text>
              <Text style={styles.metricLabel}>Abonnés</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: "#ffb44c" }]}>
                {reviewsCount}
              </Text>
              <Text style={styles.metricLabel}>Avis reçus</Text>
            </View>
          </View>
        </View>

        {/* — INVITATIONS EN ATTENTE — */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Invitations en attente</Text>
          </View>

          {invitations.length > 0 ? (
            invitations.map((inv) => (
              <View key={inv.id} style={styles.invitationCard}>
                <View style={styles.goalLeftContent}>
                  {inv.sender && (
                    <View style={styles.invitationInfo}>
                      <Image
                        source={{ uri: buildAvatarUrl(inv.sender.photoUrl) }}
                        style={styles.invitationAvatar}
                      />
                      <Text style={styles.invitationUserName}>
                        {inv.sender.username}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAccept(inv.id)}
                  >
                    <Text style={styles.buttonText}>Accepter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(inv.id)}
                  >
                    <Text style={styles.buttonText}>Refuser</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                0 invitation reçue aujourd'hui
              </Text>
            </View>
          )}
        </View>

        {/* — PLANS & INVITATIONS — */}
        <View style={styles.sectionn}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plans & Invitations</Text>
          </View>

          {/* Invitations du jour */}
          {pendingCount > 0 && (
            <>
              <Text style={styles.subsectionTitle}>
                Invitations reçues ({pendingCount})
              </Text>
              {todayInvitations.map((inv) => (
                <TouchableOpacity key={inv.id} style={styles.goalCard}>
                  <View style={styles.goalLeftContent}>
                    <View
                      style={[
                        styles.checkCircle,
                        { backgroundColor: "#b69eff" },
                      ]}
                    >
                      <Ionicons name="person" size={14} color="#fff" />
                    </View>
                    <Text style={styles.goalText}>{inv.username}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {inv.status === "PENDING"
                        ? "En attente"
                        : inv.status === "ACCEPTED"
                        ? "Acceptée"
                        : "Refusée"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Aucun plan / invit */}
          {todayInvitations.length === 0 && plansToday.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Pas d'invitations ni de plans aujourd'hui
              </Text>
            </View>
          )}

          {/* Résumé */}
          <TouchableOpacity style={styles.summaryCard}>
            <View style={styles.goalLeftContent}>
              <View
                style={[styles.checkCircle, { backgroundColor: "#ffb44c" }]}
              >
                <Ionicons name="notifications" size={14} color="#fff" />
              </View>
              <Text style={styles.goalText}>
                {pendingCount} invitation{pendingCount > 1 ? "s" : ""} reçue
                {pendingCount > 1 ? "s" : ""}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryCard}>
            <View style={styles.goalLeftContent}>
              <View
                style={[styles.checkCircle, { backgroundColor: "#ff5a87" }]}
              >
                <Ionicons name="calendar" size={14} color="#fff" />
              </View>
              <Text style={styles.goalText}>
                {plansToday.length} plan{plansToday.length > 1 ? "s" : ""}{" "}
                aujourd'hui
              </Text>
            </View>
          </TouchableOpacity>

          {/* Plans du jour */}
          {plansToday.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>
                Plans assignés aujourd'hui ({plansToday.length})
              </Text>
              {plansToday.map((plan) => (
                <View key={plan.userId} style={styles.planUserRow}>
                  <TouchableOpacity 
                    style={styles.goalCard}
                    onPress={() => fetchUserPlan(plan.userId, plan.username)}
                  >
                    <View style={styles.goalLeftContentt}>
                      <View
                        style={[
                          styles.checkCircle,
                          { backgroundColor: "#ff5a87" },
                        ]}
                      >
                        <Ionicons name="calendar" size={14} color="#fff" />
                      </View>
                      <Text style={styles.goalText}>{plan.username}</Text>
                    </View> 
                    <TouchableOpacity 
                    style={styles.badgeButton}
                    onPress={() => handleOpenBadgeModal(plan.userId, plan.username)}
                  >
                    <Ionicons name="trophy" size={20} color="#ffb44c" />
                  </TouchableOpacity>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#ff5a87"
                    />  {/* Badge button added here */}
                 
                  </TouchableOpacity>
                  
                
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal pour afficher le plan d'un utilisateur */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plan de {selectedUserName}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {selectedUserPlan && selectedUserPlan.meals && selectedUserPlan.meals.length > 0 ? (
                selectedUserPlan.meals.map((meal, index) => (
                  <View key={index} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      <Text style={styles.mealTime}>{meal.time}</Text>
                    </View>
                    {meal.foods.map((food, foodIndex) => (
                      <View key={foodIndex} style={styles.foodItem}>
                        <Text style={styles.foodName}>{food.name}</Text>
                        <Text style={styles.foodQuantity}>{food.quantity}</Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Aucun plan disponible pour aujourd'hui
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NEW - Modal pour sélectionner un badge */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={badgeModalVisible}
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeIcon}
                onPress={() => setBadgeModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Envoyer un badge</Text>
              <View style={{width: 24}} />
            </View>
            
            <View style={styles.recipientInfo}>
              <Ionicons name="person-circle" size={24} color="#666" />
              <Text style={styles.recipientName}>{selectedUserName}</Text>
            </View>
            
            <ScrollView>
              <Text style={styles.subsectionTitle}>Sélectionnez un badge à envoyer</Text>
              <View style={styles.badgeGrid}>
                {badges.map((badge) => (
                  <TouchableOpacity
                    key={badge.id}
                    style={styles.badgeItem}
                    onPress={() => handleSelectBadge(badge)}
                  >
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDescription}>{badge.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Badge Selection Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={badgeSelectionConfirmVisible}
        onRequestClose={() => setBadgeSelectionConfirmVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.confirmationView}>
            <Text style={styles.confirmationTitle}>
              Confirmer l'envoi du badge à {selectedUserName}
            </Text>
            
            {selectedBadge && (
              <View style={styles.selectedBadgeContainer}>
                <Text style={styles.selectedBadgeIcon}>{selectedBadge.icon}</Text>
                <Text style={styles.selectedBadgeName}>{selectedBadge.name}</Text>
                <Text style={styles.badgeDescription}>{selectedBadge.description}</Text>
              </View>
            )}
            
            <View style={styles.confirmButtonsContainer}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setBadgeSelectionConfirmVisible(false)}
              >
                <Text style={[styles.confirmButtonText, styles.cancelButtonText]}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, styles.sendButton]}
                onPress={handleSendBadge}
              >
                <Text style={[styles.confirmButtonText, styles.sendButtonText]}>Envoyer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <FooterC />
    </SafeAreaView>
  );
}

const buildAvatarUrl = (rawUrl?: string) => {
  const baseUrl = "http://localhost:8080/";
  if (rawUrl && rawUrl.trim().length > 0) {
    return rawUrl.startsWith("http")
      ? rawUrl.replace("localhost:8081", "localhost:8080")
      : baseUrl + rawUrl;
  }
  return "https://dummyimage.com/40x40/cccccc/ffffff&text=User";
};

/* ──────────────────────────
 *  Styles complets
 * ────────────────────────── */
const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: "#f8f8f8" 
    },
    center: { 
      flex: 1, 
      justifyContent: "center", 
      alignItems: "center" 
    },
    content: { 
      padding: 15 
    },
    section: { 
      marginBottom: 20 
    },
    sectionn: { 
      marginBottom: 50 
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    sectionTitle: { 
      fontSize: 18, 
      fontWeight: "600", 
      color: "#333" 
    },
    statsCard: {
      backgroundColor: "#fff",
      borderRadius: 18,
      padding: 15,
      flexDirection: "row",
      marginBottom: 15,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    statsLeftColumn: { 
      width: "30%", 
      alignItems: "center", 
      justifyContent: "center" 
    },
    statsRightColumn: { 
      width: "70%", 
      justifyContent: "center" 
    },
    bigNumber: { 
      fontSize: 42, 
      fontWeight: "700", 
      color: "#333" 
    },
    statsLabel: { 
      fontSize: 12, 
      color: "#888" 
    },
    chartContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "flex-end",
      height: 60,
    },
    chartColumn: { 
      alignItems: "center", 
      width: 20 
    },
    chartBar: { 
      width: 6, 
      borderRadius: 3 
    },
    purpleBar: { 
      backgroundColor: "#b69eff" 
    },
    orangeBar: { 
      backgroundColor: "#ffb44c" 
    },
    chartLabel: { 
      fontSize: 12, 
      color: "#888", 
      marginTop: 5 
    },
    metricsRow: { 
      flexDirection: "row", 
      justifyContent: "space-between" 
    },
    metricCard: {
      flex: 1,
      backgroundColor: "#fff",
      padding: 15,
      borderRadius: 18,
      alignItems: "center",
      marginHorizontal: 5,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    metricNumber: { 
      fontSize: 24, 
      fontWeight: "700", 
      color: "#b69eff" 
    },
    metricLabel: {
      fontSize: 12,
      color: "#888",
      textAlign: "center",
      marginTop: 4,
    },
    subsectionTitle: {
      fontSize: 15,
      fontWeight: "500",
      color: "#666",
      marginBottom: 8,
      marginTop: 5,
    },
    goalCard: {
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
    },
    invitationCard: {
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: "column",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
    },
    summaryCard: {
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 1,
      borderLeftWidth: 3,
      borderLeftColor: "#ffb44c",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
    },
    goalLeftContent: { 
      flexDirection: "row", 
      alignItems: "center" ,
    },
    goalLeftContentt: { 
      flexDirection: "row", 
      alignItems: "center" ,
      flex: 1,
      width: 280,
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#e6e6e6",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    goalText: { 
      fontSize: 15, 
      color: "#444" 
    },
    statusBadge: {
      backgroundColor: "#f0f0f0",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: { 
      fontSize: 12, 
      color: "#666" 
    },
    emptyState: {
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 20,
      marginBottom: 15,
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
    },
    emptyStateText: { 
      fontSize: 15, 
      color: "#888", 
      textAlign: "center" 
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 10,
    },
    actionButton: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      marginLeft: 10,
    },
    acceptButton: {
      backgroundColor: "#b69eff",
    },
    rejectButton: {
      backgroundColor: "#ff5a87",
    },
    buttonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "500",
    },
    invitationInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    invitationAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    invitationUserName: {
      fontSize: 15,
      fontWeight: "500",
      color: "#333",
    },
  
    modalView: {
      width: "90%",
      maxHeight: "80%",
      backgroundColor: "white",
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
      paddingBottom: 10,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "#333",
    },
    modalContent: {
      maxHeight: "90%",
    },
    mealCard: {
      backgroundColor: "#f9f9f9",
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
    mealHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#eaeaea",
      paddingBottom: 5,
    },
    mealName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#ff5a87",
    },
    mealTime: {
      fontSize: 14,
      color: "#666",
    },
    foodItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: "#eaeaea",
    },
    foodName: {
      fontSize: 15,
      color: "#444",
      flex: 1,
    },
    foodQuantity: {
      fontSize: 14,
      color: "#888",
      marginLeft: 10,
    },
    noMealsText: {
      fontSize: 16,
      color: "#888",
      textAlign: "center",
      marginVertical: 20,
    },
    modalButton: {
      backgroundColor: "#b69eff",
      padding: 12,
      borderRadius: 20,
      alignItems: "center",
      marginTop: 15,
    },
    modalButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "500",
    },
    // Styles pour les indicateurs de calories
    caloriesBadge: {
      backgroundColor: "#e8f4ff",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      marginLeft: 8,
    },
    caloriesText: {
      fontSize: 12,
      color: "#4a90e2",
    },
    // Styles supplémentaires pour l'affichage des plans
    planTypeChip: {
      backgroundColor: "#e8f7ef",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 15,
      alignSelf: "flex-start",
      marginBottom: 10,
    },
    planTypeText: {
      fontSize: 12,
      color: "#4caf50",
      fontWeight: "500",
    },
    dateRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
      paddingBottom: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: "#eaeaea",
    },
    dateBadge: {
      fontSize: 14,
      color: "#888",
    },
    totalCaloriesRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      marginTop: 5,
      borderTopWidth: 1,
      borderTopColor: "#eaeaea",
    },
    totalCaloriesLabel: {
      fontSize: 15,
      fontWeight: "500",
      color: "#444",
    },
    totalCaloriesValue: {
      fontSize: 15,
      fontWeight: "600",
      color: "#ff5a87",
    },
    supplementsSection: {
      marginTop: 10,
      padding: 10,
      backgroundColor: "#f0f8ff",
      borderRadius: 8,
    },
    supplementsTitle: {
      fontSize: 14,
      fontWeight: "500",
      color: "#4a90e2",
      marginBottom: 5,
    },
    supplementItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
    },
    supplementName: {
      fontSize: 13,
      color: "#555",
    },
    supplementDosage: {
      fontSize: 13,
      color: "#888",
    },
    // Styles pour les boutons d'actions dans le modal
    modalActionButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 15,
      borderTopWidth: 1,
      borderTopColor: "#f0f0f0",
      paddingTop: 15,
    },
    modalActionButton: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      flex: 1,
      marginHorizontal: 5,
      alignItems: "center",
    },
    editButton: {
      backgroundColor: "#b69eff",
    },
    closeButton: {
      backgroundColor: "#f0f0f0",
    },
    // Styles pour les statistiques de progression
    progressSection: {
      marginTop: 10,
      padding: 10,
      backgroundColor: "#fff",
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#333",
      marginBottom: 10,
    },
    progressBar: {
      height: 8,
      backgroundColor: "#f0f0f0",
      borderRadius: 4,
      marginVertical: 5,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressLabel: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 3,
    },
    progressLabelText: {
      fontSize: 12,
      color: "#888",
    },
    progressValue: {
      fontSize: 12,
      fontWeight: "500",
      color: "#444",
    },
    // Styles pour la liste des abonnés
    subscribersListContainer: {
      marginTop: 10,
    },
    subscriberItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 12,
      marginBottom: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
    subscriberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    subscriberInfo: {
      flex: 1,
    },
    subscriberName: {
      fontSize: 15,
      fontWeight: "500",
      color: "#333",
    },
    subscriberSince: {
      fontSize: 12,
      color: "#888",
      marginTop: 2,
    },
    subscriberActionButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
      backgroundColor: "#f0f0f0",
    },
    subscriberActionText: {
      fontSize: 12,
      color: "#666",
    },
    centeredView: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    // Styles pour la sélection de badge
    badgeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#fff",
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 10,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    planUserRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
  
    },
    badgeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 15,
    },
    badgeItem: {
      width: "48%",
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
    },
    badgeIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    badgeName: {
      fontSize: 14,
      fontWeight: "600",
      color: "#333",
      textAlign: "center",
      marginBottom: 4,
    },
    badgeDescription: {
      fontSize: 12,
      color: "#888",
      textAlign: "center",
    },
    // Styles pour la confirmation d'envoi de badge
    confirmationView: {
      backgroundColor: "white",
      borderRadius: 20,
      padding: 20,
      width: "90%",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    confirmationTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "#333",
      marginBottom: 15,
      textAlign: "center",
    },
    selectedBadgeContainer: {
      alignItems: "center",
      marginVertical: 20,
      padding: 15,
      backgroundColor: "#f9f9f9",
      borderRadius: 12,
      width: "100%",
    },
    selectedBadgeIcon: {
      fontSize: 48,
      marginBottom: 10,
    },
    selectedBadgeName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#ff5a87",
      marginBottom: 5,
    },
    confirmButtonsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginTop: 15,
    },
    confirmButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      width: "48%",
      alignItems: "center",
    },
    sendButton: {
      backgroundColor: "#b69eff",
    },
    cancelButton: {
      backgroundColor: "#f0f0f0",
    },
    confirmButtonText: {
      fontSize: 14,
      fontWeight: "500",
    },
    sendButtonText: {
      color: "#fff",
    },
    cancelButtonText: {
      color: "#666",
    },
    modalHeaderTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "#333",
      flex: 1,
      textAlign: "center",
    },
    recipientInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f5f5f5",
      padding: 12,
      borderRadius: 10,
      marginBottom: 15,
    },
    recipientName: {
      fontSize: 16,
      fontWeight: "500",
      color: "#333",
      marginLeft: 10,
    },
    closeIcon: {
      padding: 5,
    }
});
