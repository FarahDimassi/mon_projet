import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendNotificationToUser } from "./authService";
import * as Notifications from 'expo-notifications';
import { API_URL } from "./config";

// Interface pour les badges
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;
  points: number;
}

/**
 * Sauvegarde un badge obtenu par un utilisateur
 * @param userId ID de l'utilisateur
 * @param badgeId ID du badge 
 * @param badgeName Nom du badge
 * @param points Points associés au badge
 */
export async function saveBadge(userId: number, badgeId: string, badgeName: string, points: number): Promise<boolean> {
  try {
    // 1. Sauvegarder dans le localStorage
    const userBadgesKey = `userBadges_${userId}`;
    const existingBadgesJson = await AsyncStorage.getItem(userBadgesKey);
    
    const existingBadges: string[] = existingBadgesJson ? JSON.parse(existingBadgesJson) : [];
    
    // Vérifier si le badge existe déjà
    if (!existingBadges.includes(badgeId)) {
      existingBadges.push(badgeId);
      await AsyncStorage.setItem(userBadgesKey, JSON.stringify(existingBadges));
      
      // 2. Mise à jour des points
      await addUserPoints(userId, points);
      
      // 3. Création d'une notification locale
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🏅 Nouveau badge débloqué : ${badgeName}`,
          body: `Félicitations ! Vous avez gagné ${points} points.`,
          data: { type: 'badge', badgeId },
        },
        trigger: null, // notification immédiate
      });
      
      // 4. Enregistrement dans la base de notifications
      await sendNotificationToUser(
        userId,
        `🏅 Badge: ${badgeName}`,
        `Félicitations! Vous avez débloqué un nouveau badge et gagné ${points} points!`,
      );
      
      return true;
    }
    
    return false; // Le badge existe déjà
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du badge:", error);
    return false;
  }
}

/**
 * Récupérer les badges d'un utilisateur
 * @param userId ID de l'utilisateur
 */
export async function getUserBadges(userId: number): Promise<string[]> {
  try {
    const userBadgesKey = `userBadges_${userId}`;
    const userBadgesJson = await AsyncStorage.getItem(userBadgesKey);
    return userBadgesJson ? JSON.parse(userBadgesJson) : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des badges:", error);
    return [];
  }
}

/**
 * Ajoute des points au total d'un utilisateur
 * @param userId ID de l'utilisateur
 * @param points Points à ajouter
 */
export async function addUserPoints(userId: number, points: number): Promise<number> {
  try {
    const userPointsKey = `userPoints_${userId}`;
    const currentPointsJson = await AsyncStorage.getItem(userPointsKey);
    const currentPoints = currentPointsJson ? parseInt(currentPointsJson) : 0;
    
    const newTotalPoints = currentPoints + points;
    await AsyncStorage.setItem(userPointsKey, newTotalPoints.toString());
    
    return newTotalPoints;
  } catch (error) {
    console.error("Erreur lors de la mise à jour des points:", error);
    return -1;
  }
}

/**
 * Obtenir le nombre total de points d'un utilisateur
 * @param userId ID de l'utilisateur
 */
export async function getUserPoints(userId: number): Promise<number> {
  try {
    const userPointsKey = `userPoints_${userId}`;
    const pointsJson = await AsyncStorage.getItem(userPointsKey);
    return pointsJson ? parseInt(pointsJson) : 0;
  } catch (error) {
    console.error("Erreur lors de la récupération des points:", error);
    return 0;
  }
}