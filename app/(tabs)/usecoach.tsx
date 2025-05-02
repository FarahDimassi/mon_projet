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

// Nouvelle palette de couleurs
const COLORS = {
  primary: "rgba(195, 0, 0, 0.6)",
  primaryLight: "rgba(195, 0, 0, 0.2)",
  primaryDark: "rgba(155, 0, 0, 0.2)",
  secondary: "#4A6FE5",
  accent: "#FF5252",
  background: "#F8F9FF",
  cardBg: "#FFFFFF",
  text: "#2D3748",
  textLight: "#8A94A6",
  gold: "#FFD700",
  goldLight: "#FFF0B3",
  border: "#EDF0F7",
  shadow: "rgba(165, 20, 20, 0.25)"
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

const UseCoach: React.FC = () => {
  const [groupedReviews, setGroupedReviews] = useState<GroupedReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupedReviews | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

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

        // Trier par note moyenne (descendant)
        finalGroups.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
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
    if (diffInDays === 1) return "Hier";
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

  // Génère une couleur de fond aléatoire mais stable pour chaque utilisateur
  const getUserColor = (userId: number): [string, string] => {
    const colors: [string, string][] = [
      [COLORS.primary, 'rgba(250, 80, 80, 0.9)'], // Rouge principal
      ['rgba(195, 30, 60, 0.7)', 'rgba(230, 60, 80, 0.9)'], // Rouge-rose
      ['rgba(180, 20, 20, 0.7)', 'rgba(230, 50, 50, 0.9)'], // Rouge profond
      ['rgba(195, 0, 0, 0.4)', 'rgba(255, 80, 50, 0.9)'], // Rouge-orange
      ['rgba(150, 0, 20, 0.6)', 'rgba(210, 30, 50, 0.9)'], // Bordeaux
      ['rgba(195, 50, 50, 0.6)', 'rgba(230, 90, 90, 0.9)'], // Rouge clair
    ];
    return colors[userId % colors.length];
  };

  // Header avec le résumé des avis
  const renderHeader = () => {
    if (groupedReviews.length === 0) return null;
    
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.ratingCircle}>
          <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
       
          <View style={styles.smallStarsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text
                key={star}
                style={star <= Math.round(averageRating) ? styles.smallStarFilled : styles.smallStarEmpty}
              >
                ★
              </Text>
            ))}
          </View> </View>
     
        <View style={styles.statsContainer}>
          <Text style={styles.statsLabel}>Note moyenne basée sur</Text>
          <Text style={styles.statsValue}>{totalReviews} avis</Text>
          <Text style={styles.statsLabel}>de {groupedReviews.length} utilisateurs</Text>
        </View>
      </View>
    );
  };

  // Affiche une carte utilisateur avec une review représentative
  const renderUserCard = ({ item }: { item: GroupedReviews }) => {
    const representativeReview = item.reviews[0];
    const avatarUrl = buildAvatarUrl(item.user.photoUrl);
    const gradientColors = getUserColor(item.userId);
    
    return (
      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedGroup(item);
          setIsModalVisible(true);
        }}
      >
        <View style={styles.cardContent}>
          <View style={styles.userHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={gradientColors}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              </LinearGradient>
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewCount}>{item.reviews.length}</Text>
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.username}>
                {item.user.username || `Utilisateur ${item.userId}`}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text
                    key={star}
                    style={
                      star <= (item.averageRating || 0)
                        ? styles.starFilled
                        : styles.starEmpty
                    }
                  >
                    ★
                  </Text>
                ))}
                <Text style={styles.ratingText}>
                  {(item.averageRating || 0).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
          
          <LinearGradient
            colors={['#FFF', COLORS.primaryLight]}
            style={styles.reviewSummary}
          >
            <Text style={styles.comment} numberOfLines={2}>
              "{representativeReview.comment}"
            </Text>
            <View style={styles.reviewMeta}>
            </View>
          </LinearGradient>
          
          {item.reviews.length > 1 && (
            <View style={styles.moreReviewsContainer}>
              <Text style={styles.moreReviewsText}>
                +{item.reviews.length - 1} autres avis
              </Text>
              <MaterialIcons name="keyboard-arrow-right" size={20} color={COLORS.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Contenu de la modal affichant tous les avis de l'utilisateur sélectionné
  const renderModalContent = () => {
    if (!selectedGroup) return null;
    const avatarUrl = buildAvatarUrl(selectedGroup.user.photoUrl);
    const gradientColors = getUserColor(selectedGroup.userId);

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setIsModalVisible(false)}
          >
            <AntDesign name="close" size={22} color="#fff" />
          </TouchableOpacity>
          
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeaderGradient}
          >
            <View style={styles.modalHeaderContent}>
              <Image source={{ uri: avatarUrl }} style={styles.modalAvatar} />
              <View style={styles.modalUserInfo}>
                <Text style={styles.modalUsername}>
                  {selectedGroup.user.username || `Utilisateur ${selectedGroup.userId}`}
                </Text>
                <View style={styles.modalUserStats}>
                  <View style={styles.modalRatingDisplay}>
                    <View style={styles.modalStarsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text
                          key={star}
                          style={star <= Math.round(selectedGroup.averageRating || 0) ? styles.modalStarFilled : styles.modalStarEmpty}
                        >
                          ★
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.modalRatingValue}>
                      {(selectedGroup.averageRating || 0).toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.modalReviewCounter}>
                    <Text style={styles.modalReviewCountValue}>{selectedGroup.reviews.length}</Text>
                    <Text style={styles.modalReviewCountLabel}>
                      {selectedGroup.reviews.length > 1 ? 'avis' : 'avis'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
          
          <ScrollView style={styles.modalReviews}>
            {selectedGroup.reviews.map((rev, index) => (
              <View key={rev.id} style={[
                styles.modalReviewItem, 
                index % 2 === 0 ? styles.modalReviewItemEven : styles.modalReviewItemOdd
              ]}>
                <View style={styles.modalReviewHeader}>
                  <View style={styles.modalReviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text
                        key={star}
                        style={star <= rev.rating ? styles.starFilled : styles.starEmpty}
                      >
                        ★
                      </Text>
                    ))}
                    <Text style={styles.modalReviewRatingText}>{rev.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.modalReviewDate}>
                    {getRelativeTime(rev.createdAt)}
                  </Text>
                </View>
                <Text style={styles.modalComment}>"{rev.comment}"</Text>
              </View>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.modalDoneButton}
            onPress={() => setIsModalVisible(false)}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.modalDoneButtonText}>Fermer</Text>
            </LinearGradient>
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
    <Text style={styles.title}>  ★ Avis des clients  ★</Text>
      {/*   <Text style={styles.subtitle}>Découvrez ce que vos clients pensent de vous</Text> */}

      
      <View style={styles.content}>
        {groupedReviews.length === 0 ? (
          <View style={styles.emptyStateContainer}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="rate-review" size={88} color="#FF8A80" />
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
        
        {renderModalContent()}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
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
  title: {
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 48,
    textAlign: "center",
    color: "rgba(195, 0, 0, 0.75)",
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    top:36,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(195, 0, 0, 0.1)',
  },
  ratingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    backgroundColor:"rgba(245,247,250,1.00)",
    borderWidth: 3,
    borderColor: 'rgba(195, 0, 0, 0.5)',
  },
  ratingNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'rgba(155, 0, 0, 0.6)',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  smallStarsContainer: {
    flexDirection: 'row',
    marginTop: 3,
  },
  smallStarFilled: {
    fontSize: 12,
    color: COLORS.gold,
    marginHorizontal: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  smallStarEmpty: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 1,
  },
  statsContainer: {
    flex: 1,
    marginLeft: 18,
    justifyContent: 'center',
  },
  statsLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
 
  listContainer: {
    paddingBottom: 20,
  },
  // Carte utilisateur principale
  userCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(195, 0, 0, 0.1)',
  },
  cardContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: 'center',
  },
  starFilled: {
    fontSize: 16,
    color: COLORS.gold,
    marginRight: 2,
  },
  starEmpty: {
    fontSize: 16,
    color: "#E2E8F0",
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reviewBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },
  reviewCount: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  reviewSummary: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  comment: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    fontStyle: "italic",
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  moreReviewsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 0, 0, 0.1)',
  },
  moreReviewsText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 10, 10, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    width: "100%",
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    maxHeight: "90%",
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeaderGradient: {
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatar: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  modalUserInfo: {
    marginLeft: 16,
    flex: 1,
  },
  modalUsername: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalUserStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRatingDisplay: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    flexDirection: 'column',
    alignItems: 'center',
  },
  modalRatingValue: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  modalStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalStarFilled: {
    fontSize: 12,
    color: COLORS.gold,
    marginHorizontal: 1,
  },
  modalStarEmpty: {
    fontSize: 12,
    color: "#CCD2E3",
    marginHorizontal: 1,
  },
  modalReviewCounter: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalReviewCountValue: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalReviewCountLabel: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: 'center',
  },
  modalReviews: {
    padding: 16,
    maxHeight: 400,
  },
  modalReviewItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modalReviewItemEven: {
    borderLeftColor: COLORS.primary,
    backgroundColor: 'rgba(255, 245, 245, 0.5)',
  },
  modalReviewItemOdd: {
    borderLeftColor: 'rgba(195, 0, 0, 0.6)',
    backgroundColor: '#F8F9FF',
  },
  modalReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalReviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalReviewRatingText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalReviewDate: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  modalComment: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    fontStyle: "italic",
  },
  modalDoneButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginVertical: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    backgroundColor: '#FFF0F0',
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
