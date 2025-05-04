import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { requestIaCoachRequest } from "@/utils/invitationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import ActivityChart from "../../components/ActivityChart";
import Card from "../../components/Card";
import Footer from "../../components/Footer";
import { getToken, getUserIdFromToken } from "../../utils/authService";
import NavbarIA from "@/components/NavbarIA";
import Toast from "react-native-toast-message";
import { requestResetInvitationIA } from "@/utils/invitationService";
const Dashboard: React.FC = () => {
  // États pour l'ID utilisateur et le plan
  const [userId, setUserId] = useState<number | null>(null);
  const [plan, setPlan] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState<number>(1);

  // États pour les valeurs du plan seul
  const [planCalories, setPlanCalories] = useState<number>(0);
  const [cumulativeSteps, setCumulativeSteps] = useState<number>(0);
  const [cumulativeDistance, setCumulativeDistance] = useState<number>(0);
  const [cumulativeWater, setCumulativeWater] = useState<number>(0);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
const [invitationSent, setInvitationSent] = useState(false);
  // États pour les repas scannés
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);
  const [loggedCalories, setLoggedCalories] = useState<number>(0);

  // États pour les données tickées dans le Diary
  const [diarySteps, setDiarySteps] = useState<number>(0);
  const [diaryDistance, setDiaryDistance] = useState<number>(0);
  const [diaryWater, setDiaryWater] = useState<number>(0);
  const [diaryMealCalories, setDiaryMealCalories] = useState<number>(0);

  // États pour la progression pondérale
  const [initialWeight, setInitialWeight] = useState<string>("");
  const [targetWeightPlan, setTargetWeightPlan] = useState<string>("");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [weight, setWeight] = useState<number>(70.5);

  // États pour la modal générique
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalContent, setModalContent] = useState<string>("");

  // États pour la progression 30 jours
  const [planCalories30, setPlanCalories30] = useState<number>(0);

  // États pour la modal coach
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [mealPlan, setMealPlan] = useState<any[]>([]);

  // États pour le formulaire de progression
  const [isProgressFormVisible, setIsProgressFormVisible] = useState<boolean>(false);
  const [currentWeight, setCurrentWeight] = useState<string>("");
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [waistSize, setWaistSize] = useState<string>("");
  const [hipSize, setHipSize] = useState<string>("");
  const [selectedCoachType, setSelectedCoachType] = useState<string>("");
  const [satisfactionRating, setSatisfactionRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

    const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
    const [messageText, setMessageText] = useState("");
  // Calcule la somme des calories sur 30 jours
  useEffect(() => {
    if (plan.length > 0) {
      let sum = 0;
      for (let i = 0; i < 30 && i < plan.length; i++) {
        sum += plan[i].recommended_calories || 0;
      }
      setPlanCalories30(sum);
    }
  }, [plan]);

  // Simule la récupération du plan de repas pour une date/coach donnés
  const fetchMealPlanForDate = async (date: string, coachId: number) => {
    console.log(`Fetching meal plan for date: ${date} and coach: ${coachId}`);
    // setMealPlan(result);
  };

  // Construction d'URL d'avatar
  const buildAvatarUrl = (photoUrl: string) => photoUrl || "https://via.placeholder.com/150";

  // Date locale formatée
  const getLocalFormattedDate = (date: Date) => date.toLocaleDateString();

  // Calcul BMI
  const calculateBMI = (weight: string, height: string) => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w && h) return (w / (h * h)).toFixed(2);
    return "N/A";
  };

  // Soumission formulaire progression
  const handleSubmitProgressForm = async () => {
    const init = parseFloat(initialWeight);
      const curr = parseFloat(currentWeight);
      const target = parseFloat(targetWeight);
      const heightNum = parseFloat(height);
    
      const bmi =
        heightNum > 0
          ? (curr / Math.pow(heightNum / 100, 2)).toFixed(2)
          : "N/A";
    
      const progressPercent =
        init !== target
          ? (((init - curr) / (init - target)) * 100).toFixed(1)
          : "100";
        
const a = initialWeight;
const b = targetWeightPlan;

console.log("Poids initial:", a, "Poids cible:", b, "Poids actuel:", curr, "IMC:", bmi, "Progression:", progressPercent);
    const userId = await getUserIdFromToken();
    console.log(userId);
    const formData = {
      userId,
      coachType: selectedCoachType,
      initialWeight: a,
      currentWeight: curr,
      targetWeight: b,
      height: heightNum,
      waistSize: waistSize ? parseFloat(waistSize) : null,
      hipSize: hipSize ? parseFloat(hipSize) : null,
      bmi: parseFloat(bmi as string) || null,
      satisfactionRating,
      feedback,
      date: getLocalFormattedDate(new Date()).split("/").reverse().join("-"),
    };
console.log("Form data:", formData);
    try {
      alert(
        `Votre IMC : ${bmi}\n` +
        `Progression : ${progressPercent}%`
      );
      const token = await getToken();
      const res = await fetch("http://192.168.1.139:8080/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const saved = await res.json();
      console.log("Données envoyées au back :", saved);
      console.log("JWT envoyé :", token);
      console.log("Payload :", formData);

      setFormSubmitted(true);
      setTimeout(() => {
        Toast.show({
          type: "success",
          text1: "Données enregistrées",
          text2: "Votre progression a été sauvegardée avec succès",
          position: "bottom",
          visibilityTime: 4000,
          autoHide: true,
        });
      }, 300);
      setTimeout(() => {
        setInitialWeight("");
        setCurrentWeight("");
        setTargetWeight("");
        setHeight("");
        setWaistSize("");
        setHipSize("");
        setSelectedCoachType("");
        setSatisfactionRating(0);
        setFeedback("");
        setFormSubmitted(false);
        setIsProgressFormVisible(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        alert("Une erreur est survenue lors de l'envoi : " + err.message);
        Toast.show({
          type: "error",
          text1: "Erreur lors de l'envoi",
          text2: err.message || "Veuillez réessayer",
          position: "bottom",
          visibilityTime: 4000,
        });
      } else {
        alert("Une erreur inconnue est survenue.");
        Toast.show({
          type: "error",
          text1: "Erreur inconnue",
          text2: "Une erreur inattendue s'est produite",
          position: "bottom",
          visibilityTime: 4000,
        });
      }
    }
  };

  // Récupération du plan stocké + calcul du jour courant
  useEffect(() => {
    (async () => {
      try {
        const id = await getUserIdFromToken();
        if (id) {
          setUserId(id);
          const storedPlan = await AsyncStorage.getItem(`generatedPlan_${id}`);
          const timestampStr = await AsyncStorage.getItem(`planTimestamp_${id}`);
          if (storedPlan && timestampStr) {
            const parsed = JSON.parse(storedPlan);
            parsed.initial_weight && setInitialWeight(parsed.initial_weight);
            parsed.target_weight && setTargetWeightPlan(parsed.target_weight);
            if (Array.isArray(parsed.two_week_plan)) {
              setPlan(parsed.two_week_plan);
              const dayNum = Math.floor((Date.now() - Number(timestampStr)) / 86400000) + 1;
              setCurrentDay(dayNum);
              computePlanValues(parsed.two_week_plan, dayNum);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Calcul cumulatif du plan + progression
  const computePlanValues = (twoWeekPlan: any[], day: number) => {
    let cal = 0, st = 0, dist = 0, wat = 0;
    for (let i = 0; i < day && i < twoWeekPlan.length; i++) {
      cal += twoWeekPlan[i].recommended_calories || 0;
      st += twoWeekPlan[i].recommended_steps || 0;
      dist += twoWeekPlan[i].recommended_distance_km || 0;
      wat += twoWeekPlan[i].recommended_water_l || 0;
    }
    setPlanCalories(cal);
    setCumulativeSteps(st);
    setCumulativeDistance(dist);
    setCumulativeWater(wat);
    if (initialWeight && targetWeightPlan) {
      const prog = initialWeight > targetWeightPlan
        ? ((parseFloat(initialWeight) - weight) / (parseFloat(initialWeight) - parseFloat(targetWeightPlan))) * 100
        : ((weight - parseFloat(initialWeight)) / (parseFloat(targetWeightPlan) - parseFloat(initialWeight))) * 100;
      setProgressPercentage(prog);
    }
  };

  // Chargement données journalières
  useEffect(() => {
    (async () => {
      if (!userId) return;
      const dataStr = await AsyncStorage.getItem(`dailyData_${userId}_day${currentDay}`);
      if (dataStr) {
        const obj = JSON.parse(dataStr);
        setDiarySteps(obj.stepsVal || 0);
        setDiaryDistance(obj.distanceVal || 0);
        setDiaryWater(obj.waterVal || 0);
        setDiaryMealCalories(obj.mealCal || 0);
      }
    })();
  }, [userId, currentDay]);

  // Affiche la breakdown dans la modal
  const handleCardPress = (title: string) => {
    let breakdown = "";
    let icon = "";
    if (title === "Calories") icon = "🔥";
    if (title === "Steps") icon = "👣";
    if (title === "Distance") icon = "🏃";
    if (title === "Water") icon = "💧";
    plan.slice(0, currentDay).forEach(d => {
      if (title === "Calories") breakdown += `Day ${d.day}: ${d.recommended_calories} kcal\n`;
      if (title === "Steps") breakdown += `Day ${d.day}: ${d.recommended_steps} steps\n`;
      if (title === "Distance") breakdown += `Day ${d.day}: ${d.recommended_distance_km} km\n`;
      if (title === "Water") breakdown += `Day ${d.day}: ${d.recommended_water_l} L\n`;
    });
    if (title === "Calories") breakdown += `\n--- Ticked Meals ---\nMeals ticked: ${diaryMealCalories} kcal\n`;
    if (title === "Steps") breakdown += `\n--- Ticked Steps ---\nUser ticked steps: ${diarySteps} steps\n`;
    if (title === "Distance") breakdown += `\n--- Ticked Distance ---\nUser ticked distance: ${diaryDistance} km\n`;
    if (title === "Water") breakdown += `\n--- Ticked Water ---\nUser ticked water: ${diaryWater} L\n`;
    setModalTitle(`${icon} ${title} Breakdown`);
    setModalContent(breakdown);
    setModalVisible(true);
  };

  const totalCaloriesDisplayed = diaryMealCalories;
  const totalStepsDisplayed = diarySteps;
  const totalDistanceDisplayed = diaryDistance;
  const totalWaterDisplayed = diaryWater;

  return (
    <SafeAreaView style={styles.container}> 
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <NavbarIA />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Mon Dashboard</Text>
          <Text style={styles.dashboardSubtitle}>Suivez votre progression quotidienne</Text>
        </View>
        
        {/* Activity Chart with Improved Container */}
        <View style={styles.chartContainer}>
          <ActivityChart />
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistiques quotidiennes</Text>
          
          <View style={styles.row}>
            <Card
              title="Calories"
              value={totalCaloriesDisplayed}
              unit="kcal"
              icon={<Ionicons name="flame" size={28} color="#ff7043" />}
              onPress={() => handleCardPress("Calories")}
            />
            <Card
              title="Steps"
              value={totalStepsDisplayed}
              unit="steps"
              icon={<Ionicons name="walk" size={28} color="#5c6bc0" />}
              onPress={() => handleCardPress("Steps")}
            />
          </View>

          <View style={styles.row}>
            <Card
              title="Distance"
              value={totalDistanceDisplayed}
              unit="km"
              icon={<Ionicons name="location" size={28} color="#66bb6a" />}
              onPress={() => handleCardPress("Distance")}
            />
            <Card
              title="Water"
              value={totalWaterDisplayed}
              unit="L"
              icon={<Ionicons name="water" size={28} color="#29b6f6" />}
              onPress={() => handleCardPress("Water")}
            />
          </View>

          <View style={styles.row}>
            <Card
              title="Weight"
              value={parseFloat(initialWeight) || 0}
              unit="kg"
              icon={<Ionicons name="scale-outline" size={28} color="#7e57c2" />}
              onPress={() => {
                const breakdown = `Initial Weight: ${initialWeight} kg\nTarget Weight: ${targetWeightPlan} kg\nProgress: ${progressPercentage.toFixed(1)}%`;
                setModalTitle("Weight Breakdown");
                setModalContent(breakdown);
                setModalVisible(true);
              }}
            />
          </View>
        </View>

        {/* Redesigned Progress Section */}
        <View style={styles.progressSectionContainer}>
          <View style={styles.progressSectionHeader}>
            <Feather name="trending-up" size={22} color="rgba(195, 0, 0, 0.7)" />
            <Text style={styles.progressSectionTitle}>Progression sur 30 jours</Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressIndicator,
                    { width: `${Math.min(100, Math.max(0, progressPercentage))}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>
                {Math.min(100, Math.max(0, Math.round(progressPercentage)))}%
              </Text>
            </View>
            
            <Text style={styles.progressText}>Objectif atteint</Text>
            <Text style={styles.progressSubText}>Données cumulées (Jour 1 à 30)</Text>
          </View>
        </View>

        {/* Redesigned Action Buttons */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          
          <View style={styles.actionCardsContainer}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setIsProgressFormVisible(true)}
            >
              <View style={[styles.actionIconContainer, styles.progressIconContainer]}>
                <Feather name="activity" size={24} color="#fff" />
              </View>
              <Text style={styles.actionCardTitle}>Suivre ma progression</Text>
              <Text style={styles.actionCardDescription}>Mettez à jour vos données physiques</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setIsMessageModalVisible(true)}
            >
              <View style={[styles.actionIconContainer, styles.coachIconContainer]}>
                <FontAwesome5 name="robot" size={24} color="#fff" />
              </View>
              <Text style={styles.actionCardTitle}>Coach IA</Text>
              <Text style={styles.actionCardDescription}>Demander l'assistance d'un coach IA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerContainer}>
        <Footer />
      </View>

      {/* Modal générique améliorée */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.enhancedModalContainer}>
            <View style={styles.enhancedModalHeader}>
              <Text style={styles.enhancedModalTitle}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.enhancedModalContent}>
              <Text style={styles.enhancedModalText}>{modalContent}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.enhancedCloseButton} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.enhancedCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal coach - style amélioré */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.enhancedModalContainer}>
            <View style={styles.enhancedModalHeader}>
              <Text style={styles.enhancedModalTitle}>Détails du coach</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{paddingHorizontal: 20, paddingTop: 10}}>
              {selectedCoach && (
                <>
                  <View style={styles.enhancedModalProfile}>
                    <Image
                      source={{ uri: buildAvatarUrl(selectedCoach.photoUrl) }}
                      style={styles.enhancedModalAvatar}
                    />
                    <Text style={styles.enhancedProfileName}>{selectedCoach.username}</Text>
                    <View style={styles.enhancedDateContainer}>
                      <Feather name="calendar" size={16} color="rgba(195, 0, 0, 0.7)" />
                      <Text style={styles.enhancedDateText}>{selectedDate}</Text>
                    </View>
                  </View>

                  <Text style={styles.enhancedPlanTitle}>Plan Nutritionnel</Text>
                  
                  {mealPlan.length > 0 ? (
                    mealPlan.map((meal, i) => (
                      <View key={i} style={styles.enhancedMealSection}>
                        <View style={styles.enhancedMealIconContainer}>
                          <Feather name="coffee" size={20} color="rgba(195, 0, 0, 0.7)" />
                        </View>
                        <View style={styles.enhancedMealTextContainer}>
                          <Text style={styles.enhancedMealLabel}>{meal.name || "Repas"}</Text>
                          <Text style={styles.enhancedMealValue}>{meal.description || "Description non disponible"}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.enhancedNoDataContainer}>
                      <Feather name="alert-circle" size={40} color="rgba(195, 0, 0, 0.3)" />
                      <Text style={styles.enhancedNoPlanText}>Aucun plan trouvé pour le {selectedDate}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.enhancedCloseButton} 
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.enhancedCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal formulaire progression améliorée */}
      <Modal
        visible={isProgressFormVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProgressFormVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.enhancedFormModalContainer}>
            <View style={styles.enhancedModalHeader}>
              <Text style={styles.enhancedModalTitle}>Suivre ma progression</Text>
              <TouchableOpacity onPress={() => setIsProgressFormVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
              style={styles.formScrollContainer}
            >
              <View style={styles.progressFormHeader}>
                <View style={styles.iconCircle}>
                  <Feather name="trending-up" size={36} color="rgba(195, 0, 0, 0.7)" />
                </View>
                <Text style={styles.progressFormSubtitle}>
                  Aidez-nous à évaluer votre progression après un mois
                </Text>
              </View>

              {formSubmitted ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconContainer}>
                    <Feather name="check-circle" size={60} color="#10b981" />
                  </View>
                  <Text style={styles.successText}>Merci pour votre retour!</Text>
                  <Text style={styles.successSubText}>
                    Vos données ont été enregistrées avec succès
                  </Text>
                </View>
              ) : (
                <>
                  {/* Type de coach - design amélioré */}
                  <View style={styles.enhancedFormSection}>
                    <Text style={styles.enhancedSectionTitle}>
                      <Feather name="users" size={18} color="rgba(195, 0, 0, 0.7)" /> Type de coach
                    </Text>
                    <View style={styles.coachTypeContainer}>
                      <TouchableOpacity
                        style={[
                          styles.enhancedCoachTypeOption,
                          selectedCoachType === "ia" && styles.enhancedCoachTypeSelected,
                        ]}
                        onPress={() => setSelectedCoachType("ia")}
                      >
                        <Feather
                          name="cpu"
                          size={24}
                          color={selectedCoachType === "ia" ? "#fff" : "rgba(195, 0, 0, 0.7)"}
                        />
                        <Text
                          style={[
                            styles.enhancedCoachTypeText,
                            selectedCoachType === "ia" && styles.enhancedCoachTypeTextSelected,
                          ]}
                        >
                          Coach IA
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.enhancedCoachTypeOption,
                          selectedCoachType === "reel" && styles.enhancedCoachTypeSelected,
                        ]}
                        onPress={() => setSelectedCoachType("reel")}
                      >
                        <Feather
                          name="user"
                          size={24}
                          color={selectedCoachType === "reel" ? "#fff" : "rgba(195, 0, 0, 0.7)"}
                        />
                        <Text
                          style={[
                            styles.enhancedCoachTypeText,
                            selectedCoachType === "reel" && styles.enhancedCoachTypeTextSelected,
                          ]}
                        >
                          Coach Réel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Données physiques - design amélioré */}
                  <View style={styles.enhancedFormSection}>
                    <Text style={styles.enhancedSectionTitle}>
                      <Feather name="bar-chart-2" size={18} color="rgba(195, 0, 0, 0.7)" /> Données physiques
                    </Text>

                    <View style={styles.enhancedInputGroup}>
                      <Text style={styles.enhancedInputLabel}>Poids initial (kg)</Text>
                      <View style={styles.enhancedInputContainer}>
                        <MaterialCommunityIcons name="weight-kilogram" size={20} color="#9ca3af" style={styles.inputIcon} />
                        <TextInput
                          style={styles.enhancedFormInput}
                          value={initialWeight}  
                          onChangeText={setInitialWeight}
                          placeholder="Ex: 80"
                          keyboardType="numeric"
                          editable
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    </View>

                    <View style={styles.enhancedInputGroup}>
                      <Text style={styles.enhancedInputLabel}>Poids actuel (kg)</Text>
                      <View style={styles.enhancedInputContainer}>
                        <MaterialCommunityIcons name="weight" size={20} color="#9ca3af" style={styles.inputIcon} />
                        <TextInput
                          style={styles.enhancedFormInput}
                          value={currentWeight}
                          onChangeText={setCurrentWeight}
                          placeholder="Ex: 78"
                          keyboardType="numeric"
                          editable
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    </View>

                    <View style={styles.enhancedInputGroup}>
  <Text style={styles.enhancedInputLabel}>Poids cible (kg)</Text>
  <View style={styles.enhancedInputContainer}>
    <Feather name="target" size={20} color="#9ca3af" style={styles.inputIcon} />
    <TextInput
      style={styles.enhancedFormInput}
      value={targetWeightPlan.toString()}
      onChangeText={text => setTargetWeightPlan(text)} // Modification ici (au lieu de setTargetWeight)
      placeholder="Ex: 75"
      keyboardType="numeric"
      editable={true} 
      placeholderTextColor="#9ca3af"
    />
  </View>
</View>

                    <View style={styles.enhancedInputGroup}>
                      <Text style={styles.enhancedInputLabel}>Taille (cm)</Text>
                      <View style={styles.enhancedInputContainer}>
                        <MaterialCommunityIcons name="human-male-height" size={20} color="#9ca3af" style={styles.inputIcon} />
                        <TextInput
                          style={styles.enhancedFormInput}
                          value={height}
                          onChangeText={setHeight}
                          placeholder="Ex: 175"
                          keyboardType="numeric"
                          editable
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    </View>

                    {currentWeight && height ? (
                      <View style={styles.enhancedBmiContainer}>
                        <View style={styles.bmiHeaderContainer}>
                          <Ionicons name="stats-chart" size={22} color="rgba(195, 0, 0, 0.7)" />
                          <Text style={styles.enhancedBmiLabel}>Votre IMC actuel</Text>
                        </View>
                        <Text style={styles.enhancedBmiValue}>
                          {calculateBMI(currentWeight, height)}
                        </Text>
                        <Text style={styles.bmiDescription}>
                          {parseFloat(calculateBMI(currentWeight, height)) < 18.5 ? "Poids insuffisant" : 
                           parseFloat(calculateBMI(currentWeight, height)) < 25 ? "Poids normal" :
                           parseFloat(calculateBMI(currentWeight, height)) < 30 ? "Surpoids" : "Obésité"}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Mesures corporelles - design amélioré */}
                  <View style={styles.enhancedFormSection}>
                    <Text style={styles.enhancedSectionTitle}>
                      <Feather name="maximize-2" size={18} color="rgba(195, 0, 0, 0.7)" /> Mesures corporelles
                    </Text>
                    <View style={styles.dualInputGroup}>
                      <View style={[styles.enhancedInputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.enhancedInputLabel}>Tour de taille (cm)</Text>
                        <View style={styles.enhancedInputContainer}>
                          <Feather name="circle" size={20} color="#9ca3af" style={styles.inputIcon} />
                          <TextInput
                            style={styles.enhancedFormInput}
                            value={waistSize}
                            onChangeText={setWaistSize}
                            placeholder="Ex: 85"
                            keyboardType="numeric"
                            editable
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                      </View>
                      <View style={[styles.enhancedInputGroup, { flex: 1 }]}>
                        <Text style={styles.enhancedInputLabel}>Tour de hanches (cm)</Text>
                        <View style={styles.enhancedInputContainer}>
                          <Feather name="circle" size={20} color="#9ca3af" style={styles.inputIcon} />
                          <TextInput
                            style={styles.enhancedFormInput}
                            value={hipSize}
                            onChangeText={setHipSize}
                            placeholder="Ex: 90"
                            keyboardType="numeric"
                            editable
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Avis expérience - design amélioré */}
                  <View style={styles.enhancedFormSection}>
                    <Text style={styles.enhancedSectionTitle}>
                      <Feather name="message-square" size={18} color="rgba(195, 0, 0, 0.7)" /> Votre avis sur l'expérience
                    </Text>
                    <View style={styles.enhancedInputGroup}>
                      <Text style={styles.enhancedInputLabel}>Satisfaction globale</Text>
                      <View style={styles.enhancedRatingContainer}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <TouchableOpacity
                            key={rating}
                            style={[
                              styles.enhancedRatingOption,
                              satisfactionRating === rating && styles.enhancedRatingSelected,
                            ]}
                            onPress={() => setSatisfactionRating(rating)}
                          >
                            <Text
                              style={[
                                styles.enhancedRatingText,
                                satisfactionRating === rating && styles.enhancedRatingTextSelected,
                              ]}
                            >
                              {rating}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.ratingLabelsContainer}>
                        <Text style={styles.ratingLabelLeft}>Insatisfait</Text>
                        <Text style={styles.ratingLabelRight}>Très satisfait</Text>
                      </View>
                    </View>
                    <View style={styles.enhancedInputGroup}>
                      <Text style={styles.enhancedInputLabel}>Feedback détaillé</Text>
                      <View style={styles.enhancedTextAreaContainer}>
                        <TextInput
                          style={styles.enhancedTextArea}
                          value={feedback}
                          onChangeText={setFeedback}
                          placeholder="Partagez votre expérience avec notre application..."
                          multiline
                          numberOfLines={5}
                          textAlignVertical="top"
                          editable
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.enhancedSubmitButton}
                    onPress={handleSubmitProgressForm}
                  >
                    <Text style={styles.enhancedSubmitButtonText}>Envoyer mes résultats</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Modal pour demande de coach IA - design amélioré */}
      <Modal
        visible={isMessageModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsMessageModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={40}
        >
          <View style={styles.enhancedRequestModalContainer}>
            <View style={styles.enhancedModalHeader}>
              <Text style={styles.enhancedModalTitle}>Demande de coach IA</Text>
              <TouchableOpacity onPress={() => setIsMessageModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.enhancedMessageScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.enhancedMessageContainer}>
                <View style={styles.enhancedMessageIconContainer}>
                  <FontAwesome5 name="robot" size={32} color="#06b6d4" />
                </View>
                <Text style={styles.enhancedMessageTitle}>
                  Demande d'assistance IA
                </Text>
                <Text style={styles.enhancedMessageSubtitle}>
                  Expliquez votre objectif et pourquoi vous souhaitez
                  l'assistance d'un coach IA
                </Text>

                <View style={styles.enhancedMessageInputContainer}>
                  <TextInput
                    style={styles.enhancedMessageInput}
                    placeholder="Rédigez votre message ici..."
                    placeholderTextColor="#9ca3af"
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                  />
                </View>

                <TouchableOpacity
  style={styles.enhancedSendButton}
  onPress={async () => {
    try {
      const userId = await getUserIdFromToken();
      if (!userId) throw new Error("ID utilisateur introuvable");
      await requestIaCoachRequest(userId, messageText);
      
      // D'abord afficher le toast, puis fermer le modal
      Toast.show({
        type: "success",
        text1: "Votre demande de coach IA a bien été envoyée !",
        position: "bottom",
        visibilityTime: 4000,
        autoHide: true,
        bottomOffset: 80, // Augmenté pour être plus visible
        topOffset: 40,
      });
      
      setMessageText("");
      // Attendre un peu avant de fermer le modal pour que le toast soit visible
      setTimeout(() => {
        setIsMessageModalVisible(false);
      }, 500);
      
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Erreur lors de l'envoi de la demande",
        position: "bottom",
        visibilityTime: 4000,
      });
    }
  }}
>
  <FontAwesome5
    name="paper-plane"
    size={18}
    color="#fff"
    style={styles.sendButtonIcon}
  />
  <Text style={styles.enhancedSendButtonText}>
    Envoyer ma demande
  </Text>
</TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Toast />
    </SafeAreaView>
  );
};

export default Dashboard;

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  dashboardHeader: {
    marginVertical: 12,
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  progressSectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  progressSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 10,
  },
  progressContainer: {
    alignItems: "center",
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 12,
  },
  progressIndicator: {
    height: "100%",
    backgroundColor: "rgba(195, 0, 0, 0.7)",
    borderRadius: 10,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: "rgba(195, 0, 0, 0.7)",
    width: 40,
    textAlign: 'right',
  },
  progressText: {
    color: "#374151",
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
  },
  progressSubText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  footerContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#222",
    paddingVertical: 10,
    alignItems: "center",
  },
  
  // Nouveaux styles pour les cartes d'actions
  actionsContainer: {
    marginBottom: 80,
  },
  actionCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressIconContainer: {
    backgroundColor: 'rgba(195, 0, 0, 0.8)',
  },
  coachIconContainer: {
    backgroundColor: '#06b6d4',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  actionCardDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Modal styles améliorés
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  enhancedModalContainer: {
    width: width * 0.88,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: height * 0.7,
  },
  enhancedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    padding: 18,
  },
  enhancedModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: '#111827',
  },
  enhancedModalContent: {
    padding: 20,
  },
  enhancedModalText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },
  enhancedCloseButton: {
    backgroundColor: "rgba(195, 0, 0, 0.7)",
    borderRadius: 12,
    margin: 18,
    padding: 14,
    alignItems: "center",
  },
  enhancedCloseButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },

  // Form modal styles améliorés
  enhancedFormModalContainer: {
    width: width * 0.9,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: height * 0.8,
  },
  formScrollContainer: {
    paddingHorizontal: 20,
  },
  progressFormHeader: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(195, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressFormSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
  },
  enhancedFormSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    paddingVertical: 10,
  },
  enhancedSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  enhancedInputGroup: {
    marginBottom: 16,
  },
  enhancedInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 8,
  },
  enhancedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  enhancedFormInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  enhancedCoachTypeOption: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  enhancedCoachTypeSelected: {
    backgroundColor: "rgba(195, 0, 0, 0.8)",
    borderColor: "rgba(195, 0, 0, 0.8)",
  },
  enhancedCoachTypeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(195, 0, 0, 0.8)",
    marginLeft: 10,
  },
  enhancedCoachTypeTextSelected: {
    color: "#fff",
  },
  enhancedBmiContainer: {
    backgroundColor: "rgba(195, 0, 0, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    alignItems: "center",
  },
  bmiHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  enhancedBmiLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(195, 0, 0, 0.7)",
    marginLeft: 8,
  },
  enhancedBmiValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(195, 0, 0, 0.8)",
    marginVertical: 8,
  },
  bmiDescription: {
    fontSize: 14,
    color: "#4b5563",
  },
  enhancedRatingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  enhancedRatingOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  enhancedRatingSelected: {
    backgroundColor: "rgba(195, 0, 0, 0.8)",
    borderColor: "rgba(195, 0, 0, 0.8)",
  },
  enhancedRatingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
  },
  enhancedRatingTextSelected: {
    color: "#fff",
  },
  ratingLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingLabelLeft: {
    fontSize: 12,
    color: "#6b7280",
  },
  ratingLabelRight: {
    fontSize: 12,
    color: "#6b7280",
  },
  enhancedTextAreaContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  enhancedTextArea: {
    padding: 12,
    height: 120,
    textAlignVertical: "top",
    fontSize: 16,
    color: "#111827",
  },
  enhancedSubmitButton: {
    backgroundColor: "rgba(195, 0, 0, 0.8)",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  enhancedSubmitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#10b981",
    marginVertical: 10,
  },
  successSubText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },

  // Styles pour la modal de message améliorée
  enhancedRequestModalContainer: {
    width: width * 0.88,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: height * 0.7,
  },
  enhancedMessageScrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  enhancedMessageContainer: {
    alignItems: "center",
  },
  enhancedMessageIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  enhancedMessageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    textAlign: "center",
  },
  enhancedMessageSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  enhancedMessageInputContainer: {
    width: '100%',
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 24,
  },
  enhancedMessageInput: {
    padding: 16,
    fontSize: 16,
    height: 150,
    textAlignVertical: "top",
    color: "#111827",
  },
  enhancedSendButton: {
    backgroundColor: "#06b6d4",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonIcon: {
    marginRight: 8,
  },
  enhancedSendButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  
  // Garder les styles nécessaires pour le reste de l'application
  coachTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dualInputGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  
  enhancedModalProfile: {
    alignItems: "center",
    marginBottom: 20,
  },
  enhancedModalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  enhancedProfileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  enhancedDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  enhancedDateText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 6,
  },
  enhancedPlanTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  enhancedMealSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  enhancedMealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  enhancedMealTextContainer: {
    flex: 1,
  },
  enhancedMealLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  enhancedMealValue: {
    fontSize: 14,
    color: "#6b7280",
  },
  enhancedNoDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  enhancedNoPlanText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 10,
    textAlign: "center",
  },
});
