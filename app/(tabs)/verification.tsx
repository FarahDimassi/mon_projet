import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  ScrollView
} from "react-native";
// @ts-ignore
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { FontAwesome } from "@expo/vector-icons";
// ***** Import Ionicons *****
import { Ionicons } from "@expo/vector-icons";
import { verifyOtpAndResetPassword } from "../../utils/authService"; // Vérifiez le chemin si nécessaire
import Toast, { ToastProps } from "react-native-toast-message";

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

export default function VerificationScreen() {
  // Récupérer l'email depuis les paramètres de navigation
  const { email } = useLocalSearchParams();  // Important: À appeler au niveau supérieur du composant
  const router = useRouter();
  const [keyboardShown, setKeyboardShown] = useState(false);
  // État pour le mot de passe et la visibilité
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Références pour les 4 champs de code
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];
  
  // État pour les 4 digits
  const [digits, setDigits] = useState(["", "", "", ""]);

  // Gère la saisie et l'auto-focus
  const handleChangeDigit = (text: string, index: number) => {
    if (text.length > 1) {
      text = text[0];
    }
    const newDigits = [...digits];
    newDigits[index] = text;
    setDigits(newDigits);
    if (text.length === 1 && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };
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

  // Fonction de soumission du code et du mot de passe
  const handleSubmit = async () => {
    const code = digits.join("");
    if (code.length !== 4) {
      showToastError("Please enter the complete verification code");
      return;
    }
    
    try {
      // Utilisation de la variable email récupérée par useLocalSearchParams()
      const message = await verifyOtpAndResetPassword(email, code, password);
      console.log("Response:", message);
      // CORRECTION ICI: Utiliser showToastSuccess au lieu de showToastError pour les cas de succès
      showToastSuccess(message);
      router.replace("/AuthScreen"); // Optionnel: Naviguer vers une page de succès
    } catch (error: any) {
      showToastError(error?.message || "Error verifying OTP and resetting password");
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <TouchableOpacity onPress={() => router.push('/forgotpswd')}
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
            <View style={styles.content}>
              <Text style={styles.title}>Verification</Text>
              <Text style={styles.subtitle}>
                Saisissez le code de vérification que vous avez reçu dans votre boîte mail pour réinitialiser votre mot de passe.
              </Text>
              {!keyboardShown && (
                <View style={styles.illustrationContainer}>
                  <Image 
                    source={require('../../assets/images/verification.png')}
                    style={styles.illustration}
                    resizeMode="contain"
                  />
                </View>
              )}
              
              <Text style={styles.instructionText}>
                We will send you one time password this email address.
              </Text>

              {/* Champ de saisie pour le nouveau mot de passe */}
              <View style={styles.inputWrapper}>
                <FontAwesome
                  name="lock"
                  size={20}
                  color="rgba(195, 0, 0, 0.6)"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nouveau mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  underlineColorAndroid="transparent"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="rgba(195, 0, 0, 0.6)"
                  />
                </TouchableOpacity>
              </View>

              {/* Les 4 champs du code */}
              <View style={styles.codeContainer}>
                {digits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={inputRefs[index]}
                    style={styles.codeInput}
                    value={digit}
                    onChangeText={(text) => handleChangeDigit(text, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                ))}
              </View>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {/* AJOUT IMPORTANT: Toast doit être en dehors de SafeAreaView pour s'afficher correctement */}
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    marginTop: 60,
    marginBottom: 8,
    color: "#333",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  illustrationContainer: {
    width: '100%',
    height: 220,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: '80%',
    height: '100%',
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
    color: "#555",
    marginLeft: 14,
  },
  // Styles pour le champ de mot de passe
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: "#fff",
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    color: "#333",
    fontSize: 16,
    borderRadius: 5,
    borderWidth: 0,
    borderColor: "transparent",
  },
  eyeIcon: {
    padding: 5,
  },
  keyboardView: {
    flex: 1,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginBottom: 40,
  },
  codeInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "rgba(195, 0, 0, 0.6)",
    borderRadius: 25,
    width: "100%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});