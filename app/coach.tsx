import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Image,
  TextInput,
  Button,
  ScrollView,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-ignore
import { useRouter } from "expo-router";
import FooterC from "../components/FooterC"; // Vérifiez le chemin
import {
  logout,
  getCoachInvitations,
  acceptInvitation,
  getUserIdFromToken,
  getOrCreateConversation,
  getUserByIdForCoach,
  getUnreadNotificationsCount,
  createMeal,
  updateMeal,
  getToken,
  patchMealByPlan,
  getMealPlan,
  getMealPlanWithTicks,
  getAcceptedInvitationsForCoach,
  sendNotificationToUser,
} from "../utils/authService";
import { FontAwesome5, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import NavbarCoach from "@/components/NavbarCoach";
import * as Notifications from 'expo-notifications';
import Toast from "react-native-toast-message";
import { rejectInvitation } from "@/utils/invitationService";

interface Invitation {
  id: number;
  sender: {
    id: number;
    username: string;
    photoUrl?: string;
  };
  status: string;
  createdAt: string | number | Date;
}

interface User {
  id: number;
  username: string;
  photoUrl?: string;
}

// Fonction utilitaire pour obtenir la date locale au format "yyyy-MM-dd"
function getLocalDateString(): string {
  // Utiliser toLocaleDateString avec le paramètre "en-CA"
  return new Date().toLocaleDateString("en-CA");
}
/**
 * Essaie de convertir plusieurs formats de createdAt
 * - Date native
 * - number (timestamp ms)
 * - ISO-string (YYYY-MM-DDThh:mm:ss…)
 * - time-only "HH:mm:ss(.SSS…)"
 */
function parseInvitationDate(
  raw: string | number | Date | null | undefined
): Date | null {
  // Afficher la valeur brute pour le débogage
  console.log("parseInvitationDate input:", raw, "type:", typeof raw);
  
  if (!raw) return null;

  try {
    // 1) Si déjà Date
    if (raw instanceof Date) {
      return isNaN(raw.getTime()) ? null : raw;
    }

    // 2) Si timestamp
    if (typeof raw === "number") {
      const d = new Date(raw);
      console.log("Date from number:", d);
      return isNaN(d.getTime()) ? null : d;
    }

    // 3) Si string
    if (typeof raw === "string") {
      let s = raw.trim();
      
      // Si la chaîne est numérique, on la traite comme un timestamp
      if (/^\d+$/.test(s)) {
        const timestamp = parseInt(s, 10);
        const d = new Date(timestamp);
        console.log("Date from numeric string:", d);
        return isNaN(d.getTime()) ? null : d;
      }

      // time-only "HH:mm:ss(.SSS…)" → on préfixe par today
      if (/^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(s)) {
        const today = new Date().toISOString().split("T")[0];
        s = `${today}T${s}`;
      }

      // espace → T pour être ISO
      if (!s.includes("T") && /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
        s = s.replace(" ", "T");
      }

      const d = new Date(s);
      console.log("Date from string:", d);
      return isNaN(d.getTime()) ? null : d;
    }
  } catch (e) {
    console.error("Erreur dans parseInvitationDate:", e);
  }

  console.log("parseInvitationDate: Non parsable, retourne null");
  return null;
}

/**
 * Formate un Date (ou null) en “il y a X”
 */
function formatRelativeTime(date: Date | null): string {
  if (!date) return "il y a un instant";

  const now = Date.now();
  const then = date.getTime();
  const sec  = Math.floor((now - then) / 1000);

  if (sec < 60) return "il y a quelques secondes";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} minute${min>1?"s":""}`;
  const hr  = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} heure${hr>1?"s":""}`;
  const d   = Math.floor(hr / 24);
  if (d < 30) return `il y a ${d} jour${d>1?"s":""}`;
  const mo  = Math.floor(d / 30);
  if (mo < 12) return `il y a ${mo} mois`;
  const y   = Math.floor(mo / 12);
  return `il y a ${y} an${y>1?"s":""}`;
}
export default function CoachDashboard() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [subscribers, setSubscribers] = useState<User[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<number[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const router = useRouter();

  // États pour la modal Daily Report
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [selectedUserForReport, setSelectedUserForReport] = useState<User | null>(null);
  // reportDate est initialisé avec la date locale correcte
  const [reportDate, setReportDate] = useState<string>(getLocalDateString());

  // État pour stocker l'enregistrement Meal pour la date, userId et coachId
  const [currentMealRecord, setCurrentMealRecord] = useState<any>(null);

  // États pour la modal de formulaire complet
  const [showFullMealFormModal, setShowFullMealFormModal] = useState(false);
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [snacks, setSnacks] = useState("");
  const [sport, setSport] = useState("");
  const [water, setWater] = useState("");

  // États pour l'édition d'une colonne
  const [editMealType, setEditMealType] = useState<keyof typeof mealIcons | null>(null);
  const [editMealValue, setEditMealValue] = useState<string>("");
  const [showEditMealModal, setShowEditMealModal] = useState(false);

  const openEditMealModal = (mealType: string) => {
    setEditMealType(mealType);
    if (currentMealRecord && currentMealRecord[mealType.toLowerCase()] !== undefined) {
      setEditMealValue(currentMealRecord[mealType.toLowerCase()]);
    } else {
      setEditMealValue("");
    }
    setShowEditMealModal(true);
  };

  // Charge le plan (Meal) correspondant à reportDate, userId et coachId
  const loadMealRecord = async (user: User) => {
    try {
      const coachId = await getUserIdFromToken();
      // Utilise reportDate (déjà initialisé correctement avec getLocalDateString())
      const dateToUse = reportDate.trim() ? reportDate.trim() : getLocalDateString();
      console.log("Chargement du plan pour date =", dateToUse);
      //const mealRecord = await getMealPlan(dateToUse, user.id, coachId);
      //setCurrentMealRecord(mealRecord);
      //console.log("Meal record chargé :", mealRecord);
      const mealRecord = await getMealPlan(dateToUse, user.id, coachId);
           const mealsWithTicks = await getMealPlanWithTicks(user.id, coachId, dateToUse);
            if (mealsWithTicks.length > 0) {
              const ticks = mealsWithTicks[0]; 
              // on copie tous les champs « XXXTick » dans mealRecord
              Object
             .keys(ticks)
                .filter(k => k.endsWith("Tick"))
                .forEach(k => {
                  // @ts-ignore
                  mealRecord[k] = ticks[k];
                });
            }
      
           // 3) on met à jour le state avec le plan + ticks
            setCurrentMealRecord(mealRecord);
            console.log("Meal record chargé (avec ticks) :", mealRecord);
    } catch (error) {
      console.error("Erreur lors du chargement du meal record :", error);
      setCurrentMealRecord(null);
    }
  };
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Permission de notifications refusée');
      }
    })();
  }, []);
  
  
  // Lors de l'ouverture du Daily Report, initialiser reportDate avec la date locale
  const handleOpenDailyReport = (user: User) => {
    setSelectedUserForReport(user);
    setShowDailyReportModal(true);
    setBreakfast("");
    setLunch("");
    setDinner("");
    setSnacks("");
    setSport("");
    setWater("");
    const today = getLocalDateString();
    setReportDate(today);
    loadMealRecord(user);
  };

  // Lors de l'update, utiliser reportDate pour identifier le plan
  const handleUpdateMealColumn = async () => {
    if (!selectedUserForReport || !editMealType) return;
    try {
      const payload = {
        [editMealType.toLowerCase()]: editMealValue,
      };
      console.log("Payload envoyé :", payload);

      const coachId = await getUserIdFromToken();
      const userId = selectedUserForReport.id;
      const dateToUse = reportDate.trim() ? reportDate.trim() : getLocalDateString();

      const updatedMeal = await patchMealByPlan(dateToUse, userId, coachId, payload);
      console.log("Réponse du serveur :", updatedMeal);
      Toast.show({
        type: "success",
        text1: "Succès",
        text2: `Le champ ${editMealType} a été mis à jour.`,
        position: "top",
      });
      setShowEditMealModal(false);
      setCurrentMealRecord(updatedMeal);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du repas:", error);
        Toast.show({
    type: "error",
    text1: "Erreur",
    text2: "Impossible de modifier le repas.",
    position: "top",
  });
    }
  };

  // Mapping des images pour chaque catégorie
  const mealIcons = {
    "Breakfast": require("../assets/images/breakfast.png"),
    "Lunch": require("../assets/images/lunch.png"),
    "Dinner": require("../assets/images/dinner.png"),
    "Snacks": require("../assets/images/snacks.png"),
    "Sport": require("../assets/images/exercice.png"),
    "Water": require("../assets/images/water.png"),
  };

  const loadAcceptedIds = async () => {
    try {
      const idsString = await AsyncStorage.getItem("acceptedInvitationIds");
      if (idsString) {
        const parsed = JSON.parse(idsString) as number[];
        setAcceptedIds(parsed);
        console.log(">>> [loadAcceptedIds] IDs acceptés chargés:", parsed);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des IDs acceptés:", error);
    }
  };

  const saveAcceptedIds = async (newAcceptedIds: number[]) => {
    try {
      await AsyncStorage.setItem("acceptedInvitationIds", JSON.stringify(newAcceptedIds));
      console.log(">>> [saveAcceptedIds] IDs acceptés sauvegardés:", newAcceptedIds);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des IDs acceptés:", error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const coachId = await getUserIdFromToken();
      if (!coachId) return;
  
      const data = await getCoachInvitations(coachId);
  
      // 1) invitations PENDING pour l’affichage du haut
      const pendingInvitations = data.filter(
        (inv: Invitation) => inv.status === "PENDING"
      );
      setInvitations(pendingInvitations);
  
      /* 2) ⛔️ ON NE MET PLUS À JOUR subscribers ICI
            c’est fetchSubscribers qui possède la source de vérité */
    } catch (error) {
      console.error("Erreur lors de la récupération des invitations:", error);
    }
  };
  
// ------------------------------------------------------------------
// Accepte l’invitation puis recharge la liste complète des abonnés
// ------------------------------------------------------------------
const handleAccept = async (invitationId: number) => {
  console.log(">>> [handleAccept] Reçu invitationId:", invitationId);
  try {
    /* 1.  accepter l’invitation côté backend */
    await acceptInvitation(invitationId);
    Toast.show({
      type: "success",
      text1: "Invitation acceptée",
      position: "top",
    });

    /* 2.  retirer l’invitation PENDING de la liste locale */
    setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));

    /* 3.  recharger les abonnés directement depuis l’API backend */
    const coachId = await getUserIdFromToken();
    if (coachId) {
      const accepted = await getAcceptedInvitationsForCoach(coachId);

      // transforme le tableau d’invitations acceptées en tableau d’abonnés uniques
      const freshSubscribers: User[] = Array.from(
        new Map(
          accepted.map((inv: any) => [
            inv.sender?.id ?? inv.userId,
            {
              id: inv.sender?.id ?? inv.userId,
              username: inv.sender?.username ?? inv.username,
              photoUrl: inv.sender?.photoUrl,
            },
          ])
        ).values()
      );
      setSubscribers(freshSubscribers);
      
      // Vérifier si le coach a atteint 5 abonnés et lui décerner un badge si c'est le cas
      const badgeAwarded = await import("../utils/authService").then(module => 
        module.checkAndAwardSubscriberBadge(coachId)
      );
      
      if (badgeAwarded) {
        // Afficher une notification à l'utilisateur
        Toast.show({
          type: "success",
          text1: "🏆 Félicitations !",
          text2: "Vous avez atteint 5 abonnés et reçu le badge 'Club des 5' !",
          position: "top",
          visibilityTime: 4000,
        });
        
        // Afficher une alerte plus visible
        setTimeout(() => {
          Alert.alert(
            "🏆 Badge débloqué !",
            "Félicitations ! Vous avez atteint 5 abonnés et reçu le badge 'Club des 5'. Consultez vos badges dans la section notifications.",
            [{ text: "Super !", style: "default" }]
          );
        }, 500);
      }
    }

    /* 4.  mémoriser l’ID accepté (si tu tiens à le garder) */
    const newAcceptedIds = [...acceptedIds, invitationId];
    setAcceptedIds(newAcceptedIds);
    await saveAcceptedIds(newAcceptedIds);

  } catch (err) {
    console.error("Erreur lors de l'acceptation:", err);
    Toast.show({
      type: "error",
      text1: "Erreur",
      text2: "Impossible d'accepter l'invitation",
      position: "top",
    });
  }
};
const handleRefuse = useCallback(async (invId: number) => {
  try {
    // 1. Appel API
    await rejectInvitation(invId);

    // 2. Mise à jour locale : on enlève l’invitation refusée
    setInvitations((prev) =>
      prev.filter((inv) => inv.id !== invId)
    );

    // 3. Feedback utilisateur
    Toast.show({
      type: 'success',
      text1: 'Invitation refusée',
    });
  } catch (err: any) {
    console.error(err);
    Alert.alert(
      'Erreur',
      err.message || 'Impossible de refuser l’invitation.'
    );
  }
}, [setInvitations]);

  const openChatWithUser = async (targetUserId: number) => {
    try {
      router.push(`/chatCoach/${targetUserId}`);
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la conversation :", error);
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: "Impossible d'ouvrir la conversation",
        position: "top",
      });
    }
  };

 const handleSubmitFullMealForm = async () => {
  if (!selectedUserForReport) return;
  try {
    const coachId = await getUserIdFromToken();
    const dateToUse = reportDate.trim() ? reportDate.trim() : getLocalDateString();

    const payload = {
      coachId: coachId,
      userId: selectedUserForReport.id,
      breakfast,
      lunch,
      dinner,
      snacks,
      sport,
      water,
      date: dateToUse,
    };

    await createMeal(payload);
    Toast.show({
      type: "success",
      text1: "Succès",
      text2: `Les repas ont été ajoutés.`,
      position: "top",
    });
    setShowFullMealFormModal(false);
    // 🚨 Notification locale
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📋 Nouveau plan ajouté",
        body: `Le plan du jour pour ${selectedUserForReport.username} a été créé avec succès.`,
        sound: 'default',          // ✅ Correct pour iOS et Android
        channelId: 'default',      // ✅ Android : à placer ici
      },
      trigger: null,   
    });

    // 🚨 Notification enregistrée en base pour l'utilisateur
    await sendNotificationToUser(
      selectedUserForReport.id,
      "🎯 Nouveau plan disponible",
      `Coach a ajouté votre programme du ${dateToUse}. Consultez-le dans l'application !`
    );

    console.log("✅ Notification enregistrée côté backend");

    setShowFullMealFormModal(false);
  } catch (error) {
    console.error("Erreur lors de l'envoi du formulaire complet:", error);
    Toast.show({
      type: "error",
      text1: "Erreur",
      text2: "Impossible d'enregistrer les repas.",
      position: "top",
    });
  }
};

