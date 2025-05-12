import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  StyleSheet,
  BackHandler,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ImageBackground,
  Platform,
  Dimensions,
} from "react-native";

const { width, height } = Dimensions.get("window");
// @ts-ignore
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Check, AlertCircle, X, Star, ArrowRight, Bell , Award, Coffee} from "react-native-feather";
import Toast from 'react-native-toast-message'; // Importation du composant Toast
import {
  getNotificationsByUserId,
  getToken,
  getUnreadNotificationsCount,
  getUserIdFromToken,
  getUsersById,
  logout,
  updateUserCoach,
} from "../utils/authService";
import ProtectedRoute from "../utils/ProtectedRoute";
import Footer from "../components/Footer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NavbarIA from "@/components/NavbarIA";
import { Icon } from "react-native-paper";
import { API_URL } from "@/utils/config";

interface Notification {
  isRead: any;
  id: string;
  message: string;
}

export default function UserPage() {
  const router = useRouter();

  // États existants
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>("");
  const [selectedMealDetail, setSelectedMealDetail] = useState<string>("");
  const [steps, setSteps] = useState(0);
  const [weight, setWeight] = useState(60.0);
  const [waterIntake, setWaterIntake] = useState(0);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);
  const [loggedCalories, setLoggedCalories] = useState<number>(0);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [mealCompletion, setMealCompletion] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    snacks: false,
  });
  const [activityCompletion, setActivityCompletion] = useState(false);
  const [stepsCompletion, setStepsCompletion] = useState(false);
  const [distanceCompletion, setDistanceCompletion] = useState(false);
  const [caloriesCompletion, setCaloriesCompletion] = useState(false);
  const [waterCompletion, setWaterCompletion] = useState(false);
  const [remainingPlanCalories, setRemainingPlanCalories] = useState<number>(0);
  const [showData, setShowData] = useState(true); // Ajout de l'état pour contrôler l'affichage des plats scannés

  // <-- Les plats scannés récupérés depuis l'API
  const [scannedDishes, setScannedDishes] = useState<{ productName: string; calories: number }[]>([]);

  const [currentDayPlan, setCurrentDayPlan] = useState<any>(null);

  // État pour la modale d'introduction
  const [showIntroModal, setShowIntroModal] = useState(false);

  // -------------------- Gestion persistante des ticks --------------------
  // Charger les ticks spécifiques à l'utilisateur (sans condition sur le jour)
  const loadDiaryTicks = async () => {
    if (!userId) return;
    try {
      // Récupérer la date actuelle au format YYYY-MM-DD pour la persistance
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Clé pour la date du dernier plan consulté
      const lastPlanDateKey = `lastPlanDate_${userId}`;
      const lastPlanDate = await AsyncStorage.getItem(lastPlanDateKey);
      
      // Si la date a changé, on va réinitialiser les ticks
      const dateChanged = lastPlanDate !== currentDate;
      if (dateChanged) {
        // Enregistrer la nouvelle date comme dernière date consultée
        await AsyncStorage.setItem(lastPlanDateKey, currentDate);
      }
      
      // On utilise toujours une clé spécifique au jour du plan actuel
      const day = currentDayPlan?.day || 1;
      const diaryKey = `diaryTicks_${userId}_day${day}`;

      // Récupérer les ticks stockés
      const storedTicks = await AsyncStorage.getItem(diaryKey);
      
      if (storedTicks && !dateChanged) {
        // Si on a des données stockées et que la date n'a pas changé, on les utilise
        const parsed = JSON.parse(storedTicks);
        
        setMealCompletion(parsed.mealCompletion || {
          breakfast: false,
          lunch:     false,
          dinner:    false,
          snacks:    false,
        });
        setActivityCompletion(parsed.activityCompletion || false);
        setStepsCompletion(parsed.stepsCompletion       || false);
        setDistanceCompletion(parsed.distanceCompletion || false);
        setCaloriesCompletion(parsed.caloriesCompletion || false);
        setWaterCompletion(parsed.waterCompletion       || false);
      } else {
        // Date a changé OU pas de données stockées:
        // On initialise avec valeurs par défaut
        const defaultTicks = {
          mealCompletion: {
            breakfast: false,
            lunch:     false,
            dinner:    false,
            snacks:    false,
          },
          activityCompletion: false,
          stepsCompletion:    false,
          distanceCompletion: false,
          caloriesCompletion: false,
          waterCompletion:    false,
        };
        
        // Enregistrer ces valeurs par défaut
        await AsyncStorage.setItem(diaryKey, JSON.stringify(defaultTicks));
        
        // Et mettre à jour l'état
        setMealCompletion(defaultTicks.mealCompletion);
        setActivityCompletion(defaultTicks.activityCompletion);
        setStepsCompletion(defaultTicks.stepsCompletion);
        setDistanceCompletion(defaultTicks.distanceCompletion);
        setCaloriesCompletion(defaultTicks.caloriesCompletion);
        setWaterCompletion(defaultTicks.waterCompletion);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des diary ticks :", error);
    }
  };
  
  // Mettre à jour les ticks pour l'utilisateur courant
  const updateDiaryTicks = async (updatedValues: Partial<any>) => {
    if (!userId || !currentDayPlan) return;
  
    // On utilise le jour du plan actuel pour la clé
    const day = currentDayPlan.day;
    const diaryKey = `diaryTicks_${userId}_day${day}`;
    
    // Enregistrer aussi la date actuelle comme dernière date de consultation
    const currentDate = new Date().toISOString().split('T')[0];
    const lastPlanDateKey = `lastPlanDate_${userId}`;
    await AsyncStorage.setItem(lastPlanDateKey, currentDate);
  
    try {
      // Lire l'état actuel des ticks
      const stored = await AsyncStorage.getItem(diaryKey);
      const current = stored ? JSON.parse(stored) : {};
  
      // Fusionner avec les nouvelles valeurs
      const merged = { ...current, ...updatedValues };
  
      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem(diaryKey, JSON.stringify(merged));
      console.log(`✓ Ticks mis à jour pour le jour ${day}`, merged);
    } catch (error) {
      console.error("Erreur lors de la mise à jour des diaryTicks :", error);
    }
  };
  

  // Stocker la progression journalière pour l'utilisateur courant
  const storeDiaryProgress = async () => {
    if (!userId || !currentDayPlan) return;
    try {
      const stepsVal = stepsCompletion ? currentDayPlan.recommended_steps || 0 : 0;
      const distanceVal = distanceCompletion ? currentDayPlan.recommended_distance_km || 0 : 0;
      const waterVal = waterCompletion ? currentDayPlan.recommended_water_l || 0 : 0;
      const totalDayCal = currentDayPlan.recommended_calories || 0;
      const calPerMeal = totalDayCal / 4;
      let mealCal = 0;
      if (mealCompletion.breakfast) mealCal += calPerMeal;
      if (mealCompletion.lunch) mealCal += calPerMeal;
      if (mealCompletion.dinner) mealCal += calPerMeal;
      if (mealCompletion.snacks) mealCal += calPerMeal;
      const dailyData = {
        day: currentDayPlan.day,
        stepsVal,
        distanceVal,
        waterVal,
        mealCal,
      };
      await AsyncStorage.setItem(`dailyData_${userId}_day${currentDayPlan.day}`, JSON.stringify(dailyData));
      console.log("Daily progress stored:", dailyData);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du dailyData :", err);
    }
  };
  // ----------------------------------------------------------------------------

  // Charger les ticks dès que l'ID utilisateur est disponible

  const assignCoach = async () => {

    const selectedCoach = await AsyncStorage.getItem(`selectedCoach_${userId}`);
        if (selectedCoach) {
          try {
            // 3) Met à jour en base
            await updateUserCoach(selectedCoach as 'reel' | 'ia');
            setShowIntroModal(false);

            // 4) Si reel, redirige
            if (selectedCoach === 'reel') {
              router.replace('/reel');
              return;
            }else {
              setShowIntroModal(false);
              return;
            }
          } catch (err) {
            console.error("❌ Erreur mise à jour coach en base :", err);
          }
        }
      }
  useEffect(() => {
    const init = async () => {
      console.log("Initialisation de UserPage...");
      console.log(showIntroModal);
      try {
        // 1) Récupère l'ID depuis le token
        const id = await getUserIdFromToken();
        const user = await getUsersById(id);
        if (!id) {
          console.error("❌ Impossible de récupérer l'ID utilisateur.");
          return;
        }
        setUserId(id);
        if (user?.coachType==='reel'){
          router.replace('/reel');
          return;
        }
      



        // 2) Check AsyncStorage
        if (user.coachType !== 'reel' && user.coachType !== 'ia') {
          
          setShowIntroModal(true);
          assignCoach();
        }

        fetchNotifications(id);
        fetchUnreadCount(id);
        fetchPlanForToday(id);

      } catch (err) {
        console.error("❌ Erreur init UserPage :", err);
      }
    };

    init();
  }, []);

  // const handleSelectCoach = async (choice: 'reel' | 'ia') => {
  //   if (!userId) return;
  //   try {
  //     // 1) Met à jour en base
  //     await updateUserCoach(choice);

  //     // 2) Sauvegarde localement
  //     await AsyncStorage.setItem(`selectedCoach_${userId}`, choice);

  //     // 3) Ferme la modal
  //     setShowIntroModal(false);

  //     // 4) Si reel, redirige
  //     if (choice === 'reel') {
  //       router.replace('/reel');
  //     }
  //     // sinon l'utilisateur reste sur la page courante

  //   } catch (err) {
  //     console.error("❌ Erreur lors de la mise à jour du coach :", err);
    
  // }};
  

  const handleIntroClose = async (action: "coachRell" | "coachIA") => {
    if (userId) {
      const coachType = action === "coachRell" ? "reel" : "ia";
      // Sauvegarder le choix dans AsyncStorage
      await AsyncStorage.setItem(`selectedCoach_${userId}`, coachType);
      
      try {
        // Mettre à jour le type de coach dans la base de données
        await updateUserCoach(coachType);
        console.log(`✓ Type de coach ${coachType} enregistré en base de données`);
      } catch (error) {
        console.error("❌ Erreur lors de la mise à jour du coach en base:", error);
      }
    }
    
    setShowIntroModal(false);
    if (action === "coachRell") {
      router.replace("/reel");
    }
  };

  // ----------------------------------- PERSISTANCE DES TICKS -----------------------------------
  // Charger les plats scannés depuis l'API en fonction de la date locale
  useEffect(() => {
    const fetchScannedProducts = async () => {
      if (!userId) return;

      const localDate = new Date();
      const formattedDate = localDate.toISOString().split("T")[0];

      try {
        const userIdFromToken = await getUserIdFromToken();
        const token = await getToken();
        const response = await fetch(
          `${API_URL}/api/scannedproducts/user/${userIdFromToken}/date/${formattedDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setScannedDishes(data);
        } else {
          console.error("Erreur lors de la récupération des plats scannés");
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des plats scannés :", error);
      }
    };

    fetchScannedProducts();
  }, [userId, currentDay]);

  useEffect(() => {
    if (!userId || !currentDayPlan) return;
  
    // Réinitialisation visuelle immédiate
    setMealCompletion({ breakfast:false, lunch:false, dinner:false, snacks:false });
    setActivityCompletion(false);
    setStepsCompletion(false);
    setDistanceCompletion(false);
    setCaloriesCompletion(false);
    setWaterCompletion(false);
  
    // Recharge des ticks pour le jour courant
    loadDiaryTicks();
  }, [
    userId,
    currentDayPlan  // ← on surveille l’objet, pas sa propriété .day
  ]);


  // Charger éventuellement les plats scannés stockés (version offline)
  useEffect(() => {
    const loadScannedDishes = async () => {
      if (userId) {
        const storedDishes = await AsyncStorage.getItem(`scannedDishes_${userId}`);
        if (storedDishes) {
          setScannedDishes(JSON.parse(storedDishes));
        }
      }
    };
    loadScannedDishes();
  }, [userId]);

  const fetchNotifications = async (id: number) => {
    try {
      const userNotifications = await getNotificationsByUserId(id);
      setNotifications(userNotifications);
      setHasNewNotifications(userNotifications.length > 0);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des notifications :", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async (id: number) => {
    try {
      const count = await getUnreadNotificationsCount(id);
      setUnreadCount(count);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des notifications non lues :", error);
    }
  };

  const fetchPlanForToday = async (id: number) => {
    try {
      const planKey = `generatedPlan_${id}`;
      const timestampKey = `planTimestamp_${id}`;
      const storedPlan = await AsyncStorage.getItem(planKey);
      const timestampStr = await AsyncStorage.getItem(timestampKey);
      if (storedPlan && timestampStr) {
        const timestamp = Number(timestampStr);
        // Calcul du jour courant basé sur la différence de timestamps
        const computedDay = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)) + 1;
        const parsedPlan = JSON.parse(storedPlan);
        if (parsedPlan && Array.isArray(parsedPlan.two_week_plan)) {
          const todayPlan =
            parsedPlan.two_week_plan.find((d: any) => d.day === computedDay) ||
            parsedPlan.two_week_plan[0];
          setCurrentDayPlan(todayPlan);
          setCurrentDay(Number(todayPlan.day));
          await loadDiaryTicks();
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du plan :", error);
    }
  };

  // Récupérer d'éventuelles données de repas déjà loggés (non lié à scannedDishes)
  useEffect(() => {
    const fetchLoggedData = async () => {
      try {
        const mealsStr = await AsyncStorage.getItem("loggedMeals");
        if (mealsStr && currentDayPlan) {
          const mealsParsed = JSON.parse(mealsStr);
          const filteredMeals = mealsParsed.filter(
            (meal: any) => Number(meal.day) === Number(currentDayPlan.day)
          );
          setLoggedMeals(filteredMeals);
        }
        const loggedCalStr = await AsyncStorage.getItem("totalCalories");
        if (loggedCalStr) {
          const calParsed = JSON.parse(loggedCalStr);
          setLoggedCalories(calParsed);
        }
      } catch (error) {
        console.error("Error fetching logged meal data:", error);
      }
    };
    fetchLoggedData();
  }, [currentDayPlan]);

  // Dès qu'on modifie les ticks (repas, eau, etc.), on stocke la progression
  useEffect(() => {
    storeDiaryProgress();
  }, [mealCompletion, stepsCompletion, distanceCompletion, waterCompletion]);

  // Ajuster les calories restantes selon le plan du jour
  useEffect(() => {
    if (currentDayPlan) {
      setRemainingPlanCalories(currentDayPlan.recommended_calories);
    }
  }, [currentDayPlan]);

  // Exemple de fonction si on veut cocher le repas automatiquement selon le plat scanné
  const handleScanDish = async (scannedName: string, scannedCalories: number) => {
    if (!currentDayPlan || !userId) return;
    const totalDayCal = currentDayPlan.recommended_calories;
    const calPerMeal = totalDayCal / 4;
    const tolerance = 0.1;
    const lowerBound = calPerMeal * (1 - tolerance);
    const upperBound = calPerMeal * (1 + tolerance);

    // Vérifier si le scan correspond à un tick automatique pour un repas
    if (scannedCalories >= lowerBound && scannedCalories <= upperBound) {
      if (!mealCompletion.breakfast) {
        const newMealCompletion = { ...mealCompletion, breakfast: true };
        setMealCompletion(newMealCompletion);
        updateDiaryTicks({ mealCompletion: newMealCompletion });
        setRemainingPlanCalories((prev) => Math.max((prev ?? 0) - scannedCalories, 0));
        return;
      } else if (!mealCompletion.lunch) {
        const newMealCompletion = { ...mealCompletion, lunch: true };
        setMealCompletion(newMealCompletion);
        updateDiaryTicks({ mealCompletion: newMealCompletion });
        setRemainingPlanCalories((prev) => Math.max((prev ?? 0) - scannedCalories, 0));
        return;
      } else if (!mealCompletion.dinner) {
        const newMealCompletion = { ...mealCompletion, dinner: true };
        setMealCompletion(newMealCompletion);
        updateDiaryTicks({ mealCompletion: newMealCompletion });
        setRemainingPlanCalories((prev) => Math.max((prev ?? 0) - scannedCalories, 0));
        return;
      } else if (!mealCompletion.snacks) {
        const newMealCompletion = { ...mealCompletion, snacks: true };
        setMealCompletion(newMealCompletion);
        updateDiaryTicks({ mealCompletion: newMealCompletion });
        setRemainingPlanCalories((prev) => Math.max((prev ?? 0) - scannedCalories, 0));
        return;
      }
    }

    // Enregistrer le plat scanné pour cet utilisateur uniquement
    const newMeal = { name: scannedName, calories: scannedCalories, day: currentDayPlan.day };
    const updatedDishes = [...scannedDishes, newMeal];
    setScannedDishes(updatedDishes);
    await AsyncStorage.setItem(`scannedDishes_${userId}`, JSON.stringify(updatedDishes));

    // Mettre à jour dailyData avec une clé propre à l'utilisateur
    const dailyDataKey = `dailyData_${userId}`;
    const storedData = await AsyncStorage.getItem(dailyDataKey);
    let dailyData = storedData ? JSON.parse(storedData) : {};
    dailyData.mealCal = (dailyData.mealCal || 0) + scannedCalories;
    dailyData.lastScannedDish = scannedName;
    await AsyncStorage.setItem(dailyDataKey, JSON.stringify(dailyData));

    setRemainingPlanCalories((prev) => Math.max((prev ?? 0) - scannedCalories, 0));
  };

/*   // Fonction d’exemple pour vider la liste scannée
  const handleClearScannedDishes = async () => {
    if (!userId) return;
    await AsyncStorage.removeItem(`scannedDishes_${userId}`);
    setScannedDishes([]);
  };
 */
  // Ouvre la page Calendrier
  const handleCalendar = () => {
    router.push("/CalendarUserIA");
  };

  // Empêcher le bouton "back" Android de quitter l'application
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => backHandler.remove();
  }, []);
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => backHandler.remove();
  }, []);

  // Déconnexion
  const handleLogout = async () => {
    await logout();
    router.replace("/AuthScreen");
  };

  // Page profil
  const handleProfile = () => {
    router.push("/profile");
  };

  // Notifications
/*   const handleNotifications = async () => {
    if (userId) {
      await getUnreadNotificationsCount(userId);
    }
    setModalVisible(true);
  }; */

  // Ouvrir la modale de détail d’un repas
  const handleMealPress = (mealType: string, detail: string) => {
    setSelectedMealType(mealType);
    setSelectedMealDetail(detail);
    setMealModalVisible(true);
  };

  // Cocher / Décocher un repas manuellement
  const handleMealComplete = async (mealType: keyof typeof mealCompletion) => {
      // Mise à jour de l'état local
      const newState = { ...mealCompletion, [mealType]: !mealCompletion[mealType] };
      setMealCompletion(newState);
      
      // Sauvegarde dans AsyncStorage pour persistance
      try {
        await updateDiaryTicks({ mealCompletion: newState });
        console.log(`✓ Statut de ${mealType} sauvegardé: ${newState[mealType]}`, userId);
        
        // Vérifier si tous les repas sont maintenant cochés
        checkAllMealsCompleted(newState);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde du tick:", error);
      }
  };

  // Fonction qui vérifie si tous les repas sont cochés et affiche un toast
  const checkAllMealsCompleted = (mealState: typeof mealCompletion) => {
    // Vérifie si tous les repas sont cochés et aussi les autres activités
    if (mealState.breakfast && mealState.lunch && mealState.dinner && mealState.snacks && 
        activityCompletion && stepsCompletion && distanceCompletion && waterCompletion) {
      // Afficher directement le toast de félicitations
      Toast.show({
        type: "success",
        text1: "Félicitations !",
        text2: "Bravo ! Tu as complété tout ton plan d'aujourd'hui !",
        position: "bottom",
        visibilityTime: 5000
      });
    }
  };

  // Cocher / Décocher l'activité
  const handleActivityComplete = async () => {
    const newVal = !activityCompletion;
    setActivityCompletion(newVal);
    try {
      await updateDiaryTicks({ activityCompletion: newVal });
      console.log(`✓ Statut de l'activité sauvegardé: ${newVal}`, userId);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du tick d'activité:", error);
    }
  };
  
  const handleStepsComplete = async () => {
    const newVal = !stepsCompletion;
    setStepsCompletion(newVal);
    try {
      await updateDiaryTicks({ stepsCompletion: newVal });
      console.log(`✓ Statut des steps sauvegardé: ${newVal}`, userId);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du tick de steps:", error);
    }
  };
  
  const handleDistanceComplete = async () => {
    const newVal = !distanceCompletion;
    setDistanceCompletion(newVal);
    try {
      await updateDiaryTicks({ distanceCompletion: newVal });
      console.log(`✓ Statut de distance sauvegardé: ${newVal}`, userId);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du tick de distance:", error);
    }
  };
  
  const handleCaloriesComplete = async () => {
    const newVal = !caloriesCompletion;
    setCaloriesCompletion(newVal);
    try {
      await updateDiaryTicks({ caloriesCompletion: newVal });
      console.log(`✓ Statut de calories sauvegardé: ${newVal}`, userId);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du tick de calories:", error);
    }
  };
  
  const handleWaterComplete = async () => {
    const newVal = !waterCompletion;
    setWaterCompletion(newVal);
    try {
      await updateDiaryTicks({ waterCompletion: newVal });
      console.log(`✓ Statut d'eau sauvegardé: ${newVal}`, userId);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du tick d'eau:", error);
    }
  };

  return (
    <ProtectedRoute>
      <NavbarIA />


      {/* Modale de détail d'un repas */}
      <Modal
  visible={mealModalVisible}
  animationType="fade"
  transparent={true}
  onRequestClose={() => setMealModalVisible(false)}
>
  <View style={styles.modalOverlay}>
  <View style={styles.modalContainer}>
    {/* Icône flottante en haut - conditionnelle selon le type de repas */}
    <View style={[styles.iconWrapper, selectedMealType === "Breakfast" ? styles.breakfastIconWrapper : null]}>
      {selectedMealType === "Breakfast" ? (
        <Coffee width={24} height={24} color="#FFFFFF" />
      ) : selectedMealType === "Snacks" ? (
        <Ionicons name="ice-cream-outline" size={24} color="#FFFFFF" />
      ) : (
        <MaterialIcons name="restaurant" size={24} color="#FFFFFF" />
      )}
    </View>
      
      {/* Titre avec étoile */}
      <View style={styles.titleContainer}>
        <Star width={20} height={20} color="#F59E0B" strokeWidth={2} fill="#F59E0B" />
        <Text style={styles.modalTitle}>{selectedMealType}</Text>
      </View>
      
      {/* Contenu */}
      <View style={styles.contentBox}>
        <Text style={styles.modalContent}>{selectedMealDetail}</Text>
      </View>
      
      {/* Bouton */}
      <TouchableOpacity
        style={styles.modalCloseButton}
        onPress={() => setMealModalVisible(false)}
      >
        <Text style={styles.modalCloseButtonText}>Fermer</Text>
      <Icon source="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  </View>
</Modal>  
      {/* Modale d'intro / Sélection de coach */}
      <Modal
      visible={showIntroModal}
      animationType="fade"
      transparent={true}
    >
      <ImageBackground 
        source={require("../assets/white.jpg")} 
        style={styles.introModalOverlay}
        imageStyle={{ opacity: 0.9 }}
      >
        <View style={styles.blackOverlay} />
        <View style={styles.introModalContainer}>
          <View style={styles.introCardHeader}>
            <Ionicons 
              name="book-outline" 
              size={50} 
              color="rgba(195, 0, 0, 0.85)" 
              style={styles.headerIcon}
            />
            <Text style={styles.introTitle}>Bienvenue dans votre Diary!</Text>
            <Text style={styles.introSubtitle}>Votre parcours de bien-être commence ici</Text>
          </View>

          <View style={styles.divider} />
          
          <Text style={styles.introContent}>
            Choisissez le coach qui vous accompagnera dans votre parcours personnel.
          </Text>
          
          <View style={styles.coachOptionsContainer}>
            <TouchableOpacity 
              style={[styles.coachOption, styles.coachRealOption]} 
              onPress={() => handleIntroClose("coachRell")}
            >
              <View style={styles.coachIconContainer}>
                <Ionicons name="people-outline" size={28} color="#fff" />
              </View>
              <View style={styles.coachTextContainer}>
                <Text style={styles.coachTitle}>Coach Réel</Text>
                <Text style={styles.coachDescription}>Accompagnement personnalisé</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.coachOption, styles.coachAIOption]} 
              onPress={() => {
                assignCoach();
                handleIntroClose("coachIA");
              }}
            >
              <View style={styles.coachIconContainer}>
                <Ionicons name="rocket-outline" size={28} color="#fff" />
              </View>
              <View style={styles.coachTextContainer}>
                <Text style={styles.coachTitle}>Coach IA</Text>
                <Text style={styles.coachDescription}>Disponible 24/7</Text>
              </View>
            </TouchableOpacity>
          </View>
          
         {/*  <TouchableOpacity 
            style={styles.skipButton} 
            onPress={() => handleIntroClose("skip")}
          >
            <Text style={styles.skipButtonText}>Plus tard</Text>
          </TouchableOpacity> */}
        </View>
      </ImageBackground>
    </Modal>
        {/* Modale pour le scanner d'aliments */}
        <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.scanModalContainer]}>
            <View style={styles.scanIconHeader}>
              <View style={styles.scanIconCircle}>
                <Ionicons name="scan" size={32} color="#3B82F6" />
              </View>
            </View>
            <Text style={styles.scanModalTitle}>📷 Ajouter un Aliment</Text>
            <Text style={styles.scanModalSubtitle}>Choisissez une méthode pour scanner vos aliments</Text>

            {/* Food Scanner */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setModalVisible(false);
                router.push("/FoodScannerScreen");
              }}
            >
              <MaterialIcons name="camera-alt" size={24} color="white" />
              <Text style={styles.optionText}>Food Scanner</Text>
            </TouchableOpacity>

            {/* Code à Barres */}
            <TouchableOpacity
              style={[styles.optionButton, styles.barcodeButton]}
              onPress={() => {
                setModalVisible(false);
                router.push("/BarcodeScannerScreen");
              }}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color="white" />
              <Text style={styles.optionText}>Code à Barres</Text>
            </TouchableOpacity>

            {/* Bouton Fermer */}
            <TouchableOpacity
              style={styles.scanCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.scanCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Corps principal */}
      <ScrollView style={styles.container}>
      <View style={styles.headerContent}>
  <Text style={styles.todayTitle}>Plan du jour</Text>
  <Text style={styles.headerSubtitle}>Cochez chaque élément lorsque vous le complétez</Text>
