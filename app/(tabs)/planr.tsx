
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Button,
  StatusBar,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  SafeAreaView,
  Alert,
} from "react-native";
import { Client as StompClient } from '@stomp/stompjs';
import * as Notifications from 'expo-notifications';
import Checkbox from 'expo-checkbox';
// @ts-ignore
import { useRouter } from "expo-router";
import {
  getAcceptedCoachesForUser,
  getToken,
  getUserIdFromToken,
  getMealPlanForUserCoachAndDate,
  getCoachById,
} from "../../utils/authService";
import FooterR from "../../components/FooterR";
import { Feather } from "@expo/vector-icons";
import NavbarUser from "@/components/NavbarUser";

// Définition de l'interface pour l'utilisateur
interface User {
  id: number;
  username: string;
  photoUrl?: string;
}

// Fonction pour formater la date locale en "yyyy-MM-dd"
const getLocalFormattedDate = (date: Date) => {
  const year = date.getFullYear();
  let month: number | string = date.getMonth() + 1;
  let day: number | string = date.getDate();

  // Ajouter un zéro devant les mois et jours inférieurs à 10
  month = month < 10 ? `0${month}` : month;
  day = day < 10 ? `0${day}` : day;

  return `${year}-${month}-${day}`;
};

export default function Planr() {
  const [coaches, setCoaches] = useState<User[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<User | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [mealPlan, setMealPlan] = useState<any[]>([]);
  const [loggedInUserId, setLoggedInUserId] = useState<number>(0);
  // Initialisation de selectedDate avec la date locale actuelle
  const [selectedDate, setSelectedDate] = useState(getLocalFormattedDate(new Date()));
  const router = useRouter();
  // État par défaut pour les champs du formulaire (valeurs vides pour permettre la saisie)
  const [selectedCoachType, setSelectedCoachType] = useState('');
  const [waistSize, setWaistSize] = useState('');
  const [hipSize, setHipSize] = useState('');
  const [satisfactionRating, setSatisfactionRating] = useState(0);
  // Nouvel état pour la barre de recherche
  const [searchQuery, setSearchQuery] = useState("");
  
  // États pour le formulaire de progression - avec valeurs initiales vides
  const [isProgressFormVisible, setIsProgressFormVisible] = useState(false);
  const [initialWeight, setInitialWeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [height, setHeight] = useState("");
  const [feedback, setFeedback] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [lastPlanId, setLastPlanId] = useState<number | null>(null);
  // Récupération de l'ID utilisateur connecté et chargement des coachs
  // en tout début de Planr()
  
useEffect(() => {
  // 1) Gestion en foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
    }),
  });

  // 2) Créer le canal Android + demander la permission
  (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:             'Plans',
        importance:       Notifications.AndroidImportance.MAX,
        vibrationPattern: [0,250,250,250],
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Impossible d’envoyer des notifications');
    }
  })();
}, []);


  useEffect(() => {
    (async () => {
      try {
        const uid = await getUserIdFromToken();
        console.log("ID utilisateur connecté :", uid);
        if (uid !== null) {
          setLoggedInUserId(uid);
        } else {
          console.error("User ID is null");
        }
        if (uid !== null) {
          const coachList = await getAcceptedCoachesForUser(uid);
          console.log("Liste des coachs :", coachList);
          setCoaches(coachList);
        } else {
          console.error("User ID is null");
        }
      } catch (error) {
        console.error("Erreur lors du chargement des coachs:", error);
      }
    })();
  }, []);

  // Vérification périodique pour mettre à jour la date en fonction de la date locale
  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentLocalDate = getLocalFormattedDate(new Date());
      // Si la date a changé, mettre à jour le state et rafraîchir le plan si un coach est sélectionné
      setSelectedDate((prevDate) => {
        if (prevDate !== currentLocalDate) {
          if (selectedCoach) {
            fetchMealPlanForDate(currentLocalDate, selectedCoach.id);
          }
          return currentLocalDate;
        }
        return prevDate;
      });
    }, 60000); // Vérifie toutes les minutes

    return () => clearInterval(intervalId);
  }, [selectedCoach]);
  const handleToggle = async (
    mealId: number,
    field: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'sport' | 'water'
  ) => {
    const key = `${mealId}-${field}`;
    const newValue = !checkedItems[key];
    // Met à jour localement
    setCheckedItems(prev => ({ ...prev, [key]: newValue }));

    // Envoie au backend / coach
    try {
      const token = await getToken();
      await fetch(`http://192.168.1.139:8080/api/meals/user/${mealId}/tick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ field, status: newValue }),
      });
    } catch (err) {
      console.error('Erreur enregistrement tick', err);
    }
  };
  const loadTicks = async (date: string, userId: number) => {
    try {
      const token = await getToken();
      const res = await fetch(
        `http://192.168.1.139:8080/api/meals/user/${userId}/ticks?date=${date}`,
        {
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          }
        }
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const mealsWithTicks: Array<any> = await res.json();
  
      // Reconstruit checkedItems à partir de meal.breakfastTick, etc.
      const newChecked: Record<string, boolean> = {};
      mealsWithTicks.forEach(meal => {
        ['breakfast','lunch','dinner','snacks','sport','water'].forEach(field => {
          newChecked[`${meal.id}-${field}`] = !!meal[`${field}Tick`];
        });
      });
      setCheckedItems(newChecked);
  
      return mealsWithTicks;
    } catch (err) {
      console.error("Erreur loadTicks:", err);
      return [];
    }
  };
  

  // Fonction pour construire l'URL de l'image du coach
  const buildAvatarUrl = (rawUrl?: string) => {
    const baseUrl = "http://192.168.1.139:8080/";
    if (rawUrl && rawUrl.trim().length > 0) {
      return rawUrl.startsWith("http")
        ? rawUrl.replace("localhost:8081", "192.168.1.139:8080")
        : baseUrl + rawUrl;
    }
    return require("../../assets/images/profile.jpg");
  };

  // Fonction pour récupérer le plan pour une date donnée
 // Charge le plan nutritionnel **et** les ticks associés