// ─── récupère TOUS les abonnés “acceptés” depuis l’API backend ───
const fetchSubscribers = async () => {
  try {
    const coachId = await getUserIdFromToken();
    if (!coachId) return;

    const accepted = await getAcceptedInvitationsForCoach(coachId);

    const backSubscribers: User[] = Array.from(
      new Map(
        accepted.map((inv: any) => {
          const u = inv.sender ?? inv.user ?? {};
          return [
            u.id ?? inv.userId,
            {
              id: u.id ?? inv.userId,
              username: u.username ?? inv.username,
              photoUrl: u.photoUrl,
            },
          ];
        })
      ).values()
    );

    setSubscribers(backSubscribers);
    console.log(">>> Subscribers depuis backend :", backSubscribers);
  } catch (e) {
    console.error("Erreur fetchSubscribers :", e);
  }
};




  // Nouvel état pour la recherche parmi les abonnés
  const [subscriberSearch, setSubscriberSearch] = useState("");

  // Filtrer les abonnés en fonction du texte saisi (filtrage sur username)
  const filteredSubscribers = subscribers.filter((subscriber) =>
    subscriber.username.toLowerCase().includes(subscriberSearch.toLowerCase())
  );
  console.log(">>> filteredSubscribers :", filteredSubscribers);
