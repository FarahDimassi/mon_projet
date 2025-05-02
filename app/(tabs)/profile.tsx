import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
} from "react-native";
// @ts-ignore
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import {
  getUsersById,
  getUserIdFromToken,
  updateUsers,
  uploadUserPhoto,
  getFullImageUrl,
  logout,
} from "../../utils/authService";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

interface User {
  id: number;
  username: string;
  email: string;
  photoUrl?: string;
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = await getUserIdFromToken();
        if (!userId) {
          console.error("❌ Impossible de récupérer l'ID utilisateur.");
          setLoading(false);
          return;
        }
        const userData = await getUsersById(userId);
        if (userData) {
          setUser(userData);
          setName(userData.username);
          setEmail(userData.email);
        } else {
          console.error("❌ Aucun utilisateur trouvé !");
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement des données :", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdate = async () => {
    if (!user) return;
    try {
      const updatedData: { username: string; email: string; password?: string } = {
        username: name,
        email,
      };
      if (password.length > 0) {
        updatedData.password = password;
      }
      await updateUsers(user.id, updatedData);
      Alert.alert("Succès", "Votre profil a été mis à jour !");
      setIsEditing(false);
      setPassword("");
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour :", error);
      Alert.alert("Erreur", "Échec de la mise à jour du profil.");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "La permission d'accéder aux photos est requise.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.uri) {
        setPreviewImageUri(asset.uri);
      }
      if (asset.base64) {
        setBase64Data(asset.base64);
      }
    }
  };

  const handleUploadImage = async (uri: string) => {
    if (!user) return;
    try {
      setUploading(true);
      let fileUri: string | Blob = uri;
  
      // Sur mobile, convertir la base64 en fichier temporaire
      if (Platform.OS !== "web" && base64Data) {
        const fileName = `temp_${Date.now()}.jpg`;
        fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log("Fichier temporaire créé (mobile) :", fileUri);
      } else if (Platform.OS === "web" && uri.startsWith("data:image/")) {
        // Sur web, convertir le data URI en Blob
        const res = await fetch(uri);
        const blob = await res.blob();
        fileUri = blob;
        console.log("Blob créé (web) :", blob);
      }
  
      // Appeler la fonction d'upload qui renvoie le nom du fichier
      const filename = await uploadUserPhoto(user.id, fileUri);
      console.log("Filename reçu :", filename);
  
      // Si le filename contient déjà "http://localhost:8080/uploads/", le supprimer :
      const filenameProcessed = filename.replace(/^http:\/\/192.168.1.139:8080\/uploads\/?/, "");
      // Construire la nouvelle photoUrl avec le chemin relatif seulement
      const newPhotoUrl = "uploads/" + filenameProcessed;
      
      // Mise à jour de l'utilisateur en base via updateUsers
      const updatedUser = await updateUsers(user.id, {
        username: user.username,
        email: user.email,
        photoUrl: newPhotoUrl,
      });
      setUser(updatedUser);
      Alert.alert("Succès", "Votre photo a été mise à jour et enregistrée en base !");
    } catch (error: any) {
      console.error("Erreur lors de l'upload de l'image :", error);
      Alert.alert("Erreur", error.message || "Échec de l'upload de l'image.");
    } finally {
      setUploading(false);
      setPreviewImageUri(null);
      setBase64Data(null);
    }
  };

  const handleCancelPreview = () => {
    setPreviewImageUri(null);
    setBase64Data(null);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/AuthScreen");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="rgba(195, 0, 0, 0.5)" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Erreur : Impossible de charger les données utilisateur.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background circles */}
      <View style={styles.backgroundContainer}>
        <Svg height="100%" width="100%" style={styles.backgroundSvg}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#6366F1" stopOpacity="0.7" />
              <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0.5" />
            </LinearGradient>
          </Defs>
          <Circle cx="0" cy="0" r="150" fill="rgba(195, 0, 0, 0.1)" />
          <Circle cx="400" cy="100" r="80" fill="rgba(195, 0, 0, 0.1)" />
          <Circle cx="50" cy="450" r="120" fill="rgba(195, 0, 0, 0.1)" />
          <Circle cx="300" cy="600" r="200" fill="rgba(195, 0, 0, 0.1)" />
        </Svg>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Mon Profil</Text>
          <Text style={styles.subtitle}>Gérez vos informations personnelles</Text>
        </View>
        
        <View style={styles.cardContainer}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImageWrapper}>
              <Image
                source={
                  user.photoUrl
                    ? { uri: getFullImageUrl(user.photoUrl) }
                    : require("../../assets/images/profile.jpg")
                }
                style={styles.profileImage}
              />
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
              <Ionicons name="camera" size={18} color="white" />
            </TouchableOpacity>
          </View>

          <Text style={styles.username}>{user.username}</Text>
          
          {previewImageUri && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>
                Aperçu de votre nouvelle photo
              </Text>
              <Image source={{ uri: previewImageUri }} style={styles.previewImage} />
              <View style={styles.previewButtonsContainer}>
                <TouchableOpacity
                  style={[styles.previewButton, styles.confirmButton]}
                  onPress={() => handleUploadImage(previewImageUri)}
                >
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={styles.previewButtonText}>Confirmer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewButton, styles.cancelButton]}
                  onPress={handleCancelPreview}
                >
                  <Ionicons name="close" size={18} color="white" />
                  <Text style={styles.previewButtonText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={18} color="rgba(195, 0, 0, 0.6)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  editable={isEditing}
                  placeholder="Votre nom d'utilisateur"
                  placeholderTextColor="#A0AEC0"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={18} color="rgba(195, 0, 0, 0.6)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  editable={isEditing}
                  placeholder="Votre adresse email"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="email-address"
                />
              </View>
            </View>
            
            {isEditing && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nouveau mot de passe</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={18} color="rgba(195, 0, 0, 0.60)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true}
                    placeholder="Laisser vide pour ne pas changer"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.actionsContainer}>
            {isEditing ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleUpdate}>
                <Ionicons name="save" size={18} color="white" />
                <Text style={styles.buttonText}>Sauvegarder</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsEditing(true)}>
                <Ionicons name="create" size={18} color="white" />
                <Text style={styles.buttonText}>Modifier</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push("/user")}>
              <Ionicons name="arrow-back" size={16} color="white" />
              <Text style={styles.footerButtonText}>Retour</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="exit-outline" size={16} color="white" />
              <Text style={styles.footerButtonText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F5F7FA",
  },
  backgroundContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  backgroundSvg: {
    position: "absolute",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: "center",
  
  },
  title: { 
    fontSize: 28, 
    fontWeight: "700", 
    color: "#1A202C",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
    marginBottom: 8,
  },
  cardContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
     
    },
    
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: "center",
     top:-15,
  },
  profileImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "rgba(195, 0, 0, 0.5)",
    shadowColor: "rgba(195, 0, 0, 0.5)",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    position: "relative",
  },
  profileImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#E2E8F0",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  changeImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(195, 0, 0, 0.8)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  username: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 24,
  },
  previewContainer: {
    backgroundColor: "#F7FAFC",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 12,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 16,
    marginBottom: 16,
    resizeMode: "cover",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  previewButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 6,
    minWidth: 120,
  },
  confirmButton: {
    backgroundColor: "#4C51BF",
  },
  cancelButton: {
    backgroundColor: "#E53E3E",
  },
  previewButtonText: { 
    color: "white", 
    fontWeight: "600",
    marginLeft: 4,
  },
  formContainer: { 
    width: "100%",
    marginBottom: 20,

  },
  inputGroup: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F7FAFC",
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#2D3748",
    paddingVertical: 8,
  },
  actionsContainer: {
    width: "100%",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "rgba(195, 0, 0, 0.5)",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "rgba(195, 0, 0, 0.5)",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: "rgba(195, 0, 0, 0.5)",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(195, 0, 0, 0.3)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E53E3E",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  footerButtonText: { 
    color: "white", 
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "rgba(195, 0, 0, 0.5)",
    fontWeight: "500",
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F5F7FA",
  },
  errorText: { 
    color: "#E53E3E", 
    fontSize: 16, 
    fontWeight: "600",
    textAlign: "center",
  },
});