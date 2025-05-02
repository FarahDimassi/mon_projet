/* import React, { useEffect, useState } from "react";
import { View, Text, Button } from "react-native";
import { login, getRole, saveToken, getToken, removeToken } from "../utils/authService"; // Ajuste le chemin

export default function TestAuthScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const storedToken = await getToken();
        setToken(storedToken);
        const userRole = await getRole();
        setRole(userRole);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
      }
    }

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>📌 Test Auth</Text>
      <Text>Token : {token ? "✅ Token stocké" : "❌ Aucun token trouvé"}</Text>
      <Text>Rôle : {role ? `✅ ${role}` : "❌ Rôle introuvable"}</Text>

      <Button title="Login User" onPress={async () => {
        try {
          const jwt = await login("user@example.com", "password123"); // Remplace par un vrai user
          await saveToken(jwt);
          setToken(jwt);
          setRole(await getRole());
        } catch (error) {
          console.error(error);
        }
      }} />

      <Button title="Login Admin" onPress={async () => {
        try {
          const jwt = await login("admin@example.com", "adminpassword"); // Remplace par un vrai admin
          await saveToken(jwt);
          setToken(jwt);
          setRole(await getRole());
        } catch (error) {
          console.error(error);
        }
      }} />

      <Button title="Déconnexion" onPress={async () => {
        await removeToken();
        setToken(null);
        setRole(null);
      }} />
    </View>
  );
}
 */
import React from "react";
import { View, Text } from "react-native";

export default function TestAuthScreen() {
  return (
    <View>
      <Text>Test Auth Page</Text>
    </View>
  );
}