const fetchMealPlanForDate = async (date: string, coachId: number) => {
  console.log("Date utilisée :", date);
  try {
    // 1. Récupère le plan
    const planData = await getMealPlanForUserCoachAndDate(
      loggedInUserId,
      coachId,
      date
    );
    console.log(
      `Plan récupéré pour userId=${loggedInUserId}, coachId=${coachId}, date=${date} :`,
      planData
    );
    setMealPlan(planData ? [planData] : []);
    if (planData && planData.id !== lastPlanId) {
      setLastPlanId(planData.id);
    /*   await Notifications.scheduleNotificationAsync({
        content: {
          title: `🏋️ Nouveau plan de ${selectedCoach?.username}`,
          android: {
            channelId: 'default',
            priority:  'high',
            sound:     'default',
            vibrate:   [0,250,250,250],
          },
          ios: {
            sound:             true,
            interruptionLevel: 'active',
          },
        },
        trigger: null,
      }); */
    }
    // 2. Charge les ticks pour remplir checkedItems
    await loadTicks(
      date,
      loggedInUserId        // coachId
    );
  } catch (error) {
    console.error("Erreur lors de la récupération du plan:", error);
    setMealPlan([]);
    // on vide aussi les ticks en cas d’erreur
    setCheckedItems({});
  }
};



  // Filtrer les coachs en fonction de la barre de recherche (sur le username)
  const filteredCoaches = coaches.filter((coach) =>
    coach.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Affichage d'un coach dans la FlatList
  const renderContactItem = ({ item }: { item: User }) => {
    const avatarUrl =
      item.photoUrl && item.photoUrl.trim().length > 0
        ? item.photoUrl.startsWith("http")
          ? item.photoUrl.replace("localhost:8081", "192.168.1.139:8080")
          : `http://192.168.1.139:8080/${item.photoUrl}`
        : null;
    const avatarSource = avatarUrl
      ? { uri: avatarUrl }
      : require("../../assets/images/profile.jpg");

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={async () => {
          setSelectedCoach(item);
          // Utilisation de la date sélectionnée (locale) pour récupérer le plan
          await fetchMealPlanForDate(selectedDate, item.id);
          setIsModalVisible(true);
        }}
      >
        <View style={styles.contactItemInner}>
          <Image source={avatarSource} style={styles.avatar} />
          <View style={styles.textContainer}>
            <Text style={styles.name}>{item.username}</Text>
            <Text style={styles.subtitle}>Coach nutrition</Text>
          </View>
          <Feather name="chevron-right" size={22} color="rgba(195, 0, 0, 0.6)" />
        </View>
      </TouchableOpacity>
    );
  };

  // Fonction de rendu pour afficher chaque segment du plan dans une "card"
  const renderMealItem = (meal: any, index: number) => {
    return (
      <View key={index} style={styles.mealCard}>
        <Text style={styles.mealDate}>{meal.date}</Text>
        
        <View style={styles.mealSection}>
          <View style={styles.mealIconContainer}>
            <Feather name="coffee" size={18} color="rgba(195, 0, 0, 0.6)" />
          </View>
          <View style={styles.mealTextContainer}>
            <Text style={styles.mealLabel}>Breakfast</Text>
            <Text style={styles.mealValue}>{meal.breakfast || "-"}</Text>
          </View>
          <Checkbox
            value={!!checkedItems[`${meal.id}-breakfast`]}
            onValueChange={() => handleToggle(meal.id, 'breakfast')}
          />
        </View>
        
        <View style={styles.mealSection}>
          <View style={styles.mealIconContainer}>
            <Feather name="sun" size={18} color="rgba(195, 0, 0, 0.6)" />
          </View>
          <View style={styles.mealTextContainer}>
            <Text style={styles.mealLabel}>Lunch</Text>
            <Text style={styles.mealValue}>{meal.lunch || "-"}</Text>
          </View>
          <Checkbox
            value={!!checkedItems[`${meal.id}-lunch`]}
            onValueChange={() => handleToggle(meal.id, 'lunch')}
          />
        </View>
        
        <View style={styles.mealSection}>
          <View style={styles.mealIconContainer}>
            <Feather name="moon" size={18} color="rgba(195, 0, 0, 0.6)" />
          </View>
          <View style={styles.mealTextContainer}>
            <Text style={styles.mealLabel}>Dinner</Text>
            <Text style={styles.mealValue}>{meal.dinner || "-"}</Text>
          </View>
          <Checkbox
            value={!!checkedItems[`${meal.id}-dinner`]}
            onValueChange={() => handleToggle(meal.id, 'dinner')}
          />
        </View>
        
        <View style={styles.mealSection}>
          <View style={styles.mealIconContainer}>
            <Feather name="package" size={18} color="rgba(195, 0, 0, 0.6)" />
          </View>
          <View style={styles.mealTextContainer}>
            <Text style={styles.mealLabel}>Snacks</Text>
            <Text style={styles.mealValue}>{meal.snacks || "-"}</Text>
          </View>
          <Checkbox
            value={!!checkedItems[`${meal.id}-snacks`]}
            onValueChange={() => handleToggle(meal.id, 'snacks')}
          />
        </View>
        
        <View style={styles.mealSection}>
          <View style={styles.mealIconContainer}>
            <Feather name="activity" size={18} color="rgba(195, 0, 0, 0.6)" />
          </View>
          <View style={styles.mealTextContainer}>
            <Text style={styles.mealLabel}>Sport</Text>
            <Text style={styles.mealValue}>{meal.sport || "-"}</Text>
          </View>
          <Checkbox
            value={!!checkedItems[`${meal.id}-sport`]}
            onValueChange={() => handleToggle(meal.id, 'sport')}
          />
        </View>
        
        <View style={styles.mealSection}>
          <View style={styles.mealIconContainer}>
            <Feather name="droplet" size={18} color="rgba(195, 0, 0, 0.6)" />
          </View>
          <View style={styles.mealTextContainer}>
            <Text style={styles.mealLabel}>Water</Text>
            <Text style={styles.mealValue}>{meal.water || "-"}</Text>
          </View>
          <Checkbox
            value={!!checkedItems[`${meal.id}-water`]}
            onValueChange={() => handleToggle(meal.id, 'water')}
          />
        </View>
      </View>
    );
  };
  

  // Exemple : fonction pour changer la date (celle-ci pourrait être appelée par un composant DatePicker)
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    // Si un coach est déjà sélectionné, on met à jour le plan pour la nouvelle date
    if (selectedCoach) {
      fetchMealPlanForDate(newDate, selectedCoach.id);
    }
  };

  // Fonction pour calculer l'IMC
  const calculateBMI = (weight: string, height: string) => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height) / 100; // Conversion en mètres
    
    if (weightNum && heightNum) {
      return (weightNum / (heightNum * heightNum)).toFixed(2);
    }
    return "N/A";
  };

  // Fonction pour gérer la soumission du formulaire
  const handleSubmitProgressForm = async () => {
    // 1. Calculer l'IMC et le % de progression
    const init = parseFloat(initialWeight);
    const curr = parseFloat(currentWeight);
    const target = parseFloat(targetWeight);
    const heightNum = parseFloat(height);
  console.log(init)
    const bmi =
      heightNum > 0
        ? (curr / Math.pow(heightNum / 100, 2)).toFixed(2)
        : "N/A";
  
    const progressPercent =
      init !== target
        ? (((init - curr) / (init - target)) * 100).toFixed(1)
        : "100";
        const userId = await getUserIdFromToken();
    // 2. Préparer le payload
    const formData = {
      userId,
      coachType: selectedCoachType, // "ia" ou "reel"
      initialWeight: init,
      currentWeight: curr,
      targetWeight: target,
      height: heightNum,
      waistSize: waistSize ? parseFloat(waistSize) : null,
      hipSize: hipSize ? parseFloat(hipSize) : null,
      bmi: parseFloat(bmi) || null,
      satisfactionRating,
      feedback,
      date: getLocalFormattedDate(new Date()),
    };
  
    try {
      // 3. Afficher tout de suite à l'utilisateur
      alert(
        `Votre IMC : ${bmi}\n` +
        `Progression : ${progressPercent}%`
      );
  
      // 4. Envoyer au back
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
      
      // 5. Reset + confirmation UI
      setFormSubmitted(true);
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
      } else {
        alert("Une erreur inconnue est survenue.");
      }
    }
  };
  
  return (
    //<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar backgroundColor="rgba(195, 0, 0, 0.6)" barStyle="light-content" />
        
        {/* Header */}
        <NavbarUser />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mes Coachs</Text>
        </View>
        
        {/* Bouton pour accéder au formulaire de progression */}
        <TouchableOpacity 
          style={styles.progressButton}
          onPress={() => setIsProgressFormVisible(true)}
        >
          <Feather name="activity" size={20} color="#fff" style={{marginRight: 8}} />
          <Text style={styles.progressButtonText}>Suivre ma progression</Text>
        </TouchableOpacity>
        
        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="rgba(195, 0, 0, 0.6)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un coach..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
        </View>
        
        {/* Liste des coachs */}
        <FlatList
          data={filteredCoaches}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
        
        {/* Modal du plan alimentaire */}
        <Modal
      visible={isModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButtonTop}
            onPress={() => setIsModalVisible(false)}
          >
            <Feather name="x" size={24} color="rgba(195, 0, 0, 0.6)" />
          </TouchableOpacity>
          
          {selectedCoach && (
            <>
              <View style={styles.modalHeader}>
                <Image
                  source={{ uri: buildAvatarUrl(selectedCoach.photoUrl) }}
                  style={styles.modalAvatar}
                />
                <Text style={styles.modalName}>{selectedCoach.username}</Text>
                <View style={styles.dateContainer}>
                  <Feather name="calendar" size={16} color="rgba(195, 0, 0, 0.6)" />
                  <Text style={styles.dateText}>{selectedDate}</Text>
                </View>
              </View>
              
              <Text style={styles.modalSubTitle}>Plan Nutritionnel</Text>
              
              <ScrollView 
                style={styles.mealPlanScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.mealPlanContentContainer}
              >
                {mealPlan && mealPlan.length > 0 ? (
                  mealPlan.map((meal, index) => renderMealItem(meal, index))
                ) : (
                  <View style={styles.noDataContainer}>
                    <Feather name="alert-circle" size={40} color="rgba(195, 0, 0, 0.3)" />
                    <Text style={styles.noPlanText}>
                      Aucun plan trouvé pour le {selectedDate}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
        
        {/* Modal du formulaire de progression - CORRIGÉ POUR PERMETTRE LA SAISIE */}
        <Modal
          visible={isProgressFormVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsProgressFormVisible(false)}
        >
          {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}> */}
            <View style={styles.modalOverlay}>
              <View style={styles.progressFormContent}>
                <TouchableOpacity
                  style={styles.closeButtonTop}
                  onPress={() => setIsProgressFormVisible(false)}
                >
                  <Feather name="x" size={24} color="rgba(195, 0, 0, 0.6)" />
                </TouchableOpacity>
                
                <ScrollView showsVerticalScrollIndicator={false}
   keyboardShouldPersistTaps="handled">
                  <View style={styles.progressFormHeader}>
                    <Feather name="trending-up" size={40} color="rgba(195, 0, 0, 0.6)" />
                    <Text style={styles.progressFormTitle}>Suivre ma progression</Text>
                    <Text style={styles.progressFormSubtitle}>
                      Aidez-nous à évaluer votre progression après un mois
                    </Text>
                  </View>
                  
                  {formSubmitted ? (
                    <View style={styles.successContainer}>
                      <Feather name="check-circle" size={60} color="rgba(0, 195, 0, 0.6)" />
                      <Text style={styles.successText}>Merci pour votre retour!</Text>
                      <Text style={styles.successSubText}>
                        Vos données ont été enregistrées avec succès
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Type de coach */}
                      <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>
                          <Feather name="users" size={18} color="rgba(195, 0, 0, 0.6)" /> 
                          Type de coach
                        </Text>
                        
                        <View style={styles.coachTypeContainer}>
                          <TouchableOpacity 
                            style={[
                              styles.coachTypeOption, 
                              selectedCoachType === 'ia' && styles.coachTypeSelected
                            ]}
                            onPress={() => setSelectedCoachType('ia')}
                          >
                            <Feather 
                              name="cpu" 
                              size={24} 
                              color={selectedCoachType === 'ia' ? "#fff" : "rgba(195, 0, 0, 0.6)"} 
                            />
                            <Text style={[
                              styles.coachTypeText,
                              selectedCoachType === 'ia' && styles.coachTypeTextSelected
                            ]}>
                              Coach IA
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[
                              styles.coachTypeOption, 
                              selectedCoachType === 'reel' && styles.coachTypeSelected
                            ]}
                            onPress={() => setSelectedCoachType('reel')}
                          >
                            <Feather 
                              name="user" 
                              size={24} 
                              color={selectedCoachType === 'reel' ? "#fff" : "rgba(195, 0, 0, 0.6)"} 
                            />
                            <Text style={[
                              styles.coachTypeText,
                              selectedCoachType === 'reel' && styles.coachTypeTextSelected
                            ]}>
                              Coach Réel
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Formulaire */}
                      <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>
                          <Feather name="bar-chart-2" size={18} color="rgba(195, 0, 0, 0.6)" /> 
                          Données physiques
                        </Text>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Poids initial (kg)</Text>
                          <TextInput
                            style={styles.formInput}
                            value={initialWeight}
                            onChangeText={(text) => setInitialWeight(text)}
                            placeholder="Ex: 80"
                            keyboardType="numeric"
                            editable={true}
                            underlineColorAndroid="transparent"
                            placeholderTextColor="#999"
                          />
                        </View>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Poids actuel (kg)</Text>
                          <TextInput
                            style={styles.formInput}
                            value={currentWeight}
                            onChangeText={(text) => setCurrentWeight(text)}
                            placeholder="Ex: 78"
                            keyboardType="numeric"
                            editable={true}
                              underlineColorAndroid="transparent"
                placeholderTextColor="#999"
                          />
                        </View>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Poids cible (kg)</Text>
                          <TextInput
                            style={styles.formInput}
                            value={targetWeight}
                            onChangeText={(text) => setTargetWeight(text)}
                            placeholder="Ex: 75"
                            keyboardType="numeric"
                            editable={true}
                              underlineColorAndroid="transparent"
                placeholderTextColor="#999"
                          />
                        </View>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Taille (cm)</Text>
                          <TextInput
                            style={styles.formInput}
                            value={height}
                            onChangeText={(text) => setHeight(text)}
                            placeholder="Ex: 175"
                            keyboardType="numeric"
                            editable={true}
                              underlineColorAndroid="transparent"
                placeholderTextColor="#999"
                          />
                        </View>
                        
                        {currentWeight && height ? (
                          <View style={styles.bmiContainer}>
                            <Text style={styles.bmiLabel}>Votre IMC actuel</Text>
                            <Text style={styles.bmiValue}>
                              {calculateBMI(currentWeight, height)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      
                      {/* Ajout de dimensions personnalisables - CORRIGÉ */}
                      <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>
                          <Feather name="maximize-2" size={18} color="rgba(195, 0, 0, 0.6)" /> 
                          Mesures corporelles
                        </Text>
                        
                        <View style={styles.dualInputGroup}>
                          <View style={styles.halfInputGroup}>
                            <Text style={styles.inputLabel}>Tour de taille (cm)</Text>
                            <TextInput
                              style={styles.formInput}
                              value={waistSize}
                              onChangeText={(text) => setWaistSize(text)}
                              placeholder="Ex: 85"
                              keyboardType="numeric"
                              editable={true}
                                underlineColorAndroid="transparent"
                placeholderTextColor="#999"
                            />
                          </View>
                          
                          <View style={styles.halfInputGroup}>
                            <Text style={styles.inputLabel}>Tour de hanches (cm)</Text>
                            <TextInput
                              style={styles.formInput}
                              value={hipSize}
                              onChangeText={(text) => setHipSize(text)}
                              placeholder="Ex: 90"
                              keyboardType="numeric"
                              editable={true}
                                underlineColorAndroid="transparent"
                placeholderTextColor="#999"
                            />
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>
                          <Feather name="message-square" size={18} color="rgba(195, 0, 0, 0.6)" /> 
                          Votre avis sur l'expérience
                        </Text>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Satisfaction globale</Text>
                          <View style={styles.ratingContainer}>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <TouchableOpacity
                                key={rating}
                                style={[
                                  styles.ratingOption,
                                  satisfactionRating === rating && styles.ratingSelected
                                ]}
                                onPress={() => setSatisfactionRating(rating)}
                              >
                                <Text style={[
                                  styles.ratingText,
                                  satisfactionRating === rating && styles.ratingTextSelected
                                ]}>
                                  {rating}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Feedback détaillé</Text>
                          <TextInput
                            style={[styles.formInput, styles.textArea]}
                            value={feedback}
                            onChangeText={(text) => setFeedback(text)}
                            placeholder="Partagez votre expérience avec notre application..."
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            editable={true}
                              underlineColorAndroid="transparent"
                placeholderTextColor="#999"
                          />
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.submitButton}
                        onPress={handleSubmitProgressForm}
                      >
                        <Text style={styles.submitButtonText}>Envoyer mes résultats</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
              </View>
            </View>
          {/* </TouchableWithoutFeedback> */}
        </Modal>
        
        <FooterR />
      </View>
   // </TouchableWithoutFeedback>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    //backgroundColor: "rgba(195, 0, 0, 0.6)",
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(195, 0, 0, 0.6)",
    textAlign: "center",
  },
  progressButton: {
    flexDirection: "row",
    backgroundColor: "rgba(195, 0, 0, 0.8)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  progressButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "rgba(195, 0, 0, 0.4)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mealPlanScrollView: {
    flexGrow: 0,
    maxHeight: '75%',
  },
  mealPlanContentContainer: {
    paddingBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  searchIcon: {
    marginRight: 5,
  },
  listContainer: {
    padding: 15,
  },
  contactItem: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "rgba(195, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(195, 0, 0, 0.6)",
  },
  contactItemInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "rgba(195, 0, 0, 0.6)",
  },
  textContainer: {
    marginLeft: 15,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    paddingTop: 25,
    maxHeight: "80%",
    paddingBottom: 6,
  },
  closeButtonTop: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "rgba(195, 0, 0, 0.6)",
    marginBottom: 12,
  },
  modalName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
    color: "#333",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dateText: {
    fontSize: 14,
    marginLeft: 5,
    color: "#555",
  },
  modalSubTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 7,
    color: "rgba(195, 0, 0, 0.6)",
    textAlign: "center",
  },
  mealCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "rgba(195, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  mealDate: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  mealSection: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    alignItems: "center",
  },
  mealIconContainer: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  mealLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(195, 0, 0, 0.6)",
    marginBottom: 2,
  },
  mealValue: {
    fontSize: 14,
    color: "#555",
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  noPlanText: {
    fontSize: 16,
    color: "#777",
    marginTop: 10,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "rgba(195, 0, 0, 0.6)",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 15,
    alignSelf: "center",
    minWidth: 150,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Styles pour le formulaire de progression
  progressFormContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    paddingTop: 25,
    maxHeight: "85%",
  },
  progressFormHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  progressFormTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 5,
    color: "rgba(195, 0, 0, 0.8)",
  },
  progressFormSubtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(195, 0, 0, 0.8)",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    paddingBottom: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  bmiContainer: {
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    alignItems: "center",
  },
  bmiLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(195, 0, 0, 0.7)",
    marginBottom: 5,
  },
  bmiValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "rgba(195, 0, 0, 0.8)",
  },
  submitButton: {
    backgroundColor: "rgba(195, 0, 0, 0.8)",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  successText: {
    fontSize: 22,
    fontWeight: "700",
    color: "rgba(0, 195, 0, 0.8)",
    marginTop: 15,
    marginBottom: 5,
  },
  successSubText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  coachTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  coachTypeOption: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
  },
  coachTypeSelected: {
    backgroundColor: 'rgba(195, 0, 0, 0.8)',
    borderColor: 'rgba(195, 0, 0, 0.8)',
  },
  coachTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(195, 0, 0, 0.8)',
    marginLeft: 10,
  },
  coachTypeTextSelected: {
    color: '#fff',
  },
  dualInputGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInputGroup: {
    flex: 1,
    marginRight: 5, width: '48%',
  },
 
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 5,
  },
  ratingOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ratingSelected: {
    backgroundColor: 'rgba(195, 0, 0, 0.8)',
    borderColor: 'rgba(195, 0, 0, 0.8)',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  ratingTextSelected: {
    color: '#fff',
  },
});