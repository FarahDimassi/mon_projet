// components/VideoRoom.tsx
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserIdFromToken } from '../utils/tokenUtils';
import { Ionicons } from '@expo/vector-icons';
import { VideoCallService } from '../utils/VideoCallService';

// Importation conditionnelle de JitsiMeet
let JitsiMeet: { endCall: () => void; call: (arg0: string, arg1: { displayName: string; }) => void; toggleAudioMuted: () => void; toggleVideoMuted: () => void; toggleCamera: () => void; } | null = null;
let JitsiMeetView: React.JSX.IntrinsicAttributes | null = null;

// Importer JitsiMeet uniquement sur les plateformes natives (iOS, Android)
if (Platform.OS !== 'web') {
  try {
    // Pour iOS, nous utilisons une approche différente à cause des limitations
    if (Platform.OS === 'ios') {
      const JitsiModule = require('react-native-jitsi-meet');
      JitsiMeet = JitsiModule;
      // Sur iOS, JitsiMeetView est spécifiquement importé si disponible
      JitsiMeetView = JitsiModule.JitsiMeetView || JitsiModule.default;
    } else {
      // Pour Android
      const JitsiModule = require('react-native-jitsi-meet');
      JitsiMeet = JitsiModule.default || JitsiModule;
      JitsiMeetView = JitsiModule.default || JitsiModule;
    }
  } catch (e) {
    console.error("Impossible de charger react-native-jitsi-meet:", e);
  }
}

export default function VideoRoom() {
  const jitsiRef = useRef(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  
  // Get room details from params
  const { sessionId, coachId, userId, roomName: paramRoomName } = params;

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
        
        // Generate room name based on parameters
        let roomId;
        if (paramRoomName) {
          // Si le nom de la salle est fourni directement (depuis un lien d'invitation)
          roomId = String(paramRoomName);
        } else if (coachId && userId) {
          // Sinon génération basée sur les IDs des participants
          roomId = VideoCallService.generateRoomName(Number(coachId), Number(userId));
        } else {
          // Fallback avec sessionId
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
      if (Platform.OS !== 'web' && JitsiMeet) {
        try {
          if (typeof JitsiMeet.endCall === 'function') {
            JitsiMeet.endCall();
          }
        } catch (err) {
          console.error("Error ending call:", err);
        }
      }
    };
  }, [sessionId, coachId, userId, paramRoomName]);
  
  useEffect(() => {
    // Start the call once we have all the information
    if (roomName && userName && !loading && !error) {
      const url = `https://meet.jit.si/${roomName}`;
      const userInfo = { displayName: userName };
      
      try {
        console.log("Starting video call to:", url);
        
        if (Platform.OS !== 'web' && JitsiMeet) {
          // Vérifier si la méthode call existe
          if (typeof JitsiMeet.call === 'function') {
            JitsiMeet.call(url, userInfo);
          } else {
            // Fallback au cas où l'API ne correspond pas à ce qu'on attend
            console.warn("JitsiMeet n'a pas de méthode call, utilisation du navigateur");
            Linking.openURL(url);
          }
        } else {
          // Pour le web ou si JitsiMeet n'est pas disponible
          if (Platform.OS === 'web') {
            window.open(url, '_blank');
          } else {
            Linking.openURL(url);
          }
        }
      } catch (err) {
        console.error("Error starting call:", err);
        setError("Impossible de démarrer l'appel vidéo");
        
        // Try web fallback if native call fails
        try {
          Linking.openURL(`https://meet.jit.si/${roomName}`);
        } catch (e) {
          console.error("Fallback failed:", e);
        }
      }
    }
  }, [roomName, userName, loading, error]);

  // Control handlers
  const toggleAudio = () => {
    if (Platform.OS !== 'web' && JitsiMeet) {
      try {
        if (typeof JitsiMeet.toggleAudioMuted === 'function') {
          JitsiMeet.toggleAudioMuted();
        }
      } catch (e) {
        console.error("Failed to toggle audio:", e);
      }
    }
  };
  
  const toggleVideo = () => {
    if (Platform.OS !== 'web' && JitsiMeet) {
      try {
        if (typeof JitsiMeet.toggleVideoMuted === 'function') {
          JitsiMeet.toggleVideoMuted();
        }
      } catch (e) {
        console.error("Failed to toggle video:", e);
      }
    }
  };
  
  const switchCamera = () => {
    if (Platform.OS !== 'web' && JitsiMeet) {
      try {
        if (typeof JitsiMeet.toggleCamera === 'function') {
          JitsiMeet.toggleCamera();
        }
      } catch (e) {
        console.error("Failed to switch camera:", e);
      }
    }
  };
  
  const endCall = () => {
    if (Platform.OS !== 'web' && JitsiMeet) {
      try {
        if (typeof JitsiMeet.endCall === 'function') {
          JitsiMeet.endCall();
        }
      } catch (e) {
        console.error("Failed to end call:", e);
      }
    }
    router.replace('/(tabs)/Chconver');
  };

  // Lors de la fin d'un appel, revenir à Chconver au lieu de simplement retourner en arrière
  const handleConferenceTerminated = () => {
    router.replace('/(tabs)/Chconver'); // Utiliser replace au lieu de back ou push
  };

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.replace('/(tabs)/Chconver')}
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
        <TouchableOpacity 
          style={[styles.button, { marginTop: 10, backgroundColor: '#777' }]}
          onPress={() => router.replace('/(tabs)/Chconver')}
        >
          <Text style={styles.buttonText}>Retour aux conversations</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  // Vérification que JitsiMeetView est disponible avant de l'utiliser
  if (!JitsiMeetView) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Le composant de visioconférence n'est pas disponible sur cet appareil.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            const url = `https://meet.jit.si/${roomName}`;
            Linking.canOpenURL(url).then(supported => {
              if (supported) {
                Linking.openURL(url);
              } else {
                Alert.alert("Erreur", "Impossible d'ouvrir le navigateur");
              }
            });
          }}
        >
          <Text style={styles.buttonText}>Ouvrir dans le navigateur</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { marginTop: 10, backgroundColor: '#777' }]}
          onPress={() => router.replace('/(tabs)/Chconver')}
        >
          <Text style={styles.buttonText}>Retour aux conversations</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Utiliser conditionnellement JitsiMeetView avec ses props appropriées */}
      {JitsiMeetView && (
        <JitsiMeetView
          ref={jitsiRef}
          onConferenceTerminated={handleConferenceTerminated}
          onConferenceJoined={() => console.log(`Rejoint: ${roomName}`)}
          onConferenceWillJoin={() => console.log('Connexion en cours...')}
          style={styles.jitsiView}
        />
      )}
      
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
