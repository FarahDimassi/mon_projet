// src/notifications.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getToken, getUserIdFromToken } from '@/utils/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1) configure le handler pour quand l'app est ouverte
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:   true,
    shouldPlaySound:   true,
    shouldSetBadge:    false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string> {
  if (!Device.isDevice) {
    console.warn('Push notifications requièrent un vrai device.');
    return ''; 
  }

  // Sur Android, crée le canal
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Demande la permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    throw new Error('Permission non accordée pour les notifications');
  }

  // Récupère le token Expo
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  const expoPushToken = tokenData.data;

  // Envoie-le à ton backend
  const jwt = await getToken();
  const userId = await getUserIdFromToken();
  await fetch('http://192.168.1.139:8080/api/notifications/register-device', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      userId:     String(userId),
      token:      expoPushToken,
      deviceType: Platform.OS,
    }),
  });
  
  // Récupérer les paramètres de notification d'hydratation sauvegardés
  const hydrationIntervalStr = await AsyncStorage.getItem('hydrationInterval');
  const hydrationInterval = hydrationIntervalStr ? parseInt(hydrationIntervalStr) : 7200; // 2 heures par défaut
  
  // Programme les rappels d'hydratation avec l'intervalle sauvegardé
  await scheduleHydrationReminder(hydrationInterval);
  return expoPushToken;
}

/**
 * Programme des notifications d'hydratation à intervalles réguliers
 * @param intervalSeconds - Intervalle en secondes entre les notifications (défaut: 7200 = 2 heures)
 * @param startDelaySeconds - Délai avant la première notification en secondes (défaut: 60 = 1 minute)
 */
export async function scheduleHydrationReminder(
  intervalSeconds: number = 7200,  // 2 heures par défaut
  startDelaySeconds: number = 60   // 1 minute par défaut
) {
  try {
    // Sauvegarde l'intervalle dans AsyncStorage
    await AsyncStorage.setItem('hydrationInterval', intervalSeconds.toString());

    // Annule toutes les anciennes notifications programmées de type hydratation
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const hydrationNotificationIds = scheduledNotifications
      .filter(notification => notification.content.data?.type === 'hydration')
      .map(notification => notification.identifier);
    
    // Annuler toutes les notifications d'hydratation existantes
    for (const id of hydrationNotificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  
    // Programme une notification immédiate si startDelaySeconds est 0
    if (startDelaySeconds === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Hydrate-toi ! 💧",
          body: "Il est temps de boire un grand verre d'eau.",
          data: { type: "hydration" },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // notification immédiate
      });
    }
    
    // Programme la notification récurrente
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hydrate-toi ! 💧",
        body: "Il est temps de boire un grand verre d'eau.",
        data: { type: "hydration" },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: startDelaySeconds > 0 ? startDelaySeconds : intervalSeconds,
        repeats: true 
      },
    });
    
    console.log(`Notifications d'hydratation programmées tous les ${intervalSeconds/60} minutes`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la programmation des notifications d'hydratation:", error);
    return false;
  }
}

/**
 * Annule toutes les notifications d'hydratation programmées
 */
export async function cancelHydrationReminders() {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const hydrationNotificationIds = scheduledNotifications
      .filter(notification => notification.content.data?.type === 'hydration')
      .map(notification => notification.identifier);
    
    for (const id of hydrationNotificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    
    console.log(`${hydrationNotificationIds.length} notifications d'hydratation annulées`);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'annulation des notifications d'hydratation:", error);
    return false;
  }
}