useEffect(() => {
  const init = async () => {
    await loadAcceptedIds();
    await fetchInvitations();   // ← on ATTEND vraiment la fin
    await fetchSubscribers();   // puis on écrase avec la version backend
  };
  init();
}, []);
  return (
    <View style={styles.container}>
      <View style={styles.content}>
      <NavbarCoach />
 {/* Section Invitations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail" size={20} color="rgba(195, 0, 0, 0.7)" />
            <Text style={styles.sectionTitle}>Invitations en attente</Text>
          </View>
          
          {invitations.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="mail-open-outline" size={40} color="#B3B3B3" />
              <Text style={styles.emptyStateText}>Aucune invitation pour le moment</Text>
            </View>
          ) : (
            <FlatList
              data={invitations}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                // Composant carte d'invitation premium
<View style={styles.invitationCard}>
  {/* Section Info Utilisateur avec animation */}
  <View style={styles.invitationInfo}>
    <View style={styles.avatarContainer}>
      <Image
        source={{ uri: buildAvatarUrl(item.sender.photoUrl) }}
        style={styles.invitationAvatar}
      />
      <View style={styles.statusIndicator} />
    </View>
    
    <View style={styles.userInfoContainer}>
      <Text style={styles.invitationUserName}>{item.sender.username}</Text>
      <Text style={styles.invitationTimeStamp}>
        Vous a invité • {
          // Utilisation d'une variable intermédiaire pour éviter l'accès direct à createdAt
          (() => {
            const rawDate = item && item.createdAt ? item.createdAt : null;
            console.log(">>> rawDate:", rawDate);
            const parsedDate = parseInvitationDate(rawDate);
            return formatRelativeTime(parsedDate);
          })()
        }
      </Text>
    </View>
  </View>
  
  {/* Animation pour séparateur */}
  <View style={styles.separator} />
  
  {/* Section des boutons améliorés */}
  <View style={styles.buttonContainer}>
    <TouchableOpacity
      style={styles.acceptButton}
      onPress={() => handleAccept(item.id)}
      activeOpacity={0.75}
    >
      <View style={styles.iconTextContainer}>
        <Feather name="user-plus" size={16} color="#FFF" style={styles.buttonIcon} />
        <Text style={styles.acceptButtonText}>Accepter</Text>
      </View>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={styles.refuseButton}
      onPress={() => handleRefuse(item.id)}
      activeOpacity={0.75}
    >
      <View style={styles.iconTextContainer}>
        <Feather name="x" size={16} color="#667085" style={styles.buttonIcon} />
        <Text style={styles.refuseButtonText}>Refuser</Text>
      </View>
    </TouchableOpacity>
  </View>
</View>
              )}
              contentContainerStyle={styles.invitationsList}
            />
          )}
        </View>

        {/* Section Abonnés */}
        <View style={[styles.section, {flex: 1}]}>
  <View style={styles.sectionHeader}>
    <Ionicons name="people" size={20} color="rgba(195, 0, 0, 0.7)" />
    <Text style={styles.sectionTitle}>Mes abonnés</Text>
  </View>
  
  {/* Barre de recherche - reste fixe */}
  <View style={styles.searchContainer}>
    <Feather name="search" size={20} color="rgba(195, 0, 0, 0.7)" style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Rechercher un abonné..."
      placeholderTextColor="#8A9AAF"
      value={subscriberSearch}
      onChangeText={setSubscriberSearch}
    />
  </View>
  
  {/* Contenu défilant */}
 {/* ───── Liste des abonnés ───── */}
