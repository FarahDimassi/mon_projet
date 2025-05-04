import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import * as Network from "expo-network";
import { Platform } from "react-native";
import { getToken } from "./authService";

let API_URL = "http://192.168.1.139:8080"; 

export async function requestResetInvitation(userId: number, message: string): Promise<any> {
    try {
        const token = await getToken();
      const response = await fetch(`${API_URL}/api/users/request-reset-invitation?userId=${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erreur lors de la demande de réinitialisation");
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erreur requestResetInvitation:", error);
      throw error;
    }
  }
  
  export async function requestResetInvitationIA(userId: number, message: string): Promise<any> {
    try {
        const token = await getToken();
      const response = await fetch(`${API_URL}/api/users/request-reset-invitation?userId=${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erreur lors de la demande de réinitialisation");
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erreur requestResetInvitation:", error);
      throw error;
    }
  }
  export async function requestIaCoachRequest(userId: number, comment: string) {
    const token = await getToken();
    const url = `${API_URL}/api/users/${userId}/coach-request?comment=${encodeURIComponent(comment)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erreur ${res.status} : ${err}`);
    }
    // si votre endpoint ne renvoie pas de JSON, vous pouvez juste return;
    return;
  }