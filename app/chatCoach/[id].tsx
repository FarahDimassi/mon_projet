import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  ToastAndroid,
  Platform,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { getToken, getUserIdFromToken } from '@/utils/authService';
// @ts-ignore
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

// 🛠️ Imports nécessaires pour les notifications locales
import * as Notifications from 'expo-notifications';

export const unstable_settings = {
  hideTabBar: true,
};

interface ChatMessage {
  senderId: number;
  receiverId: string;
  message: string;
  date: Date | string;
  isFromMe?: boolean;
  senderName?: string;
}

const ChatCoach: React.FC = () => {
  // Référence pour le FlatList
  const flatListRef = useRef<FlatList<any>>(null);
  
  // 🛠️ 1) Configure le handler système pour afficher les notifications quand l'app est au premier plan
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  // 🛠️ 2) Crée le canal Android et demande la permission
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "Impossible d'envoyer des notifications");
      }
    })();
  }, []);

  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [receiverUserName, setReceiverUserName] = useState<string>('');
  const { id: receiverId } = useLocalSearchParams() as { id: string };

  const [client, setClient] = useState<Client | null>(null);
  const [message, setMessage] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [senderName, setSenderName] = useState<string>('');

  // Initialiser token et ID utilisateur
  useEffect(() => {
    async function init() {
      const newToken = await getToken();
      setToken(newToken);
      const extractedUserId = await getUserIdFromToken();
      setUserId(String(extractedUserId));
      
      // Récupérer votre propre nom d'utilisateur
      if (newToken) {
        try {
          const response = await fetch(`http://192.168.1.139:8080/api/chat/get-my-username`, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          if (response.ok) {
            const myName = await response.text();
            setSenderName(myName);
            console.log('Nom d\'utilisateur récupéré:', myName);
          }
        } catch (err) {
          console.error("Erreur lors de la récupération de votre nom d'utilisateur:", err);
        }
      }
    }
    init();
  }, []);

  // Fonction pour défiler vers le bas de la liste - AMÉLIORÉE
  const scrollToBottom = (animated: boolean = true) => {
    if (flatListRef.current && chatMessages.length > 0) {
      // Utilisation de setTimeout pour s'assurer que le rendu est terminé
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated });
        } catch (e) {
          console.log("Erreur lors du défilement:", e);
        }
      }, 200);
    }
  };

  // Scroll automatique quand les messages changent
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  // Construction de l'ID de la room de manière déterministe
  const buildRoomId = (userId: string, receiverId: string) =>
    userId < receiverId ? `${userId}_${receiverId}` : `${receiverId}_${userId}`;

  // Connexion STOMP et abonnements
  useEffect(() => {
    if (!token || !userId || !receiverId) return;

    // Récupérer l'historique du chat
    fetch(`http://192.168.1.139:8080/api/chat/history/${receiverId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch chat history');
        return res.json();
      })
      .then((data) => {
        const formattedData = data.map((msg: any) => ({
          ...msg,
          isFromMe: msg.senderId == userId,
        }));
        console.log({ formattedData });
        setChatMessages(formattedData);
        // Défiler vers le bas après le chargement initial des messages
        setTimeout(() => scrollToBottom(false), 300);
      })
      .catch((err) => console.error(err));

    const roomId = buildRoomId(userId, receiverId);

    // Création de la connexion via SockJS à votre endpoint WebSocket
    const socket = new SockJS(`http://192.168.1.139:8080/ws?token=${token}`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      debug: (str) => console.log(str),
      onConnect: () => {
        // Abonnement au topic de la room de chat
        stompClient.subscribe(`/topic/room/${roomId}`, async (msg) => {
          const receivedMsg = JSON.parse(msg.body);
          console.log({ receivedMsg });

          setChatMessages((prev) => {
            // Si le message provient de vous, on vérifie s'il existe déjà
            if (receivedMsg.senderId == userId) {
              if (prev.find((item) => item.isFromMe && item.message === receivedMsg.message)) {
                return prev;
              }
            }
            return [...prev, { ...receivedMsg, isFromMe: receivedMsg.senderId == userId }];
          });

          // 🛠️ 3) Planifier une notification locale pour l'autre utilisateur
          if (receivedMsg.senderId !== parseInt(userId, 10)) {
            try {
              const notifId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `Nouveau message de ${receiverUserName}`,
                  body: receivedMsg.message,
                  //subtitle: 'Message privé',
                  //data: { sender: receiverUserName },
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
                trigger: null, // immédiat
              });
              console.log('✅ Notification planifiée, id =', notifId);
            } catch (e) {
              console.error('❌ Erreur scheduleNotificationAsync:', e);
            }
          }
        });

        // Abonnement pour récupérer les erreurs envoyées par le backend
        stompClient.subscribe(`/user/queue/errors`, (msg) => {
          const errorText = msg.body;
          console.error('Erreur reçue:', errorText);
          Toast.show({ type: 'error', text1: errorText, position: 'top' });
        });
      },
      onStompError: (frame) => {
        console.error('Erreur STOMP: ' + frame);
      },
    });

    stompClient.activate();
    setClient(stompClient);

    return () => {
      if (stompClient && stompClient.connected) {
        stompClient.deactivate();
      }
    };
  }, [token, userId, receiverId, receiverUserName]);

  // Récupération du nom d'utilisateur du destinataire
  useEffect(() => {
    if (token && receiverId) {
      fetch(`http://192.168.1.139:8080/api/chat/get-username-by-id/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch username');
          return res.text();
        })
        .then((data) => {
          console.log('username', data);
          setReceiverUserName(data);
        })
        .catch((err) => console.error(err));
    }
  }, [receiverId, token, receiverUserName]);

  // Gérer le clavier - défile automatiquement vers le bas quand le clavier apparaît
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      scrollToBottom();
    });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [chatMessages]);

  const router = useRouter();

  // Envoi d'un message avec mise à jour locale immédiate
  const sendMessage = () => {
    if (client && client.connected && message.trim().length > 0) {
      const chatMessage = {
        receiverId,
        message,
        date: new Date(),
        receiverUserName, // Ajouter le nom de l'expéditeur
      };
      try {
        client.publish({ destination: '/app/chat', body: JSON.stringify(chatMessage) });
        console.log('Message envoyé :', chatMessage);
        setChatMessages((prev) => [...prev, { ...chatMessage, isFromMe: true }]);
        setMessage('');
        // Défiler vers le bas après l'envoi du message
        setTimeout(() => scrollToBottom(), 100);
      } catch (error) {
        console.error('Erreur d\'envoi :', error);
        Toast.show({ type: 'error', text1: 'Une erreur s\'est produite lors de l\'envoi', position: 'top' });
      }
    } else {
      console.error('Pas de connexion STOMP ou message vide');
      Toast.show({ type: 'error', text1: 'Connexion non établie ou message vide', position: 'top' });
    }
  };

  // Format date pour affichage
  const formatTime = (date: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Rendu de la vue
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.userInfoContainer}>
          <Text style={styles.headerText}>{receiverUserName}</Text>
          <Text style={styles.statusText}>En ligne</Text>
        </View>
        
        {/* <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
        </TouchableOpacity> */}
      </View>
      
      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          style={styles.chatList}
          data={chatMessages}
          keyExtractor={(item, index) => `msg-${index}-${item.date}`}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          onContentSizeChange={() => scrollToBottom(false)}
          onLayout={() => scrollToBottom(false)}
          contentContainerStyle={styles.chatListContent}
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
                <View style={[
                  styles.messageBubble, 
                  item.isFromMe ? styles.myMessageBubble : styles.theirMessageBubble,
                ]}>
                  <Text style={[styles.messageText, item.isFromMe ? styles.myMessageText : styles.theirMessageText]}>
                    {item.message}
                  </Text>
                  <Text style={[styles.timeStamp, item.isFromMe ? styles.myTimeStamp : styles.theirTimeStamp]}>
                    {formatTime(item.date)}
                  </Text>
                </View>
              </>
            );
          }}
        />
      </View>
      
      <View style={styles.inputContainer}>
        {/* <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="add-circle-outline" size={26} color="rgba(195, 0, 0, 0.8)" />
        </TouchableOpacity> */}
        
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Écrivez un message..."
          style={styles.input}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={!message.trim()}
        >
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <Toast />
    </KeyboardAvoidingView>
  );
};

export default ChatCoach;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(195, 0, 0, 0.9)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    padding: 5,
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  headerText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff',
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  moreButton: {
    padding: 5,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  chatList: { 
    flex: 1, 
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20, // Espace supplémentaire en bas
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
  messageBubble: { 
    maxWidth: '80%', 
    padding: 12, 
    marginVertical: 4, 
    borderRadius: 18, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 1, 
    elevation: 1 
  },
  myMessageBubble: { 
    alignSelf: 'flex-end', 
    backgroundColor: 'rgba(195, 0, 0, 0.8)', 
    borderBottomRightRadius: 4 
  },
  theirMessageBubble: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#fff', 
    borderBottomLeftRadius: 4 
  },
  messageText: { 
    fontSize: 16, 
    lineHeight: 22 
  },
  myMessageText: { 
    color: '#fff' 
  },
  theirMessageText: { 
    color: '#333' 
  },
  timeStamp: { 
    fontSize: 10, 
    marginTop: 4, 
    alignSelf: 'flex-end' 
  },
  myTimeStamp: { 
    color: 'rgba(255,255,255,0.7)' 
  },
  theirTimeStamp: { 
    color: 'rgba(0,0,0,0.5)' 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 10, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#e0e0e0',
  },
  attachButton: {
    padding: 8,
  },
  input: { 
    flex: 1,
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 20, 
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9', 
    minHeight: 40, 
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: 'rgba(195, 0, 0, 0.8)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(195, 0, 0, 0.4)',
  },
});