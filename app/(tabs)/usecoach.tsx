import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,

} from "react-native";
import { 
  getReviewsByCoachId, 
  getUserIdFromToken, 
  getUserByIdForCoach 
} from "../../utils/authService";
import FooterC from "../../components/FooterC";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, AntDesign, MaterialIcons } from '@expo/vector-icons';
import NavbarCoach from "@/components/NavbarCoach";

const { width } = Dimensions.get('window');

// Palette de couleurs moderne
const COLORS = {
  primary: "#FF4757", // Rouge vif
  primaryLight: "rgba(255, 71, 87, 0.2)",
  primaryDark: "rgba(235, 51, 67, 0.2)",
  secondary: "#4A6FE5",
  accent: "#FF5252",
  background: "#F8F9FF",
  cardBg: "#FFFFFF",
  text: "#2D3748",
  textLight: "#8A94A6",
  gold: "#FFC107", // Plus doré comme dans l'image
  goldLight: "#FFF0B3",
  border: "#EDF0F7",
  shadow: "rgba(165, 20, 20, 0.25)",
  progressBarBg: "#ECECEC", // Arrière-plan gris clair pour les barres de progression
  blue: "#4A6FE5",
  blueLight: "#EBF0FF",
};

interface UserInfo {
  id: number;
  username: string;
  photoUrl?: string;
}

interface Review {
  id: number;
  userId: number;
  coachId: number;
  rating: number;
  comment: string;
  createdAt?: string;
  user?: UserInfo;
}

interface GroupedReviews {
  userId: number;
  user: UserInfo;
  reviews: Review[];
  averageRating?: number;
}

// Distribution des notes
interface RatingDistribution {
  5: number; // Excellent
  4: number; // Bon
  3: number; // Moyen
  2: number; // Passable
  1: number; // Mauvais
}

