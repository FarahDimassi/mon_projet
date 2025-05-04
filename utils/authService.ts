import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import * as Network from "expo-network";
import { Platform } from "react-native";
import { registerForPushNotificationsAsync } from "./NotificationService";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
let API_URL = "http://192.168.1.139:8080"; 

// 🚀 Détection automatique de l'IP locale
/* async function detectLocalIp() {
    try {
      const ip = await Network.getIpAddressAsync();
      console.log("🌍 IP détectée :", ip);
  
      if (Platform.OS !== "web" && ip && (ip.startsWith("192.168.") || ip.startsWith("10."))) {
        API_URL = `http://${ip}:8080`; // 📡 Utilise l’IP détectée dynamiquement
      }
    } catch (error) {
      console.error("❌ Impossible de récupérer l’IP locale :", error);
    }
  }
  
  // 📡 Exécute la détection seulement sur mobile
  if (Platform.OS !== "web") {
    detectLocalIp();
  } */
   // 📡 Exécute dès le démarrage

// 🔑 1. Connexion : Login avec Full Name & Password
export async function login(fullName: string, password: string) {
  try {
    console.log("📢 Tentative de connexion...");
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: fullName, password }),
    });

    if (!response.ok) {
      throw new Error("Échec de connexion");
    }

    const token = await response.text();
    await saveToken(token); // ✅ Stocke le token
    await registerForPushNotificationsAsync();
    return token;
  } catch (error) {
    console.error("❌ Erreur de connexion :", error);
    throw error;
  }
}

/**
 * Inscription d'un utilisateur.
 * Pour role==="Coach", `file` doit être l'objet retourné par DocumentPicker.getDocumentAsync().
 * @returns token JWT (pour User) ou message d'attente (pour Coach)
 */
export async function register(
  fullName: string,
  email: string,
  password: string,
  role: "User" | "Coach",
  file?: {
    uri: string;
    name: string;
    mimeType?: string;
  }
): Promise<string> {
  const formData = new FormData();

  // ⚙️ Champs texte
  formData.append("username", fullName);
  formData.append("email",    email);
  formData.append("password", password);
  formData.append("role",     role);

  // 📎 Fichier pour les Coach
  if (role === "Coach") {
    if (!file?.uri) {
      throw new Error("Pour le rôle Coach, un fichier est requis.");
    }
    let fileForForm: any;

    if (Platform.OS === "web") {
      // Sur le web, on récupère un Blob à partir de l'URI (data: ou blob:)
      const blob = await fetch(file.uri).then(r => r.blob());
      // On crée un vrai File pour FormData
      fileForForm = new File([blob], file.name, {
        type: file.mimeType || "application/octet-stream",
      });
    } else {
      // Sur mobile, FormData accepte l'objet { uri, name, type }
      fileForForm = {
        uri:  file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      };
    }

    formData.append("file", fileForForm);
  }

  // 🚀 Envoi
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    body: formData,      // Ne pas fixer Content-Type
  });

  // 📥 Gestion erreur
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    throw new Error(err.error || `Échec d'inscription (${res.status})`);
  }

  // 📦 Lecture du token ou du message
  const data: { token?: string; message?: string } = await res.json();
  return data.token ?? data.message ?? "";
}
/* export const logout = async (): Promise<string> => {
  try {
    const token = await getToken();
    if (!token) {
      return "No token found";
    }
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Logout failed");
    }
    // On peut aussi supprimer le token du stockage
    await AsyncStorage.removeItem("token");
    return await response.text();
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
}; */

// 📂 3. Sauvegarde du token JWT
export async function saveToken(token: string) {
  try {
    console.log("",token)
    await AsyncStorage.setItem("jwtToken", token);
    console.log("✅ Token sauvegardé !");
    await registerForPushNotificationsAsync();
  } catch (error) {
    console.error("❌ Erreur de sauvegarde du token :", error);
  }
}

// 🔍 4. Récupération du token JWT

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

