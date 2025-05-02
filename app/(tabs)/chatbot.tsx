import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Footer from "../../components/Footer";
import ProtectedRoute from "../../utils/ProtectedRoute";
import NavbarIA from "@/components/NavbarIA";

const GEMINI_API_KEY = "AIzaSyAv-z7qo8OT1q1z90VqKlHQ2TgRsB5br0w"; // ⚠️ Remplace par ta clé API
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;


interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);

  /* const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setUserInput("");
    setLoading(true);

    try {
      const response = await axios.post(
        GEMINI_API_URL,
        {
          contents: [{ parts: [{ text: userInput }] }]
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data && response.data.candidates) {
        const botReply: Message = {
          role: "assistant",
          content: response.data.candidates[0].content.parts[0].text,
        };
        setMessages([...newMessages, botReply]);
      } else {
        throw new Error("Réponse invalide de l'API Gemini.");
      }
    } catch (error) {
      console.error("Erreur lors de la requête Gemini :", error);
      setMessages([...newMessages, { role: "assistant", content: "❌ Erreur avec l'API Gemini. Réessaie plus tard." }]);
    }

    setLoading(false);
  }; */
 const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userInput }
    ];
    setMessages(newMessages);
    setUserInput("");
    setLoading(true);

    // 1️⃣ Détection des salutations (hi, hello, bonjour, etc.)
    const greetingRegex = /^\s*(hi|hello|hey|bonjour|salut|salutations)[\s!?.]*$/i;
    if (greetingRegex.test(userInput)) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "👋 Bonjour ! Je suis ton assistant Nutrition & Sport. " +
            "Pose-moi une question sur la nutrition ou le sport !"
        }
      ]);
      setLoading(false);
      return;
    }

  
    const geminiPrompt =
      'you are a gym and Nutrition & Sport expert your task is to reply on this specefic question/message (if the message doesnt belongs to sports/nutrition fields respond by "i cant help") :' + userInput + '\n\n'; 
    // 3️⃣ Appel à l'API Gemini pour les questions valides
    try {
      const response = await axios.post(
        GEMINI_API_URL,
        { contents: [{ parts: [{ text: geminiPrompt }] }] },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data?.candidates?.length) {
        const botReply: Message = {
          role: "assistant",
          content: response.data.candidates[0].content.parts[0].text.trim()
        };
        setMessages([...newMessages, botReply]);
      } else {
        throw new Error("Réponse invalide de l'API Gemini.");
      }
    } catch (error) {
      console.error("Erreur lors de la requête Gemini :", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "❌ Erreur avec l'API Gemini. Réessaie plus tard."
        }
      ]);
    }

    setLoading(false);
  };
  return (
    <ProtectedRoute>
      <NavbarIA />
      <View style={styles.container}>
        <Text style={styles.title}>💬 Nutrition IA</Text>
        <ScrollView style={styles.chatContainer}>
          {messages.map((msg, index) => (
            <View key={index} style={msg.role === "user" ? styles.userMessage : styles.botMessage}>
              <Text style={msg.role === "user" ? styles.userText : styles.botText}>{msg.content}</Text>
              {msg.role === "assistant" && <Ionicons name="chatbubble" size={16} color="blue" />}
            </View>
          ))}
          {loading && <ActivityIndicator size="large" color="#007AFF" />}
        </ScrollView>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Écrivez un message..."
            placeholderTextColor="#A0A0A0"
            onSubmitEditing={sendMessage} // Envoie le message en appuyant sur "Entrée"
          />
          <TouchableOpacity onPress={sendMessage} disabled={loading} style={styles.sendButton}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      <Footer />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    marginBottom: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 20,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
    maxWidth: "75%",
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
    maxWidth: "75%",
  },
  userText: {
    color: "white", // ✅ Texte utilisateur en blanc
  },
  botText: {
    color: "black", // ✅ Texte bot en noir
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8e8e8",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "black",
    outlineStyle: "none", // Supprime le contour sur le web
    borderWidth: 0, // Supprime la bordure
    backgroundColor: "transparent", // Assurez-vous qu'il n'y a pas d'effet visuel de fond
  }
  ,
  sendButton: {
    backgroundColor: "rgba(195, 0, 0, 0.8)", // ✅ Couleur violette pour le bouton
    borderRadius: 20,
    padding: 10,
    marginLeft: 10,
  },
});
