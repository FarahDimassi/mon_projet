// ChatScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
  ActionSheetIOS,
  Linking,
} from "react-native";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import * as Notifications from 'expo-notifications';

// en haut de ChatScreen.tsx
import * as ImagePicker from "expo-image-picker";

import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import { getUserIdFromToken, getToken } from "../../utils/authService";
import FooterC from "../../components/FooterC";
import NavbarCoach from "@/components/NavbarCoach";

// Import useRouter pour la navigation
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL } from "@/utils/config";

// Types
interface ChatContact {
  coach: any;
  user: any;
  partnerId: number;
  partnerName: string;
  partnerImageUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface ChatMessage {
  id?: number;
  message: string;
  senderId: number;
  date?: string;
  isFromMe?: boolean;
  attachmentType?: "image" | "audio";
  attachmentUrl?: string;
}

const ChatScreen: React.FC = () => {
  const router = useRouter(); // Pour la navigation vers VideoRoom
  // Récupérer les paramètres, notamment le lien de réunion partagé
  const params = useLocalSearchParams();
  const { roomLink } = params;

  // ─── Helpers pour générer le fichier RN + MIME ───
const getFileExtension = (uri: string) =>
  uri.includes('.') ? uri.split('.').pop()!.toLowerCase() : '';

const guessMime = (ext: string) => {
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'm4a') return 'audio/m4a';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'mp3') return 'audio/mpeg';
  return 'application/octet-stream';
};

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(true);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [client, setClient] = useState<Client | null>(null);
  const isCoach = false;
  const [searchQuery, setSearchQuery] = useState("");
  
  // États pour les fonctionnalités d'attachement
  const [showAttachmentModal, setShowAttachmentModal] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [durationTimer, setDurationTimer] = useState<NodeJS.Timeout | null>(null);
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const isWeb = Platform.OS === 'web';
  const chatListRef = React.useRef<FlatList>(null);
  // Récupération du token et de l'ID utilisateur
  useEffect(() => {
    (async () => {
      const newToken = await getToken();
      setToken(newToken);
      const extractedUserId = await getUserIdFromToken();
      setUserId(String(extractedUserId));
    })();
  }, []);
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission caméra",
          "Tu dois autoriser l'accès à la caméra pour prendre des photos."
        );
      }
    })();
  }, []);
   useEffect(() => {
    (async () => {
      // Demande d’abord l’accès à la galerie
      if (!mediaPermission?.granted) {
        await requestMediaPermission();
      }
      // Puis l’accès à la caméra
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
    })();
  }, []);
  // Récupération de la liste des contacts
  useEffect(() => {
    if (!token || !userId) return;
    const fetchContacts = async () => {
      try {
        const url = ` ${API_URL}/api/chat/contacts?userId=${userId}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des contacts");
        }
        const data = await response.json();
        setContacts(data);
      } catch (error) {
        console.error("Erreur de chargement des contacts :", error);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [token, userId]);
  useEffect(() => {
    // Configuration du handler global (Android & iOS)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  
    // Configuration spécifique Android : Channel
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',                     // 🔊 Son par défaut
          vibrationPattern: [0, 250, 250, 250], // 📳 Vibration personnalisée
          lightColor: '#FF231F7C',              // Optionnel : LED couleur (si dispo)
        });
      }
    })();
  }, []);
  
  // Filtrer les contacts
  const filteredContacts = contacts.filter((contact) =>
    contact.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleTakePhoto = async () => {
    // ferme ton modal d’options
    setShowAttachmentModal(false);
  
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
  
      if (!result.canceled && result.assets.length > 0) {
        await uploadAndSendImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Erreur caméra :", err);
      Alert.alert("Erreur", "Impossible de prendre la photo.");
    }
  };
/*   useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }
    })();
  }, []); */
  
  // Chargement de l'historique et configuration du WebSocket
  useEffect(() => {
    if (!selectedContact || !token || !userId) return;
    setLoadingChat(true);

    const fetchHistory = async () => {
      try {
        const url = ` ${API_URL}/api/chat/history/${selectedContact.partnerId}?userId=${userId}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch chat history");
        }
        const data = await res.json();
        const formattedData: ChatMessage[] = data.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          message: msg.message,
          attachmentType: msg.attachmentType,   // ← obligatoire
          attachmentUrl: msg.attachmentUrl,     // ← obligatoire
          date: msg.date,
          isFromMe: msg.senderId.toString() === userId,
        }));
        setChatMessages(formattedData);
        setTimeout(() => {
          if (chatListRef.current && formattedData.length > 0) {
            chatListRef.current.scrollToEnd({ animated: false });
          }
        }, 200);
      } catch (err) {
        console.error("Erreur chargement historique :", err);
      } finally {
        setLoadingChat(false);
      }
    };
    fetchHistory();

    const buildRoomId = (userId: string, partnerId: number) => {
      return Number(userId) < partnerId
        ? `${userId}_${partnerId}`
        : `${partnerId}_${userId}`;
    };
    const roomId = buildRoomId(userId, selectedContact.partnerId);

    const socket = new SockJS(` ${API_URL}/ws?token=${token}`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      debug: (str) => console.log(str),
      onConnect: () => {
        stompClient.subscribe(`/topic/room/${roomId}`, async (msg) => {
          const receivedMsg = JSON.parse(msg.body);
        
          setChatMessages((prev) => [
            ...prev,
            { ...receivedMsg, isFromMe: receivedMsg.senderId == userId },
          ]);
        
          // 🚨 Affiche une notification locale si ce n'est PAS moi le sender
          if (receivedMsg.senderId !== parseInt(userId, 10)) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `Nouveau message de ${selectedContact?.partnerName || 'Contact'}`,
                  body: receivedMsg.message || 'Vous avez reçu un message.',
                  android: {
                    channelId: 'default',
                    priority: 'high',
                    sound: 'default',
                    vibrate: [0, 250, 250, 250],
                  },
                  // iOS-specific
                  ios: {
                    sound: true,
                    interruptionLevel: 'active',
                  },
                },
                trigger: null,  // Immédiat
              });
              console.log('🔔 Notification locale affichée');
            } catch (e) {
              console.error('Erreur lors de la notification locale :', e);
            }
          }
        });
        
        
      },
    });
    stompClient.activate();
    setClient(stompClient);

    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [selectedContact, token, userId]);

  // Envoi d'un message texte
  const sendMessage = () => {
    if (client && message.trim().length > 0 && selectedContact) {
      const chatMessage = {
        receiverId: selectedContact.partnerId,
        message: message,
        date: new Date(),
      };
      client.publish({
        destination: "/app/chat",
        body: JSON.stringify(chatMessage),
      });
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      setMessage("");
    }
  };

  // Fonction pour démarrer une visioconférence et partager le lien
