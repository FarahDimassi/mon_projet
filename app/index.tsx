// @ts-ignore
 import { Redirect } from "expo-router";

/* export default function Index() {
  return <Redirect href="/AuthScreen" />;
}  */
  export default function Index() {
    return <Redirect href="/WelcomeScreen" />;}
// app/index.tsx (ou ton fichier d’accueil)
/* import React from "react";
import { View, Text, StyleSheet } from "react-native";
// @ts-ignore
import { Link } from "expo-router";

// … dans ton composant :
export default function Index() {
  return (
    <View style={styles.container}>
     
      <Link href="/LocalNotifTester">
        <Text style={styles.link}>Tester notif locale</Text>
      </Link>
    </View>
  );
} 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  link: {
    color: "#0066cc",
    marginTop: 20,
  },
});
*/
/* import React, { useEffect, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenUsageScreen, setHasSeenUsageScreen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem('hasSeenUsageScreen');
        // S’il existe et que c’est "true", on passe à AuthScreen
        if (value === 'true') {
          setHasSeenUsageScreen(true);
        }
      } catch (err) {
        console.log('Erreur AsyncStorage:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    // Affiche un loader pendant qu’on lit la valeur en local
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Si on a déjà vu la page d’usage, on va vers AuthScreen
  if (hasSeenUsageScreen) {
    return <Redirect href="/AuthScreen" />;
  } else {
    // Sinon, on va vers UsageScreen
    return <Redirect href="/UsageScreen" />;
  }
}
 */