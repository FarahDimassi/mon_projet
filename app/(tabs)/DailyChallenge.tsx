import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Modal
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import ProtectedRoute from "../../utils/ProtectedRoute";
import NavbarIA from "@/components/NavbarIA";
import Footer from "../../components/Footer";
import { getUserIdFromToken, getToken } from "@/utils/authService";
import * as Haptics from 'expo-haptics';
import LottieView from "lottie-react-native";
import { useFocusEffect } from "expo-router";
import Toast from 'react-native-toast-message';
import NavbarUser from "@/components/NavbarUser";
import FooterR from "@/components/FooterR";


// Clé API Gemini
const GEMINI_API_KEY = "AIzaSyAv-z7qo8OT1q1z90VqKlHQ2TgRsB5br0w";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const API_URL = "http://192.168.1.139:8080";

// Interface pour les défis
interface Challenge {
  id: string;
  type: "sport" | "nutrition";
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  completed: boolean;
  date: string;
}

// Interface pour les bonus
interface Bonus {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  unlocked: boolean;
}

export default function DailyChallenge() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);

  // Animation pour les points gagnés
  const animatePoints = (points: number) => {
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 1500,
      easing: Easing.elastic(1),
      useNativeDriver: true
    }).start();

    Toast.show({
      type: 'success',
      text1: 'Défi complété !',
      text2: `+${points} points ajoutés à votre score`,
      visibilityTime: 3000,
      position: 'bottom',
    });
  };

  // Effet pour charger les données utilisateur au démarrage
  useEffect(() => {
    const initUser = async () => {
      try {
        const id = await getUserIdFromToken();
        setUserId(id);

        // Charger les points et le streak
        await loadUserStats(id);
        
        // Charger les défis existants ou en générer de nouveaux
        await loadOrGenerateChallenges(id);
        
        // Charger les bonus
        await loadBonuses(id);
      } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  // Rafraîchir les données lorsque l'écran est affiché
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        loadUserStats(userId);
        loadOrGenerateChallenges(userId);
        loadBonuses(userId);
      }
      return () => {};
    }, [userId])
  );

  // Charger les statistiques de l'utilisateur
  const loadUserStats = async (id: number) => {
    try {
      const pointsStr = await AsyncStorage.getItem(`userPoints_${id}`);
      const streakStr = await AsyncStorage.getItem(`userStreak_${id}`);
      
      if (pointsStr) setTotalPoints(parseInt(pointsStr));
      if (streakStr) setStreak(parseInt(streakStr));
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error);
    }
  };

  // Sauvegarder les statistiques de l'utilisateur
  const saveUserStats = async (id: number, points: number, userStreak: number) => {
    try {
      await AsyncStorage.setItem(`userPoints_${id}`, points.toString());
      await AsyncStorage.setItem(`userStreak_${id}`, userStreak.toString());
      
      // Mise à jour en base de données (optionnel - à implémenter côté serveur)
      const token = await getToken();
      /*
      await fetch(`${API_URL}/api/users/${id}/stats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ points, streak: userStreak })
      });
      */
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des stats:", error);
    }
  };

  // Charger ou générer des défis
  const loadOrGenerateChallenges = async (id: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storedChallenges = await AsyncStorage.getItem(`userChallenges_${id}_${today}`);
      
      if (storedChallenges) {
        setChallenges(JSON.parse(storedChallenges));
      } else {
        await generateNewChallenges(id);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des défis:", error);
    }
  };

  // Générer de nouveaux défis via l'API Gemini
  const generateNewChallenges = async (id: number) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Prompt pour l'API Gemini
      const prompt = `Génère 3 défis quotidiens sur le thème de la nutrition et du sport:
      - 1 défi facile sur la nutrition
      - 1 défi moyen sur le sport
      - 1 défi difficile au choix

      Format strict JSON:
      [
        {
          "id": "unique-id-1",
          "type": "nutrition",
          "title": "Titre du défi 1",
          "description": "Description détaillée du défi 1 en français",
          "difficulty": "easy",
          "points": 10
        },
        {
          "id": "unique-id-2",
          "type": "sport",
          "title": "Titre du défi 2",
          "description": "Description détaillée du défi 2 en français",
          "difficulty": "medium", 
          "points": 20
        },
        {
          "id": "unique-id-3",
          "type": "sport|nutrition",
          "title": "Titre du défi 3",
          "description": "Description détaillée du défi 3 en français",
          "difficulty": "hard",
          "points": 30
        }
      ]
      `;

      // Appel à l'API Gemini
      const response = await axios.post(
        GEMINI_API_URL,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Format de réponse Gemini invalide");
      }

      // Extraction du JSON de la réponse
      const responseText = response.data.candidates[0].content.parts[0].text;
      // Extraction du JSON entre les délimiteurs de code
      const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
      if (!jsonMatch) {
        throw new Error("Aucun JSON valide trouvé dans la réponse");
      }

      let newChallenges: Challenge[] = [];
      try {
        const parsedChallenges = JSON.parse(jsonMatch[0]);
        
        // Formater les défis et ajouter les propriétés manquantes
        newChallenges = parsedChallenges.map((c: any) => ({
          ...c,
          completed: false,
          date: today
        }));
      } catch (parseError) {
        console.error("Erreur lors du parsing du JSON:", parseError);
        throw new Error("Format JSON invalide dans la réponse");
      }

      // Sauvegarder les défis localement
      await AsyncStorage.setItem(`userChallenges_${id}_${today}`, JSON.stringify(newChallenges));
      setChallenges(newChallenges);
    } catch (error) {
      console.error("Erreur lors de la génération des défis:", error);
      // Défis par défaut en cas d'erreur
      const defaultChallenges: Challenge[] = [
        {
          id: "default-1",
          type: "nutrition",
          title: "Boire 2 litres d'eau",
          description: "Assurez-vous de boire au moins 2 litres d'eau aujourd'hui pour rester bien hydraté.",
          difficulty: "easy",
          points: 10,
          completed: false,
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: "default-2",
          type: "sport",
          title: "30 minutes de marche",
          description: "Faites une marche rapide de 30 minutes pour améliorer votre circulation sanguine.",
          difficulty: "medium",
          points: 20,
          completed: false,
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: "default-3",
          type: "nutrition",
          title: "Éviter les sucres transformés",
          description: "Ne consommez pas de sucres transformés ou d'aliments ultra-transformés pour toute la journée.",
          difficulty: "hard",
          points: 30,
          completed: false,
          date: new Date().toISOString().split('T')[0]
        }
      ];
      
      await AsyncStorage.setItem(
        `userChallenges_${id}_${new Date().toISOString().split('T')[0]}`, 
        JSON.stringify(defaultChallenges)
      );
      setChallenges(defaultChallenges);
    } finally {
      setLoading(false);
    }
  };

  // Charger les bonus disponibles
  const loadBonuses = async (id: number) => {
    try {
      const storedBonuses = await AsyncStorage.getItem(`userBonuses_${id}`);
      
      if (storedBonuses) {
        setBonuses(JSON.parse(storedBonuses));
      } else {
        // Bonus par défaut
        const defaultBonuses: Bonus[] = [
          {
            id: "bonus-1",
            name: "Novice",
            description: "Complétez 5 défis",
            points: 50,
            icon: "trophy",
            unlocked: false
          },
          {
            id: "bonus-2",
            name: "Expert",
            description: "Complétez 10 défis",
            points: 100,
            icon: "fire",
            unlocked: false
          },
          {
            id: "bonus-3",
            name: "Maître",
            description: "Atteignez un streak de 7 jours",
            points: 200,
            icon: "star",
            unlocked: false
          }
        ];
        
        await AsyncStorage.setItem(`userBonuses_${id}`, JSON.stringify(defaultBonuses));
        setBonuses(defaultBonuses);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des bonus:", error);
    }
  };

  // Marquer un défi comme complété
  const completeChallenge = async (challenge: Challenge) => {
    if (!userId) return;
    
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Mettre à jour l'état local
      const updatedChallenges = challenges.map(c => 
        c.id === challenge.id ? { ...c, completed: true } : c
      );
      
      setChallenges(updatedChallenges);
      
      // Sauvegarder localement
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(
        `userChallenges_${userId}_${today}`, 
        JSON.stringify(updatedChallenges)
      );
      
      // Augmenter les points
      const newPoints = totalPoints + challenge.points;
      setTotalPoints(newPoints);
      
      // Vérifier si tous les défis sont complétés
      const allCompleted = updatedChallenges.every(c => c.completed);
      const newStreak = allCompleted ? streak + 1 : streak;
      setStreak(newStreak);
      
      // Sauvegarder les stats
      await saveUserStats(userId, newPoints, newStreak);
      
      // Vérifier les bonus débloqués
      await checkBonuses(userId, updatedChallenges, newStreak);
      
      // Animation des points
      animatePoints(challenge.points);
      
      // Afficher la confetti pour les défis difficiles
      if (challenge.difficulty === "hard") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error) {
      console.error("Erreur lors de la complétion du défi:", error);
    }
  };

  // Vérifier si des bonus sont débloqués
  const checkBonuses = async (id: number, currentChallenges: Challenge[], currentStreak: number) => {
    try {
      // Compter le nombre total de défis complétés
      const completedChallengesKey = await AsyncStorage.getAllKeys();
      const challengeKeys = completedChallengesKey.filter(key => 
        key.startsWith(`userChallenges_${id}_`)
      );
      
      let totalCompleted = 0;
      for (const key of challengeKeys) {
        const storedChallenges = await AsyncStorage.getItem(key);
        if (storedChallenges) {
          const parsedChallenges: Challenge[] = JSON.parse(storedChallenges);
          totalCompleted += parsedChallenges.filter(c => c.completed).length;
        }
      }
      
      // Mettre à jour les bonus selon les critères
      const updatedBonuses = bonuses.map(bonus => {
        if (bonus.unlocked) return bonus;
        
        // Critères pour débloquer les bonus
        if (bonus.id === "bonus-1" && totalCompleted >= 5) {
          return { ...bonus, unlocked: true };
        }
        if (bonus.id === "bonus-2" && totalCompleted >= 10) {
          return { ...bonus, unlocked: true };
        }
        if (bonus.id === "bonus-3" && currentStreak >= 7) {
          return { ...bonus, unlocked: true };
        }
        
        return bonus;
      });
      
      // Vérifier si de nouveaux bonus ont été débloqués
      const newlyUnlocked = updatedBonuses.filter((b, i) => 
        b.unlocked && !bonuses[i].unlocked
      );
      
      if (newlyUnlocked.length > 0) {
        // Ajouter les points des bonus
        let bonusPoints = 0;
        newlyUnlocked.forEach(bonus => {
          bonusPoints += bonus.points;
        });
        
        const newTotal = totalPoints + bonusPoints;
        setTotalPoints(newTotal);
        await saveUserStats(id, newTotal, currentStreak);
        
        // Afficher une notification pour les nouveaux bonus
        newlyUnlocked.forEach(bonus => {
          Toast.show({
            type: 'success',
            text1: `Bonus débloqué: ${bonus.name}!`,
            text2: `+${bonus.points} points ajoutés à votre score`,
            visibilityTime: 4000,
          });
        });
        
        // Animation pour le bonus
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      setBonuses(updatedBonuses);
      await AsyncStorage.setItem(`userBonuses_${id}`, JSON.stringify(updatedBonuses));
      
    } catch (error) {
      console.error("Erreur lors de la vérification des bonus:", error);
    }
  };

  // Ouvrir la modale avec les détails du défi
  const openChallengeModal = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setModalVisible(true);
  };

  // Rendu du composant
  return (
    <ProtectedRoute>
      <NavbarUser />
      <ScrollView style={styles.container}>
        {/* Header avec stats */}
        <LinearGradient
          colors={['#3B82F6', '#1E40AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerContainer}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Défis du jour</Text>
              <Text style={styles.headerSubtitle}>
                Complétez les défis pour gagner des points et débloquer des bonus!
              </Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalPoints}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Liste des défis */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Chargement des défis...</Text>
          </View>
        ) : (
          <>
            <View style={styles.challengesContainer}>
              <Text style={styles.sectionTitle}>Défis quotidiens</Text>
              {challenges.map((challenge) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={[
                    styles.challengeCard,
                    challenge.completed && styles.completedChallengeCard,
                  ]}
                  onPress={() => openChallengeModal(challenge)}
                  disabled={challenge.completed}
                >
                  <View style={styles.challengeHeader}>
                    <View style={styles.challengeIconContainer}>
                      {challenge.type === "sport" ? (
                        <MaterialCommunityIcons
                          name="run-fast"
                          size={22}
                          color="#fff"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="food-apple"
                          size={22}
                          color="#fff"
                        />
                      )}
                    </View>

                    <View style={styles.challengeTitleContainer}>
                      <Text style={styles.challengeTitle}>{challenge.title}</Text>
                      <View style={styles.challengeDifficultyContainer}>
                        {[...Array(
                          challenge.difficulty === "easy" ? 1 : 
                          challenge.difficulty === "medium" ? 2 : 3
                        )].map((_, i) => (
                          <View key={i} style={styles.difficultyDot} />
                        ))}
                      </View>
                    </View>

                    <View style={styles.pointsContainer}>
                      <Text style={styles.pointsText}>+{challenge.points}</Text>
                    </View>
                  </View>

                  <View style={styles.challengeContent}>
                    <Text style={styles.challengeDescription} numberOfLines={2}>
                      {challenge.description}
                    </Text>
                  </View>

                  <View style={styles.challengeFooter}>
                    <TouchableOpacity
                      style={[
                        styles.completeButton,
                        challenge.completed && styles.completedButton,
                      ]}
                      onPress={() => !challenge.completed && completeChallenge(challenge)}
                      disabled={challenge.completed}
                    >
                      {challenge.completed ? (
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                      ) : (
                        <Text style={styles.completeButtonText}>Marquer comme terminé</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bonus débloqués */}
            <View style={styles.bonusesContainer}>
              <Text style={styles.sectionTitle}>Bonus et récompenses</Text>
              {bonuses.map((bonus) => (
                <View
                  key={bonus.id}
                  style={[
                    styles.bonusCard,
                    bonus.unlocked ? styles.unlockedBonusCard : styles.lockedBonusCard,
                  ]}
                >
                  <View style={styles.bonusIconContainer}>
                    <FontAwesome5
                      name={bonus.icon}
                      size={24}
                      color={bonus.unlocked ? "#FFD700" : "#A0AEC0"}
                    />
                  </View>
                  <View style={styles.bonusContent}>
                    <View style={styles.bonusHeader}>
                      <Text
                        style={[
                          styles.bonusTitle,
                          bonus.unlocked ? styles.unlockedBonusTitle : styles.lockedBonusTitle,
                        ]}
                      >
                        {bonus.name}
                      </Text>
                      <Text style={styles.bonusPoints}>+{bonus.points} pts</Text>
                    </View>
                    <Text
                      style={[
                        styles.bonusDescription,
                        bonus.unlocked ? styles.unlockedBonusDesc : styles.lockedBonusDesc,
                      ]}
                    >
                      {bonus.description}
                    </Text>
                  </View>
                  {bonus.unlocked && (
                    <View style={styles.unlockedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Point animation */}
        {animation && (
          <Animated.View
            style={[
              styles.pointAnimation,
              {
                opacity: animation.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -100],
                    }),
                  },
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.pointAnimationText}>
              +{selectedChallenge?.points || ""}
            </Text>
          </Animated.View>
        )}

        {/* Confetti animation */}
        {showConfetti && (
          <View style={styles.confettiContainer}>
            <LottieView
              source={require('../../assets/confetti.json')}
              autoPlay
              loop={false}
              style={styles.confetti}
            />
          </View>
        )}

        {/* Challenge Detail Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {selectedChallenge && (
                <>
                  <View style={styles.modalHeader}>
                    <View
                      style={[
                        styles.modalIconContainer,
                        selectedChallenge.type === "sport"
                          ? styles.sportIconContainer
                          : styles.nutritionIconContainer,
                      ]}
                    >
                      {selectedChallenge.type === "sport" ? (
                        <MaterialCommunityIcons name="run-fast" size={28} color="#fff" />
                      ) : (
                        <MaterialCommunityIcons name="food-apple" size={28} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.modalTitle}>{selectedChallenge.title}</Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Ionicons name="close" size={24} color="#718096" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalContent}>
                    <View style={styles.modalInfoRow}>
                      <View style={styles.modalInfoItem}>
                        <Text style={styles.modalInfoLabel}>Type</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedChallenge.type === "sport" ? "Sport" : "Nutrition"}
                        </Text>
                      </View>
                      <View style={styles.modalInfoItem}>
                        <Text style={styles.modalInfoLabel}>Difficulté</Text>
                        <View style={styles.difficultyContainer}>
                          {[...Array(
                            selectedChallenge.difficulty === "easy" ? 1 : 
                            selectedChallenge.difficulty === "medium" ? 2 : 3
                          )].map((_, i) => (
                            <View key={i} style={styles.modalDifficultyDot} />
                          ))}
                        </View>
                      </View>
                      <View style={styles.modalInfoItem}>
                        <Text style={styles.modalInfoLabel}>Points</Text>
                        <Text style={styles.modalPointsValue}>
                          +{selectedChallenge.points}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.descriptionContainer}>
                      <Text style={styles.descriptionTitle}>Description</Text>
                      <Text style={styles.descriptionText}>
                        {selectedChallenge.description}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.modalCompleteButton,
                        selectedChallenge.completed && styles.modalCompletedButton,
                      ]}
                      onPress={() => {
                        if (!selectedChallenge.completed) {
                          completeChallenge(selectedChallenge);
                          setModalVisible(false);
                        }
                      }}
                      disabled={selectedChallenge.completed}
                    >
                      {selectedChallenge.completed ? (
                        <Text style={styles.modalCompleteButtonText}>
                          Défi complété ✓
                        </Text>
                      ) : (
                        <Text style={styles.modalCompleteButtonText}>
                          Marquer comme terminé
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
      <FooterR />
      <Toast />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafc",
  },
  headerContainer: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    maxWidth: "80%",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    marginHorizontal: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#718096",
    marginTop: 10,
  },
  challengesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 16,
  },
  challengeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  completedChallengeCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#D1FAE5",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  challengeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  challengeTitleContainer: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: 4,
  },
  challengeDifficultyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    marginRight: 4,
  },
  pointsContainer: {
    backgroundColor: "#EBF5FF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pointsText: {
    color: "#2563EB",
    fontWeight: "bold",
    fontSize: 14,
  },
  challengeContent: {
    marginVertical: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: "#718096",
    lineHeight: 20,
  },
  challengeFooter: {
    marginTop: 8,
  },
  completeButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  completedButton: {
    backgroundColor: "#10B981",
  },
  completeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  bonusesContainer: {
    padding: 16,
    marginBottom: 80,
  },
  bonusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    borderWidth: 1,
  },
  unlockedBonusCard: {
    borderColor: "#FEF3C7",
    backgroundColor: "#FFFBEB",
  },
  lockedBonusCard: {
    borderColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  bonusIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    backgroundColor: "#F8FAFC",
  },
  bonusContent: {
    flex: 1,
  },
  bonusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  unlockedBonusTitle: {
    color: "#D97706",
  },
  lockedBonusTitle: {
    color: "#4B5563",
  },
  bonusPoints: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
  },
  bonusDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  unlockedBonusDesc: {
    color: "#92400E",
  },
  lockedBonusDesc: {
    color: "#718096",
  },
  unlockedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#059669",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pointAnimation: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pointAnimationText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: "none",
  },
  confetti: {
    width: "100%",
    height: "100%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sportIconContainer: {
    backgroundColor: "#3B82F6",
  },
  nutritionIconContainer: {
    backgroundColor: "#10B981",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a202c",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    padding: 20,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalInfoItem: {
    alignItems: "center",
  },
  modalInfoLabel: {
    fontSize: 12,
    color: "#718096",
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
  },
  modalPointsValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3B82F6",
  },
  difficultyContainer: {
    flexDirection: "row",
  },
  modalDifficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginHorizontal: 2,
  },
  descriptionContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#4A5568",
    lineHeight: 22,
  },
  modalCompleteButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCompletedButton: {
    backgroundColor: "#10B981",
  },
  modalCompleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});