const startVideoCall = () => {
  try {
    // Générer un nom de salle unique qui ne contient pas de caractères spéciaux
    const simpleRoomName = `meeting${userId}${Date.now()}`;
    const meetingLink = `https://meet.jit.si/${simpleRoomName}`;
    
    // Vérifier si un client WebSocket est disponible
    if (!client || !client.connected) {
      console.log("Client WebSocket non connecté, création d'une nouvelle connexion...");
      
      const token = getToken();
      if (!token) {
        Alert.alert("Erreur d'authentification", "Veuillez vous reconnecter et réessayer.");
        return;
      }
      
      // Réinitialiser la connexion WebSocket
      const socket = new SockJS(` ${API_URL}/ws?token=${token}`);
      const newStompClient = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        debug: (str) => console.log(str),
      });
      
      newStompClient.onConnect = () => {
        console.log("Nouvelle connexion établie, envoi des invitations...");
        // Attendre un court instant que la connexion soit complètement établie
        setTimeout(() => {
          sendInvitations(newStompClient, simpleRoomName, meetingLink);
        }, 1000);
      };
      
      newStompClient.activate();
      setClient(newStompClient);
    } else {
      // Si le client est déjà connecté, envoi direct des invitations
      console.log("Client WebSocket déjà connecté, envoi direct des invitations...");
      sendInvitations(client, simpleRoomName, meetingLink);
    }
  } catch (e) {
    console.error("Erreur lors du démarrage de l'appel vidéo:", e);
    Alert.alert("Erreur", "Impossible de démarrer l'appel vidéo.");
  }
};
  
  // Fonction d'aide pour envoyer les invitations et rediriger vers la salle
  const sendInvitations = (stompClient: Client, roomName: string, meetingLink: string) => {
    try {
      let contactsCount = 0;
      
      // Envoyer le lien à tous les contacts de manière fiable
      contacts.forEach(contact => {
        const invitationMessage = {
          receiverId: contact.partnerId,
          // Message simplifié avec juste le lien, sans le texte d'introduction
          message: `${meetingLink}`,
          date: new Date().toISOString(),
          type: "INVITATION"  // Capital pour être cohérent avec le backend
        };
        
        stompClient.publish({
          destination: "/app/chat",
          body: JSON.stringify(invitationMessage),
        });
        contactsCount++;
      });
      
      // Afficher confirmation
      Alert.alert(
        "Invitation envoyée", 
        `Le lien de la réunion a été envoyé à ${contactsCount} contact(s).`,
        [{ 
          text: "Rejoindre maintenant", 
          onPress: () => {
            console.log("Navigation vers VideoRoom avec roomName:", roomName);
            // Ouvrir directement dans le navigateur pour garantir la compatibilité
            if (Platform.OS === 'web') {
              window.open(meetingLink, '_blank');
            } else {
              Linking.openURL(meetingLink);
            }
            
            // Rediriger également vers la page VideoRoom de l'application
            router.push({
              pathname: '/VideoRoom',
              params: {
                sessionId: Date.now().toString(),
                userId: userId,
                isHost: true,
                roomName: roomName,
                directLink: meetingLink
              }
            });
          }
        }]
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi des invitations:", error);
      Alert.alert("Erreur", "Impossible d'envoyer les invitations, veuillez réessayer.");
    }
  };

  // Ouvrir les options d'attachement
  const openAttachmentOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Annuler", "Prendre une photo", "Choisir une image", "Enregistrer un message vocal"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePicture();
          } else if (buttonIndex === 2) {
            pickImage();
          } else if (buttonIndex === 3) {
            toggleRecording();
          }
        }
      );
    } else {
      // Pour Android et Web, afficher notre popup personnalisée
      setShowAttachmentModal(true);
    }
  };

  // Prendre une photo avec la caméra
  const takePicture = async () => {
    // 2.1) Demande de permissions caméra
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission refusée", "L'accès à la caméra est nécessaire.");
      return;
    }
  
    // 2.2) Ouverture de l'appareil photo natif
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
  
    // 2.3) Si l'utilisateur a pris une photo, on l'uploade
    if (!result.canceled && result.assets.length > 0) {
      await uploadAndSendImage(result.assets[0].uri);
    }
  };
  // Sélectionner une image depuis la galerie
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission refusée", "L'accès à la galerie est nécessaire pour cette fonctionnalité.");
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadAndSendImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erreur lors de la sélection d'image:", error);
      Alert.alert("Erreur", "Impossible de sélectionner une image.");
    }
  };
  

  // Uploader et envoyer l'image
 // Assurez‑vous que votre interface ChatMessage connaît ces champs :