<View style={styles.scrollableContainer}>
  {filteredSubscribers.length === 0 ? (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="people-outline" size={40} color="#B3B3B3" />
      <Text style={styles.emptyStateText}>
        {subscribers.length === 0
          ? "Aucun abonné pour le moment"
          : "Aucun résultat pour cette recherche"}
      </Text>
    </View>
  ) : (
    <FlatList
    style={{flex: 1, height: '100%'}}
      data={filteredSubscribers}                     // ← déjà filtré
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.subscribersList}
      renderItem={({ item }) => (
        <View style={styles.subscriberCard}>
          {/* zone « profil » – ouvre le report */}
          <TouchableOpacity
            style={styles.subscriberInfo}
            onPress={() => handleOpenDailyReport(item)}
          >
            <Image
              source={{ uri: buildAvatarUrl(item.photoUrl) }}
              style={styles.subscriberAvatar}
            />
            <Text style={styles.subscriberName}>{item.username}</Text>
          </TouchableOpacity>

          {/* actions : repas • chat */}
          <View style={styles.subscriberActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleOpenDailyReport(item)}
            >
              <Ionicons
                name="restaurant-outline"
                size={20}
                color="rgba(195, 0, 0, 0.7)"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openChatWithUser(item.id)}
            >
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color="rgba(195, 0, 0, 0.7)"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  )}
</View>
</View>
        {/* Modal Daily Report */}
        <Modal
          visible={showDailyReportModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDailyReportModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dailyReportModal}>
              {selectedUserForReport && (
                <>
                  <View style={styles.modalHeader}>
                    <Image
                      source={{ uri: buildAvatarUrl(selectedUserForReport.photoUrl) }}
                      style={styles.modalAvatar}
                    />
                    <View style={styles.modalTitleContainer}>
                      <Text style={styles.modalUsername}>{selectedUserForReport.username}</Text>
                      <Text style={styles.modalSubtitle}>Rapport quotidien</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.modalAddButton}
                      onPress={() => setShowFullMealFormModal(true)}
                    >
                      <Ionicons name="add-circle" size={26} color="rgba(195, 0, 0, 0.5)" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>Plan du jour : </Text>
                    <Text style={styles.dateValue}>{reportDate}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.loadPlanButton}
                    onPress={() => loadMealRecord(selectedUserForReport)}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.loadPlanButtonText}>Charger plan</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.reportList}>
  {(
    ["Breakfast","Lunch","Dinner","Snacks","Sport","Water"] as Array<keyof typeof mealIcons>
  ).map((item, index) => {
    // clé du tick, ex. "breakfastTick"
    const tickKey = `${item.toLowerCase()}Tick`;
    const hasTick = currentMealRecord?.[tickKey];

    return (
      <View style={styles.mealItem} key={index}>
        <View style={styles.mealInfo}>
          <Image source={mealIcons[item]} style={styles.mealIcon} />
          <View style={styles.mealTextContainer}>
            <Text style={styles.mealName}>{item}</Text>
            <View style={styles.mealValueWithTick}>
              <Text style={styles.mealValue}>
                {currentMealRecord?.[item.toLowerCase()] ?? "Non défini"}
              </Text>
              {hasTick && (
                <Feather
                  name="check-circle"
                  size={18}
                  color="rgba(0,200,0,0.8)"
                  style={styles.tickIcon}
                />
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditMealModal(item)}
        >
          <Feather name="edit-2" size={18} color="rgba(195, 0, 0, 0.5)" />
        </TouchableOpacity>
      </View>
    );
  })}
</View>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setShowDailyReportModal(false)}
                  >
                    <Text style={styles.closeModalButtonText}>Fermer</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
        
        {/* Modal Formulaire Complet */}
        {showFullMealFormModal && (
         <Modal
         transparent
         visible={showFullMealFormModal}
         animationType="slide"
         onRequestClose={() => setShowFullMealFormModal(false)}
       >
         <SafeAreaView style={styles.modalOverlay}>
           <KeyboardAvoidingView
             behavior={Platform.OS === "ios" ? "padding" : "height"}
             style={{ flex: 1 }}
           >
             <View style={styles.formModal}>
               <View style={styles.formHeader}>
                 <Text style={styles.formTitle}>Ajouter programme du jour</Text>
                 <TouchableOpacity
                   style={styles.closeFormModalIcon}
                   onPress={() => setShowFullMealFormModal(false)}
                 >
                   <Ionicons name="close" size={24} color="rgba(195, 0, 0, 0.7)" />
                 </TouchableOpacity>
               </View>
               
               <Text style={styles.formDate}>Date : {reportDate}</Text>
               
               <ScrollView 
                 style={styles.formScrollContainer}
                 showsVerticalScrollIndicator={false}
                 keyboardShouldPersistTaps="handled"
               >
                 {(["Breakfast", "Lunch", "Dinner", "Snacks", "Sport", "Water"]).map((category, index) => (
                   <View style={styles.formInputGroup} key={index}>
                     <View style={styles.formInputLabel}>
                       <Image source={mealIcons[category]} style={styles.formInputIcon} />
                       <Text style={styles.formInputTitle}>{category}</Text>
                     </View>
                     <TextInput
                       style={styles.formInput}
                       placeholder={`Ajouter ${category.toLowerCase()}...`}
                       placeholderTextColor="#8A9AAF"
                       value={
                         category === "Breakfast" ? breakfast :
                         category === "Lunch" ? lunch :
                         category === "Dinner" ? dinner :
                         category === "Snacks" ? snacks :
                         category === "Sport" ? sport :
                         water
                       }
                       onChangeText={
                         category === "Breakfast" ? setBreakfast :
                         category === "Lunch" ? setLunch :
                         category === "Dinner" ? setDinner :
                         category === "Snacks" ? setSnacks :
                         category === "Sport" ? setSport :
                         setWater
                       }
                       multiline={true}
                     />
                   </View>
                 ))}
                 
                 <TouchableOpacity
                   style={styles.submitFormButton}
                   onPress={handleSubmitFullMealForm}
                 >
                   <Text style={styles.submitFormButtonText}>Enregistrer</Text>
                 </TouchableOpacity>
                 
                 {/* Add padding at the bottom to ensure content isn't hidden behind keyboard */}
                 <View style={{ height: 20 }} />
               </ScrollView>
             </View>
           </KeyboardAvoidingView>
         </SafeAreaView>
       </Modal>
        )}
        
        {/* Modal Edition Repas */}
        {showEditMealModal && (
          <Modal
            transparent
            visible={showEditMealModal}
            animationType="slide"
            onRequestClose={() => setShowEditMealModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.editMealModal}>
                <View style={styles.editMealHeader}>
                    {editMealType && (
                    <Image source={mealIcons[editMealType]} style={styles.editMealIcon} />
                    )}
                  <Text style={styles.editMealTitle}>
                    Modifier {editMealType}
                  </Text>
                </View>
                
                <TextInput
                  style={styles.editMealInput}
                  placeholder={`Contenu pour ${editMealType}...`}
                  placeholderTextColor="#8A9AAF"
                  value={editMealValue}
                  onChangeText={setEditMealValue}
                  multiline={true}
                  numberOfLines={4}
                />
                
                <View style={styles.editMealButtons}>
                  <TouchableOpacity 
                    style={styles.cancelEditButton} 
                    onPress={() => setShowEditMealModal(false)}
                  >
                    <Text style={styles.cancelEditButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmEditButton} 
                    onPress={handleUpdateMealColumn}
                  >
                    <Text style={styles.confirmEditButtonText}>Mettre à jour</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
      <FooterC />
      <Toast />
    </View>
  );
}

