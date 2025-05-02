import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getUserIdFromToken } from '../../utils/tokenUtils';

/**
 * This is the index page for the chatCoach directory.
 * It will automatically redirect to the user's chat screen.
 */
export default function ChatCoachIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the appropriate chat screen
    async function redirectToChat() {
      try {
        // Get the current user's ID
        const userId = await getUserIdFromToken();
        
        if (userId) {
          // If user is logged in, redirect to their own chat page
          router.replace(`/chatCoach/${userId}`);
        } else {
          // If not logged in, redirect to login
          router.replace('/AuthScreen');
        }
      } catch (error) {
        console.error('Error redirecting to chat:', error);
      }
    }
    
    redirectToChat();
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading chat...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    fontSize: 18,
    color: '#555',
  }
});