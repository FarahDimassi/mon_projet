// components/NotificationsButton.tsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { useRouter } from 'expo-router';
import { getUserIdFromToken, getToken } from '../../utils/tokenUtils';
import { API_URL } from '@/utils/config';

const BASE_URL = `${API_URL}/api/notifications`;

export function NotificationsButton() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  const fetchUnread = async () => {
    const userId = await getUserIdFromToken();
    const token  = await getToken();
    const res    = await fetch(`${BASE_URL}/user/${userId}/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json(); 
      setCount(json.count);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        setCount(0);
        router.push('/NotificationsScreen');
      }}
    >
      <Ionicons name="notifications-outline" size={24} color="#333" />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { marginRight: 16 },
  badge: {
    position: 'absolute',
    top: -4, right: -4,
    backgroundColor: 'red',
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 16, alignItems: 'center'
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
});

// Add default export to fix the "missing the required default export" warning
export default NotificationsButton;