const buildAvatarUrl = (rawUrl?: string) => {
  console.log(rawUrl);
  const baseUrl = "http://192.168.1.139:8080/";
  if (rawUrl && rawUrl.trim().length > 0) {
    return rawUrl.startsWith("http")
      ? rawUrl.replace("localhost:8081", "192.168.1.139:8080")
      : baseUrl + rawUrl;
  }
  console.log(rawUrl);
  return "https://dummyimage.com/40x40/cccccc/ffffff&text=User";
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FBFC",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  formScrollContainer: {
    flexGrow: 1,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344955",
    top:7,
  },
  headerTitlee :{
flexDirection: "row",
gap: 2,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 5,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 5,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#F05454",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { 
    color: "#FFFFFF", 
    fontSize: 10, 
    fontWeight: "bold" 
  },
  
  // Sections
 /*  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    flex: 0.7,
  }, */

    // Section conteneur pour les invitations
    section: {
      backgroundColor: "#FFFFFF",
      borderRadius: 15,
      padding: 15,
      marginBottom: 25,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 3,
      //flex: 1, // Prend tout l'espace disponible
      //maxHeight: 400, // Hauteur maximale pour permettre le défilement
    },
    
    // En-tête de la section
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: 'rgba(195, 0, 0, 0.5)',
      marginLeft: 8,
    },
    
    // Container d'état vide
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    
    emptyStateText: {
      color: '#B3B3B3',
      marginTop: 8,
      textAlign: 'center',
    },
    
    // Liste des invitations - container de la FlatList
    invitationsList: {
      paddingBottom: 10,
    },
    
    // Carte d'invitation
    invitationCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginVertical: 8,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: '#F1F5F9',
    },
    
    invitationInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    
    avatarContainer: {
      position: 'relative',
    },
    
    invitationAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: '#F0F9FF',
    },
    
    statusIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#10B981',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    
    userInfoContainer: {
      marginLeft: 12,
      flex: 1,
    },
    
    invitationUserName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1E293B',
      marginBottom: 2,
    },
    
    invitationTimeStamp: {
      fontSize: 13,
      color: '#64748B',
      fontWeight: '400',
    },
    
    separator: {
      height: 1,
      backgroundColor: '#F1F5F9',
      marginBottom: 14,
    },
    
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    
    iconTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    buttonIcon: {
      marginRight: 8,
    },
    
    acceptButton: {
      flex: 1,
      backgroundColor: '#0EA5E9',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    
    acceptButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
      letterSpacing: 0.2,
    },
    
    refuseButton: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    
    refuseButtonText: {
      color: '#667085',
      fontWeight: '600',
      fontSize: 14,
      letterSpacing: 0.2,
    },
  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    height: 44,
  },
  scrollableContainer: {
    flex: 1, // Prendra tout l'espace disponible
    minHeight: 200,
    marginTop: 10,
    paddingBottom: 20, // Petit espace avant la fin de la section
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#344955",
  },
  
  // Subscribers
  subscribersList: {
    paddingVertical: 5,
    gap: 8, // Ajoute un espacement entre les éléments de la liste
  },

  subscriberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    //marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
   // flex: 1,
    //paddingBottom : 10,
  },
  subscriberInfo: {
    flexDirection: "row",
    alignItems: "center",
    
  },
  subscriberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#E0E5EC",
  },
  subscriberName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#344955",
  },
  subscriberActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F0F2F5",
    marginLeft: 8,
  },
  
  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Daily Report Modal
  dailyReportModal: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E5EC",
    paddingBottom: 15,
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(195, 0, 0, 0.5)",
  },
  modalTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  modalUsername: {
    fontSize: 22,
    fontWeight: "700",
    color: "#344955",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#8A9AAF",
    marginTop: 2,
  },
  modalAddButton: {
    padding: 5,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  dateLabel: {
    fontSize: 16, 
    color: "rgba(195, 0, 0, 0.5)",
    fontWeight: "500",
  },
  dateValue: {
    fontSize: 16,
    color: "#344955",
    fontWeight: "600",
  },
  loadPlanButton: {
    backgroundColor: "rgba(195, 0, 0, 0.5)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  loadPlanButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  reportList: {
    marginBottom: 20,
  },
  mealItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E5EC",
  },
  mealInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mealIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginRight: 15,
  },
  mealTextContainer: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344955",
    marginBottom: 3,
  },
  mealValue: {
    fontSize: 14,
    color: "#8A9AAF",
  },
  editButton: {
    padding: 8,
    backgroundColor: "#F0F2F5",
    borderRadius: 8,
  },
  closeModalButton: {
    backgroundColor: "rgba(195, 0, 0, 0.5)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeModalButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  
  // Form Modal
  formModal: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    maxHeight: "90%",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E5EC",
    paddingBottom: 15,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344955",
  },
  closeFormModalIcon: {
    padding: 5,
  },
  formDate: {
    fontSize: 16,
    color: "rgba(195, 0, 0, 0.5)",
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "500",
  },
  formInputGroup: {
    marginBottom: 15,
  },
  formInputLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  formInputIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
    marginRight: 8,
  },
  formInputTitle: {
    fontSize: 16,
    color: "#344955",
    fontWeight: "500",
  },
  formInput: {
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#344955",
    borderWidth: 1,
    borderColor: "#E0E5EC",
  },
  submitFormButton: {
    backgroundColor: "rgba(195, 0, 0, 0.5)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    paddingBottom:10,
  },
  submitFormButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  
  // Edit Meal Modal
  editMealModal: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  editMealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E5EC",
    paddingBottom: 15,
  },
  editMealIcon: {
    width: 30,
    height: 30,
    resizeMode: "contain",
    marginRight: 10,
  },
  editMealTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344955",
  },
  editMealInput: {
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E5EC",
    padding: 15,
    fontSize: 16,
    color: "#344955",
    height: 120,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  editMealButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelEditButton: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E0E5EC",
  },
  cancelEditButtonText: {
    color: "rgba(195, 0, 0, 0.5)",
    fontWeight: "600",
    fontSize: 16,
  },
  confirmEditButton: {
    flex: 1,
    backgroundColor: "rgba(195, 0, 0, 0.5)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmEditButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  mealValueWithTick: {
    flexDirection: "row",
    alignItems: "center",
  },
  tickIcon: {
    marginLeft: 6,
  },
  
});