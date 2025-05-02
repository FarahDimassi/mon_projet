import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

// Get token from storage
export async function getToken() {
  try {
    let token = await AsyncStorage.getItem("jwtToken");
    if (!token) {
      console.error("❌ Aucun token trouvé.");
      return null;
    }

    // 🔍 Correction : Vérifier et supprimer les éventuels objets JSON mal formatés
    if (token.startsWith("{") && token.endsWith("}")) {
      token = JSON.parse(token).token; // ✅ Corrige l'extraction du token
    }

    console.log("🔑 Token corrigé :", token);
    return token;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du token :", error);
    return null;
  }
}

// Get user ID from JWT token
export async function getUserIdFromToken(): Promise<number | null> {
  try {
    const token = await getToken();
    if (!token) return null;

    const decoded: any = jwtDecode(token);

    console.log("🔍 Token décodé :", decoded); // ✅ Ajoute ce log

    if (decoded?.id) {
      console.log("✅ ID utilisateur détecté :", decoded.id);
      return Number(decoded.id);
    }

    console.error("❌ L'ID utilisateur est absent du token !");
    return null;
  } catch (error) {
    console.error("❌ Erreur lors de l'extraction de l'ID utilisateur :", error);
    return null;
  }
}

// Save token to storage 
export async function saveToken(token: string) {
  try {
    console.log("",token)
    await AsyncStorage.setItem("jwtToken", token);
    console.log("✅ Token sauvegardé !");
  } catch (error) {
    console.error("❌ Erreur de sauvegarde du token :", error);
  }
}