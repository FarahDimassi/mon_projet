// app/forgot-password/index.tsx
import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Keyboard
} from "react-native";
import axios from "axios";
// @ts-ignore
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { forgotPassword } from "../../utils/authService";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get("window");

// Configuration du toast
const toastConfig = {
  success: ({ text1, text2, ...rest }: { text1?: string, text2?: string }) => (
    <View style={{
      height: 60,
      width: '90%',
      backgroundColor: 'rgba(0, 195, 0, 0.8)',
      borderRadius: 10,
      padding: 10,
      justifyContent: 'center',
    }}>
      <Text style={{ color: 'white', fontWeight: 'bold' }}>{text1}</Text>
      <Text style={{ color: 'white' }}>{text2}</Text>
    </View>
  ),
  error: ({ text1, text2, ...rest }: { text1?: string, text2?: string }) => (
    <View style={{
      height: 60,
      width: '90%',
      backgroundColor: 'rgba(195, 0, 0, 0.8)',
      borderRadius: 10,
      padding: 10,
      justifyContent: 'center',
    }}>
      <Text style={{ color: 'white', fontWeight: 'bold' }}>{text1}</Text>
      <Text style={{ color: 'white' }}>{text2}</Text>
    </View>
  ),
  info: ({ text1, text2, ...rest }: { text1?: string, text2?: string }) => (
    <View style={{
      height: 60,
      width: '90%',
      backgroundColor: 'rgba(0, 0, 195, 0.8)',
      borderRadius: 10,
      padding: 10,
      justifyContent: 'center',
    }}>
      <Text style={{ color: 'white', fontWeight: 'bold' }}>{text1}</Text>
      <Text style={{ color: 'white' }}>{text2}</Text>
    </View>
  ),
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [keyboardShown, setKeyboardShown] = useState(false);
  const router = useRouter();

  // Écouter les événements de clavier
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardShown(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardShown(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Fonction pour afficher les toasts d'erreur
  const showToastError = (message: string) => {
    try {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: message,
        position: "bottom",
        visibilityTime: 4000,
      });
      console.log(`Toast error appelé avec: ${message}`);
    } catch (e) {
      console.error("Erreur lors de l'affichage du toast:", e);
    }
  };

  // Fonction pour afficher les toasts de succès
  const showToastSuccess = (message: string) => {
    try {
      Toast.show({
        type: "success",
        text1: "Succès",
        text2: message,
        position: "bottom",
        visibilityTime: 4000,
      });
      console.log(`Toast success appelé avec: ${message}`);
    } catch (e) {
      console.error("Erreur lors de l'affichage du toast:", e);
    }
  };

  const handleSendOTP = async () => {
    try {
      // Masquer le clavier lors de l'envoi
      Keyboard.dismiss();
      
      // Validation de l'email
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showToastError("Veuillez entrer une adresse email valide");
        return;
      }

      // Consommer l'API via votre fonction sendForgotPasswordOTP
      const message = await forgotPassword(email);

      console.log(message);
      
      // Afficher un toast de succès
      showToastSuccess("Code de vérification envoyé avec succès");

      // Navigation vers l'écran de vérification en passant l'email en paramètre
      router.push({
        pathname: "/verification",
        params: { email },
      });
    } catch (error: any) {
      showToastError(error?.message || "Erreur lors de l'envoi du code de vérification");
    }
  };
  

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <TouchableOpacity onPress={() => router.push('/AuthScreen')}
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 11,
                  zIndex: 10, // pour qu'il soit au-dessus si nécessaire
                }}>
            <Ionicons name="arrow-back" size={32} color="#rgba(195, 0, 0, 0.7)" />
          </TouchableOpacity>
        {/* Background Circle */}
        <View style={styles.backgroundCircleContainer}>
          <Svg height="500" width="500" viewBox="0 0 500 500">
            <Circle cx="250" cy="150" r="250" fill="rgba(195, 0, 0, 1.00)" opacity={0.2} />
          </Svg>
        </View>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.headerContainer, keyboardShown && styles.headerContainerCompact]}>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Vous avez oublié votre mot de passe ?
                Pas de problème, indiquez simplement votre adresse email et nous vous enverrons un code de vérification pour le réinitialiser.
              </Text>
            </View>

            {/* Illustration container qui se masque si le clavier est visible */}
            {!keyboardShown && (
              <View style={styles.illustrationContainer}>
                <Image 
                  source={require('../../assets/images/forgot.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.formContainer}>
              <Text style={styles.label}>Enter Your Email Address</Text>
              
              <TextInput
                style={styles.input}
                placeholder="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                returnKeyType="send"
                onSubmitEditing={handleSendOTP}
                 placeholderTextColor="#999"
              />
              
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleSendOTP}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Send OTP</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Toast doit être à l'extérieur de SafeAreaView et à la racine */}
      <Toast config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backgroundCircleContainer: {
    position: 'absolute',
    top: -100,
    right: -100,
    zIndex: -1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  headerContainer: {
    marginTop: 60,
    marginBottom: 20,
  },
  headerContainerCompact: {
    marginTop: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    paddingRight: 50,
  },
  illustrationContainer: {
    width: '100%',
    height: 180,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  formContainer: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
    color: "#333",
    fontWeight: "500",
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    fontSize: 15,
    
  },
  button: {
    backgroundColor: "rgba(195, 0, 0, 0.4)",
    borderRadius: 30,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});