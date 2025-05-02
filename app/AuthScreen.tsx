// app/AuthScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Platform,
  Image,
  SafeAreaView,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import Svg, { Circle } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";

import {
  login,
  register,
  saveToken,
  getRole,
  getToken,
} from "../utils/authService";

// 🛠️ Ajout pour les notifications locales
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get("window");

// Configuration du toast (ajout)
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

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("User");
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState<DocumentPicker.DocumentResult | null>(null);
  const router = useRouter();

  // 🛠️ Configure le handler système pour les notifications locales
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  useEffect(() => {
    const checkToken = async () => {
      const tokenStocké = await getToken();
      if (tokenStocké) {
        const userRole = await getRole();
        if (userRole === "ROLE_User") {
          router.replace("/user");
        } else if (userRole === "ROLE_ADMIN") {
          router.replace("/admin");
        } else if (userRole === "ROLE_Coach") {
          router.replace("/coach");
        }
      }
    };
    checkToken();

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );
    return () => backHandler.remove();
  }, []);

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

  // Document picker compatible avec votre implémentation register
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        // Formater le résultat pour rester compatible avec l'implémentation attendue
        const compatibleResult = {
          type: "success",
          name: selectedFile.name,
          uri: selectedFile.uri,
          mimeType: selectedFile.mimeType || "application/octet-stream",
          size: selectedFile.size
        };
        
        setFile(compatibleResult);
        
        Toast.show({
          type: "success",
          text1: "Document sélectionné",
          text2: selectedFile.name,
          position: "bottom",
          visibilityTime: 3000,
        });
        console.log("Document sélectionné:", compatibleResult);
      } else {
        console.log("Sélection de document annulée");
      }
    } catch (err) {
      console.error("Erreur lors de la sélection du document :", err);
      showToastError("Erreur lors de la sélection du document");
    }
  };

  const handleAuth = async () => {
    try {
      if (isSignUp && (!fullName || !email || !password)) {
        showToastError("Veuillez remplir tous les champs");
        return;
      }

      if (!isSignUp && (!fullName || !password)) {
        showToastError("Veuillez saisir vos identifiants");
        return;
      }

      // Vérification pour l'upload de fichier Coach
      if (isSignUp && role === "Coach" && !file) {
        showToastError("Veuillez télécharger votre CV ou diplôme");
        return;
      }

      let token;
      if (isSignUp && role) {
        // Utilise directement l'objet file tel qu'il est stocké
        // car le format correspond déjà à ce qui est attendu par register()
        token = await register(fullName, email, password, role as "User" | "Coach", file);

        if (role === "Coach") {
          try {
            Toast.show({
              type: "info",
              text1: "Inscription Coach",
              text2: "Enregistré ! Validation admin avant activation.",
              position: "bottom",
              visibilityTime: 4000,
            });
            console.log("Toast info coach appelé");
          } catch (e) {
            console.error("Erreur Toast:", e);
          }
          setIsSignUp(false);
          return;
        }

        try {
          Toast.show({
            type: "success",
            text1: "Compte créé",
            text2: "Connectez-vous maintenant.",
            position: "bottom",
            visibilityTime: 4000,
          });
          console.log("Toast succès création appelé");
        } catch (e) {
          console.error("Erreur Toast:", e);
        }
        setIsSignUp(false);
        return;
      } else {
        token = await login(fullName, password);
      }

      await saveToken(token);

      // 🛠️ Planifier une notification locale de bienvenue dans 5 secondes
      if (Platform.OS !== "web") {
        try {
          const { status } =
            await Notifications.requestPermissionsAsync();
          if (status === "granted") {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Bienvenue !",
                body: "Vous êtes connecté·e, profitez de l'app 👍",
              },
              trigger: { seconds: 5 },
            });
          }
        } catch (notifError) {
          console.warn(
            "↪️ Notification failed, but continuing login",
            notifError
          );
        }
      }

      const userRole = await getRole();
      try {
        Toast.show({
          type: "success",
          text1: "Succès",
          text2: "Connexion réussie 🎉",
          position: "bottom",
          visibilityTime: 4000,
        });
        console.log("Toast succès connexion appelé");
      } catch (e) {
        console.error("Erreur Toast:", e);
      }
      
      if (userRole === "ROLE_User") {
        router.replace("/user");
      } else if (userRole === "ROLE_ADMIN") {
        router.replace("/admin");
      } else if (userRole === "ROLE_Coach") {
        router.replace("/coach");
      } else {
        throw new Error(`Unknown role! (${userRole})`);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      showToastError(error.message ?? "Échec de l'authentification");
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Background Circle */}
        <View style={styles.backgroundCircleContainer}>
          <Svg height="500" width="500" viewBox="0 0 500 500">
            <Circle
              cx="250"
              cy="150"
              r="250"
              fill="rgba(195, 0, 0)"
              opacity={0.2}
            />
          </Svg>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo and App Name */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/images/nutrition.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.headerContainer}>
              <Text style={styles.title}>Welcome</Text>
              <Text style={styles.subtitle}>
                {isSignUp
                  ? "Create an Account"
                  : "Log In to Your Account"}
              </Text>
            </View>

            {/* Switch Login/Signup */}
            <View style={styles.switchContainer}>
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  !isSignUp && styles.activeButton,
                ]}
                onPress={() => setIsSignUp(false)}
              >
                <Text
                  style={[
                    styles.switchText,
                    !isSignUp && styles.activeText,
                  ]}
                >
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  isSignUp && styles.activeButton,
                ]}
                onPress={() => setIsSignUp(true)}
              >
                <Text
                  style={[
                    styles.switchText,
                    isSignUp && styles.activeText,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.inputContainer}>
              {/* Full Name */}
              <View style={styles.inputWrapper}>
                <FontAwesome
                  name="user"
                  size={20}
                  color="rgba(195, 0, 0, 0.6)"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  underlineColorAndroid="transparent"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Email (only Sign Up) */}
              {isSignUp && (
                <>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="email"
                      size={20}
                      color="rgba(195, 0, 0, 0.6)"
                      style={styles.icon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      underlineColorAndroid="transparent"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Role Selector */}
                  <View style={styles.inputWrapper}>
                    <FontAwesome
                      name="user-circle-o"
                      size={20}
                      color="rgba(195, 0, 0, 0.6)"
                      style={styles.icon}
                    />
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={role}
                        onValueChange={(itemValue) =>
                          setRole(itemValue as string)
                        }
                        style={styles.picker}
                      >
                        <Picker.Item label="User" value="User" />
                        <Picker.Item label="Coach" value="Coach" />
                      </Picker>
                    </View>
                  </View>

                  {/* File Upload for Coach */}
                  {isSignUp && role === "Coach" && (
                    <View style={styles.inputWrapper}>
                      <MaterialIcons
                        name="upload-file"
                        size={20}
                        color="rgba(195, 0, 0, 0.6)"
                        style={styles.icon}
                      />
                      <TouchableOpacity style={styles.fileButton} onPress={pickDocument}>
                        <Text style={styles.fileButtonText}>
                          {file && (file as any).name
                            ? (file as any).name
                            : "Télécharger CV ou diplôme"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Password */}
              <View style={styles.inputWrapper}>
                <FontAwesome
                  name="lock"
                  size={20}
                  color="rgba(195, 0, 0, 0.6)"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
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
            </View>

            <TouchableOpacity
              style={styles.authButton}
              onPress={handleAuth}
            >
              <Text style={styles.authButtonText}>
                {isSignUp ? "Sign Up" : "Log In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => router.push("/forgotpswd")}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
            
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Toast doit être à l'extérieur de SafeAreaView et à la racine */}
      <Toast config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  backgroundCircleContainer: {
    position: "absolute",
    top: -100,
    right: -100,
    zIndex: -1,
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
  },
  logoContainer: { alignItems: "center", marginTop: 40, marginBottom: 20 },
  logo: { width: 180, height: 180 },
  headerContainer: { width: "100%", marginBottom: 20 },
  title: {
    fontSize: 18,
    fontWeight: "400",
    color: "rgba(195, 0, 0, 0.7)",
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.7)",
    marginTop: 5,
  },
  switchContainer: {
    flexDirection: "row",
    backgroundColor: "#ddd",
    borderRadius: 30,
    padding: 5,
    marginBottom: 25,
    width: "90%",
  },
  switchButton: { flex: 1, paddingVertical: 12, borderRadius: 25, alignItems: "center" },
  activeButton: { backgroundColor: "rgba(195, 0, 0, 0.4)" },
  switchText: { fontSize: 16, color: "#666", fontWeight: "600" },
  activeText: { color: "#fff" },
  inputContainer: { width: "100%", marginBottom: 20 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 15,
    borderRadius: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerContainer: { flex: 1, justifyContent: "center" },
  picker: { height: 50, color: "#333", borderWidth: 0, borderColor: "transparent" },
  icon: { marginRight: 10 },
  eyeIcon: { padding: 10 },
  input: { flex: 1, height: 55, fontSize: 16, color: "#333" },
  authButton: {
    backgroundColor: "rgba(195, 0, 0, 0.4)",
    width: "100%",
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  forgotPasswordButton: { paddingVertical: 10, marginBottom: 20 },
  forgotText: { color: "rgba(195, 0, 0, 1)", fontSize: 16, fontWeight: "500" },
  nutritionImagesContainer: { width: "100%", height: 120, marginTop: 20, justifyContent: "center", alignItems: "center" },
  nutritionImage: { width: "100%", height: "100%" },
  // Styles pour le bouton de fichier
  fileButton: {
    flex: 1,
    height: 55,
    justifyContent: "center",
  },
  fileButtonText: {
    fontSize: 16,
    color: "#555",
  },
});