// Fonction pour appeler l'API forgot-password
export const forgotPassword = async (email: string ) => {
  try {
    // Assurez-vous d'utiliser la bonne URL (par exemple, votre domaine et le chemin complet)
    const response = await fetch(
      `${API_URL}/auth/forgot-password?email=${encodeURIComponent(email)}`,
      {
        method: "POST",
        // si besoin d'envoyer des headers, par exemple pour JSON :
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      throw new Error("Erreur lors de la demande de réinitialisation de mot de passe");
    }
    
    // Ici, nous attendons un texte en réponse (le message de succès)
    const message = await response.text();
    return message;
  } catch (error) {
    console.error("forgotPassword error", error);
    throw error;
  }
};

// Fonction pour appeler l'API verify-otp
export const verifyOtpAndResetPassword = async (email: string , otp:  number, newPassword: string) => {
  try {
    // Remarquez que nous utilisons ici les query parameters
    const response = await fetch(
      `${API_URL}/auth/verify-otp?email=${encodeURIComponent(
        email
      )}&otp=${encodeURIComponent(otp)}&newPassword=${encodeURIComponent(newPassword)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      throw new Error("Erreur lors de la vérification du code OTP ou de la réinitialisation du mot de passe");
    }
    
    const message = await response.text();
    return message;
  } catch (error) {
    console.error("verifyOtpAndResetPassword error", error);
    throw error;
  }
};


// 🎭 5. Extraction du rôle depuis le token JWT
export async function getRole() {
  try {
    const token = await getToken();
    if (!token) {
      console.log("Aucun token trouvé.");
      return null;
    }

    const decoded: any = jwtDecode(token);
    console.log("✅ Token décodé :", decoded);

    if (!decoded.role) {
      throw new Error("Le rôle est introuvable dans le token");
    }

    console.log("✅ Rôle extrait :", decoded.role);
    return decoded.role;
  } catch (error) {
    console.error("❌ Erreur lors de l'extraction du rôle :", error);
    return null;
  }
}

// 🚪 6. Déconnexion : Suppression du token
export async function logout() {
  try {
    await AsyncStorage.removeItem("jwtToken");
    console.log("🚪 Déconnecté avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du token :", error);
  }
}

// 🔐 7. Vérification de l'authentification
export async function isAuthenticated() {
  const token = await getToken();
  return token !== null;
}

export async function getAllUsers() {
  try {
    const token = await getToken();
    console.log("📡 Token utilisé pour la requête :", token);

    if (!token) {
      throw new Error("❌ Aucun token trouvé.");
    }

    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token.trim()}`, // Nettoie le token
      },
    });

    console.log("📡 Statut de la réponse :", response.status);

    if (!response.ok) {
      throw new Error(`Erreur ${response.status} : ${await response.text()}`);
    }

    const users = await response.json();
    console.log("✅ Utilisateurs récupérés :", users);
    return users;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des utilisateurs :", error);
    throw error;
  }
}





// 👤 Récupérer un utilisateur par ID
// ajout dans authService.ts
export interface UserFile {
  id: number;
  name: string;
  type: string;
  size: number;
  url: string;         // pour l’œil
  downloadUrl: string; // pour la flèche
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  filePath?: string;
  fileViewUrl?: string;
  fileDownloadUrl?: string;
  files?: UserFile[];  // remplace l’ancien Array<{…url:string}>
}



// Dans getUserById()
export async function getUserById(id: number): Promise<User> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
    headers: { Authorization: `Bearer ${await getToken()}` }
  });
  if (!res.ok) throw new Error("Erreur récupération user");
  return res.json();
}


// ➕ Ajouter un utilisateur
export async function createUser(user: { username: string; password: string; fullName: string; role: string }) {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      throw new Error("Échec de la création de l'utilisateur");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la création de l'utilisateur :", error);
    throw error;
  }
}

// ✏️ Mettre à jour un utilisateur
export async function updateUser(id: number, userDetails: any) {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userDetails),
    });

    if (!response.ok) {
      throw new Error("Échec de la mise à jour de l'utilisateur");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de l'utilisateur :", error);
    throw error;
  }
}

// 🗑️ Supprimer un utilisateur
export async function deleteUser(id: number) {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Échec de la suppression de l'utilisateur");
    }

    console.log("✅ Utilisateur supprimé avec succès !");
    return { message: "Utilisateur supprimé avec succès !" }; // ✅ Retourne un message fixe
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de l'utilisateur :", error);
    throw error;
  }
}

