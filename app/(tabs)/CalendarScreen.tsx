import React, { useEffect, useState } from "react";
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
  ImageBackground,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";

// Type pour représenter l'objet date renvoyé par react-native-calendars
type DateObject = {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
};

// Importez vos fonctions depuis authService
import { 
  getToken, 
  getUserByUsername, 
  getUserIdFromToken, 
  saveCalendarPlan, 
  getUserByIdForCoach,
  deleteRemark
} from "../../utils/authService";
import { getMealPlan } from "../../utils/authService";

// Définition de l'API_URL (à adapter)
const API_URL = "http://192.168.1.139:8080";

// Importez votre footer adapté pour coach
import FooterC from "../../components/FooterC";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";


// Palettes de couleurs pour le calendrier
const COLORS = {
  primary: "#4A6FFF", // Bleu principal
  secondary: "#FF6B6B", // Rouge pour les dates avec remarques
  accent: "#4CAF50", // Vert pour les dates avec plans
  highlight: "#FFD166", // Jaune pour les dates sélectionnées
  background: "#F9FAFF", // Fond clair
  modal: "#FFFFFF", // Fond modal
  text: "#2D3748", // Texte principal
  textLight: "#718096", // Texte secondaire
  success: "#38B2AC", // Vert succès
  error: "#E53E3E", // Rouge erreur
  border: "#E2E8F0", // Bordures
};

// Fonction pour récupérer toutes les remarques pour une date donnée, en utilisant la date et le coachId.
async function getCalendarPlanRemarks(date: string, coachId: number): Promise<any[]> {
  try {
    const token = await getToken();
    const url = `${API_URL}/api/calendar/plan/remarks?date=${encodeURIComponent(date)}&coachId=${coachId}`;
    console.log("GET remarques via URL :", url);
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
    const data = await response.json();
    console.log("Remarques récupérées :", data);
    return data;
  } catch (error) {
    console.error("Erreur dans getCalendarPlanRemarks :", error);
    throw error;
  }
}

