import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../utils/notification';

export default function RootLayout() {
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // enregistrement et envoi du token au backend
    registerForPushNotificationsAsync().catch(console.error);

    // réaction au tap sur la notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tap:', response);
      // tu peux router vers le chat ici, e.g. router.push(...)
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,  // supprime tout header, y compris "(tabs)"
      }}
    >
      {/* Screens « simples » */}
      <Stack.Screen name="index" options={{ title: "Accueil" }} />
      <Stack.Screen name="AuthScreen" />
      <Stack.Screen name="user" options={{ title: "Espace Utilisateur" }} />
      <Stack.Screen name="admin" options={{ title: "Espace Admin" }} />
      <Stack.Screen name="check-role" options={{ title: "Vérification Rôle" }} />
      <Stack.Screen name="NotificationsScreen" options={{ title: "Notifications" }} />
      <Stack.Screen name="WelcomeScreen" options={{ title: "Welcome" }} />

      {/* Écran de test des notifications locales */}
      <Stack.Screen
        name="LocalNotifTester"
        options={{ title: "Test Notifications" }}
      />

      {/* Écran reel (sans header) */}
      <Stack.Screen name="reel" />

      {/* Groupe chatCoach avec routes imbriquées */}
      <Stack.Screen name="chatCoach" options={{ headerShown: false }} />
      
      {/* Groupe Tabs */}
      <Stack.Screen name="(tabs)" />
      
    </Stack>
  );
}