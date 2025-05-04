import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Button,
  TextInput,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import * as Notifications from 'expo-notifications';
import { FontAwesome5 } from "@expo/vector-icons";
import FooterR from "../../components/FooterR";
import {
  getAllCoaches,
  getCoachById,
  inviteCoach,
  createReview,
  getMyReviews,
  updateReview,
  deleteReview,
  getUserIdFromToken,
  getCoachReviewsForMe,
  CoachReviewsPayload,
} from "../../utils/authService";
// @ts-ignore
import { router } from "expo-router";
import { requestResetInvitation } from "@/utils/invitationService";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import NavbarUser from "@/components/NavbarUser";

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  active?: boolean;
  photoUrl?: string;
}

interface Review {
  id: number;
  userId: number;
  coachId: number;
  rating: number;
  comment: string;
}

export default function Coaches() {
  const [coaches, setCoaches] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<User | null>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);

  // États pour la modal de review
  const [isRateModalVisible, setIsRateModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // Reviews de l'utilisateur connecté
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // États pour la popup de message de demande de réinitialisation
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [messageText, setMessageText] = useState("");

  // État local pour bloquer l'envoi d'une invitation
  const [invitationSent, setInvitationSent] = useState(false);
  const [coachReviews, setCoachReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  
  useEffect(() => {
    async function fetchCoaches() {
      try {
        const fetchedCoaches: User[] = await getAllCoaches();
        setCoaches(fetchedCoaches);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des coachs :", error);
        Alert.alert("Erreur", "Impossible de récupérer la liste des coachs.");
      } finally {
        setLoading(false);
      }
    }

    async function fetchMyReviews() {
      try {
        const reviews = await getMyReviews();
        setMyReviews(reviews);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération de mes reviews :", error);
      }
    }

    fetchCoaches();
    fetchMyReviews();

    // Réinitialiser localement l'état (exemple logout ou reload)
    setInvitationSent(false);
  }, []);

  const filteredCoaches = coaches.filter((coach) =>
    coach.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateAverageRating = (reviews: any[]) => {
    if (!reviews || reviews.length === 0) return 0;
    
    // Vérifier si chaque review a une propriété rating et la convertir en nombre
    const validRatings = reviews.filter(review => review && typeof review.rating === 'number');
    
    if (validRatings.length === 0) return 0;
    
    const sum = validRatings.reduce((total, review) => total + review.rating, 0);
    return (sum / validRatings.length).toFixed(1);
  };
  const handleSelectCoach = async (coach: User) => {
    setSelectedCoach(coach);
    setIsViewModalVisible(true);
  
    try {
      // 1) On récupère l’objet { reviews, averageRating }
      const payload: CoachReviewsPayload = await getCoachReviewsForMe(coach.id);
  
      // 2) On stocke directement le tableau et la moyenne
      setCoachReviews(payload.reviews);
      setAverageRating(payload.averageRating);
    } catch (error) {
      console.error("Erreur lors de la récupération des évaluations :", error);
      setCoachReviews([]);
      setAverageRating(0);
    }
  };
  
  const handleViewCoach = async (id: number) => {
    try {
      const coach = await getCoachById(id);
      handleSelectCoach(coach);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de récupérer les détails du coach.");
    }
  };

  const handleCreateReview = async () => {
    if (!selectedCoach) return;
    if (rating === 0) {
      Toast.show({
        type: "error",
        text1: "Veuillez sélectionner une note.",
        position: 'top',
      });
      return;
    }
    try {
      await createReview(selectedCoach.id, rating, comment);
      Toast.show({
        type: "success",
        text1: "Votre avis a été envoyé !",
        position: 'top',
      });
      setIsRateModalVisible(false);
      const updatedReviews = await getMyReviews();
      setMyReviews(updatedReviews);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'avis :", error);
      Toast.show({
        type: "error",
        text1: "Impossible d'envoyer la review.",
        position: 'top',
      });
    }
  };
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Permission de notifications refusée');
      }
    })();
  }, []);
  

  const handleInviteCoach = async (coachId: number) => {
    if (invitationSent) {
      Toast.show({
        type: "error",
        text1: "Vous ne pouvez pas envoyer une autre invitation",
      });
      return;
    }
    try {
      await inviteCoach(coachId);
      Toast.show({
        type: "success",
        text1: "Invitation envoyée !",
      });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🤝 Invitation envoyée",
          body: "Votre invitation au coach a été envoyée avec succès.",
          sound: 'default',
          channelId: 'default',   // ✅ Doit être ici
        },
        trigger: null,  // Notification immédiate
      });
  
      setInvitationSent(true);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Échec de l'envoi de l'invitation.",
      });
    }
  };

  const handleSendMessage = (coach: User) => {
    Toast.show({
      type: "info",
      text1: `Redirection vers la conversation avec ${coach.username}`,
    });
    router.push(`/chatCoach/${coach.id}`);
  };

  const openRateModal = (coach: User) => {
    setSelectedCoach(coach);
    const existingReview = myReviews.find((review) => review.coachId === coach.id);
    if (existingReview) {
      setIsEditMode(true);
      setEditingReview(existingReview);
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    } else {
      setIsEditMode(false);
      setEditingReview(null);
      setRating(0);
      setComment("");
    }
    setIsRateModalVisible(true);
  };

  const handleUpdateReview = async () => {
    if (!editingReview || !selectedCoach) return;
    try {
      const userId = await getUserIdFromToken();
      if (!userId) {
        Alert.alert("Erreur", "ID utilisateur non trouvé.");
        return;
      }
      await updateReview(userId, editingReview.id, rating, comment, selectedCoach.id);
      Toast.show({
        type: "success",
        text1: "Votre avis a été mis à jour !",
      });
      setIsRateModalVisible(false);
      const updatedReviews = await getMyReviews();
      setMyReviews(updatedReviews);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'avis :", error);
      Toast.show({
        type: "error",
        text1: "Impossible de mettre à jour la review.",
      });
    }
  };

  const handleDeleteReview = async () => {
    if (!editingReview) return;
    Alert.alert(
      "Confirmation",
      "Voulez-vous vraiment supprimer cet avis ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = await getUserIdFromToken();
              if (!userId) {
                Toast.show({
                  type: "error",
                  text1: "ID utilisateur non trouvé.",
                });
                return;
              }
              await deleteReview(userId, editingReview.id);
              Toast.show({
                type: "success",
                text1: "Avis supprimé avec succès.",
              });
              setEditingReview(null);
              setIsEditMode(false);
              setRating(0);
              setComment("");
              setIsRateModalVisible(false);
              const updatedReviews = await getMyReviews();
              setMyReviews(updatedReviews);
            } catch (error) {
              console.error("Erreur lors de la suppression de l'avis :", error);
              Toast.show({
                type: "error",
                text1: "Impossible de supprimer la review.",
              });
            }
          }
        }
      ]
    );
  };

  const renderCoachItem = ({ item }: { item: User }) => {
    // Traitement de l'URL de l'image
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
        style={[styles.coachItem, selectedCoach?.id === item.id && styles.selectedCoachItem]}
        onPress={() => handleViewCoach(item.id)}
        activeOpacity={0.7}
      >
        {/* Image du coach avec indicateur de statut */}
        <View style={styles.avatarWrapper}>
          <Image source={avatarSource} style={styles.avatar} />
          {item.active && <View style={styles.activeIndicator} />}
        </View>
        
        {/* Contenu principal */}
        <View style={styles.contentContainer}>
          <Text style={[styles.coachName, selectedCoach?.id === item.id && styles.selectedCoachName]}>
            {item.username}
          </Text>
          <Text style={styles.roleBadge}>{item.role}</Text>
          
          {/* Icônes d'actions */}
          <View style={styles.iconRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleInviteCoach(item.id)} 
              disabled={invitationSent}
            >
              <FontAwesome5 
                name="handshake" 
                size={16} 
                color={invitationSent ? "#ccc" : "#fff"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.messageButton]} 
              onPress={() => handleSendMessage(item)}
            >
              <FontAwesome5 name="envelope" size={16} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.rateButton]} 
              onPress={() => openRateModal(item)}
            >
              <FontAwesome5 name="star" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Flèche indiquant qu'on peut voir les détails */}
        <FontAwesome5 name="chevron-right" size={16} color="#999" style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <NavbarUser />
      {/* Header avec dégradé */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nos Coachs Experts</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setIsMessageModalVisible(true)}
        >
          <FontAwesome5 name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Barre de recherche améliorée */}
        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={18} color="rgba(195, 0, 0, 0.60)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un coach par nom..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <FontAwesome5 name="times-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Nombre de résultats */}
        <View style={styles.resultCountContainer}>
          <Text style={styles.resultCount}>
            {filteredCoaches.length} {filteredCoaches.length > 1 ? 'coachs disponibles' : 'coach disponible'}
          </Text>
        </View>
        
        {/* Liste des coachs */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="rgba(195, 0, 0, 0.60)" />
            <Text style={styles.loadingText}>Chargement des coachs...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCoaches}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCoachItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="user-slash" size={50} color="#d1d5db" />
                <Text style={styles.emptyText}>Aucun coach trouvé</Text>
                <Text style={styles.emptySubText}>Essayez avec un autre terme de recherche</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal détails du coach */}
      <Modal visible={isViewModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedCoach && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Profil du Coach</Text>
                  <TouchableOpacity 
                    onPress={() => setIsViewModalVisible(false)}
                  >
                    <FontAwesome5 name="times" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.profileHeader}>
                  <Image 
                    source={
                      selectedCoach.photoUrl && selectedCoach.photoUrl.trim().length > 0
                        ? {
                            uri: selectedCoach.photoUrl.startsWith("http")
                              ? selectedCoach.photoUrl.replace("localhost:8081", "192.168.1.139:8080")
                              : `http://192.168.1.139:8080/${selectedCoach.photoUrl}`
                          }
                        : require("../../assets/images/profile.jpg")
                    } 
                    style={styles.detailAvatar} 
                  />
                  <Text style={styles.profileName}>{selectedCoach.username}</Text>
                  
                  {/* Composant de notation moyenne */}
                  <View style={styles.ratingContainer}>
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome5 
                          key={star}
                          name="star" 
                          size={16} 
                          solid={star <= Math.round(averageRating)}
                          color={star <= Math.round(averageRating) ? "#FFD700" : "#D3D3D3"} 
                          style={styles.starIcon}
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingText}>{averageRating} ({coachReviews.length} avis)</Text>
                  </View>
                  
                  <View style={styles.profileBadge}>
                    <Text style={styles.profileBadgeText}>{selectedCoach.role}</Text>
                  </View>
                  <View style={styles.statusIndicator}>
                    <View style={[styles.statusDot, {backgroundColor: selectedCoach.active ? '#10b981' : '#ef4444'}]} />
                    <Text style={styles.statusText}>{selectedCoach.active ? 'Disponible' : 'Indisponible'}</Text>
                  </View>
                </View>
                
                <View style={styles.profileDetails}>
                  <View style={styles.detailRow}>
                    <FontAwesome5 name="envelope" size={16} color="rgba(195, 0, 0, 0.60)" style={styles.detailIcon} />
                    <Text style={styles.detailText}>{selectedCoach.email}</Text>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.inviteButton]}
                    onPress={() => {
                      setIsViewModalVisible(false);
                      handleInviteCoach(selectedCoach.id);
                    }}
                    disabled={invitationSent}
                  >
                    <FontAwesome5 name="handshake" size={16} color="#fff" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>Inviter</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.messageModalButton]}
                    onPress={() => {
                      setIsViewModalVisible(false);
                      handleSendMessage(selectedCoach);
                    }}
                  >
                    <FontAwesome5 name="envelope" size={16} color="#fff" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>Message</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.rateModalButton]}
                    onPress={() => {
                      setIsViewModalVisible(false);
                      openRateModal(selectedCoach);
                    }}
                  >
                    <FontAwesome5 name="star" size={16} color="#fff" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>Évaluer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal pour ajouter/modifier/supprimer une review */}
      <Modal visible={isRateModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedCoach && (
              <>
                <View style={[styles.modalHeader, {backgroundColor: '#fbbf24'}]}>
                  <Text style={styles.modalTitle}>
                    {isEditMode
                      ? `Modifier l'évaluation`
                      : `Évaluer ${selectedCoach.username}`}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setIsRateModalVisible(false)}
                  >
                    <FontAwesome5 name="times" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.rateCoachHeader}>
                  <Image 
                    source={
                      selectedCoach.photoUrl && selectedCoach.photoUrl.trim().length > 0
                        ? {
                            uri: selectedCoach.photoUrl.startsWith("http")
                              ? selectedCoach.photoUrl.replace("localhost:8081", "192.168.1.139:8080")
                              : `http://192.168.1.139:8080/${selectedCoach.photoUrl}`
                          }
                        : require("../../assets/images/profile.jpg")
                    } 
                    style={styles.rateCoachAvatar} 
                  />
                  <Text style={styles.rateCoachName}>{selectedCoach.username}</Text>
                </View>
                
                <Text style={styles.ratingLabel}>Votre note :</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <FontAwesome5
                        name="star"
                        solid={star <= rating}
                        size={36}
                        color={star <= rating ? "#fbbf24" : "#e5e7eb"}
                        style={styles.starIcon}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.commentLabel}>Votre commentaire :</Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Partagez votre expérience avec ce coach..."
                  style={styles.commentInput}
                  multiline
                  placeholderTextColor="#9ca3af"
                />
                
                <View style={styles.reviewButtonContainer}>
                  {isEditMode ? (
                    <>
                      <TouchableOpacity style={styles.updateButton} onPress={handleUpdateReview}>
                        <FontAwesome5 name="pen" size={17} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Mettre à jour</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteReview}>
                        <FontAwesome5 name="trash" size={16} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Supprimer</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity 
                      style={styles.submitReviewButton} 
                      onPress={handleCreateReview}
                    >
                      <FontAwesome5 name="paper-plane" size={16} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Envoyer mon évaluation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal pour envoyer un message */}
      <Modal visible={isMessageModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, {backgroundColor: '#06b6d4'}]}>
              <Text style={styles.modalTitle}>Demande de réinitialisation</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setIsMessageModalVisible(false)}
              >
                <FontAwesome5 name="times" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              contentContainerStyle={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.messageFormContainer}>
                <FontAwesome5 name="envelope-open-text" size={36} color="#06b6d4" style={styles.messageIcon} />
                <Text style={styles.messageFormTitle}>Envoyer une demande à l'administration</Text>
                <Text style={styles.messageFormSubtitle}>
                  Expliquez votre situation et pourquoi vous souhaitez réinitialiser vos invitations
                </Text>
                
                <TextInput
                  style={styles.messageInput}
                  placeholder="Rédigez votre message ici..."
                  placeholderTextColor="#9ca3af"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                />
                
                <TouchableOpacity
                  style={styles.sendMessageButton}
                  onPress={async () => {
                    try {
                      const userId = await getUserIdFromToken();
                      if (!userId) {
                        Toast.show({
                          type: "error",
                          text1: "ID utilisateur non trouvé.",
                        });
                        return;
                      }
                      await requestResetInvitation(userId, messageText);
                      Toast.show({
                        type: "success",
                        text1: "Demande de réinitialisation envoyée !",
                        position: "top",
                      });
                      setInvitationSent(false);
                      setMessageText("");
                      setIsMessageModalVisible(false);
                    } catch (error: any) {
                      Toast.show({
                        type: "error",
                        text1: error.message || "Erreur lors de l'envoi de la demande.",
                        position: "top",
                      });
                    }
                  }}
                >
                  <FontAwesome5 name="paper-plane" size={18} color="#fff" style={styles.sendButtonIcon} />
                  <Text style={styles.sendButtonText}>Envoyer la demande</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <FooterR />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.60)",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(195, 0, 0, 0.60)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  resultCountContainer: {
    marginBottom: 16,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  
  resultCount: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6b7280",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  // Styles pour la carte du coach
  coachItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  selectedCoachItem: {
    backgroundColor: "#f0f9ff",
    borderColor: "rgba(195, 0, 0, 0.60)",
    borderWidth: 1,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgb(251, 191, 36)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9,
    marginRight: 8,
   height: 40,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgb(251, 140, 36)', // Version plus orangée de l'ambre pour différencier
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9,
    height: 40,
  },
  buttonIcon: {
    marginRight: 6,
   
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    
  },
   avatarWrapper: {
    position: "relative",
    marginRight: 16,
  },
  // Si vous souhaitez les aligner côte à côte dans un conteneur:
  buttonContainer: {
    display: "flex",
    marginVertical: 8,
    gap:10,
  },
 
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  activeIndicator: {
    position: "absolute",
    width: 14,
    height: 14,
    backgroundColor: "#10b981",
    borderRadius: 7,
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: "#fff",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  coachName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 6,
  },
  selectedCoachName: {
    color: "rgba(195, 0, 0, 0.60)",
  },
  roleBadge: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 10,
    fontWeight: "500",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(195, 0, 0, 0.60)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  messageButton: {
    backgroundColor: "#06b6d4",
  },
  rateButton: {
    backgroundColor: "#fbbf24",
  },
  chevron: {
    marginLeft: 8,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(195, 0, 0, 0.60)",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
  },