// 📊 Récupérer les statistiques globales du Dashboard
export async function getDashboardStats() {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/admin/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Échec de récupération des statistiques du Dashboard");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des statistiques du Dashboard :", error);
    throw error;
  }
}

/* // 📈 Récupérer des détails supplémentaires du Dashboard
export async function getDashboardDetails() {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/admin/dashboard/details`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Échec de récupération des détails du Dashboard");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des détails du Dashboard :", error);
    throw error;
  }
} */
 /*  export const getNotificationById = async (userId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/${userId}`,{
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }});
    } catch (error) {
      console.error("Erreur lors de la récupération des notifications :", error);
      return [];
    }
  };
   */
 /*  // ✅ Ajouter une nouvelle notification
  export const addNotification = async (userId: string, message: string) => {
    try {
      const response = await axios.post(`${API_URL}`, { userId, message });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'ajout de la notification :", error);
      return null;
    }
  };
  
  // ✅ Supprimer une notification par ID
  export const deleteNotification = async (notificationId: string) => {
    try {
      await axios.delete(`${API_URL}/${notificationId}`);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification :", error);
      return false;
    }
  };

 */
  export interface User {
    id: number;
    username: string;
    email: string;
    role: string
    coachType: String;
  }
  
  // 🔔 Interface pour structurer les notifications
  export interface Notification {
    id: number;
    title: string;
    message: string;
  }
  export async function getUsersById(userId: number): Promise<User | null> {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("❌ Aucun token trouvé.");
      }
  
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error("Utilisateur introuvable");
      }
  
      return await response.json();
    } catch (error) {
      console.error("❌ Erreur lors de la récupération de l'utilisateur :", error);
      return null;
    }
  }
  
  // 📌 Récupérer les notifications par ID utilisateur
  export async function getNotificationsByUserId(userId: number): Promise<Notification[]> {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("❌ Aucun token trouvé.");
      }
  
      const response = await fetch(`${API_URL}/api/users/${userId}/notifications`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des notifications");
      }
  
      return await response.json();
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des notifications :", error);
      return [];
    }
  }