</View>

        {currentDayPlan ? (
          <View style={styles.diaryContainer}>
            {/* Repas 1 : Breakfast */}
            <View style={styles.diarySection}>
              <Image source={require("../assets/images/breakfast.png")} style={styles.icon} />
              <TouchableOpacity
                style={styles.diaryContent}
                onPress={() =>
                  handleMealPress("Breakfast", currentDayPlan.meal_plan.breakfast)
                }
              >
                <Text style={styles.sectionTitle}>Breakfast</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMealComplete("breakfast")}
                style={styles.tickContainer}
              >
                <Ionicons
                  name={mealCompletion.breakfast ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={mealCompletion.breakfast ? "green" : "gray"}
                />
              </TouchableOpacity>
            </View>

            {/* Repas 2 : Lunch */}
            <View style={styles.diarySection}>
              <Image source={require("../assets/images/lunch.png")} style={styles.icon} />
              <TouchableOpacity
                style={styles.diaryContent}
                onPress={() => handleMealPress("Lunch", currentDayPlan.meal_plan.lunch)}
              >
                <Text style={styles.sectionTitle}>Lunch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMealComplete("lunch")}
                style={styles.tickContainer}
              >
                <Ionicons
                  name={mealCompletion.lunch ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={mealCompletion.lunch ? "green" : "gray"}
                />
              </TouchableOpacity>
            </View>

            {/* Repas 3 : Dinner */}
            <View style={styles.diarySection}>
              <Image source={require("../assets/images/dinner.png")} style={styles.icon} />
              <TouchableOpacity
                style={styles.diaryContent}
                onPress={() => handleMealPress("Dinner", currentDayPlan.meal_plan.dinner)}
              >
                <Text style={styles.sectionTitle}>Dinner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMealComplete("dinner")}
                style={styles.tickContainer}
              >
                <Ionicons
                  name={mealCompletion.dinner ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={mealCompletion.dinner ? "green" : "gray"}
                />
              </TouchableOpacity>
            </View>

            {/* Repas 4 : Snacks */}
            <View style={styles.diarySection}>
              <Image source={require("../assets/images/snacks.png")} style={styles.icon} />
              <TouchableOpacity
                style={styles.diaryContent}
                onPress={() => handleMealPress("Snacks", currentDayPlan.meal_plan.snacks)}
              >
                <Text style={styles.sectionTitle}>Snacks</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMealComplete("snacks")}
                style={styles.tickContainer}
              >
                <Ionicons
                  name={mealCompletion.snacks ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={mealCompletion.snacks ? "green" : "gray"}
                />
              </TouchableOpacity>
            </View>

            {/* Activité physique */}
            <View style={styles.section}>
              <Image source={require("../assets/images/exercice.png")} style={styles.icon} />
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Activity: </Text>
                {currentDayPlan.physical_activity}
              </Text>
              <TouchableOpacity onPress={handleActivityComplete} style={styles.tickContainer}>
                <Ionicons
                  name={activityCompletion ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={activityCompletion ? "green" : "gray"}
                />
              </TouchableOpacity>
            </View>

            {/* Steps */}
            <View style={styles.section}>
              <Image source={require("../assets/images/steps.png")} style={styles.icon} />
              <Text style={styles.infoText}>
                <Text style={styles.bold}> Steps: </Text>
                {currentDayPlan.recommended_steps}
              </Text>
              <TouchableOpacity onPress={handleStepsComplete} style={styles.tickContainer}>
                <Ionicons
                  name={stepsCompletion ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={stepsCompletion ? "green" : "gray"}
                />
              </TouchableOpacity>
            </View>

            {/* Distance */}
            <View style={styles.section}>
              <Image source={require("../assets/images/distance.png")} style={styles.icon} />
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Distance (km): </Text>
                {currentDayPlan.recommended_distance_km}
              </Text>
              <TouchableOpacity onPress={handleDistanceComplete} style={styles.tickContainer}>
                <Ionicons
                  name={distanceCompletion ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={distanceCompletion ? "green" : "gray"}
                />
              </TouchableOpacity>
            </View>

            {/* Calories */}
            <View style={styles.section}>
              <Image source={require("../assets/images/calories.png")} style={styles.icon} />
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Calories: </Text>
                {currentDayPlan.recommended_calories}
              </Text>
            </View>

            {/* Eau */}
            <View style={[styles.section, { marginBottom: 5 }]}>
              <Image source={require("../assets/images/water.png")} style={styles.icon} />
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Water (l): </Text>
                {currentDayPlan.recommended_water_l}
              </Text>
              <TouchableOpacity onPress={handleWaterComplete} style={styles.tickContainer}>
                <Ionicons
                  name={waterCompletion ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={waterCompletion ? "green" : "gray"}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noPlanContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={50} color="#6B7280" />
            </View>
            <Text style={styles.emptyTitleText}>Aucun plan disponible</Text>
            <Text style={styles.emptySubtitleText}>
              Vous n'avez pas encore de plan alimentaire pour aujourd'hui
            </Text>
            <TouchableOpacity style={styles.createPlanButton} onPress={handleCalendar}>
              <Ionicons name="add-circle-outline" size={18} color="#3B82F6" style={styles.scanButtonIcon} />
              <Text style={styles.createPlanButtonText}>Voir le calendrier</Text>
            </TouchableOpacity>
          </View>
        )}

    {/* Liste des plats scannés */}
<View style={styles.scannedDishesContainer}>
  <View style={styles.scannedDishesTitleContainer}>
    <View style={styles.titleWithIcon}>
      <Ionicons name="scan-outline" size={24} color="#3B82F6" style={styles.scanIcon} />
      <Text style={styles.scannedDishesTitle}>Plats Scannés</Text>
    </View>
    <TouchableOpacity 
      style={styles.toggleButton}
      onPress={() => setShowData(!showData)}
    >
      <Text style={styles.toggleButtonText}>
        {showData ? "Voir vide" : "Voir données"}
      </Text>
    </TouchableOpacity>
  </View>
  
  {showData && scannedDishes && scannedDishes.length > 0 ? (
    <>
      <FlatList
        data={scannedDishes}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.scannedDishItem}>
            <View style={styles.dishIconContainer}>
              <Ionicons name="restaurant-outline" size={18} color="#3B82F6" />
            </View>
            <View style={styles.dishTextContainer}>
              <Text style={styles.dishName}>{item.productName}</Text>
              <View style={styles.caloriesBadge}>
                <Text style={styles.caloriesText}>{item.calories} kcal</Text>
              </View>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      
      {/* Compteur de calories total */}
      <View style={styles.totalCaloriesContainer}>
        <Text style={styles.totalCaloriesLabel}>Total calories:</Text>
        <Text style={[
          styles.totalCaloriesValue, 
          scannedDishes.reduce((acc, meal) => acc + (meal.calories || 0), 0) > 600 
            ? styles.totalCaloriesExceeded 
            : styles.totalCaloriesNormal
        ]}>
          {scannedDishes.reduce((acc, meal) => acc + (meal.calories || 0), 0)} kcal
        </Text>
      </View>
      
      {(() => {
        const totalScanned = scannedDishes.reduce((acc, meal) => acc + (meal.calories || 0), 0);
        if (totalScanned > 600) {
          return (
            <View style={styles.alertContainer}>
              <Ionicons name="warning-outline" size={22} color="#EF4444" style={styles.alertIcon} />
              <Text style={styles.alertText}>
                Vous avez dépassé la limite recommandée de 600 calories.
              </Text>
            </View>
          );
        }
        return null;
      })()}
    </>
  ) : (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="scan-outline" size={40} color="#6B7280" />
      </View>
      <Text style={styles.emptyTitleText}>Aucun plat scanné</Text>
      <Text style={styles.emptySubtitleText}>Scannez vos repas pour suivre vos calories</Text>
      
     
      <TouchableOpacity style={styles.scanButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={18} color="#3B82F6" style={styles.scanButtonIcon} />
        <Text style={styles.scanButtonText}>Scanner un plat</Text>
      </TouchableOpacity>
    </View>
  )}
</View>
      </ScrollView>

      <Footer />
      
      {/* Composant Toast pour afficher les messages */}
      <Toast />
    </ProtectedRoute>
  );
}

// ----------------------------------- STYLES -----------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f7" },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderBottomWidth: 3,
    borderBottomColor: "rgba(0, 0, 0, 0.12)",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  breakfastIconWrapper: {
  backgroundColor: '#rgba(195, 0, 0, 0.90)', 
  shadowColor: 'rgba(195, 0, 0, 0.70)',
  justifyContent: "center",
  alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  icon: {
    width: 50,
    height: 50,
    marginTop: 20,
    marginLeft: 6,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    margin: 10,
    borderRadius: 10,
  },
  notificationIconContainer: {
    position: "relative",
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 50,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: "red",
    borderRadius: 5,
  },
  badgeTextt: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    top: -2,
    left: 3,
  },
  headerContent: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  todayTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  diaryContainer: { padding: 20 },
  diarySection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  diaryContent: { flex: 1, marginLeft: 10 },
  diaryText: { fontSize: 16, color: "#333" },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  diaryInfoSection: {
    backgroundColor: "#FFF5EE",
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  infoText: { fontSize: 16, color: "#333", marginVertical: 2 },
  bold: { fontWeight: "bold" },
 /*  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalContent: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  modalCloseButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  }, */
  closeButton: { position: "absolute", top: 10, right: 10, padding: 5 },
  notificationText: { fontSize: 16, paddingVertical: 5, textAlign: "left", width: "100%" },
  noNotifications: { fontSize: 14, color: "#999", textAlign: "center", marginTop: 10 },
  notificationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  markAsRead: { fontSize: 14, color: "blue", fontWeight: "bold" },
  tickContainer: { marginLeft: 10 },
  introModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  blackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  introModalContainer: {
    width: width * 0.85,
    maxHeight: height * 0.7,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  introCardHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  headerIcon: {
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(195, 0, 0, 0.55)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    width: '90%',
    backgroundColor: 'rgba(195, 0, 0, 0.30)',
    marginVertical: 15,
  },
  introContent: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: '#444',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  coachOptionsContainer: {
    width: '100%',
    marginTop: 10,
    gap: 15,
  },
  coachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 12,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  coachRealOption: {
    backgroundColor: 'rgba(195, 0, 0, 0.45)',
  },
  coachAIOption: {
    backgroundColor: 'rgba(195, 0, 0, 0.65)',
  },
  coachIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  coachTextContainer: {
    flex: 1,
  },
  coachTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },
  coachDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  skipButton: {
    marginTop: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 0, 0, 0.30)',
  },
  skipButtonText: {
    color: 'rgba(195, 0, 0, 0.80)',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
   backgroundColor: 'rrgba(0, 0, 0, 0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  iconWrapper: {
    position: 'absolute',
    top: -25,
    backgroundColor: 'rgba(195, 0, 0, 0.90)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(195, 0, 0, 0.70)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginLeft: 10,
    letterSpacing: -0.5,
  },
  contentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalContent: {
    fontSize: 16,
    lineHeight: 26,
    color: '#4B5563',
    textAlign: 'left',
  },
  modalCloseButton: {
    backgroundColor: 'rgba(195, 0, 0, 0.70)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: 'rgba(195, 0, 0, 0.70)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 10,
  },

// Ajoutez/remplacez ces styles dans l'objet styles
// Ajoutez/modifiez ces styles dans votre objet styles
scannedDishesContainer: {
  margin: 20,
  padding: 16,
  backgroundColor: '#fff',
  borderRadius: 16,
  marginBottom: 80,
  marginTop: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
  borderWidth: 1,
  borderColor: '#f0f0f0',
},
scannedDishesTitleContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8, // Réduit de 16 à 8
  paddingBottom: 8, // Réduit de 12 à 8
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
titleWithIcon: {
  flexDirection: 'row',
  alignItems: 'center',
},
scanIcon: {
  marginRight: 10,
},
scannedDishesTitle: {
  fontSize: 16, // Réduit de 18 à 16 
  fontWeight: "700",
  color: "#333",
},
toggleButton: {
  backgroundColor: "#EBF5FF",
  paddingVertical: 4, // Réduit de 6 à 4
  paddingHorizontal: 10,
  borderRadius: 16,
},
toggleButtonText: {
  color: "#3B82F6",
  fontSize: 12, // Réduit de 14 à 12
  fontWeight: "500",
},
scannedDishItem: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 12,
},
dishIconContainer: {
  width: 36,
  height: 36,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#EBF5FF", // Bleu très clair
  borderRadius: 8,
  marginRight: 12,
},
dishTextContainer: {
  flex: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
dishName: {
  fontSize: 16,
  fontWeight: "500",
  color: "#333",
  flex: 1,
  marginRight: 8,
},
caloriesBadge: {
  backgroundColor: "#EBF5FF",
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 16,
},
caloriesText: {
  color: "#3B82F6",
  fontWeight: "600",
  fontSize: 14,
},
separator: {
  height: 1,
  backgroundColor: "#f0f0f0",
},
listContent: {
  paddingVertical: 8,
},
totalCaloriesContainer: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#F9FAFB",
  marginTop: 16,
  padding: 12,
  borderRadius: 8,
},
totalCaloriesLabel: {
  fontSize: 15,
  fontWeight: "500",
  color: "#374151",
},
totalCaloriesValue: {
  fontSize: 16,
  fontWeight: "700",
},
totalCaloriesNormal: {
  color: "#10B981", // Vert
},
totalCaloriesExceeded: {
  color: "#EF4444", // Rouge
},
alertContainer: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FEF2F2", // Rouge très clair
  padding: 12,
  marginTop: 12,
  borderRadius: 8,
},
alertIcon: {
  marginRight: 10,
},
alertText: {
  color: "#EF4444",
  fontSize: 14,
  fontWeight: "500",
  flex: 1,
},
clearButton: {
  backgroundColor: "#F3F4F6",
  padding: 12,
  borderRadius: 8,
  alignItems: "center",
  marginTop: 16,
},
clearButtonText: {
  color: "#4B5563",
  fontSize: 15,
  fontWeight: "600",
},
emptyContainer: {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 30,
  paddingHorizontal: 16,
},
emptyIconContainer: {
  width: 70,
  height: 70,
  borderRadius: 35,
  backgroundColor: "#F3F4F6",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 16,
},
emptyTitleText: {
  fontSize: 18,
  fontWeight: "600",
  color: "#4B5563",
  marginBottom: 8,
},
emptySubtitleText: {
  fontSize: 14,
  color: "#9CA3AF",
  textAlign: "center",
  marginBottom: 20,
},
scanButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#EBF5FF",
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
},
scanButtonIcon: {
  marginRight: 8,
},
scanButtonText: {
  color: "#3B82F6",
  fontSize: 15,
  fontWeight: "600",
},
noPlanContainer: {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 30,
  paddingHorizontal: 16,
},
createPlanButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#EBF5FF",
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginTop: 20,
},
createPlanButtonText: {
  color: "#3B82F6",
  fontSize: 15,
  fontWeight: "600",
},
scanModalContainer: {
  paddingTop: 50,
  paddingBottom: 30,
},
scanIconHeader: {
  position: 'absolute',
  top: -30,
  alignItems: 'center',
  width: '100%',
},
scanIconCircle: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#EBF5FF',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  borderWidth: 3,
  borderColor: '#fff',
},
scanModalTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#1F2937',
  marginBottom: 8,
  textAlign: 'center',
},
scanModalSubtitle: {
  fontSize: 14,
  color: '#6B7280',
  marginBottom: 24,
  textAlign: 'center',
},
optionButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#3B82F6',
  padding: 15,
  borderRadius: 12,
  marginVertical: 8,
  width: '100%',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
},
barcodeButton: {
  backgroundColor: '#4F46E5', // Légèrement différent pour visuellement distinguer
},
optionText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
  marginLeft: 12,
},
scanCloseButton: {
  marginTop: 16,
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
},
scanCloseText: {
  color: '#6B7280',
  fontSize: 15,
  fontWeight: '500',
  textAlign: 'center',
},
});