// Profile header dans la modale de détails
profileHeader: {
  alignItems: "center",
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#e5e7eb",
},
detailAvatar: {
  width: 120,
  height: 120,
  borderRadius: 60,
  borderWidth: 3,
  borderColor: "#e5e7eb",
  marginBottom: 16,
},
profileName: {
  fontSize: 22,
  fontWeight: "bold",
  color: "#111827",
  marginBottom: 8,
},
profileBadge: {
  backgroundColor: "#e0e7ff",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 12,
  marginBottom: 8,
},
profileBadgeText: {
  color: "rgba(195, 0, 0, 0.60)",
  fontWeight: "600",
  fontSize: 14,
},
statusIndicator: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 4,
},
statusDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  marginRight: 6,
},
statusText: {
  fontSize: 14,
  color: "#6b7280",
},

// Section détails contact
profileDetails: {
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#e5e7eb",
},
detailRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
},
detailIcon: {
  marginRight: 12,
},
detailText: {
  fontSize: 16,
  color: "#374151",
},

// Boutons d'action dans la modale de détails
modalActions: {
  flexDirection: "row",
  justifyContent: "space-between",
  padding: 20,
},
modalActionButton: {
  flex: 1,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 12,
  borderRadius: 12,
  marginHorizontal: 4,
},
inviteButton: {
  backgroundColor: "rgba(195, 0, 0, 0.60)",
},
messageModalButton: {
  backgroundColor: "#06b6d4",
},
rateModalButton: {
  backgroundColor: "#fbbf24",
},
actionButtonIcon: {
  marginRight: 8,
},
actionButtonText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 15,
},

