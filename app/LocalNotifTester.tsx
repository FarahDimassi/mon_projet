// app/LocalNotifTester.tsx
import React, { useEffect, useState } from "react";
import { View, Button, StyleSheet, Text, Alert } from "react-native";
import * as Notifications from "expo-notifications";
// @ts-ignore
import { useRouter } from "expo-router";

export default function LocalNotifTester() {
  const router = useRouter();
  const [scheduledId, setScheduledId] = useState<string | null>(null);

  useEffect(() => {
    // Définit le handler système
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Écoute en foregound
    const sub = Notifications.addNotificationReceivedListener(n =>
      Alert.alert("🔔 Notification reçue", n.request.content.body)
    );
    return () => sub.remove();
  }, []);

  const scheduleNotification = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission notifications refusée");
      return;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Test locale",
        body: "Cette notif arrive même si l'app est fermée 👍",
      },
      trigger: { seconds: 5 },
    });
    console.log("🔖 Planifiée, id =", id);
    setScheduledId(id);
  };

  const cancelNotification = async () => {
    if (scheduledId) {
      await Notifications.cancelScheduledNotificationAsync(scheduledId);
      console.log("❌ Annulée");
      setScheduledId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tester notification locale</Text>
      <Button title="Planifier dans 5 s" onPress={scheduleNotification} />
      {scheduledId && (
        <Button
          title="Annuler la notification"
          onPress={cancelNotification}
          color="red"
        />
      )}
      {/* ←←← NOUVEAU : Bouton pour revenir à l'accueil */}
      <View style={{ marginTop: 30 }}>
        <Button title="← Retour" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, marginBottom: 20 },
});