// ✅ Fonction pour récupérer l'ID de l'utilisateur depuis le JWT
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
export async function updateUsers(id: number, userDetails: any) {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userDetails),
    });

    if (!response.ok) {
      throw new Error("Échec de la mise à jour de l'utilisateur");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de l'utilisateur :", error);
    throw error;
  }
}
// 📌 Récupérer le nombre de notifications non lues
/* export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error("❌ Aucun token trouvé.");
    }

    console.log("🔑 Token utilisé :", token);

    const response = await fetch(`${API_URL}/api/user/notifications/unread/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des notifications non lues");
    }

    const data = await response.json();
    return data.unreadCount;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des notifications non lues :", error);
    return 0;
  }
} */
  export const getUnreadNotificationsCount = async (userId: number) => {
    const token = await getToken();
    const res = await fetch(
      `${API_URL}/api/notifications/user/${userId}/unread-count`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error("Erreur fetching unread count");
    const { count } = await res.json() as { count: number };
    return count;
  };
  export const markAllNotificationsAsRead = async (userId: number) => {
    const token = await getToken();
    const res = await fetch(
      `${API_URL}/api/notifications/user/${userId}/read-all`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error("Erreur marking all as read");
  };
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("❌ Aucun token trouvé.");
    }

    if (!notificationId) {
      throw new Error("❌ L'ID de la notification est invalide.");
    }

    console.log(`📡 Marquer comme lue la notification ID: ${notificationId}`);

    const response = await fetch(`${API_URL}/api/notifications/mark-as-read/${notificationId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la mise à jour de la notification");
    }

    console.log("✅ Notification marquée comme lue");
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de la notification :", error);
  }
}


export async function acceptInvitation(invitationId: number): Promise<any> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/coach/accept/${invitationId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("❌ Erreur lors de l'acceptation de l'invitation");
  return await response.json();
}
export async function getCoachInvitations(coachId: number): Promise<any[]> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/coach/${coachId}/invitations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("❌ Erreur lors du chargement des invitations");
  return await response.json();
}



export const getFullImageUrl = (url: string): string => {
  let filename = url;

  // Si l'URL est complète, extraire uniquement le nom de fichier
  if (filename.includes("http")) {
    filename = filename.split("/").pop() || filename;
    console.log(filename)
  }

  // Remplacer "uploads/uploads" ou "uploads\u005Cuploads" par "uploads/"
  filename = filename.replace(/^(uploads[\/\\]+){1,}/, "");

console.log(filename)

  return `http://192.168.1.139:8080/uploads/${filename}`;
};
export async function uploadUserPhoto(userId: number, file: string | Blob): Promise<string> {
  const formData = new FormData();
  formData.append("userId", userId.toString());
  
  // Si "file" est de type string, on suppose qu'il s'agit d'un URI (mobile)
  if (typeof file === "string") {
    formData.append("file", {
      uri: file,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);
  } else {
    // Si c'est un Blob (cas du web)
    formData.append("file", file, "photo.jpg");
  }
  
  const token = await getToken();
  console.log("Token utilisé pour l'upload :", token);

  const response = await fetch("http://192.168.1.139:8080/api/users/uploadPhoto", {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
      // Ne pas définir Content-Type pour FormData
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur lors de l'upload de la photo (${response.status}) : ${errorText}`);
  }

  const data = await response.json();
  const returnedUrl = data.photoUrl || data.filename;
  if (!returnedUrl) {
    throw new Error("Aucune URL de photo retournée par le backend.");
  }
  return returnedUrl;
}


export async function inviteCoach(coachId: number): Promise<any> {
  try {
    const token = await getToken(); // Récupère le token JWT
    // Extraire l'ID utilisateur depuis le token
    const userId = await getUserIdFromToken();
    if (!userId) throw new Error("ID utilisateur introuvable dans le token");

    const response = await fetch(
      `${API_URL}/api/users/invite?userId=${userId}&coachId=${coachId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Échec de l'envoi de l'invitation");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'invitation :", error);
    throw error;
  }
}

export async function getCoachById(coachId: number): Promise<any> {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/users/coaches/${coachId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Coach non trouvé");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du coach :", error);
    throw error;
  }
}

export async function getAllCoaches(): Promise<any> {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/users/coaches`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Échec de la récupération des coachs");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des coachs :", error);
    throw error;
  }
}
export async function canChat(coachId: number,userId : number): Promise<any> {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/coach/can-chat?coachId=${coachId}&userId=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la vérification de la permission de chat");
    }
    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la vérification de chat :", error);
    throw error;
  }
}

export async function getOrCreateConversation(userId: number, coachId: number): Promise<any> {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/conversations/getOrCreate?userId=${userId}&coachId=${coachId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Impossible de récupérer ou créer la conversation");
    }
    const conversation = await response.json();
    console.log('Conversation récupérée ou créée:', conversation);
    if (conversation.id) {
      return conversation.id;  // Retourner uniquement l'ID de la conversation
    } else {
      throw new Error("Aucun ID de conversation retourné");
    }
  } catch (error) {
    console.error("❌ Erreur dans getOrCreateConversation :", error);
    throw error;
  }
}


/**
 * Récupère l'historique des messages d'une conversation.
 */
export async function getConversationMessages(conversationId: number): Promise<any> {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Impossible de récupérer les messages");
    }
    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des messages :", error);
    throw error;
  }
}

/**
 * Envoie un message dans une conversation.
 */
