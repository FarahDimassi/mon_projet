import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UsageScreen() {
  const router = useRouter();

  // Gère le clic sur "Je suis ici pour mon usage personnel"
  const handlePersonalUsage = async () => {
    try {
      // On stocke dans AsyncStorage que l’utilisateur a vu cette page
      await AsyncStorage.setItem('hasSeenUsageScreen', 'true');
      // Ensuite, on redirige vers AuthScreen
      router.push('/AuthScreen');
    } catch (err) {
      console.log('Erreur AsyncStorage:', err);
    }
  };

  // Gère le clic sur "Je suis un professionnel de la nutrition"
  const handleNutritionPro = () => {
    // Même logique si vous souhaitez faire pareil
    // ou une autre route, etc.
    // Par exemple :
    router.push('/AuthScreen');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How will you be using the app?</Text>

      <TouchableOpacity style={styles.buttonPersonal} onPress={handlePersonalUsage}>
        <Text style={styles.buttonText}>
          I'm here for my personal nutrition journey
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonPro} onPress={handleNutritionPro}>
        <Text style={styles.buttonText}>I'm a nutrition professional</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 30,
    fontWeight: 'bold',
  },
  buttonPersonal: {
    backgroundColor: '#a6c48a', // vert clair
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  buttonPro: {
    backgroundColor: '#f7cda0', // orange clair
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
});