interface ChatMessage {
  id?: number;
  message?: string;
  imageUrl?: string;
  attachmentType?: "audio" | "image";
  attachmentUrl?: string;
  senderId: number;
  date?: string;
  isFromMe?: boolean;
}
const uploadAndSendImage = async (uri: string, webFile?: File) => {
    if (!token || !selectedContact) return;
  
    try {
      const formData = new FormData();
  
      if (isWeb && webFile) {
        // Web : on pousse directement le File du <input>
        formData.append('file', webFile);
      } else {
        // Mobile RN : on passe un objet { uri, name, type }
        const ext = getFileExtension(uri) || 'jpg';
        formData.append('file', {
          uri,
          name: `photo_${Date.now()}.${ext}`,
          type: guessMime(ext),
        } as any);
      }
  
      const res = await fetch(' ${API_URL}/api/chat/upload/image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
  
      if (!res.ok) throw new Error(await res.text());
      const { url: imageUrl } = await res.json();
  
      const outgoing: ChatMessage = {
        senderId: Number(userId),
        isFromMe: true,
        date: new Date().toISOString(),
        message: 'Image envoyée',
        attachmentType: 'image',
        attachmentUrl: imageUrl,
      };
  
      client?.publish({
        destination: '/app/chat',
        body: JSON.stringify({ receiverId: selectedContact.partnerId, ...outgoing }),
      });
      setChatMessages((prev) => [...prev, outgoing]);
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (e) {
      console.error('uploadAndSendImage', e);
      Alert.alert('Erreur', "Impossible d'envoyer l'image.");
    }
  };
  

  // Démarrer/arrêter l'enregistrement audio
  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // Démarrer l'enregistrement audio
  const startRecording = async () => {
    try {
      // Demander les permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission refusée", "L'accès au microphone est nécessaire pour cette fonctionnalité.");
        return;
      }

      // Configurer l'audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Créer un nouvel enregistrement
      const recording = new Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Démarrer un timer pour afficher la durée
      const timer = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
      setDurationTimer(timer);
      
    } catch (error) {
      console.error("Erreur lors du démarrage de l'enregistrement:", error);
      Alert.alert("Erreur", "Impossible de démarrer l'enregistrement.");
    }
  };

  // Arrêter l'enregistrement audio
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      // Arrêter le timer
      if (durationTimer) {
        clearInterval(durationTimer);
        setDurationTimer(null);
      }
      
      // Arrêter l'enregistrement
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Réinitialiser les états
      setRecording(null);
      setIsRecording(false);
      
      if (uri) {
        await uploadAndSendAudio(uri);
      }
      
    } catch (error) {
      console.error("Erreur lors de l'arrêt de l'enregistrement:", error);
      Alert.alert("Erreur", "Impossible de finaliser l'enregistrement.");
    }
  };

  const uploadAndSendAudio = async (uri: string, webBlob?: Blob) => {
      if (!token || !selectedContact) return;
    
      try {
        const formData = new FormData();
    
        if (isWeb && webBlob) {
          // Web : le Blob capturé par MediaRecorder
          formData.append('file', webBlob, 'recording.mp3');
        } else {
          // Mobile RN : objet { uri, name, type }
          const ext = getFileExtension(uri) || 'm4a';
          formData.append('file', {
            uri,
            name: `audio_${Date.now()}.${ext}`,
            type: guessMime(ext),
          } as any);
        }
    
        const res = await fetch(' ${API_URL}/api/chat/upload/audio', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
    
        if (!res.ok) throw new Error(await res.text());
        const { url: audioUrl } = await res.json();
    
        const outgoing: ChatMessage = {
          senderId: Number(userId),
          isFromMe: true,
          date: new Date().toISOString(),
          message: 'Message vocal',
          attachmentType: 'audio',
          attachmentUrl: audioUrl,
        };
    
        client?.publish({
          destination: '/app/chat',
          body: JSON.stringify({ receiverId: selectedContact.partnerId, ...outgoing }),
        });
        setChatMessages((prev) => [...prev, outgoing]);
        setTimeout(() => {
          if (chatListRef.current) {
            chatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      } catch (e) {
        console.error('uploadAndSendAudio', e);
        Alert.alert('Erreur', "Impossible d'envoyer le message vocal.");
      }
    };
  
  
  // Fonction pour lire un audio
  const playAudio = async (audioUrl: string) => {
    try {
      const soundObject = new Audio.Sound();
      await soundObject.loadAsync({ uri: audioUrl });
      await soundObject.playAsync();
    } catch (error) {
      console.error("Erreur lors de la lecture de l'audio:", error);
      Alert.alert("Erreur", "Impossible de lire le message vocal.");
    }
  };

  // Rendu d'un message avec gestion des attachements et liens d'invitation
  const renderMessage = (item: ChatMessage) => {
    // Vérifier si le message contient un lien d'invitation ou un lien direct Jitsi
    const isInvitationMessage = item.message && item.message.includes("Invitation à une réunion vidéo:");
    
    // Différents formats possibles de liens Jitsi
    const jitsiPattern = /(https?:\/\/)?(meet\.jit\.si\/[a-zA-Z0-9-_]+)|(https?:\/\/meet\.jit\.si\/[a-zA-Z0-9-_]+)/i;
    const containsJitsiLink = item.message && jitsiPattern.test(item.message);
    
    // Extraire le nom de la salle depuis le message
    let meetingLink = null;
    let roomName = null;
    
    if ((isInvitationMessage || containsJitsiLink) && item.message) {
      // Rechercher le lien avec ou sans protocole
      const fullLinkMatch = item.message.match(jitsiPattern);
      if (fullLinkMatch) {
        // Normaliser le lien pour garantir qu'il a un protocole
        meetingLink = fullLinkMatch[0];
        if (!meetingLink.startsWith('http')) {
          meetingLink = 'https://' + meetingLink;
        }
        
        // Extraire le nom de la salle (partie après le dernier /)
        const parts = meetingLink.split('/');
        roomName = parts[parts.length - 1];
        console.log("URL extraite:", meetingLink, "Nom de salle:", roomName);
      }
    }
    
    // Si le message est un lien brut Jitsi, l'afficher comme un bouton cliquable
    if (containsJitsiLink && meetingLink) {
      return (
        <View style={[
          styles.messageBubbleContainer,
          item.isFromMe ? styles.myMessageContainer : styles.theirMessageContainer,
        ]}>
          <View style={[
            styles.messageBubble,
            item.isFromMe ? styles.myMessage : styles.theirMessage,
            styles.linkMessage
          ]}>
            <View style={styles.jitsiLinkContainer}>
              <Ionicons name="videocam" size={20} color="#4CAF50" style={{marginRight: 8}} />
              <TouchableOpacity 
                onPress={() => {
                  if (meetingLink) {
                    if (Platform.OS === 'web') {
                      window.open(meetingLink, '_blank');
                    } else {
                      Linking.openURL(meetingLink);
                    }
                  }
                }}
                style={styles.linkButtonContainer}
              >
                <Text style={styles.jitsiLink}>Rejoindre la visioconférence</Text>
              </TouchableOpacity>
            </View>
            
            {/* Afficher également l'URL brute comme référence */}
            <Text style={styles.meetingUrlText}>{item.message}</Text>
          </View>
          
          <Text style={[
            styles.messageTime,
            item.isFromMe ? styles.myMessageTime : styles.theirMessageTime,
          ]}>
            {item.date ? new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
          </Text>
        </View>
      );
    }
    
    // Le reste du code reste inchangé pour les autres types de messages
    return (
      <View style={[
        styles.messageBubbleContainer,
        item.isFromMe ? styles.myMessageContainer : styles.theirMessageContainer,
      ]}>
        <View style={[
          styles.messageBubble,
          item.isFromMe ? styles.myMessage : styles.theirMessage,
          isInvitationMessage ? styles.invitationMessage : null,
        ]}>
          {/* Contenu du message en fonction du type */}
          {item.attachmentType === 'image' && item.attachmentUrl ? (
            <TouchableOpacity onPress={() => {}/* Ouvrir l'image en plein écran */}>
              <Image 
                source={{ uri: item.attachmentUrl.replace("localhost:8081", "192.168.1.139:8080") }} 
                style={styles.attachmentImage} 
                resizeMode="cover"
              />
              <Text style={[
                styles.messageText,
                item.isFromMe ? styles.myMessageText : styles.theirMessageText,
              ]}>
                {item.message}
              </Text>
            </TouchableOpacity>
          ) : item.attachmentType === 'audio' && item.attachmentUrl ? (
            <TouchableOpacity 
              style={styles.audioContainer}
              onPress={() => playAudio(item.attachmentUrl?.replace("localhost:8081", "192.168.1.139:8080") || '')}
            >
              <Ionicons name="play-circle" size={24} color={item.isFromMe ? "rgba(155, 0, 0, 0.8)" : "#555"} />
              <View style={styles.audioInfo}>
                <Text style={[
                  styles.messageText,
                  item.isFromMe ? styles.myMessageText : styles.theirMessageText,
                ]}>
                  {item.message}
                </Text>
              </View>
            </TouchableOpacity>
          ) : isInvitationMessage ? (
            // Rendre les messages d'invitation avec URL directement cliquable
            <View style={styles.invitationContainer}>
              <Ionicons name="videocam" size={24} color={item.isFromMe ? "rgba(155, 0, 0, 0.8)" : "#4CAF50"} style={styles.invitationIcon} />
              <View style={styles.invitationTextContainer}>
                <Text style={[
                  styles.messageText,
                  item.isFromMe ? styles.myMessageText : styles.theirMessageText,
                  styles.invitationText
                ]}>
                  Invitation à une réunion vidéo
                </Text>
                {meetingLink && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (meetingLink) {
                        if (Platform.OS === 'web') {
                          window.open(meetingLink, '_blank');
                        } else {
                          Linking.openURL(meetingLink);
                        }
                      }
                    }}
                    style={styles.linkButtonContainer}
                  >
                    <Text style={styles.hyperLink}>Cliquez ici pour rejoindre</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <Text style={[
              styles.messageText,
              item.isFromMe ? styles.myMessageText : styles.theirMessageText,
            ]}>
              {item.message}
            </Text>
          )}
        </View>
        
        <Text style={[
          styles.messageTime,
          item.isFromMe ? styles.myMessageTime : styles.theirMessageTime,
        ]}>
          {item.date ? new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
        </Text>
      </View>
    );
  };

  // Rendu d'un item contact
  const renderContactItem = ({ item }: { item: ChatContact }) => {
    const avatarUrl =
      item.partnerImageUrl && item.partnerImageUrl.trim().length > 0
        ? item.partnerImageUrl.startsWith("http")
          ? item.partnerImageUrl.replace("localhost:8081", "192.168.1.139:8080")
          : ` ${API_URL}/${item.partnerImageUrl}`
        : null;
    const avatarSource = avatarUrl
      ? { uri: avatarUrl }
      : require("../../assets/images/profile.jpg");
  
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => {
          setSelectedContact(item);
          setIsModalVisible(true);
        }}
      >
        <Image source={avatarSource} style={styles.avatar} />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.partnerName}</Text>
          <Text style={styles.lastMessageText} numberOfLines={1}>
            {item.lastMessage || "Aucun message récent"}
          </Text>
        </View>
        <Text style={styles.time}>{item.lastMessageTime || ""}</Text>
      </TouchableOpacity>
    );
  };

  // Rendu principal
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8f4f4" />
      <NavbarCoach />
      
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholderTextColor="rgba(155, 0, 0, 0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <FontAwesome5 name="search" size={20} color="rgba(155, 0, 0, 0.6)" style={styles.searchIcon} />
      </View>
  
      {/* Liste des contacts avec bouton d'appel vidéo global */}
      <View style={styles.contactListContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Mes Discussions</Text>
          <TouchableOpacity 
            style={styles.globalVideoCallButton} 
            onPress={() => {
              // Démarrer un appel général à tous les abonnés
              try {
                // Générer un nom de salle unique avec timestamp
                const simpleRoomName = `meeting${userId}${Date.now()}`;
                const meetingLink = `https://meet.jit.si/${simpleRoomName}`;
                
                // Créer une fonction pour envoyer les invitations
                const sendGlobalInvitations = (stompClient: Client) => {
                  let sentCount = 0;
                  
                  // Envoyer le lien à tous les contacts de manière fiable
                  contacts.forEach(contact => {
                    const invitationMessage = {
                      receiverId: contact.partnerId,
                      message: `${meetingLink}`,
                      date: new Date().toISOString(),
                      type: "INVITATION"  // Capital pour être cohérent avec le backend
                    };
                    
                    stompClient.publish({
                      destination: "/app/chat",
                      body: JSON.stringify(invitationMessage),
                    });
                    sentCount++;
                  });
                  
                  // Afficher confirmation avec nombre d'abonnés
                  Alert.alert(
                    "Invitation envoyée", 
                    `Le lien de la réunion a été envoyé à ${sentCount} contact(s).`,
                    [{ 
                      text: "Rejoindre maintenant", 
                      onPress: () => {
                        console.log("Navigation vers VideoRoom avec roomName:", simpleRoomName);
                        
                        // Utiliser directement le navigateur externe pour plus de fiabilité
                        if (Platform.OS === 'web') {
                          window.open(meetingLink, '_blank');
                        } else {
                          Linking.openURL(meetingLink);
                        }
                      }
                    }]
                  );
                };
                
                // Vérifier si un client WebSocket existe déjà
                if (client && client.connected) {
                  // Si oui, l'utiliser directement
                  sendGlobalInvitations(client);
                } else {
                  // Sinon, créer un nouveau client
                  const newToken = getToken();
                  if (!newToken) {
                    Alert.alert("Erreur d'authentification", "Veuillez vous reconnecter et réessayer.");
                    return;
                  }
                  
                  // Création d'une nouvelle connexion WebSocket asynchrone
                  (async () => {
                    try {
                      const token = await getToken();
                      if (!token) {
                        Alert.alert("Erreur d'authentification", "Veuillez vous reconnecter et réessayer.");
                        return;
                      }
                      
                      const socket = new SockJS(` ${API_URL}/ws?token=${token}`);
                      const newStompClient = new Client({
                        webSocketFactory: () => socket,
                        reconnectDelay: 5000,
                        debug: (str) => console.log(str),
                      });
                      
                      // Configuration de la connexion
                      newStompClient.onConnect = () => {
                        console.log("Nouvelle connexion établie, envoi des invitations...");
                        sendGlobalInvitations(newStompClient);
                      };
                      
                      // Activation du client
                      newStompClient.activate();
                    } catch (e) {
                      console.error("Erreur lors de la création de la connexion:", e);
                      Alert.alert("Erreur de connexion", "Impossible de se connecter au serveur de discussion.");
                    }
                  })();
                }
              } catch (e) {
                console.error("Erreur lors du démarrage de l'appel vidéo:", e);
                Alert.alert("Erreur", "Impossible de démarrer l'appel vidéo.");
              }
            }}
          >
            <Ionicons name="videocam" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      
        {loadingContacts ? (
          <ActivityIndicator size="large" color="rgba(155, 0, 0, 0.6)" />
        ) : contacts.length === 0 ? (
          <Text style={styles.emptyText}>Aucune discussion disponible.</Text>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.partnerId.toString()}
            renderItem={renderContactItem}
            contentContainerStyle={styles.contactsList}
          />
        )}
      </View>
  
      {/* Modal pour afficher l'historique de conversation */}
    {/* ——— MODAL ENTIER avec gestion clavier ——— */}
<Modal visible={isModalVisible} animationType="slide">
  <SafeAreaView style={styles.modalContainer}>
    {selectedContact && (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}  // ajuste 60‑100 si besoin
      >
        {/* — En‑tête — */}
        <View style={styles.simpleHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setIsModalVisible(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.profileContainer}>
            <Image
              source={
                selectedContact.partnerImageUrl?.trim()
                  ? { uri: selectedContact.partnerImageUrl.startsWith('http')
                        ? selectedContact.partnerImageUrl.replace('localhost:8081', 'localhost:8080')
                        : ` ${API_URL}/${selectedContact.partnerImageUrl}` }
                  : require('../../assets/images/profile.jpg')
              }
              style={styles.profileImage}
            />
            <Text style={styles.profileName}>{selectedContact.partnerName}</Text>
          </View>

          {/* Bouton d'appel vidéo */}
       {/*    <TouchableOpacity style={styles.videoCallButton} onPress={startVideoCall}>
            <Ionicons name="videocam" size={24} color="#fff" />
          </TouchableOpacity> */}
        </View>

        {/* — Corps (liste) — */}
        {loadingChat ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(155, 0, 0, 0.6)" />
            <Text style={styles.loadingText}>Chargement des messages...</Text>
          </View>
        ) : (
          <FlatList
          ref={chatListRef}
          style={styles.chatList}
          data={chatMessages}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={({ item, index }) => {
            // Vérifie si c'est le premier message ou s'il y a un changement de jour
            const showDate = index === 0 || (index > 0 && 
              new Date(item.date).toDateString() !== new Date(chatMessages[index - 1].date).toDateString());
            
            return (
              <>
                {showDate && (
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>
                      {new Date(item.date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {renderMessage(item)}
              </>
            );
          }}
          inverted={false}
          contentContainerStyle={styles.chatListContent}
          onContentSizeChange={() => {
            if (chatListRef.current) {
              chatListRef.current.scrollToEnd({ animated: false });
            }
          }}
        />
        )}

        {/* — Barre de saisie — */}
        <View style={styles.simpleInputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={openAttachmentOptions}>
            <Ionicons name="add-circle" size={28} color="rgba(155, 0, 0, 0.7)" />
          </TouchableOpacity>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Message..."
            placeholderTextColor="rgba(155, 0, 0, 0.4)"
            style={styles.input}
            multiline
            maxLength={1000}
          />

          {isRecording ? (
            <View style={styles.recordingContainer}>
              <Text style={styles.recordingTimer}>
                {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
              </Text>
              <TouchableOpacity
                style={[styles.sendButton, styles.recordingButton]}
                onPress={stopRecording}
              >
                <MaterialIcons name="stop" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              disabled={message.trim().length === 0}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    )}
  </SafeAreaView>
</Modal>

      
      {/* Modal pour les options d'attachement */}
      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachmentModal(false)}
      >
        <TouchableOpacity 
          style={styles.attachmentModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentModal(false)}
        >
          <View style={styles.attachmentModalContainer}>
            <View style={styles.attachmentModalContent}>
              <Text style={styles.attachmentModalTitle}>Joindre un fichier</Text>
              
              <TouchableOpacity 
  style={styles.attachmentOption}
  onPress={handleTakePhoto}
>
  <Ionicons name="camera" size={24} color="rgba(155, 0, 0, 0.8)" />
  <Text style={styles.attachmentOptionText}>Prendre une photo</Text>
</TouchableOpacity>

              
              <TouchableOpacity 
                style={styles.attachmentOption}
                onPress={() => {
                  setShowAttachmentModal(false);
                  pickImage();
                }}
              >
                <Ionicons name="images" size={24} color="rgba(155, 0, 0, 0.8)" />
                <Text style={styles.attachmentOptionText}>Choisir une image</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.attachmentOption}
                onPress={() => {
                  setShowAttachmentModal(false);
                  toggleRecording();
                }}
              >
                <Ionicons name="mic" size={24} color="rgba(155, 0, 0, 0.8)" />
                <Text style={styles.attachmentOptionText}>Enregistrer un message vocal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.attachmentOption, styles.cancelOption]}
                onPress={() => setShowAttachmentModal(false)}
              >
                <Text style={styles.cancelOptionText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
  
      {/* Footer */}
      <FooterC />
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(248,244,244,1.00)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "rgba(155, 0, 0, 0.15)",
    shadowColor: "rgba(155, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontFamily: Platform.OS === 'ios' ? "Helvetica Neue" : "Roboto",
    fontWeight: "400",
  },
  searchIcon: {
    marginLeft: 8,
  },
  contactListContainer: {
    flex: 1,
    backgroundColor: "#f5f0f0",
    padding: 12,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "rgba(155, 0, 0, 0.85)",
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  globalVideoCallButton: {
    backgroundColor: "#4CAF50", // Couleur verte comme dans VideoRoom
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 50,
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  contactsList: {
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "rgba(155, 0, 0, 0.3)",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(155, 0, 0, 0.7)",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "rgba(155, 0, 0, 0.2)",
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 5,
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  lastMessageText: {
    fontSize: 13,
    color: "#666",
    fontFamily: Platform.OS === 'ios' ? "Helvetica Neue" : "Roboto",
    fontWeight: "400",
  },
  time: {
    fontSize: 11,
    color: "rgba(155, 0, 0, 0.7)",
    fontWeight: "500",
    alignSelf: "flex-start",
    marginRight: 3,
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8f4f4",
  },
  // En-tête simplifié
  simpleHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(155, 0, 0, 0.85)",
    paddingVertical: 14,
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  profileContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  profileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "rgba(155, 0, 0, 0.7)",
    fontSize: 15,
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  chatListContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageBubbleContainer: {
    marginBottom: 3,
    maxWidth: "80%",
  },
  myMessageContainer: {
    alignSelf: "flex-end",
  },
  theirMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessage: {
    backgroundColor: "rgba(155, 0, 0, 0.1)",
    borderColor: "rgba(155, 0, 0, 0.2)",
    borderWidth: 0.5,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: "rgba(155, 0, 0, 0.15)",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  myMessageText: {
    color: "rgba(155, 0, 0, 0.9)",
    fontWeight: "400",
  },
  theirMessageText: {
    color: "#333",
    fontWeight: "400",
  },
  messageTime: {
    fontSize: 10,
    marginTop: 2,
    marginHorizontal: 2,
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "300",
  },
  myMessageTime: {
    color: "rgba(155, 0, 0, 0.6)",
    textAlign: "right",
    paddingRight: 4,
  },
  theirMessageTime: {
    color: "#888",
    paddingLeft: 4,
  },
  
  // Styles pour la barre de saisie améliorée
  simpleInputContainer: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(155, 0, 0, 0.1)",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(155, 0, 0, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginRight: 10,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#f9f9f9",
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    maxHeight: 100,
    paddingBottom: 1,
    //marginBottom: 10,
  },
  sendButton: {
    backgroundColor: "rgba(155, 0, 0, 0.8)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(155, 0, 0, 0.6)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Nouveaux styles pour les attachements
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  attachmentImage: {
    width: "100%",
    height: 180,
    borderRadius: 15,
    marginBottom: 5,
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  audioInfo: {
    marginLeft: 10,
    flex: 1,
  },
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  recordingButton: {
    backgroundColor: "#E74C3C",
  },
  recordingTimer: {
    fontSize: 14,
    color: "rgba(155, 0, 0, 0.8)",
    fontWeight: "600",
    marginRight: 10,
    fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  // Styles pour la popup d'attachement
attachmentModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
attachmentModalContainer: {
  width: '80%',
  backgroundColor: '#fff',
  borderRadius: 15,
  overflow: 'hidden',
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
},
attachmentModalContent: {
  padding: 0,
},
attachmentModalTitle: {
  fontSize: 18,
  fontWeight: "600",
  color: "#fff",
  backgroundColor: "rgba(155, 0, 0, 0.85)",
  padding: 15,
  textAlign: "center",
  fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
},
attachmentOption: {
  flexDirection: "row",
  alignItems: "center",
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(155, 0, 0, 0.1)",
},
attachmentOptionText: {
  fontSize: 16,
  color: "#333",
  marginLeft: 15,
  fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
},
cancelOption: {
  backgroundColor: "#f5f5f5",
  justifyContent: "center",
},
cancelOptionText: {
  fontSize: 16,
  fontWeight: "600",
  color: "rgba(155, 0, 0, 0.8)",
  textAlign: "center",
  fontFamily: "BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
},
videoCallButton: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "#4CAF50", // Couleur verte comme dans VideoRoom
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
  elevation: 5,
  marginRight: 10,
},
// Styles pour les messages d'invitation
  invitationMessage: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  invitationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  invitationIcon: {
    marginRight: 10,
  },
  invitationTextContainer: {
    flex: 1,
  },
  invitationText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  tapToJoinText: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 4,
  },
  meetingLink: {
    fontSize: 12,
    color: '#4CAF50',
    textDecorationLine: 'underline',
    marginTop: 3,
    marginBottom: 3,
  },
  clickableLink: {
    fontSize: 12,
    color: '#4CAF50',
    textDecorationLine: 'underline',
    marginTop: 3,
    marginBottom: 3,
  },
  linkMessage: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  jitsiLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkButtonContainer: {
    flex: 1,
  },
  jitsiLink: {
    color: '#4CAF50',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  hyperLink: {
    color: '#4CAF50',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
