import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  Image,
  Platform,
  FlatList,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Picker } from "@react-native-picker/picker";

// Type pour représenter l'objet date renvoyé par react-native-calendars
type DateObject = {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
};

// Import des fonctions d'authService
import { 
  getToken, 
  getUserByUsername, 
  getUserIdFromToken, 
  saveCalendarPlan, 
  getUserByIdForCoach,
  deleteRemark
} from "../../utils/authService";
import { getMealPlan } from "../../utils/authService";

// Import des composants et des icônes
import FooterC from "../../components/FooterC";
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from "@expo/vector-icons";
// @ts-ignore
import { useNavigation } from "expo-router";

// Configuration de la localisation pour le calendrier
LocaleConfig.locales['fr'] = {
  monthNames: [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre'
  ],
  monthNamesShort: ['Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

// API URL
const API_URL = "http://192.168.1.139:8080";

// Fonction pour récupérer les remarques pour une date
async function getCalendarPlanRemarks(date: string, coachId: number): Promise<any[]> {
  try {
    const token = await getToken();
    const url = `${API_URL}/api/calendar/plan/remarks?date=${encodeURIComponent(date)}&coachId=${coachId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
         "Content-Type": "application/json",
         "Authorization": `Bearer ${token}`
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur GET (remarks), status = ${response.status}. Message: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Erreur dans getCalendarPlanRemarks :", error);
    return []; // Retourner un tableau vide en cas d'erreur
  }
}

// Fonction pour vérifier si une date a des plans nutritionnels
async function checkIfDateHasPlans(date: string, userId: number, coachId: number): Promise<boolean> {
  try {
    if (!userId || !coachId) return false;
    
    const plan = await getMealPlan(date, userId, coachId);
    return !!(plan && plan.id);
  } catch (error) {
    console.log(`Pas de plan pour ${date}`);
    return false;
  }
}

export default function CalendarScreen() {
  // États principaux
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [markedDates, setMarkedDates] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState("");
  const [currentMonthObj, setCurrentMonthObj] = useState<{month: number, year: number} | null>(null);
  const calendarRef = useRef(null);
  
  // États pour sélectionner un utilisateur
  const [newUsername, setNewUsername] = useState("");
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [coachId, setCoachId] = useState<number | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  
  // États pour les modales
  const [addPlanModalVisible, setAddPlanModalVisible] = useState(false);
  const [addPlanUsername, setAddPlanUsername] = useState("");
  const [addPlanDate, setAddPlanDate] = useState("");
  const [addPlanComment, setAddPlanComment] = useState("");
  const [remarks, setRemarks] = useState<any[]>([]);
  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  
  const navigation = useNavigation();

  // État pour contrôler la date actuelle du calendrier
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

  // Récupération du coachId dès le montage
  useEffect(() => {
    const fetchCoachId = async () => {
      try {
        const id = await getUserIdFromToken();
        setCoachId(id);
        console.log("Coach ID récupéré:", id);
      } catch (error) {
        console.error("Erreur lors de la récupération du coachId :", error);
      }
    };
    fetchCoachId();
    
    // Initialiser le mois actuel
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const monthName = today.toLocaleString('default', { month: 'long' });
    setCurrentMonth(`${monthName} ${year}`);
    setCurrentMonthObj({ month, year });
  }, []);

  // Récupération des invitations
  useEffect(() => {
    if (coachId !== null) {
      const fetchInvitations = async () => {
        try {
          const token = await getToken();
          const url = `${API_URL}/api/friends/coach-invitations/${coachId}`;
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });
          if (!response.ok) {
            throw new Error(`Erreur lors de la récupération des invitations`);
          }
          const data = await response.json();
          setInvitations(data);
        } catch (error) {
          console.error("Erreur dans fetchInvitations :", error);
        }
      };
      fetchInvitations();
    }
  }, [coachId]);

  // Charger les données du calendrier quand le coach ID est disponible ou quand le mois change
  useEffect(() => {
    if (coachId !== null && currentMonthObj) {
      console.log(`Mois actuel: ${currentMonthObj.month}/${currentMonthObj.year}`);
      loadMonthMarkers(currentMonthObj.month, currentMonthObj.year);
    }
  }, [coachId, currentMonthObj]);

  // Marquage de la date
  useEffect(() => {
    if (targetUserId !== null && selectedDate) {
      setMarkedDates(prev => ({
        ...prev,
        [selectedDate]: { 
          marked: true, 
          selected: true,
          selectedColor: 'rgba(195, 0, 0, 0.7)',
          dotColor: prev[selectedDate]?.dotColor || '#4A6FFF'
        }
      }));
    }
  }, [targetUserId, selectedDate]);

  // Fonction pour charger les marqueurs du mois sans rafraîchissement visible
  const loadMonthMarkers = async (month: number, year: number) => {
    if (coachId === null) return;
    
    try {
      // Ne pas afficher l'indicateur de chargement pendant la navigation entre les mois
      const isInitialLoad = !Object.keys(markedDates).length;
      if (isInitialLoad) {
        setLoading(true);
      }
      
      console.log(`Chargement des marqueurs pour ${month}/${year}`);
      
      // Préparer les dates du mois
      const datesInMonth: string[] = [];
      let currentDate = new Date(year, month - 1, 1);
      const nextMonth = new Date(year, month, 0);
      const lastDay = nextMonth.getDate();
      
      // Générer toutes les dates du mois
      for (let day = 1; day <= lastDay; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dateStr = dateObj.toISOString().split('T')[0];
        datesInMonth.push(dateStr);
      }
      
      // Commencer avec un objet markedDates vide pour ce mois
      const newMarkedDates: {[key: string]: any} = {};
      
      // Pour chaque date du mois, vérifier les remarques et les plans
      for (const dateStr of datesInMonth) {
        try {
          // Vérifier s'il y a des remarques pour cette date
          const remarksData = await getCalendarPlanRemarks(dateStr, coachId);
          const hasRemarks = remarksData && remarksData.length > 0;
          
          // Si la date a des remarques, la marquer
          if (hasRemarks) {
            newMarkedDates[dateStr] = {
              ...(newMarkedDates[dateStr] || {}),
              marked: true,
              dotColor: '#FF6B6B' // Rouge pour les remarques
            };
          }
          
          // Si on a un utilisateur cible, vérifier s'il a un plan pour cette date
          if (targetUserId !== null) {
            const hasPlan = await checkIfDateHasPlans(dateStr, targetUserId, coachId);
            
            if (hasPlan && !hasRemarks) {
              // Si la date a un plan mais pas de remarques, la marquer en vert
              newMarkedDates[dateStr] = {
                ...(newMarkedDates[dateStr] || {}),
                marked: true,
                dotColor: '#4CAF50' // Vert pour les plans
              };
            }
          }
        } catch (error) {
          console.error(`Erreur lors de la vérification des marqueurs pour ${dateStr}:`, error);
        }
      }
      
      // Si une date est sélectionnée, s'assurer qu'elle reste sélectionnée
      if (selectedDate) {
        newMarkedDates[selectedDate] = {
          ...(newMarkedDates[selectedDate] || {}),
          marked: true,
          selected: true,
          selectedColor: 'rgba(195, 0, 0, 0.7)',
        };
      }
      
      setMarkedDates(newMarkedDates);
    } catch (error) {
      console.error("Erreur dans loadMonthMarkers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation entre les mois - approche directe
  const goToPreviousMonth = () => {
    if (!currentMonthObj) return;
    
    // Calculer le nouveau mois et année
    let newMonth, newYear;
    
    if (currentMonthObj.month === 1) {
      newMonth = 12;
      newYear = currentMonthObj.year - 1;
    } else {
      newMonth = currentMonthObj.month - 1;
      newYear = currentMonthObj.year;
    }
    
    // Mettre à jour le titre du mois affiché
    const date = new Date(newYear, newMonth - 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    setCurrentMonth(`${monthName} ${newYear}`);
    
    // Créer une nouvelle date pour le calendrier - c'est la clé du changement immédiat
    const newDate = `${newYear}-${String(newMonth).padStart(2, '0')}-01`;
    setCurrentDate(newDate);
    
    // Mettre à jour l'objet du mois courant pour les marqueurs
    setCurrentMonthObj({ month: newMonth, year: newYear });
  };
  
  const goToNextMonth = () => {
    if (!currentMonthObj) return;
    
    // Calculer le nouveau mois et année
    let newMonth, newYear;
    
    if (currentMonthObj.month === 12) {
      newMonth = 1;
      newYear = currentMonthObj.year + 1;
    } else {
      newMonth = currentMonthObj.month + 1;
      newYear = currentMonthObj.year;
    }
    
    // Mettre à jour le titre du mois affiché
    const date = new Date(newYear, newMonth - 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    setCurrentMonth(`${monthName} ${newYear}`);
    
    // Créer une nouvelle date pour le calendrier - c'est la clé du changement immédiat
    const newDate = `${newYear}-${String(newMonth).padStart(2, '0')}-01`;
    setCurrentDate(newDate);
    
    // Mettre à jour l'objet du mois courant pour les marqueurs
    setCurrentMonthObj({ month: newMonth, year: newYear });
  };

  // Fonction pour gérer le changement de mois via le composant Calendar
  const onMonthChange = (monthData: any) => {
    console.log("Mois changé via le composant Calendar:", monthData);
    const { month, year } = monthData;
    
    const date = new Date(year, month - 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    
    setCurrentMonth(`${monthName} ${year}`);
    setCurrentMonthObj({ month, year });
  };

  // Lorsqu'on clique sur une date
  const handleDayPress = async (day: DateObject) => {
    setSelectedDate(day.dateString);
    
    // Marquer la date comme sélectionnée
    setMarkedDates(prev => {
      const newMarkedDates = { ...prev };
      
      // Réinitialiser la sélection pour toutes les dates
      Object.keys(newMarkedDates).forEach(date => {
        if (newMarkedDates[date] && newMarkedDates[date].selected) {
          newMarkedDates[date] = {
            ...newMarkedDates[date],
            selected: false
          };
        }
      });
      
      // Marquer la nouvelle date comme sélectionnée
      newMarkedDates[day.dateString] = {
        ...(newMarkedDates[day.dateString] || {}),
        marked: true,
        selected: true,
        selectedColor: 'rgba(195, 0, 0, 0.7)',
        dotColor: newMarkedDates[day.dateString]?.dotColor || '#4A6FFF'
      };
      
      return newMarkedDates;
    });
    
    if (targetUserId === null) {
      setMealPlan(null);
      setModalVisible(true);
      return;
    }
    
    if (coachId === null) {
      Alert.alert("Erreur", "CoachId non disponible.");
      return;
    }
    
    try {
      setLoading(true);
      const plan = await getMealPlan(day.dateString, targetUserId, coachId);
      setMealPlan(plan);
      
      // Vérifier s'il y a des remarques pour cette date
      const remarksData = await getCalendarPlanRemarks(day.dateString, coachId);
      const hasRemarks = remarksData && remarksData.length > 0;
      
      setMarkedDates(prev => ({
        ...prev,
        [day.dateString]: { 
          marked: true, 
          selected: true,
          selectedColor: 'rgba(195, 0, 0, 0.7)',
          dotColor: hasRemarks ? '#FF6B6B' : 
                  (plan && plan.id) ? '#4CAF50' : 
                  '#4A6FFF'
        }
      }));
      
      setModalVisible(true);
    } catch (error) {
      console.error("Erreur lors de la récupération du meal plan :", error);
      setMealPlan(null);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Résolution du nom d'utilisateur
  const resolveUsername = async () => {
    if (!newUsername) {
      Alert.alert("Erreur", "Veuillez sélectionner un nom d'utilisateur.");
      return;
    }
    try {
      setLoading(true);
      const resolvedUser = await getUserByUsername(newUsername);
      if (!resolvedUser || !resolvedUser.id) {
        Alert.alert("Erreur", "Aucun utilisateur trouvé pour ce nom d'utilisateur.");
        return;
      }
      setTargetUserId(resolvedUser.id);
      
      if (selectedDate && coachId !== null) {
        const plan = await getMealPlan(selectedDate, resolvedUser.id, coachId);
        setMealPlan(plan);
        
        // Vérifier s'il y a des remarques pour cette date
        const remarksData = await getCalendarPlanRemarks(selectedDate, coachId);
        const hasRemarks = remarksData && remarksData.length > 0;
        
        setMarkedDates(prev => ({
          ...prev,
          [selectedDate]: { 
            marked: true, 
            selected: true,
            selectedColor: 'rgba(195, 0, 0, 0.7)',
            dotColor: hasRemarks ? '#FF6B6B' : 
                    (plan && plan.id) ? '#4CAF50' : 
                    '#4A6FFF'
          }
        }));
      }
      
      // Recharger les marqueurs du mois actuel avec le nouvel utilisateur cible
      if (currentMonthObj) {
        loadMonthMarkers(currentMonthObj.month, currentMonthObj.year);
      }
    } catch (error) {
      console.error("Erreur lors de la résolution du nom d'utilisateur :", error);
      Alert.alert("Erreur", "Impossible de résoudre le nom d'utilisateur.");
    } finally {
      setLoading(false);
    }
  };

  // Ajout de plan
  const handleAddPlan = async () => {
    if (!addPlanDate) {
      Alert.alert("Erreur", "Veuillez saisir une date au format YYYY-MM-DD.");
      return;
    }
    if (!addPlanUsername) {
      Alert.alert("Erreur", "Veuillez sélectionner un nom d'utilisateur.");
      return;
    }
    if (!addPlanComment) {
      Alert.alert("Erreur", "Veuillez saisir un commentaire.");
      return;
    }
    if (coachId === null) {
      Alert.alert("Erreur", "CoachId non disponible.");
      return;
    }
    
    try {
      setLoading(true);
      const resolvedUser = await getUserByUsername(addPlanUsername);
      if (!resolvedUser || !resolvedUser.id) {
        Alert.alert("Erreur", "Aucun utilisateur trouvé pour ce nom d'utilisateur.");
        return;
      }
      const userId = resolvedUser.id;
      await saveCalendarPlan(addPlanDate, userId, coachId, addPlanUsername, addPlanComment);
      
      // Animation de succès
      Alert.alert("Succès", "Remarque enregistrée avec succès.");
      
      // Mise à jour visuelle du calendrier
      setMarkedDates(prev => ({
        ...prev,
        [addPlanDate]: { 
          ...(prev[addPlanDate] || {}),
          marked: true, 
          dotColor: '#FF6B6B'  // Couleur rouge pour les remarques
        }
      }));
      
      setAddPlanModalVisible(false);
      setAddPlanDate("");
      setAddPlanUsername("");
      setAddPlanComment("");
      
      // Recharger les marqueurs du mois actuel
      if (currentMonthObj) {
        loadMonthMarkers(currentMonthObj.month, currentMonthObj.year);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du plan :", error);
      Alert.alert("Erreur", "Erreur lors de l'enregistrement de la remarque.");
    } finally {
      setLoading(false);
    }
  };

  // Affichage des remarques
  const handleShowRemarks = async () => {
    if (!selectedDate) {
      Alert.alert("Erreur", "Veuillez sélectionner une date.");
      return;
    }
    if (coachId === null) {
      Alert.alert("Erreur", "CoachId non disponible.");
      return;
    }
    
    try {
      setLoading(true);
      const remarksData = await getCalendarPlanRemarks(selectedDate, coachId);
      
      // Enrichir les remarques avec le nom d'utilisateur
      const enrichedRemarks = await Promise.all(
        remarksData.map(async (item) => {
          try {
            const userData = await getUserByIdForCoach(item.userId);
            return { 
              ...item, 
              resolvedUsername: userData?.username || `User_${item.userId}` 
            };
          } catch (error) {
            return { 
              ...item, 
              resolvedUsername: `User_${item.userId}` 
            };
          }
        })
      );
      
      setRemarks(enrichedRemarks);
      
      // Mise à jour visuelle du calendrier
      if (enrichedRemarks.length > 0) {
        setMarkedDates(prev => ({
          ...prev,
          [selectedDate]: { 
            ...prev[selectedDate],
            marked: true, 
            dotColor: '#FF6B6B' // Rouge pour les remarques
          }
        }));
      }
      
      setRemarksModalVisible(true);
    } catch (error) {
      console.error("Erreur lors de la récupération des remarques :", error);
      Alert.alert("Erreur", "Impossible de récupérer les remarques pour cette date.");
    } finally {
      setLoading(false);
    }
  };

  // Suppression d'une remarque
  const handleDeleteRemark = async (remarkId: number) => {
    try {
      setLoading(true);
      await deleteRemark(remarkId);
      Alert.alert("Succès", "Remarque supprimée avec succès.");
      
      // Mise à jour de l'état local
      const updatedRemarks = remarks.filter((remark) => remark.id !== remarkId);
      setRemarks(updatedRemarks);
      
      // Mise à jour du marquage de la date si c'était la dernière remarque
      if (updatedRemarks.length === 0) {
        setMarkedDates(prev => ({
          ...prev,
          [selectedDate]: { 
            ...prev[selectedDate],
            marked: true, 
            dotColor: '#4A6FFF' // Couleur par défaut
          }
        }));
      }
      
      // Recharger les marqueurs du mois actuel
      if (currentMonthObj) {
        loadMonthMarkers(currentMonthObj.month, currentMonthObj.year);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la remarque :", error);
      Alert.alert("Erreur", "Impossible de supprimer la remarque.");
    } finally {
      setLoading(false);
    }
  };

  // Fermeture de la modal
  const closeModal = () => {
    setModalVisible(false);
    setTargetUserId(null);
    setNewUsername("");
    setMealPlan(null);
  };
  
  // Rendu de l'en-tête personnalisé
  const renderCustomHeader = () => {
    return (
      <View style={styles.customHeaderContainer}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.customHeaderTitle}>{currentMonth}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-forward" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    );
  };

  // Rendu du nom d'utilisateur
  const renderUsername = () => {
    const [username, setUsername] = useState<string | null>(null);
    
    useEffect(() => {
      const fetchUsername = async () => {
        try {
          const coachId = await getUserIdFromToken();
          if (coachId) {
            const coachData = await getUserByIdForCoach(coachId);
            setUsername(coachData?.username || "Coach");
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du nom d'utilisateur:", error);
          setUsername("Coach");
        }
      };
      
      fetchUsername();
    }, []);
    
    return username;
  };

  return (
    <View style={styles.container}>
      {/* Bouton retour */}
      <TouchableOpacity
        onPress={() => navigation.navigate('coach')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={32} color="rgba(195, 0, 0, 0.7)" />
      </TouchableOpacity>

      {/* En-tête avec titre et image */}
      <View style={styles.calendarHeaderContainer}>
        <Image 
          source={require('../../assets/images/calend.png')} 
          style={styles.calendarIcon}
        />
        <Text style={styles.title}>Calendrier {'\n'} du {renderUsername()} </Text>
      </View>

      {/* Bouton d'ajout une remarque */}
      <TouchableOpacity
        style={styles.addPlanButton}
        onPress={() => setAddPlanModalVisible(true)}
      >
        <Text style={styles.addPlanButtonText}>+</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A6FFF" />
        </View>
      ) : (
        <View style={styles.calendarContainer}>
          {/* En-tête personnalisé */}
          {renderCustomHeader()}
          
          {/* Jours de la semaine */}
          <View style={styles.weekdayHeader}>
            <Text style={styles.weekdayText}>Dim</Text>
            <Text style={styles.weekdayText}>Lun</Text>
            <Text style={styles.weekdayText}>Mar</Text>
            <Text style={styles.weekdayText}>Mer</Text>
            <Text style={styles.weekdayText}>Jeu</Text>
            <Text style={styles.weekdayText}>Ven</Text>
            <Text style={styles.weekdayText}>Sam</Text>
          </View>
          
          {/* Calendrier */}
          <Calendar
            ref={calendarRef}
            current={currentDate}
            key={currentDate} // Cette ligne est la clé pour forcer le changement sans rafraîchissement
            markedDates={markedDates}
            onDayPress={handleDayPress}
            onMonthChange={onMonthChange}
            hideArrows={true}
            disableArrowLeft={true}
            disableArrowRight={true}
            enableSwipeMonths={true}
            firstDay={1}
            renderArrow={() => null}
            theme={{
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#333',
              selectedDayBackgroundColor: 'rgba(195, 0, 0, 0.7)',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#3498db',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              arrowColor: 'transparent',
              monthTextColor: 'transparent',
              indicatorColor: 'rgba(195, 0, 0, 0.7)',
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              'stylesheet.calendar.header': {
                header: {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingLeft: 10,
                  paddingRight: 10,
                  alignItems: 'center',
                  height: 0,
                  opacity: 0,
                },
                dayHeader: {
                  opacity: 0,
                  height: 0,
                }
              },
              'stylesheet.day.basic': {
                base: {
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  marginTop: 4,
                  marginBottom: 4,
                },
                today: {
                  backgroundColor: '#f8f8fc',
                  borderWidth: 1,
                  borderColor: 'rgba(195, 0, 0, 0.3)',
                },
                selected: {
                  backgroundColor: 'rgba(195, 0, 0, 0.7)',
                  borderRadius: 16,
                },
              },
            }}
            hideExtraDays={false}
          />
          
          {/* Légende */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(195, 0, 0, 0.7)' }]} />
              <Text style={styles.legendText}>Date sélectionnée</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.legendText}>Avec remarques</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Avec plan</Text>
            </View>
          </View>
        </View>
      )}

      {/* Modal de consultation du plan */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* En-tête avec date et bouton de fermeture */}
            <View style={styles.modalHeader}>
              <View style={styles.modalDateContainer}>
                <Ionicons name="calendar" size={24} color="rgba(195, 0, 0, 0.7)" />
                <Text style={styles.modalTitle}>{selectedDate}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={closeModal}
              >
                <Ionicons name="close-circle" size={28} color="rgba(195, 0, 0, 0.7)" />
              </TouchableOpacity>
            </View>
            
            {targetUserId === null ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Sélection de l'utilisateur</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newUsername}
                    style={styles.picker}
                    onValueChange={(itemValue) => setNewUsername(itemValue)}
                  >
                    <Picker.Item label="Sélectionnez un utilisateur" value="" />
                    {invitations
                      .filter((invitation, index, self) =>
                        index === self.findIndex((i) => i.sender?.id === invitation.sender?.id)
                      )
                      .map((invitation: any) => (
                        <Picker.Item
                          key={invitation.id}
                          label={invitation.sender?.username || `Invitation #${invitation.id}`}
                          value={invitation.sender?.username || invitation.id}
                        />
                      ))}
                  </Picker>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={resolveUsername}
                  >
                    <FontAwesome5 name="user-check" size={16} color="#fff" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>Résoudre</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.remarksButton]}
                    onPress={handleShowRemarks}
                  >
                    <FontAwesome5 name="clipboard-list" size={16} color="#fff" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>Remarques</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {mealPlan && mealPlan.id ? (
                  <ScrollView>
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="restaurant-outline" size={20} color="#333" />
                        <Text style={styles.sectionTitle}>Plan nutritionnel</Text>
                      </View>
                      
                      <View style={styles.planCard}>
                        <View style={styles.planCardHeader}>
                          <Ionicons name="person" size={18} color="rgba(195, 0, 0, 0.7)" />
                          <Text style={styles.planCardCoach}>Pour: {mealPlan.username}</Text>
                        </View>
                        
                        <View style={styles.mealContainer}>
                          <View style={styles.mealIconContainer}>
                            <Ionicons name="cafe" size={22} color="#8e6e5d" />
                          </View>
                          <View style={styles.mealTextContainer}>
                            <Text style={styles.mealTitle}>Petit-déjeuner</Text>
                            <Text style={styles.mealDescription}>{mealPlan.breakfast || "-"}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.mealContainer}>
                          <View style={styles.mealIconContainer}>
                            <MaterialCommunityIcons name="food-turkey" size={22} color="#5d8e5d" />
                          </View>
                          <View style={styles.mealTextContainer}>
                            <Text style={styles.mealTitle}>Déjeuner</Text>
                            <Text style={styles.mealDescription}>{mealPlan.lunch || "-"}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.mealContainer}>
                          <View style={styles.mealIconContainer}>
                            <Ionicons name="restaurant" size={22} color="#5d5d8e" />
                          </View>
                          <View style={styles.mealTextContainer}>
                            <Text style={styles.mealTitle}>Dîner</Text>
                            <Text style={styles.mealDescription}>{mealPlan.dinner || "-"}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.mealContainer}>
                          <View style={styles.mealIconContainer}>
                            <MaterialCommunityIcons name="food-apple" size={22} color="#8e5d7b" />
                          </View>
                          <View style={styles.mealTextContainer}>
                            <Text style={styles.mealTitle}>Collations</Text>
                            <Text style={styles.mealDescription}>{mealPlan.snacks || "-"}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.extraInfoContainer}>
                          <View style={styles.extraInfoItem}>
                            <Ionicons name="barbell" size={18} color="#8e5d5d" />
                            <Text style={styles.extraInfoText}>{mealPlan.sport || "Aucun sport"}</Text>
                          </View>
                          
                          <View style={styles.extraInfoItem}>
                            <Feather name="droplet" size={18} color="#5d8e8e" />
                            <Text style={styles.extraInfoText}>{mealPlan.water || "0"} ml</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.modalActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={handleShowRemarks}
                      >
                        <Text style={styles.actionButtonText}>Voir remarques</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons name="calendar-outline" size={40} color="#cccccc" />
                    <Text style={styles.emptyStateText}>Aucun plan pour cette date</Text>
                    
                   {/*  <TouchableOpacity
                      style={[styles.modalActionButton, styles.addPlanModalButton]} 
                      onPress={() => {
                        setModalVisible(false);
                        setAddPlanModalVisible(true);
                        setAddPlanDate(selectedDate);
                        setAddPlanUsername(newUsername);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#fff" style={styles.actionButtonIcon} />
                      <Text style={styles.actionButtonText}>Créer un plan</Text>
                    </TouchableOpacity>
                     */}
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.remarksModalButton]} 
                      onPress={handleShowRemarks}
                    >
                      <FontAwesome5 name="clipboard-list" size={16} color="#fff" style={styles.actionButtonIcon} />
                      <Text style={styles.actionButtonText}>Voir remarques</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal d'ajout de plan */}
      <Modal
        visible={addPlanModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddPlanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* En-tête avec date et bouton de fermeture */}
            <View style={styles.modalHeader}>
              <View style={styles.modalDateContainer}>
                <Ionicons name="add-circle" size={24} color="rgba(195, 0, 0, 0.7)" />
                <Text style={styles.modalTitle}>Ajouter une remarque</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setAddPlanModalVisible(false)}
              >
                <Ionicons name="close-circle" size={28} color="rgba(195, 0, 0, 0.7)" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sectionContainer}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Date du plan :</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9AA5B1"
                  value={addPlanDate}
                  onChangeText={setAddPlanDate}
                />
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Utilisateur :</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={addPlanUsername}
                    style={styles.formPicker}
                    onValueChange={(itemValue) => setAddPlanUsername(itemValue)}
                  >
                    <Picker.Item label="Sélectionnez un utilisateur" value="" />
                    {invitations
                      .filter((invitation, index, self) =>
                        index === self.findIndex((i) => i.sender?.id === invitation.sender?.id)
                      )
                      .map((invitation: any) => (
                        <Picker.Item
                          key={invitation.id}
                          label={invitation.sender?.username || `Invitation #${invitation.id}`}
                          value={invitation.sender?.username || invitation.id}
                        />
                      ))}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Commentaire :</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  placeholder="Ajoutez votre commentaire ici..."
                  placeholderTextColor="#9AA5B1"
                  value={addPlanComment}
                  onChangeText={setAddPlanComment}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddPlan}
              >
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal pour afficher les remarques */}
      <Modal
        visible={remarksModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRemarksModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* En-tête avec date et bouton de fermeture */}
            <View style={styles.modalHeader}>
              <View style={styles.modalDateContainer}>
                <FontAwesome5 name="clipboard-list" size={22} color="rgba(195, 0, 0, 0.7)" />
                <Text style={styles.modalTitle}>Remarques {selectedDate}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setRemarksModalVisible(false)}
              >
                <Ionicons name="close-circle" size={28} color="rgba(195, 0, 0, 0.7)" />
              </TouchableOpacity>
            </View>
            
            {remarks && remarks.length > 0 ? (
              <FlatList
                data={remarks}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.remarkCard}>
                    <View style={styles.remarkCardHeader}>
                      <View style={styles.remarkUserInfo}>
                        <Ionicons name="person-circle" size={24} color="rgba(195, 0, 0, 0.7)" />
                        <Text style={styles.remarkUsername}>{item.resolvedUsername}</Text>
                      </View>
                    {/*   <TouchableOpacity
                        style={styles.deleteRemarkButton}
                        onPress={() => handleDeleteRemark(item.id)}
                      >
                        <Ionicons name="trash-outline" size={22} color="#d00" />
                      </TouchableOpacity> */}
                    </View>
                    <Text style={styles.remarkText}>
                      {item.remarque || item.description || item.title}
                    </Text>
                  </View>
                )}
                style={styles.remarksList}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons name="clipboard-text-off-outline" size={40} color="#cccccc" />
                <Text style={styles.emptyStateText}>
                  Aucune remarque trouvée pour cette date
                </Text>
                <TouchableOpacity
                  style={styles.addRemarkButton}
                  onPress={() => {
                    setRemarksModalVisible(false);
                    setAddPlanModalVisible(true);
                    setAddPlanDate(selectedDate);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.addRemarkButtonText}>Ajouter une remarque</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <FooterC />
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  backButton: {
    position: 'absolute',
    top: 14,
    left: 11,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    marginHorizontal: 5,
    marginBottom: 20,
    top: 50,
  },
  customHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  customHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize', 
  },
  arrowButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekdayText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  addPlanButton: {
    position: "absolute",
    top: 14,
    right: 20,
    //backgroundColor: "rgba(195, 0, 0, 0.1)",
   // width: 50,
   // height: 50,
    //borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
   // borderWidth: 2,
   // borderColor: "rgba(195, 0, 0, 0.2)",
  },
  addPlanButtonText: {
    color: "rgba(195, 0, 0, 0.7)",
    fontSize: 32,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  calendarHeaderContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    height: 159,
    top: 50,
  },
  calendarIcon: {
    width: 188,
    height: 188,
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 0,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 10,
    color: '#333',
  },
  modalCloseIcon: {
    padding: 2,
  },
  sectionContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  planCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  planCardCoach: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  mealContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mealTextContainer: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginBottom: 2,
  },
  mealDescription: {
    fontSize: 14,
    color: '#666',
  },
  extraInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  extraInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  extraInfoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    margin: 15,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
    marginBottom: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginVertical: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
  },
  actionButton: {
    backgroundColor: 'rgba(195, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(195, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  remarksButton: {
    backgroundColor: '#4A6FFF',
  },
  addPlanModalButton: {
    backgroundColor: '#4CAF50',
    marginBottom: 10,
  },
  remarksModalButton: {
    backgroundColor: '#4A6FFF',
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  modalActions: {
    padding: 15,
    alignItems: 'center',
  },
  formField: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#333',
  },
  formTextarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  formPicker: {
    height: 50,
    width: '100%',
  },
  submitButton: {
    backgroundColor: 'rgba(195, 0, 0, 0.7)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  remarksList: {
    padding: 15,
  },
  remarkCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  remarkCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  remarkUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remarkUsername: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  remarkText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  deleteRemarkButton: {
    padding: 8,
  },
  addRemarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(195, 0, 0, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 15,
  },
  addRemarkButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
  },
});