// Styles pour la modale de rating
rateCoachHeader: {
  alignItems: "center",
  padding: 20,
},
rateCoachAvatar: {
  width: 80,
  height: 80,
  borderRadius: 40,
  marginBottom: 10,
},
rateCoachName: {
  fontSize: 18,
  fontWeight: "600",
  color: "#111827",
},
ratingLabel: {
  fontSize: 16,
  fontWeight: "600",
  color: "#374151",
  marginLeft: 20,
  marginBottom: 8,
},
starsContainer: {
  flexDirection: "row",
  justifyContent: "center",
  marginBottom: 24,
},
starIcon: {
  marginHorizontal: 8,
},
commentLabel: {
  fontSize: 16,
  fontWeight: "600",
  color: "#374151",
  marginLeft: 20,
  marginBottom: 8,
},
commentInput: {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 12,
  padding: 16,
  margin: 20,
  height: 120,
  textAlignVertical: "top",
  backgroundColor: "#f9fafb",
  fontSize: 16,
  color: "#374151",
},
reviewButtonContainer: {
  padding: 20,
  paddingLeft: 40,
  paddingTop: 0,
  display: "flex",
  flexDirection: "row", // Ajout de cette propriété pour l'alignement horizontal
  gap: 10,
  height: 60,
},
submitReviewButton: {
  backgroundColor: "#fbbf24",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 14,
  borderRadius: 12,
  padding:10,
},

// Styles pour la modale de message de réinitialisation
messageFormContainer: {
  padding: 20,
  alignItems: "center",
},
messageIcon: {
  marginBottom: 16,
},
messageFormTitle: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#111827",
  marginBottom: 8,
  textAlign: "center",
},
messageFormSubtitle: {
  fontSize: 14,
  color: "#6b7280",
  marginBottom: 24,
  textAlign: "center",
  paddingHorizontal: 10,
},
messageInput: {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 12,
  padding: 16,
  width: "100%",
  height: 150,
  textAlignVertical: "top",
  backgroundColor: "#f9fafb",
  fontSize: 16,
  color: "#374151",
  marginBottom: 20,
},
sendMessageButton: {
  backgroundColor: "#06b6d4",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 14,
  borderRadius: 12,
  width: "100%",
},
sendButtonIcon: {
  marginRight: 8,
},
sendButtonText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 16,
},
ratingContainer: {
  flexDirection: 'column',
  alignItems: 'center',
  marginVertical: 8,
},
ratingText: {
  color: '#666',
  fontSize: 14,
  fontWeight: '500',
}
});