export async function sendMessage(conversationId: number, senderId: number, content: string): Promise<any> {
  try {
    const token = await getToken();
    const response = await fetch(
      `${API_URL}/api/conversations/${conversationId}/sendMessage?senderId=${senderId}&content=${encodeURIComponent(content)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Impossible d'envoyer le message");
    }
    return await response.json();
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du message :", error);
    throw error;
  }
}
export async function getUserByIdForCoach(userId: number): Promise<any> {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/coach/users/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la récupération de l'utilisateur");
    }
    return await response.json();
  } catch (error) {
    console.error("❌ Erreur dans getUserByIdForCoach :", error);
    throw error;
  }
} 
  export async function updateCoach(coachId: number, updatedCoach: any){
    try {
      console.log({coachId,updatedCoach});
        
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/coach/${coachId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedCoach),
      });
      console.log(response);
      
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du profil coach");
      }
      return await response.json();
    } catch (error) {
      console.error("❌ Erreur dans updateCoach:", error);
      throw error;
    }
  }
  export async function uploadCoachPhoto(coachId: number, file: string | Blob): Promise<string> {
    const formData = new FormData();
    formData.append("coachId", coachId.toString());  // Changed from userId to coachId for coach-specific upload
  
    // If "file" is a string, we assume it's a URI (mobile)
    if (typeof file === "string") {
      formData.append("file", {
        uri: file,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
    } else {
      // If it's a Blob (web case)
      formData.append("file", file, "photo.jpg");
    }
  
    const token = await getToken();
    console.log("Token utilisé pour l'upload :", token);
  
    const response = await fetch("http://192.168.1.139:8080/api/coach/uploadPhoto", {  // Endpoint for coach photo upload
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        // Do not set Content-Type for FormData
      },
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur lors de l'upload de la photo (${response.status}) : ${errorText}`);
    }
  
    const data = await response.json();
    const returnedUrl = data.photoUrl || data.filename;
    if (!returnedUrl) {
      throw new Error("Aucune URL de photo retournée par le backend.");
    }
    return returnedUrl;
  }
  export async function getCoachsById(coachId: number): Promise<any> {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/coach/${coachId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error("Coach non trouvé");
      }
  
      return await response.json();
    } catch (error) {
      console.error("❌ Erreur lors de la récupération du coach :", error);
      throw error;
    }
  }
  // authService.ts (ou conversationService.ts)
// Fonction pour récupérer les messages d'une conversation
export const getMessages = async (conversationId: number): Promise<any[]> => {
  try {
    const response = await fetch(
      `http://192.168.1.139:8080/api/conversations/${conversationId}/messages`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Si vous utilisez un token d'authentification, décommentez et adaptez la ligne suivante :
          // "Authorization": `Bearer ${votreToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des messages: ${response.statusText}`);
    }

    // On suppose que l'API retourne directement un tableau de messages
    const messages = await response.json();
    return messages;
  } catch (error) {
    console.error("Erreur dans getMessages:", error);
    throw error;
  }
};
export async function createReview(coachId: number, rating: number, comment: string) {
  try {
    const token = await getToken();
    // Extraire l'ID utilisateur via la fonction dédiée
    const userId = await getUserIdFromToken();
    console.log("✅ ID utilisateur extrait du token :", userId);

    const response = await fetch(`${API_URL}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        coachId,
        rating,
        comment,
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de la review");
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}


// Récupérer les reviews de l'utilisateur connecté
export async function getMyReviews(): Promise<any[]> {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/reviews`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des avis");
    }
    const reviews = await response.json();
    const userId = await getUserIdFromToken();
    // Filtrer les reviews qui appartiennent à l'utilisateur connecté
    const myReviews = reviews.filter((review: any) => review.userId === userId);
    return myReviews;
  } catch (error) {
    throw error;
  }
}

// Mettre à jour une review (vérification côté backend par exemple)
export async function updateReview(
  userId: number,
  reviewId: number,
  rating: number,
  comment: string,
  coachId: number
) {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/reviews/${userId}/${reviewId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rating,
        comment,
        coachId, // On envoie le coachId
      }),
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la mise à jour de l'avis");
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}


// Supprimer une review
export async function deleteReview(userId: number, reviewId: number) {
  console.log("Appel de deleteReview avec userId:", userId, "et reviewId:", reviewId);
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/reviews/${userId}/${reviewId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la suppression de l'avis");
    }
    console.log("deleteReview renvoie OK");
    return true;
  } catch (error) {
    console.error("Erreur dans deleteReview :", error);
    throw error;
  }
}
export async function getReviewsByCoachId(coachId: number): Promise<any[]> {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/reviews/coach/${coachId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des reviews pour le coach ${coachId}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Erreur dans getReviewsByCoachId :", error);
    throw error;
  }
}
export interface Meal {
  coachId: number;
  userId: number;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
  sport?: string;
  water?: string;
  date: string; // Format "yyyy-MM-dd"
}

// Créer un plat (POST /api/meals)
export const createMeal = async (mealData: Meal): Promise<Meal> => {
  try {
    const token =  await getToken();
    console.log("Token récupéré (createMeal):", token);
    const response = await fetch(`${API_URL}/api/meals`, {  // Utilisez l'IP correcte
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, // Assurez-vous de l'espace après Bearer
      },
      body: JSON.stringify(mealData),
    });
    if (!response.ok) {
      console.error("Réponse du serveur :", response.status, response.statusText);
      throw new Error("Erreur lors de la création du plat");
    }
    return await response.json();
  } catch (error) {
    console.error("createMeal:", error);
    throw error;
  }
};


