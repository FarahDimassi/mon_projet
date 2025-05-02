import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { getToken } from './tokenUtils';
let API_URL = "http://192.168.100.206:8080";
/**
 * Service for managing video calls in the app
 */
export class VideoCallService {
  /**
   * Creates a new video call session between a coach and user
   * @param coachId The ID of the coach
   * @param userId The ID of the user/subscriber
   * @returns The session ID for the new video call
   */
  static async createSession(coachId: number, userId: number) {
    try {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/video-sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coachId, subscriberId: userId }) // note: align body key with backend
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create video session: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Created video session:', data);
      return data; // return full session object (id, roomName, etc.)
    } catch (error) {
      console.error('Error creating video session:', error);
      throw error;
    }
  }
  
  /**
   * Opens a fallback URL if native Jitsi integration fails
   * @param roomName The room name for the video call
   * @param displayName The user's display name
   */
  static openJitsiWebFallback(roomName: string, displayName: string) {
    const encodedRoomName = encodeURIComponent(roomName);
    const encodedDisplayName = encodeURIComponent(displayName);
    
    // Create a web URL for Jitsi Meet
    const url = `https://meet.jit.si/${encodedRoomName}#userInfo.displayName="${encodedDisplayName}"`;
    
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }
    
    // On mobile, show alert to confirm
    Alert.alert(
      "Ouvrir dans le navigateur",
      "L'appel vidéo va s'ouvrir dans votre navigateur web",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Continuer",
          onPress: () => Linking.openURL(url)
        }
      ]
    );
  }
  
  /**
   * Returns a unique room name for video calls
   * @param coachId The coach's ID
   * @param userId The user's ID
   * @returns A formatted room name string
   */
  static generateRoomName(coachId: number, userId: number): string {
    const timestamp = Date.now();
    return `fitness-coach-${coachId}-user-${userId}-${timestamp}`;
  }
  
  /**
   * Checks if the platform supports native Jitsi Meet
   * @returns True if the platform supports native Jitsi, false otherwise
   */
  static isNativeJitsiSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }
}
