import { getToken, getUserIdFromToken, sendNotificationToUser } from './authService';
import { addUserPoints } from './badgeService';
import * as Notifications from 'expo-notifications';
import { API_URL } from './config';

/**
 * Interface pour les objets de badge
 */
interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  points: number;
}

/**
 * Enregistre un badge dans le système de notifications et ajoute les points
 * @param userId ID de l'utilisateur
 * @param badge Information du badge
 * @returns true si succès, false sinon
 */
export async function registerBadgeNotification(userId: number, badge: BadgeInfo): Promise<boolean> {
  try {
    // 1. Ajouter les points au score de l'utilisateur (localStorage)
    await addUserPoints(userId, badge.points);
    
    // 2. Envoyer une notification locale
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏅 Badge débloqué : ${badge.name}`,
        body: `Félicitations ! Vous avez gagné ${badge.points} points.`,
        data: { 
          type: 'badge', 
          badgeId: badge.id,
          points: badge.points 
        },
      },
      trigger: null, // notification immédiate
    });
    
    // 3. Enregistrer dans la base de données des notifications
    await sendNotificationToUser(
      userId,
      `🏅 Badge débloqué : ${badge.name}`,
      `Félicitations! Vous avez obtenu le badge "${badge.name}" et gagné ${badge.points} points!`
    );
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du badge en notification:', error);
    return false;
  }
}

/**
 * Vérifie si un utilisateur mérite un nouveau badge en fonction du nombre de X
 * @param userId ID de l'utilisateur
 * @param count Nombre d'éléments (posts, likes, etc)
 * @param thresholds Paliers pour débloquer les badges {compteMinimum: {id, nom, points}}
 */
export async function checkAndAwardBadgesForCount(
  userId: number, 
  count: number,
  thresholds: {[key: number]: BadgeInfo}
): Promise<boolean> {
  try {
    // Vérifier chaque seuil dans l'ordre décroissant
    const thresholdValues = Object.keys(thresholds)
      .map(Number)
      .sort((a, b) => b - a); // Tri décroissant
      
    for (const threshold of thresholdValues) {
      if (count >= threshold) {
        // L'utilisateur a atteint ce palier, lui attribuer le badge
        const badge = thresholds[threshold];
        await registerBadgeNotification(userId, badge);
        return true;
      }
    }
    
    return false; // Aucun badge attribué
  } catch (error) {
    console.error('Erreur lors de la vérification des badges:', error);
    return false;
  }
}

/**
 * Convertit un badge existant en format BadgeInfo
 * @param badgeObject Badge à convertir
 */
export function convertToBadgeInfo(badgeObject: any): BadgeInfo {
  return {
    id: badgeObject.id || `badge-${Date.now()}`,
    name: badgeObject.name || "Badge inconnu",
    description: badgeObject.description || "",
    imageUrl: badgeObject.image || badgeObject.imageUrl,
    points: badgeObject.points || 50
  };
}