// Mettre à jour un plat existant (PUT /api/meals/{id})
export const updateMeal = async (
  mealId: number,
  mealData: Meal
): Promise<Meal> => {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/meals/${mealId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(mealData),
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la mise à jour du plat");
    }
    return await response.json();
  } catch (error) {
    console.error("updateMeal:", error);
    throw error;
  }
};


export const deleteMeal = async (mealId: number): Promise<number> => {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/meals/${mealId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la suppression du plat");
    }
    return response.status; 
  } catch (error) {
    console.error("deleteMeal:", error);
    throw error;
  }
};


export const getMealsForUser = async (userId: number): Promise<Meal[]> => {
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/meals/user/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des plats pour l'utilisateur");
    }
    return await response.json();
  } catch (error) {
    console.error("getMealsForUser:", error);
    throw error;
  }
};


export async function getMealPlan(date: string, userId: number, coachId: number): Promise<any> {
  try {
    const token = await getToken();
    const url = `${API_URL}/api/meals/plann?date=${date}&userId=${userId}&coachId=${coachId}`;
    console.log("Récupération du plan via GET sur :", url);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur GET, status = ${response.status}. Message: ${errorText}`);
    }
    const data = await response.json();
    console.log("Plan récupéré :", data);
    return data;
  } catch (error) {
    console.error("Erreur dans getMealPlan:", error);
    throw error;
  }
}

export async function patchMealByPlan(
  date: string,
  userId: number,
  coachId: number,
  payload: object
): Promise<any> {
  try {
    // Récupération du meal correspondant via l'endpoint GET /api/meals/plan
    const mealPlan = await getMealPlan(date, userId, coachId);
    // On suppose que le meal retourné contient un champ "id"
    const mealId = mealPlan.id;
    if (!mealId) {
      throw new Error("L'id du meal n'a pas pu être récupéré.");
    }
    console.log("Meal id récupéré :", mealId);
    
    // Récupérer le token d'authentification
    const token = await getToken();
    const url = `${API_URL}/api/meals/${mealId}`;
    console.log("Envoi de la requête PATCH vers :", url);
    console.log("Payload envoyé :", payload);

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error, status = ${response.status}. Message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Réponse reçue de patchMealByPlan :", data);
    return data;
  } catch (error) {
    console.error("Erreur dans patchMealByPlan:", error);
    throw error;
  }
}
export async function getAcceptedCoachesForUser(userId: number): Promise<any[]> {
  try {
    const token = await getToken();
    const url = `${API_URL}/api/friends/coaches/${userId}`;
    console.log("Appel GET pour les coachs sur :", url);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error, status = ${response.status}. Message: ${errorText}`);
    }
    const data = await response.json();
    console.log("Coach list récupérée :", data);
    return data;
  } catch (error) {
    console.error("Erreur dans getAcceptedCoachesForUser:", error);
    throw error;
  }
}
// Dans authService.ts
export async function getMealPlanForUser(userId: number, date: string): Promise<any[]> {
  try {
    const token = await getToken();
    const url = `${API_URL}/api/meals/user/${userId}?date=${date}`;
    console.log("Appel GET pour le plan sur :", url);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur GET, status = ${response.status}. Message: ${errorText}`);
    }
    const data = await response.json();
    console.log("Plan récupéré :", data);
    return data; // Tableau de meals
  } catch (error) {
    console.error("Erreur dans getMealPlanForUser:", error);
    throw error;
  }
}

// Dans utils/authService.js (ou .ts)
// Cette fonction appelle l'endpoint GET /api/meals/plan?date=...&userId=...&coachId=...
export async function getMealPlanForUserCoachAndDate(userId: number, coachId: number, date: string) {
  const token = await getToken();
  const url = `${API_URL}/api/meals/plan?date=${date}&userId=${userId}&coachId=${coachId}`;
  console.log("Appel GET pour le plan sur :", url);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur GET, status = ${response.status}. Message: ${errorText}`);
  }
  // L'endpoint renvoie un objet Meal unique
  return await response.json();
}
export async function getMealPlanForUserAndDate(userId: number, date: string) {
  const token = await getToken();
  const url = `${API_URL}/api/meals/calend?date=${date}&userId=${userId}`;
  console.log("Appel GET pour le plan sur :", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur GET, status = ${response.status}. Message: ${errorText}`);
  }

  // Récupération des données
  let data = await response.json();

  // Si le serveur renvoie déjà un tableau, on le garde ;
  // Sinon, on encapsule l'objet dans un tableau
  if (!Array.isArray(data)) {
    data = [data];
  }

  return data;
}

export async function getUserByUsername(username: string): Promise<any> {
  try {
    const token = await getToken();
    // Utilisation de encodeURIComponent pour garantir la validité de l'URL
    const response = await fetch(`${API_URL}/api/coach?username=${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
    });
    if (!response.ok) {
      throw new Error(`Erreur dans getUserByUsername : statut ${response.status}`);
    }
    const data = await response.json();
    // Si l'API renvoie une liste d'utilisateurs, on retourne le premier élément
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error("Aucun utilisateur trouvé pour le username : " + username);
      }
      return data[0];
    }
    // Si l'API renvoie directement un objet utilisateur
    if (data && data.id) {
      return data;
    }
    throw new Error("Réponse inattendue lors de la récupération de l'utilisateur");
  } catch (error) {
    console.error("Erreur dans getUserByUsername :", error);
    throw error;
  }}
  export async function saveCalendarPlan(
    date: string, 
    userId: number, 
    coachId: number, 
    username: string,
    remarque: string
  ): Promise<any> {
    try {
      const token = await getToken();
      // Construction de l'URL avec les paramètres, en encodant la date, le username et la remarque si nécessaire
      const url = `${API_URL}/api/calendar/plan/addOrUpdate?userId=${userId}&coachId=${coachId}&date=${encodeURIComponent(date)}&username=${encodeURIComponent(username)}&remarque=${encodeURIComponent(remarque)}`;
      console.log("Enregistrement du plan via POST sur :", url);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          // Le Content-Type n'est pas nécessaire ici car nous utilisons des paramètres URL
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur POST, status = ${response.status}. Message: ${errorText}`);
      }
      const data = await response.json();
      console.log("Plan enregistré :", data);
      return data;
    } catch (error) {
      console.error("Erreur dans saveCalendarPlan:", error);
      throw error;
    }
  }
  export async function deleteRemark(remarkId: number): Promise<void> {
    try {
      const token = await getToken();
      const url = `${API_URL}/api/calendar/remark/${remarkId}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur DELETE, status = ${response.status}. Message: ${errorText}`);
      }
      return;
    } catch (error) {
      console.error("Erreur dans deleteRemark:", error);
      throw error;
    }
  }
  /* export async function getDailyPlanByDate(userId: number, date: string) {
    const url = `${API_URL}/daily_plan/${userId}/date/${date}`;
    console.log("✅ Appel GET pour le plan journalier :", url);
  
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur GET Daily Plan, status = ${response.status}, message: ${errorText}`);
    }
  
    const data = await response.json();
    return data;
  } */
    export async function getUsersProgress(): Promise<number> {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/admin/progress/users`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    
      if (res.status === 204) {
        // pas de contenu -> 0% ou non défini
        return 0;
      }
      if (!res.ok) {
        throw new Error(`Erreur ${res.status} lors de la récupération de la progression`);
      }
      // le serveur renvoie directement un nombre (Double)
      const percent = await res.json();
      return percent;
    }
    export interface ChartData {
      dates: string[];
      reel: number[];
      ia: number[];
    }
    /**
     * Récupère les données de chart IA vs Coach réel depuis l’API admin.
     */
    export async function getProgressChartData(): Promise<ChartData> {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/admin/progress/chart`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    
      if (!res.ok) {
        throw new Error(`Erreur ${res.status} lors de la récupération du chart`);
      }
      // JSON au format { dates: string[], reel: number[], ia: number[] }
      const data: ChartData = await res.json();
      return data;
    }
    export async function getMealPlanWithTicks(
      userId: number,
      coachId: number,
      date: string
    ): Promise<Meal[]> {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/meals/users/${userId}/coach/${coachId}/ticks?date=${date}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Impossible de charger les ticks");
      return await res.json();
    }
    // Retourne la liste des plans assignés par le coach pour une date donnée

