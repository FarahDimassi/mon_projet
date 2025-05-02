// components/VideoRoom.tsx
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import JitsiMeet from 'react-native-jitsi-meet';
import JitsiMeetView from 'react-native-jitsi-meet';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserIdFromToken } from '../utils/tokenUtils';
import { Ionicons } from '@expo/vector-icons';
import { VideoCallService } from '../utils/VideoCallService';

export default function VideoRoom() {
  const jitsiRef = useRef(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  
  // Get room details from params
  const { sessionId, coachId, userId } = params;

  useEffect(() => {
    async function prepareSession() {
      try {
        // Default room name (can be customized later)
        let displayName = "Utilisateur";

        // Get current user info if not provided
        const currentUserId = await getUserIdFromToken();
        if (!currentUserId) {
          setError("Vous devez être connecté pour rejoindre une session vidéo");
          return;
        }
        
        // Generate room name based on participants
        let roomId;
        if (coachId && userId) {
          roomId = VideoCallService.generateRoomName(Number(coachId), Number(userId));
        } else {
          roomId = `session-${sessionId || Date.now()}`;
        }
        
        // Set final room name and user display name
        setRoomName(roomId);
        setUserName(displayName);
        setLoading(false);
      } catch (err) {
        console.error("Error preparing video session:", err);
        setError("Une erreur est survenue lors de la préparation de la session vidéo");
      }
    }
    
    prepareSession();
    
    return () => {
      // Clean up the video session when component unmounts
      try {
        JitsiMeet.endCall();
      } catch (err) {
        console.error("Error ending call:", err);
      }
    };
  }, [sessionId, coachId, userId]);
  
  useEffect(() => {
    // Start the call once we have all the information
    if (roomName && userName && !loading && !error) {
      const url = `https://meet.jit.si/${roomName}`;
      const userInfo = { displayName: userName };
      
      try {
        console.log("Starting video call to:", url);
        
        if (VideoCallService.isNativeJitsiSupported()) {
          JitsiMeet.call(url, userInfo);
        } else {
          // For web or unsupported platforms, use web fallback
          VideoCallService.openJitsiWebFallback(roomName, userName);
        }
      } catch (err) {
        console.error("Error starting call:", err);
        setError("Impossible de démarrer l'appel vidéo");
        
        // Try web fallback if native call fails
        VideoCallService.openJitsiWebFallback(roomName, userName);
      }
    }
  }, [roomName, userName, loading, error]);

  // Control handlers
  const toggleAudio = () => {
    try {
      JitsiMeet.toggleAudioMuted();
    } catch (e) {
      console.error("Failed to toggle audio:", e);
    }
  };
  
  const toggleVideo = () => {
    try {
      JitsiMeet.toggleVideoMuted();
    } catch (e) {
      console.error("Failed to toggle video:", e);
    }
  };
  
  const switchCamera = () => {
    try {
      JitsiMeet.toggleCamera();
    } catch (e) {
      console.error("Failed to switch camera:", e);
    }
  };
  
  const endCall = () => {
    try {
      JitsiMeet.endCall();
    } catch (e) {
      console.error("Failed to end call:", e);
    }
    router.back();
  };

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Préparation de votre session vidéo...</Text>
      </SafeAreaView>
    );
  }

  // Web doesn't support JitsiMeetView
  if (Platform.OS === 'web') {
    const fallbackUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}` +
                        `#userInfo.displayName="${encodeURIComponent(userName)}"`;
  
    return (
      <SafeAreaView style={styles.webContainer}>
        <Text style={styles.webText}>
          Votre navigateur va ouvrir l'appel vidéo dans une nouvelle fenêtre.
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => window.open(fallbackUrl, '_blank')}
        >
          <Text style={styles.buttonText}>Rejoindre l'appel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <View style={styles.container}>
      <JitsiMeetView
        ref={jitsiRef}
        onConferenceTerminated={() => router.back()}
        onConferenceJoined={() => console.log(`Rejoint: ${roomName}`)}
        onConferenceWillJoin={() => console.log('Connexion en cours...')}
        style={styles.jitsiView}
      />
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleAudio}>
          <Ionicons name="mic" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
          <Ionicons name="videocam" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
          <Ionicons name="camera-reverse" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={endCall}>
          <Ionicons name="call" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  jitsiView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  webText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#F44336',
    transform: [{ rotate: '135deg' }]
  }
});
