import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import SockJS from "sockjs-client";
import { Client, IMessage } from "@stomp/stompjs";
// @ts-ignore
import { useLocalSearchParams } from "expo-router";
import { getUserIdFromToken, getOrCreateConversation, getMessages } from "../../utils/authService";
import { API_URL } from "@/utils/config";

const WS_URL = `${API_URL}/ws`;
const API_BASE_URL = `${API_URL}/api/conversations`;

interface ChatMessage {
  id: number;
  text: string;
  fromMe: boolean;
}

const ChatUser: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const [stompClient, setStompClient] = useState<Client | null>(null);

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const userId = await getUserIdFromToken();
          console.log("UserId récupéré:", userId);

          // Récupérer ou créer une conversation
          const conversation = await getOrCreateConversation(Number(id), userId);
          console.log("Conversation récupérée:", conversation);

          if (!conversation || !conversation.id) {
            throw new Error("Conversation introuvable");
          }

          setConversationId(conversation.id); // Mise à jour du conversationId
          console.log("conversationId après mise à jour:", conversation.id); // Log pour vérifier

          const fetchedMessages = await getMessages(conversation.id);
          console.log("Messages récupérés:", fetchedMessages);

          setMessages(
            fetchedMessages.map((msg: any) => ({
              id: msg.id,
              text: msg.content,
              fromMe: msg.senderId === userId,
            }))
          );
        } catch (error) {
          console.error("Erreur récupération conversation/messages:", error);
          Alert.alert("Erreur", "Impossible de récupérer la conversation.");
        }
      })();
    }
  }, [id]);

  useEffect(() => {
    if (conversationId) {
      const socket = new SockJS(WS_URL);
      const client = new Client({
        webSocketFactory: () => socket,
        debug: (str: string) => console.log("STOMP Debug (ChatUser):", str),
        onConnect: () => {
          console.log("Connecté via STOMP (ChatUser) !");
          client.subscribe(`/topic/conversation.${conversationId}`, (msg: IMessage) => {
            try {
              const payload = JSON.parse(msg.body);
              console.log("Message reçu via WS (ChatUser):", payload);
              setMessages((prev) => [
                ...prev,
                { id: payload.id, text: payload.content, fromMe: false },
              ]);
            } catch (e) {
              console.error("Erreur de parsing JSON (ChatUser):", e);
            }
          });
        },
        onStompError: (frame) => {
          console.error("Erreur STOMP (ChatUser):", frame.headers["message"], frame.body);
        },
      });
      client.activate();
      setStompClient(client);
    }
  }, [conversationId]);

  const handleSendMessage = async () => {
    console.log("handleSendMessage appelé (ChatUser)");

    // Vérifier que le message et la conversationId ne sont pas vides
    if (!message.trim()) {
      console.log("Le message est vide.");
      Alert.alert("Erreur", "Veuillez entrer un message.");
      return;
    }

    if (!conversationId) {
      console.log("Le conversationId est manquant.");
      Alert.alert("Erreur", "Aucune conversation sélectionnée.");
      return;
    }

    try {
      const userId = await getUserIdFromToken();
      console.log("UserId récupéré:", userId);
      console.log("conversationId utilisé:", conversationId); // Log pour vérifier l'ID

      const url = `${API_BASE_URL}/${conversationId}/sendMessage?senderId=${userId}&content=${encodeURIComponent(message)}`;
      console.log("URL d'envoi:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Réponse de l'API:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Erreur: ${response.statusText}`);
      }

      const savedMessage = await response.json();
      console.log("Message sauvegardé:", savedMessage);

      setMessages((prev) => [
        ...prev,
        { id: savedMessage.id, text: savedMessage.content, fromMe: true },
      ]);
      setMessage("");

      // Publication via WebSocket
      if (stompClient && stompClient.connected) {
        console.log("Envoi via WebSocket...");
        stompClient.publish({
          destination: `/app/chat.sendMessage`,
          body: JSON.stringify({
            conversationId,
            senderId: userId,
            content: message,
          }),
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      Alert.alert("Erreur", "Impossible d'envoyer le message.");
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <Text style={item.fromMe ? styles.myMessage : styles.theirMessage}>
            {item.text}
          </Text>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.messagesContainer, messages.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={<Text style={styles.emptyText}>Commencez la conversation...</Text>}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Votre message..."
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButtonContainer}>
          <Text style={styles.sendButton}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  messagesContainer: { flexGrow: 1 },
  emptyContainer: { justifyContent: "center", alignItems: "center" },
  emptyText: { textAlign: "center", color: "#aaa", marginVertical: 20 },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#d1e7dd",
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: "80%",
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f1f1",
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: "80%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },
  sendButtonContainer: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  sendButton: { color: "#fff", fontWeight: "bold" },
});

export default ChatUser;