// Renvoie la liste de tous les plans assignés par le coach à la date donnée
export async function getCoachDailyPlans(
  date: string,
  coachId: number
): Promise<{ userId: number; username: string }[]> {
  const token = await getToken();
  const res = await fetch(
    `${API_URL}/api/meals/plans?date=${encodeURIComponent(date)}&coachId=${coachId}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(
      `Erreur ${res.status} lors de la récupération des plans : ${txt}`
    );
  }
  return await res.json();
}
interface Invitation {
  id: number;
  userId: number;
  username: string;
  sender?: { id: number; username: string; photoUrl?: string };
}
export const getAcceptedInvitationsForCoach = async (
  coachId: number | string
) => {
  const token = await getToken();           // <- tu l’utilises déjà ailleurs
  const res = await fetch(
    `${API_URL}/api/friends/coach-invitations/${coachId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,   // si tes autres appels l’utilisent
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Erreur ${res.status} lors du fetch des invitations`);
  }

  return (await res.json()) as Invitation[]; // <-- même type que côté backend
};
export const sendNotificationToUser = async (
  recipientId: number,
  title: string,
  content: string,
  imageUrl: string = ""
) => {
  const token = await getToken();
  const senderId = await getUserIdFromToken();

  if (!senderId) {
    throw new Error("Impossible de récupérer le senderId");
  }

  return fetch(`http://192.168.1.139:8080/api/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      content,
      recipientId,   // envoie directement le nombre
      senderId,      // envoie directement le nombre
      imageUrl,
    }),
  }).then(response => {
    if (!response.ok) {
      throw new Error("Erreur lors de l'enregistrement de la notification");
    }
    return response.json();
  });
};
export async function sendBadgeToUser(
  userId: number,
  badgeId: string,
  coachId: number,
  badgeName: string,
  badgeIcon: string
) {
  const token = await getToken();  // récupère votre JWT
  const url =
    `http://192.168.1.139:8080/api/coach/sendBadge` +
    `?coachId=${coachId}` +
    `&userId=${userId}` +
    `&badgeId=${encodeURIComponent(badgeId)}` +
    `&badgeName=${encodeURIComponent(badgeName)}` +
    `&badgeIcon=${encodeURIComponent(badgeIcon)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,   // ← indispensable pour ne plus recevoir 403
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Échec de l'envoi du badge (${res.status}) : ${body}`);
  }

  return res.json();  // { message, badgeName, badgeIcon }
}
export interface Review {
  id: number;
  userId: number;
  coachId: number;
  rating: number;
  comment?: string;
  // …
}

