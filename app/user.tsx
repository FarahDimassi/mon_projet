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
} from "react-native";
// @ts-ignore
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Check, AlertCircle, X, Star, ArrowRight, Bell , Award, Coffee} from "react-native-feather";
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
      // AJOUT : on récupère le jour courant pour la clé
      const day = currentDayPlan.day;
  
      // MODIF : la clé inclut désormais le jour
      const diaryKey = `diaryTicks_${userId}_day${day}`;
  
      // MODIF : on lit depuis la nouvelle clé
      const storedTicks = await AsyncStorage.getItem(diaryKey);
  
      if (storedTicks) {
        const parsed = JSON.parse(storedTicks);
  
        // MODIF : lecture des valeurs tick pour ce jour seulement
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
        setWaterCompletion(parsed.waterCompletion         || false);
  
      } else {
        // AJOUT : on initialise un objet de ticks par défaut pour ce jour
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
  
        // MODIF : on stocke ces defaults sous la clé spécifique au jour
        await AsyncStorage.setItem(diaryKey, JSON.stringify(defaultTicks));
  
        // AJOUT : et on injecte immédiatement ces valeurs dans le state
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
  
    // AJOUT : on récupère le jour courant pour la clé
    const day = currentDayPlan.day;
  
    // MODIF : la clé inclut désormais le jour
    const diaryKey = `diaryTicks_${userId}_day${day}`;
  
    try {
      // MODIF : on lit l’état courant pour ce jour
      const stored = await AsyncStorage.getItem(diaryKey);
      const current = stored ? JSON.parse(stored) : {};
  
      // MODIF : on fusionne avec les nouvelles valeurs
      const merged = { ...current, ...updatedValues };
  
      // MODIF : on enregistre sous la clé spécifique au jour
      await AsyncStorage.setItem(diaryKey, JSON.stringify(merged));
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
          `http://192.168.1.139:8080/api/scannedproducts/user/${userIdFromToken}/date/${formattedDate}`,
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
      } catch (error) {
        console.error("Erreur lors de la sauvegarde du tick:", error);
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
        <Text style={styles.modalCloseButtonText}>Continuer</Text>
        <ArrowRight width={18} height={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  </View>
</Modal>
      {/* Modale d'intro / Sélection de coach */}
      <Modal visible={showIntroModal} animationType="slide" transparent={true}>
        <ImageBackground source={require("../assets/white.jpg")} style={styles.introModalOverlay}>
          <View style={styles.blackOverlay} />
          <View style={styles.introModalContainer}>
            <View style={styles.introHeader}>
              <Ionicons name="book-outline" size={40} color="rgba(0, 128, 0, 1.00)" />
              <Text style={styles.introTitle}>Bienvenue dans votre Diary!</Text>
            </View>
            <Text style={styles.introContent}>Découvrez nos coachs pour vous accompagner.</Text>
            <View style={styles.introButtonContainer}>
              <TouchableOpacity style={styles.introButton} onPress={() => handleIntroClose("coachRell")}>
                <Ionicons name="people-outline" size={20} color="#fff" />
                <Text style={styles.introButtonText}>Coach Reel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.introButton} onPress={() => handleIntroClose("coachIA")}>
                <Ionicons onPress={()=>assignCoach()} name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.introButtonText}>Coach IA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </Modal>

      {/* Corps principal */}
      <ScrollView style={styles.container}>
        <View style={styles.headerContent}>
          <Text style={styles.todayTitle}>Today</Text>
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
            <View style={[styles.section, { marginBottom: 81 }]}>
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
          <ActivityIndicator size="large" color="#28A745" />
        )}

        {/* Liste des plats scannés */}
        <View style={styles.scannedDishesContainer}>
          <Text style={styles.scannedDishesTitle}>Derniers Plats Scannés</Text>
          {scannedDishes && scannedDishes.length > 0 ? (
            <>
              <FlatList
                data={scannedDishes}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.scannedDishItem}>
                    <Text style={styles.scannedDishText}>
                      {item.productName} - {item.calories} kcal
                    </Text>
                  </View>
                )}
              />
              {(() => {
                const totalScanned = scannedDishes.reduce((acc, meal) => acc + (meal.calories || 0), 0);
                if (totalScanned > 600) {
                  return (
                    <View style={styles.alertContainer}>
                      <Ionicons name="warning-outline" size={20} color="red" style={styles.alertIcon} />
                      <Text style={styles.alertText}>
                        Vous avez atteint la limite de 600 calories.
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}
              {/* <TouchableOpacity style={styles.clearButton} onPress={handleClearScannedDishes}>
                <Text style={styles.clearButtonText}>Vider la liste scannée</Text>
              </TouchableOpacity> */}
            </>
          ) : (
            <Text style={styles.scannedDishText}>Aucun plat scanné.</Text>
          )}
        </View>
      </ScrollView>

      <Footer />
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
  scannedDishesContainer: {
    margin: 20,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 80,
    marginTop: -70,
  },
  scannedDishesTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  scannedDishItem: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#eee" },
  scannedDishText: { fontSize: 16, color: "#333" },
  clearButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  clearButtonText: { color: "#fff", fontWeight: "bold" },
  alertContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,0,0,0.1)",
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
    flexWrap: "wrap",
    width: "100%",
  },
  alertIcon: { marginRight: 8 },
  alertText: {
    color: "red",
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
    flexWrap: "wrap",
  },
  introModalOverlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  blackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  introModalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    zIndex: 1,
  },
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  introContent: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
  },
  introButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  introButton: {
    backgroundColor: "rgba(0, 128, 0, 1.00)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  introButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
});