const UseCoach: React.FC = () => {
  const [groupedReviews, setGroupedReviews] = useState<GroupedReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupedReviews | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState('review'); // Nouvel état pour les onglets (product/review)
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution>({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });

  useEffect(() => {
    async function fetchCoachReviews() {
      const coachId = await getUserIdFromToken();
      if (!coachId) {
        console.error("Coach ID non trouvé dans le token");
        setLoading(false);
        return;
      }
      try {
        const reviews: Review[] = await getReviewsByCoachId(coachId);
        const enrichedReviews = await Promise.all(
          reviews.map(async (review) => {
            try {
              const user = await getUserByIdForCoach(review.userId);
              return { 
                ...review, 
                user,
                // Si pas de date réelle, on en simule une pour l'affichage
                createdAt: review.createdAt || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              };
            } catch (error) {
              console.error(`Erreur pour l'utilisateur ${review.userId} :`, error);
              return review;
            }
          })
        );

        // Calculer le nombre total d'avis et la note moyenne
        setTotalReviews(enrichedReviews.length);
        const totalRating = enrichedReviews.reduce((sum, rev) => sum + rev.rating, 0);
        setAverageRating(totalRating / enrichedReviews.length || 0);
        
        // Calculer la distribution des notes
        const distribution: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        enrichedReviews.forEach(review => {
          distribution[review.rating as keyof RatingDistribution] += 1;
        });
        setRatingDistribution(distribution);
        
        // Regrouper les reviews par userId
        const groupedMap = new Map<number, GroupedReviews>();
        enrichedReviews.forEach((rev) => {
          if (!groupedMap.has(rev.userId) && rev.user) {
            groupedMap.set(rev.userId, {
              userId: rev.userId,
              user: rev.user,
              reviews: [rev],
            });
          } else if (groupedMap.has(rev.userId)) {
            groupedMap.get(rev.userId)!.reviews.push(rev);
          }
        });

        // Calculer la note moyenne pour chaque groupe
        const finalGroups = Array.from(groupedMap.values()).map(group => ({
          ...group,
          averageRating: group.reviews.reduce((sum, rev) => sum + rev.rating, 0) / group.reviews.length
        }));

        // Trier par date de l'avis plus récent en premier
        finalGroups.sort((a, b) => {
          const dateA = new Date(a.reviews[0].createdAt || '').getTime();
          const dateB = new Date(b.reviews[0].createdAt || '').getTime();
          return dateB - dateA;
        });
        
        setGroupedReviews(finalGroups);
      } catch (error) {
        console.error("Erreur lors de la récupération des reviews :", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCoachReviews();
  }, []);

  // Format relative date
  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "Récemment";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Aujourd'hui";
    if (diffInDays === 1) return "Il y a 1 jour";
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaines`;
    if (diffInDays < 365) return `Il y a ${Math.floor(diffInDays / 30)} mois`;
    return `Il y a ${Math.floor(diffInDays / 365)} ans`;
  };

  // Fonction de construction de l'URL d'avatar à partir de photoUrl
  const buildAvatarUrl = (rawUrl?: string) => {
    const baseUrl = "http://192.168.1.139:8080/";
    if (rawUrl && rawUrl.trim().length > 0) {
      return rawUrl.startsWith("http")
        ? rawUrl.replace("localhost:8081", "192.168.1.139:8080")
        : baseUrl + rawUrl;
    }
    return "https://dummyimage.com/200x200/cccccc/ffffff&text=User";
  };

  // Header avec le résumé des avis (nouveau design)
  const renderHeader = () => {
    if (groupedReviews.length === 0) return null;
    
    // Calculer le pourcentage pour chaque note
    const getPercentage = (rating: number) => {
      return totalReviews > 0 
        ? (ratingDistribution[rating as keyof RatingDistribution] / totalReviews) * 100 
        : 0;
    };
    
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Note globale</Text>
        
        <View style={styles.ratingOverviewContainer}>
          {/* Score moyen et étoiles */}
          <View style={styles.averageRatingContainer}>
            <Text style={styles.averageRatingNumber}>{averageRating.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Text
                  key={star}
                  style={star <= Math.round(averageRating) ? styles.starFilled : styles.starEmpty}
                >
                  ★
                </Text>
              ))}
            </View>
            <Text style={styles.totalReviewsText}>Basé sur {totalReviews} avis</Text>
          </View>
          
          {/* Distribution des notes avec barres de progression */}
          <View style={styles.ratingDistributionContainer}>
            {/* Excellent - 5 étoiles */}
            <View style={styles.ratingBarContainer}>
              <Text style={styles.ratingLabel}>Excellent</Text>
              <View style={styles.progressBarWrapper}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${getPercentage(5)}%`, backgroundColor: COLORS.primary }
                  ]}
                />
              </View>
            </View>
            
            {/* Bon - 4 étoiles */}
            <View style={styles.ratingBarContainer}>
              <Text style={styles.ratingLabel}>Bon</Text>
              <View style={styles.progressBarWrapper}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${getPercentage(4)}%`, backgroundColor: COLORS.primary }
                  ]}
                />
              </View>
            </View>
            
            {/* Moyen - 3 étoiles */}
            <View style={styles.ratingBarContainer}>
              <Text style={styles.ratingLabel}>Moyen</Text>
              <View style={styles.progressBarWrapper}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${getPercentage(3)}%`, backgroundColor: COLORS.primary }
                  ]}
                />
              </View>
            </View>
            
            {/* Passable - 2 étoiles */}
            <View style={styles.ratingBarContainer}>
              <Text style={styles.ratingLabel}>Passable</Text>
              <View style={styles.progressBarWrapper}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${getPercentage(2)}%`, backgroundColor: COLORS.primary }
                  ]}
                />
              </View>
            </View>
            
            {/* Mauvais - 1 étoile */}
            <View style={styles.ratingBarContainer}>
              <Text style={styles.ratingLabel}>Mauvais</Text>
              <View style={styles.progressBarWrapper}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${getPercentage(1)}%`, backgroundColor: COLORS.primary }
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Affiche une carte utilisateur avec une review représentative
  const renderUserCard = ({ item }: { item: GroupedReviews }) => {
    const representativeReview = item.reviews[0];
    const avatarUrl = buildAvatarUrl(item.user.photoUrl);
    
    return (
      <TouchableOpacity
        style={styles.reviewCard}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedGroup(item);
          setIsModalVisible(true);
        }}
      >
        <View style={styles.reviewCardHeader}>
          <Image source={{ uri: avatarUrl }} style={styles.reviewerAvatar} />
          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>
              {item.user.username || `Utilisateur ${item.userId}`}
            </Text>
            <View style={styles.reviewMeta}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text
                    key={star}
                    style={star <= representativeReview.rating ? styles.starFilled : styles.starEmpty}
                  >
                    ★
                  </Text>
                ))}
              </View>
              <Text style={styles.reviewDate}>
                {getRelativeTime(representativeReview.createdAt)}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.reviewComment}>
          {representativeReview.comment}
        </Text>
        
        {item.reviews.length > 1 && (
          <TouchableOpacity style={styles.moreReviewsButton}>
            <Text style={styles.moreReviewsText}>
              +{item.reviews.length - 1} autres avis
            </Text>
            <MaterialIcons name="keyboard-arrow-right" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Modal complètement refait avec un design épuré
  const renderUserProfileModal = () => {
    if (!selectedGroup) return null;
    const avatarUrl = buildAvatarUrl(selectedGroup.user.photoUrl);

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.newModalContainer}>
          {/* En-tête épuré */}
          <View style={styles.newModalHeader}>
            <View style={styles.newModalHeaderLeft}>
              <Image source={{ uri: avatarUrl }} style={styles.newModalAvatar} />
              <View style={styles.newModalUserInfo}>
                <Text style={styles.newModalUsername}>
                  {selectedGroup.user.username || `Utilisateur ${selectedGroup.userId}`}
                </Text>
                <View style={styles.newModalRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text
                      key={star}
                      style={star <= Math.round(selectedGroup.averageRating || 0) ? styles.newModalStarFilled : styles.newModalStarEmpty}
                    >
                      ★
                    </Text>
                  ))}
                  <Text style={styles.newModalAverageRating}>
                    {(selectedGroup.averageRating || 0).toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.newModalCloseButton}
              onPress={() => setIsModalVisible(false)}
            >
              <AntDesign name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          
          {/* Séparateur */}
          <View style={styles.newModalDivider} />
          
          {/* Liste des avis avec design épuré */}
          <ScrollView style={styles.newModalReviewsList}>
            {selectedGroup.reviews.map((review, index) => (
              <View key={review.id} style={styles.newModalReviewItem}>
                <View style={styles.newModalReviewHeader}>
                  <View style={styles.newModalReviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text
                        key={star}
                        style={star <= review.rating ? styles.starFilled : styles.starEmpty}
                      >
                        ★
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.newModalReviewDate}>
                    {getRelativeTime(review.createdAt)}
                  </Text>
                </View>
                
                <Text style={styles.newModalReviewComment}>
                  "{review.comment}"
                </Text>
                
                {index < selectedGroup.reviews.length - 1 && (
                  <View style={styles.newModalReviewDivider} />
                )}
              </View>
            ))}
          </ScrollView>
          
          {/* Bouton simple */}
          <TouchableOpacity
            style={styles.newModalButton}
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={styles.newModalButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des avis...</Text>
        </View>
        <FooterC />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <NavbarCoach />
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Avis des clients</Text>
        
        {groupedReviews.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="rate-review" size={88} color={COLORS.primary} />
            </View>
            <Text style={styles.noReviewsText}>Aucun avis pour le moment</Text>
            <Text style={styles.emptyStateSubtext}>
              Les avis de vos clients apparaîtront ici dès qu'ils partageront leur expérience.
            </Text>
            <View style={styles.divider} />
            <Text style={styles.tipText}>
              Conseil : Encouragez vos clients à laisser un avis après chaque service pour améliorer votre visibilité !
            </Text>
          </View>
        ) : (
          <FlatList
            data={groupedReviews}
            keyExtractor={(item) => item.userId.toString()}
            renderItem={renderUserCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderHeader}
          />
        )}
      </View>
      
      <FooterC />
      
      <Modal visible={isModalVisible} transparent animationType="slide">
        {renderUserProfileModal()}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Styles de base
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 20,
    color: COLORS.text,
  },

  // Carte de résumé des avis
  summaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 15,
  },
  ratingOverviewContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  averageRatingContainer: {
    alignItems: "center",
    width: 120,
    marginRight: 15,
  },
  averageRatingNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: 'center',
    marginBottom: 5,
  },
  starFilled: {
    fontSize: 18,
    color: COLORS.gold,
    marginHorizontal: 1,
  },
  starEmpty: {
    fontSize: 18,
    color: "#DFE1E6",
    marginHorizontal: 1,
  },
  totalReviewsText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  ratingDistributionContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  ratingBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingLabel: {
    width: 70,
    fontSize: 12,
    color: COLORS.textLight,
    marginRight: 8,
  },
  progressBarWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.progressBarBg,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  
  // Carte de review individuelle
  reviewCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewCardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  moreReviewsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  moreReviewsText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  
  // Styles pour le nouveau modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  newModalContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '85%',
    width: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  newModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: COLORS.primary,
  },
  newModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  newModalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  newModalUserInfo: {
    justifyContent: 'center',
  },
  newModalUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    color: "#FFFFFF",
    marginBottom: 5,
  },
  newModalRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newModalStarFilled: {
    color: COLORS.gold,
    fontSize: 16,
    marginRight: 1,
  },
  newModalStarEmpty: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    marginRight: 1,
  },
  newModalAverageRating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "#FFFFFF",
    marginLeft: 6,
  },
  newModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: 'center',
    justifyContent: 'center',
  },
  newModalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  newModalReviewsList: {
    padding: 20,
    paddingTop: 10,
  },
  newModalReviewItem: {
    marginBottom: 24,
  },
  newModalReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newModalReviewRating: {
    flexDirection: 'row',
  },
  newModalReviewDate: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  newModalReviewComment: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  newModalReviewDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 18,
  },
  newModalButton: {
    margin: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  newModalButtonText: {
    color: "#FFFFFF",
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // État vide
  listContainer: {
    paddingBottom: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noReviewsText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    width: '100%',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default UseCoach;