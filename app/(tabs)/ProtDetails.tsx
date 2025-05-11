import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { Button, Card, Divider, ProgressBar } from "react-native-paper";
// @ts-ignore
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken, getUserIdFromToken } from "@/utils/authService";
import { API_URL } from "@/utils/config";

const ProtDetails: React.FC = () => {
    const { name, calories, carbs, protein, fat } = useLocalSearchParams();
    const router = useRouter();

    const handleLogMeal = async () => {
        try {
        const userId = await getUserIdFromToken();
        const token = await getToken();
          const response = await fetch(`${API_URL}/api/scannedproducts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
             
              
            },
            body: JSON.stringify({
                productName: name,
                userId: userId,
                calories: parseInt(calories as string, 10),
              }),
          });
      
          if (!response.ok) {
            throw new Error("Échec de la sauvegarde.");
          }
      
          alert("✅ Produit enregistré avec succès !");
          router.back();
        } catch (error) {
          console.error("❌ Erreur lors de l'enregistrement :", error);
          alert("❌ Erreur d'enregistrement.");
        }
      };
      

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Image du produit */}
            <Card style={styles.card}>
                <Card.Cover 
                    source={{ uri: "https://via.placeholder.com/400" }} 
                    style={styles.image} 
                />
            </Card>

            {/* Informations principales */}
            <Text style={styles.title}>{name}</Text>

            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{calories}</Text>
                    <Text style={styles.statLabel}>Calories</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{carbs}g</Text>
                    <Text style={styles.statLabel}>Carbs</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{protein}g</Text>
                    <Text style={styles.statLabel}>Protein</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{fat}g</Text>
                    <Text style={styles.statLabel}>Fat</Text>
                </View>
            </View>

            {/* Nutrition Facts */}
            <View style={styles.nutritionContainer}>
                <Text style={styles.nutritionTitle}>🍏 Nutrition Facts</Text>
                <Divider style={styles.divider} />
                <Text style={styles.nutritionText}>Carbohydrates: {carbs}g</Text>
                <Text style={styles.nutritionText}>Protein: {protein}g</Text>
                <Text style={styles.nutritionText}>Fats: {fat}g</Text>
                <Text style={styles.nutritionText}>Fiber: 0.0g</Text>
            </View>

            {/* Boutons */}
            <View style={styles.buttonContainer}>
                <Button mode="contained" onPress={handleLogMeal} style={styles.logButton}>
                    Log This Meal
                </Button>
            </View>

            {/* Retour */}
            <Button mode="text" onPress={() => router.back()} style={styles.backButton}>
                ⬅ Retour
            </Button>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, alignItems: "center", backgroundColor: "#F8F8F8" },
    card: { width: "100%", borderRadius: 15, overflow: "hidden" },
    image: { height: 200, resizeMode: "cover" },
    title: { fontSize: 26, fontWeight: "bold", marginVertical: 15, textAlign: "center" },

    statsContainer: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginVertical: 10 },
    statBox: { alignItems: "center" },
    statValue: { fontSize: 22, fontWeight: "bold", color: "#4CAF50" },
    statLabel: { fontSize: 14, color: "#777" },

    healthContainer: { width: "100%", padding: 15, backgroundColor: "#FFF", borderRadius: 10, marginVertical: 10 },
    healthTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
    healthScore: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
    progressBar: { height: 8, borderRadius: 5 },

    nutritionContainer: { width: "100%", padding: 15, backgroundColor: "#FFF", borderRadius: 10, marginVertical: 10 },
    nutritionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
    divider: { marginVertical: 5 },
    nutritionText: { fontSize: 16, marginVertical: 2 },

    buttonContainer: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 20 },
    fixButton: { backgroundColor: "#FFF", borderColor: "#4CAF50", borderWidth: 1, flex: 1, marginRight: 5 },
    logButton: { backgroundColor: "#4CAF50", flex: 1, marginLeft: 5 },
    backButton: { marginTop: 20, fontSize: 16 },
});

export default ProtDetails;