export interface CoachReviewsPayload {
  reviews:       Review[];
  averageRating: number;
}

/**
 * Récupère la liste d'avis + la note moyenne pour un coach donné,
 * en s'assurant que l'userId dans l'URL est bien celui du token.
 */
export async function getCoachReviewsForMe(coachId: number): Promise<CoachReviewsPayload> {
  const token  = await getToken();
  const userId = await getUserIdFromToken();
  if (!token || userId == null) throw new Error("Non authentifié");

  const url = `${API_URL}/api/reviews/user/${userId}/coach/${coachId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Vous n'êtes pas authentifié·e");
  }
  if (res.status === 403) {
    throw new Error("Accès refusé : vous ne pouvez voir que vos propres reviews");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur ${res.status}: ${text}`);
  }

  return await res.json() as CoachReviewsPayload;
}
export async function updateUserCoach(
  coachType: String | null,
): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error("Token manquant");

  const userId = await getUserIdFromToken();
  const url = `${API_URL}/api/users/${userId}/coachTypee`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify({ coachType }),  
    }
  );
}
export async function getIaCoachedUsers(): Promise<User[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/admin/users/ia`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Erreur ${res.status} lors de la récupération IA-users`);
  }
  return res.json();
}

/**
 * Récupère tous les users coachés par un coach réel.
 */
export async function getRealCoachedUsers(): Promise<User[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/admin/users/real`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Erreur ${res.status} lors de la récupération real-users`);
  }
  return res.json();
}