export default function CalendarScreen() {
  // États principaux
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [markedDates, setMarkedDates] = useState<{ 
    [key: string]: { 
      marked: boolean; 
      dotColor?: string;
      selected?: boolean;
      selectedColor?: string;
      customStyles?: {
        container?: {
          backgroundColor?: string;
        };
        text?: {
          color?: string;
          fontWeight?: string;
        };
      };
    } 
  }>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  
  // Pour la résolution du nom d'utilisateur
  const [newUsername, setNewUsername] = useState("");
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  
  // CoachId récupéré via le token
  const [coachId, setCoachId] = useState<number | null>(null);
  
  // Liste des invitations pour alimenter les listes déroulantes
  const [invitations, setInvitations] = useState<any[]>([]);
  
  // États pour la modal d'ajout de plan
  const [addPlanModalVisible, setAddPlanModalVisible] = useState(false);
  const [addPlanUsername, setAddPlanUsername] = useState("");
  const [addPlanDate, setAddPlanDate] = useState("");
  const [addPlanComment, setAddPlanComment] = useState("");
  
  // États pour la modal dédiée aux remarques
  const [remarks, setRemarks] = useState<any[]>([]);
  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  
  // États pour la modal d'édition d'une remarque
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRemark, setEditRemark] = useState("");
  const [editPlanId, setEditPlanId] = useState<number | null>(null);

  // Récupération du coachId dès le montage
  useEffect(() => {
    const fetchCoachId = async () => {
      try {
        console.log("Récupération du coachId...");
        const id = await getUserIdFromToken();
        console.log("CoachId détecté :", id);
        setCoachId(id);
      } catch (error) {
        console.error("Erreur lors de la récupération du coachId :", error);
      }
    };
    fetchCoachId();
  }, []);

  // Récupération des invitations depuis l'API une fois le coachId défini
  useEffect(() => {
    if (coachId !== null) {
      const fetchInvitations = async () => {
        try {
          const token = await getToken();
          const url = `${API_URL}/api/friends/coach-invitations/${coachId}`;
          console.log("Récupération des invitations via URL :", url);
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur lors de la récupération des invitations, status = ${response.status}. Message: ${errorText}`);
          }
          const data = await response.json();
          console.log("Invitations récupérées :", data);
          setInvitations(data);
        } catch (error) {
          console.error("Erreur dans fetchInvitations :", error);
        }
      };
      fetchInvitations();
    }
  }, [coachId]);

  // Marquage de la date une fois le targetUserId et selectedDate définis
  useEffect(() => {
    if (targetUserId !== null && selectedDate) {
      console.log("Marquage de la date", selectedDate, "pour targetUserId =", targetUserId);
      setMarkedDates(prev => ({
        ...prev,
        [selectedDate]: { 
          marked: true, 
          selected: true,
          selectedColor: COLORS.highlight,
          dotColor: COLORS.primary 
        }
      }));
    }
  }, [targetUserId, selectedDate]);

  // Lorsqu'on clique sur une date, récupération du plan via getMealPlan
  const handleDayPress = async (day: DateObject) => {
    console.log("handleDayPress appelé pour la date :", day.dateString);
    setSelectedDate(day.dateString);
    
    // Marquer la date comme sélectionnée
    setMarkedDates(prev => {
      const newMarkedDates = { ...prev };
      
      // Réinitialiser la sélection pour toutes les dates
      Object.keys(newMarkedDates).forEach(date => {
        if (newMarkedDates[date].selected) {
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
        selectedColor: COLORS.highlight,
        dotColor: newMarkedDates[day.dateString]?.dotColor || COLORS.primary
      };
      
      return newMarkedDates;
    });
    
    if (targetUserId === null) {
      Alert.alert("Information", "Veuillez saisir le nom d'utilisateur dans la modal.");
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
      console.log("Appel à getMealPlan avec :", { date: day.dateString, targetUserId, coachId });
      const plan = await getMealPlan(day.dateString, targetUserId, coachId);
      console.log("Plan récupéré :", plan);
      setMealPlan(plan);
      
      // Vérifier s'il y a des remarques pour cette date
      const remarksData = await getCalendarPlanRemarks(day.dateString, coachId);
      const hasRemarks = remarksData && remarksData.length > 0;
      
      setMarkedDates(prev => ({
        ...prev,
        [day.dateString]: { 
          marked: true, 
          selected: true,
          selectedColor: COLORS.highlight,
          dotColor: hasRemarks ? COLORS.secondary : 
                   (plan && plan.title && plan.title.trim() !== "") ? COLORS.accent : 
                   COLORS.primary
        }
      }));
      
      setModalVisible(true);
    } catch (error) {
      console.error("Erreur lors de la récupération du meal plan :", error);
      Alert.alert("Erreur", "Impossible de récupérer le meal plan pour cette date.");
      setMealPlan(null);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Résolution du nom d'utilisateur
  const resolveUsername = async () => {
    console.log("resolveUsername appelé, newUsername =", newUsername);
    if (!newUsername) {
      Alert.alert("Erreur", "Veuillez sélectionner un nom d'utilisateur.");
      return;
    }
    try {
      setLoading(true);
      const resolvedUser = await getUserByUsername(newUsername);
      console.log("Utilisateur résolu :", resolvedUser);
      if (!resolvedUser || !resolvedUser.id) {
        Alert.alert("Erreur", "Aucun utilisateur trouvé pour ce nom d'utilisateur.");
        return;
      }
      setTargetUserId(resolvedUser.id);
      Alert.alert("Succès", `Utilisateur résolu : ${resolvedUser.id}`);
      if (selectedDate && coachId !== null) {
        console.log("Récupération immédiate du plan pour la date", selectedDate);
        const plan = await getMealPlan(selectedDate, resolvedUser.id, coachId);
        console.log("Plan récupéré après résolution :", plan);
        setMealPlan(plan);
        
        // Vérifier s'il y a des remarques pour cette date
        const remarksData = await getCalendarPlanRemarks(selectedDate, coachId);
        const hasRemarks = remarksData && remarksData.length > 0;
        
        setMarkedDates(prev => ({
          ...prev,
          [selectedDate]: { 
            marked: true, 
            selected: true,
            selectedColor: COLORS.highlight,
            dotColor: hasRemarks ? COLORS.secondary : 
                     (plan && plan.title && plan.title.trim() !== "") ? COLORS.accent : 
                     COLORS.primary
          }
        }));
        
        setModalVisible(true);
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
      console.log("Enregistrement du plan pour :", { date: addPlanDate, userId, coachId, comment: addPlanComment });
      const newPlan = await saveCalendarPlan(addPlanDate, userId, coachId, addPlanUsername, addPlanComment);
      console.log("Plan enregistré :", newPlan);
      
      // Animation de succès
      Alert.alert("Succès", "Plan enregistré avec succès.");
      
      // Mise à jour visuelle du calendrier
      setMarkedDates(prev => ({
        ...prev,
        [addPlanDate]: { 
          marked: true, 
          dotColor: COLORS.secondary  // Couleur rouge pour les remarques
        }
      }));
      
      setAddPlanModalVisible(false);
      setAddPlanDate("");
      setAddPlanUsername("");
      setAddPlanComment("");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du plan :", error);
      Alert.alert("Erreur", "Erreur lors de l'enregistrement du plan.");
    } finally {
      setLoading(false);
    }
  };

  // Affichage des remarques pour la date sélectionnée
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
      console.log("Remarques récupérées :", remarksData);
      // Enrichir les remarques avec le nom d'utilisateur
      const enrichedRemarks = await Promise.all(
        remarksData.map(async (item) => {
          try {
            const userData = await getUserByIdForCoach(item.userId);
            return { ...item, resolvedUsername: userData?.username || `User_${item.userId}` };
          } catch (error) {
            return { ...item, resolvedUsername: `User_${item.userId}` };
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
            dotColor: COLORS.secondary // Rouge pour les remarques
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
  const handleDeleteRemark = async (remarkId: number): Promise<void> => {
    console.log(remarkId);
    try {
      setLoading(true);
      console.log("Tentative de suppression pour remarkId :", remarkId);
      await deleteRemark(remarkId);
      Alert.alert("Succès", "Remarque supprimée avec succès.");
      // Mise à jour de l'état local pour retirer la remarque supprimée
      const updatedRemarks = remarks.filter((remark) => remark.id !== remarkId);
      setRemarks(updatedRemarks);
      
      // Si c'était la dernière remarque, mettre à jour le marquage de la date
      if (updatedRemarks.length === 0) {
        setMarkedDates(prev => ({
          ...prev,
          [selectedDate]: { 
            ...prev[selectedDate],
            marked: true, 
            dotColor: COLORS.primary // Couleur par défaut s'il n'y a plus de remarques
          }
        }));
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la remarque :", error);
      Alert.alert("Erreur", "Impossible de supprimer la remarque.");
    } finally {
      setLoading(false);
    }
  };

  // Fermeture de la modal de consultation
  const closeModal = () => {
    setModalVisible(false);
    setTargetUserId(null);
    setNewUsername("");
    setMealPlan(null);
  };
 const navigation = useNavigation();
  // Configuration du thème du calendrier
  const calendarTheme = {
    backgroundColor: COLORS.background,
    calendarBackground: COLORS.background,
    textSectionTitleColor: COLORS.text,
    selectedDayBackgroundColor: COLORS.highlight,
    selectedDayTextColor: COLORS.text,
    todayTextColor: COLORS.primary,
    dayTextColor: COLORS.text,
    textDisabledColor: COLORS.textLight,
    dotColor: COLORS.primary,
    selectedDotColor: COLORS.text,
    arrowColor: COLORS.primary,
    monthTextColor: COLORS.text,
    indicatorColor: COLORS.primary,
    textDayFontWeight: '600',
    textMonthFontWeight: 'bold',
    textDayHeaderFontWeight: '600',
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f5f7ff', '#ffffff']}
        style={styles.gradientBackground}
      >
        <TouchableOpacity
  onPress={() => navigation.navigate('coach')}
  style={{
    position: 'absolute',
    top: 14,
    left: 11,
    zIndex: 10,
  }}
>
  <Ionicons name="arrow-back" size={32} color="rgba(195, 0, 0, 0.7)" />
</TouchableOpacity>

        <View style={styles.calendarHeaderContainer}>
  <Image 
    source={require('../../assets/images/calend.png')} 
    style={styles.calendarIcon}
  />
  <Text style={styles.calendarTitle}>Calendrier {'\n'} du  {(() => {
                const [username, setUsername] = React.useState<string | null>(null);
  
                React.useEffect(() => {
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
              })()} </Text>
</View>

        {/* Bouton Plus pour ouvrir la modal d'ajout de plan */}
        <TouchableOpacity
          style={styles.addPlanButton}
          onPress={() => setAddPlanModalVisible(true)}
        >
          <Text style={styles.addPlanButtonText}>+</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.calendarContainer}>
            <Calendar 
              markedDates={markedDates} 
              onDayPress={handleDayPress} 
              theme={calendarTheme}
              enableSwipeMonths={true}
              markingType="custom"
            />
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>Date sélectionnée</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
                <Text style={styles.legendText}>Avec remarques</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
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
              <LinearGradient
                colors={['#f0f4ff', '#ffffff']}
                style={styles.modalGradient}
              >
                <Text style={styles.modalTitle}>Plan pour le {selectedDate}</Text>
                {targetUserId === null ? (
                  <>
                    <Text style={styles.planText}>
                      Veuillez sélectionner le nom d'utilisateur :
                    </Text>
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
                        style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                        onPress={resolveUsername}
                      >
                        <Text style={styles.actionButtonText}>Résoudre</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
                        onPress={handleShowRemarks}
                      >
                        <Text style={styles.actionButtonText}>Afficher remarques</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {mealPlan && mealPlan.id ? (
                      <ScrollView style={styles.planScrollView}>
                        <View style={styles.planContainer}>
                          <Text style={styles.planFieldTitle}>Plan pour {mealPlan.username}</Text>
                          <View style={styles.planFieldCard}>
                            <Text style={styles.planFieldLabel}> Breakfast :  <Ionicons name="cafe" size={20} color="brown" /></Text>
                           
                            <Text style={styles.planFieldValue}>{mealPlan.breakfast}</Text>
                          </View>
                          <View style={styles.planFieldCard}>
                            <Text style={styles.planFieldLabel}>Lunch :  <Ionicons name="restaurant" size={20} color="green" /> 
                              </Text>
                            <Text style={styles.planFieldValue}>{mealPlan.lunch}</Text>
                          </View>
                          <View style={styles.planFieldCard}>
                            <Text style={styles.planFieldLabel}>
                             Dinner :  <Ionicons name="restaurant" size={20} color="blue" /></Text>
                            <Text style={styles.planFieldValue}>{mealPlan.dinner}</Text>
                          </View>
                          <View style={styles.planFieldCard}>
                            <Text style={styles.planFieldLabel}>
                            Snacks :  <Ionicons name="fast-food" size={20} color="orange" /> </Text>
                            <Text style={styles.planFieldValue}>{mealPlan.snacks}</Text>
                          </View>
                          <View style={styles.planFieldCard}>
                            <Text style={styles.planFieldLabel}>Sport :  <Ionicons name="barbell" size={20} color="purple" />
                          </Text>
                            <Text style={styles.planFieldValue}>{mealPlan.sport}</Text>
                          </View>
                          <View style={styles.planFieldCard}>
                            <Text style={styles.planFieldLabel}>
                            Water :  <Ionicons name="water" size={16} color="skyblue" /> </Text>
                            <Text style={styles.planFieldValue}>{mealPlan.water} ml</Text>
                          </View>
                        </View>
                      </ScrollView>
                    ) : (
                      <View style={styles.emptyPlanContainer}>
                        <Text style={styles.emptyPlanText}>
                          Aucun plan pour cette date.
                        </Text>
                      </View>
                    )}
                  </>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </LinearGradient>
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
              <LinearGradient
                colors={['#f0f4ff', '#ffffff']}
                style={styles.modalGradient}
              >
                <Text style={styles.modalTitle}>Ajouter un plan</Text>
                <ScrollView style={styles.addPlanScrollView}>
                  <Text style={styles.inputLabel}>Date du plan (YYYY-MM-DD) :</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex : 2025-04-10"
                    placeholderTextColor="#9AA5B1"
                    value={addPlanDate}
                    onChangeText={setAddPlanDate}
                  />
                  
                  <Text style={styles.inputLabel}>Nom d'utilisateur :</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={addPlanUsername}
                      style={styles.picker}
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
                  
                  <Text style={styles.inputLabel}>Commentaire (remarque) :</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    placeholder="Ex : Plan nutritionnel du jour"
                    placeholderTextColor="#9AA5B1"
                    value={addPlanComment}
                    onChangeText={setAddPlanComment}
                    multiline={true}
                    numberOfLines={4}
                  />
                </ScrollView>
                
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: COLORS.accent }]} 
                    onPress={handleAddPlan}
                  >
                    <Text style={styles.actionButtonText}>Enregistrer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: COLORS.secondary }]} 
                    onPress={() => setAddPlanModalVisible(false)}
                  >
                    <Text style={styles.actionButtonText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
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
              <LinearGradient
                colors={['#f0f4ff', '#ffffff']}
                style={styles.modalGradient}
              >
                <Text style={styles.modalTitle}>Remarques pour le {selectedDate}</Text>
                {remarks && remarks.length > 0 ? (
                  <ScrollView style={styles.remarksScrollView}>
                    {remarks.map((item, index) => (
                      <View key={index} style={styles.remarkItem}>
                        <View style={styles.remarkHeader}>
                          <Text style={styles.remarkUsername}>{item.resolvedUsername}</Text>
                         {/*  <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteRemark(item.id)}
                          >
                            <Text style={styles.deleteButtonText}>Supprimer</Text>
                          </TouchableOpacity> */}
                        </View>
                        <Text style={styles.remarkText}>
                          {item.remarque || item.description || item.title}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyRemarksContainer}>
                    <Text style={styles.emptyRemarksText}>
                      Aucune remarque trouvée pour cette date.
                    </Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={[styles.closeButton, { marginTop: 15 }]} 
                  onPress={() => setRemarksModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        <FooterC />
      </LinearGradient>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    flex: 1,
    paddingTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 15,
    color: COLORS.text,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  addPlanButton: {
    position: "absolute",
    top: 10,
    right: 20,
    backgroundColor: COLORS.background,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  }, 
  addPlanButtonText: {
    color: "#FFD166",
    fontSize: 37,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  calendarContainer: {
    marginHorizontal: 10,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingBottom: 10,
    paddingTop: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#344955',
    textAlign: 'center',
    marginBottom: 10,
    ...Platform.select({
      web: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      },
      ios: {
        fontFamily: 'System',
        fontWeight: "bold",
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),},
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalGradient: {
    padding: 20,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "rgba(195, 0, 0, 0.7)",
  },
  planText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
    color: COLORS.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  picker: {
    height: 50,
    width: '100%',
    color: COLORS.text,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    minWidth: 120,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  planScrollView: {
    maxHeight: height * 0.5,
  },
  planContainer: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  planFieldTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
    color: "rgba(195, 0, 0, 0.5)",
  },
  planFieldCard: {
    backgroundColor: '#f7f9fc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(195, 0, 0, 0.4)",
  },
  planFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: COLORS.text,
  },
  planFieldValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  emptyPlanContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlanText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: "rgba(195, 0, 0, 0.4)",
    borderRadius: 10,
    backgroundColor: 'rgba(195, 0, 0, 0.1)',
  },
  closeButtonText: {
    fontSize: 16,
    color: "rgba(195, 0, 0, 0.7)",
    fontWeight: '600',
  },
  addPlanScrollView: {
    maxHeight: height * 0.4,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
    color: COLORS.text,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  remarksScrollView: {
    maxHeight: height * 0.5,
  },
  calendarHeaderContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
  //  backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    height: 159,
    top:10,
  },
  
  // Style pour l'icône du calendrier
  calendarIcon: {
    width: 188,
    height: 188,
    marginRight: 10,
  },
  remarkItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  remarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  remarkUsername: {
    fontSize: 16,
    fontWeight: '700',
    color: "rgba(195, 0, 0, 0.7)",
  },
  remarkText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyRemarksContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRemarksText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editModalContainer: {
    padding: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
});