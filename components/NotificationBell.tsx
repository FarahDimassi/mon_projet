// components/NotificationBell.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getToken, getUserIdFromToken } from "../utils/authService";
// @ts-ignore
import { useRouter } from "expo-router";
import { API_URL } from "@/utils/config";

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const router = useRouter();

  async function fetchCount() {
    const userId = await getUserIdFromToken();
    const token = await getToken();
    const res = await fetch(
      `${API_URL}/api/notifications/user/${userId}/unread-count`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    setCount(json.count);
  }

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={async () => {
        router.push("/NotificationsScreen");
        // marque tout comme lu côté back
        const userId = await getUserIdFromToken();
        const token = await getToken();
        await fetch(
          `${API_URL}/api/notifications/user/${userId}/read-all`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setCount(0);
      }}
    >
      <Ionicons name="notifications-outline" size={24} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.txt}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 8 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "red",
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  txt: { color: "white", fontSize: 10, fontWeight: "bold" },
});
