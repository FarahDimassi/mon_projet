import { getToken, getUserIdFromToken } from "@/utils/authService";
import { API_URL } from "@/utils/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-ignore
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Button, Card, Divider, ProgressBar } from "react-native-paper";

export default function DetailsReel() {
    const params = useLocalSearchParams();
    const {
        detectedFood = "Aliment Inconnu",   // ✅ Le nom détecté par Clarifai (foodName)
        calories = "N/A",
        carbs = "N/A",
        protein = "N/A",
        fat = "N/A",
  
    } = params;
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
              productName: detectedFood,
              userId: userId,
              calories: parseInt(Array.isArray(calories) ? calories[0] : calories, 10),
            }),
          });
      
          if (!response.ok) {
            throw new Error("Échec de la sauvegarde.");
          }
      
          alert("✅ Produit enregistré avec succès !");
          router.replace("reel"); // Modifié pour rediriger vers 'reel'
        } catch (error) {
          console.error("❌ Erreur lors de l'enregistrement :", error);
          alert("❌ Erreur d'enregistrement.");
        }
      };
      
    return (
        <View style={styles.container}>
            {/* ✅ Affichage du vrai nom détecté par Clarifai */}
            <Text style={styles.title}>{detectedFood}</Text>
            <Text style={styles.nutritionTitle}>🍏 Nutrition Facts</Text>
            <Divider style={styles.divider} />
            <View style={styles.card}>
                <Text style={styles.label}>🔥 Calories: <Text style={styles.value}>{calories} kcal</Text></Text>
                <Text style={styles.label}>🍞 Glucides: <Text style={styles.value}>{carbs} g</Text></Text>
                <Text style={styles.label}>🍗 Protéines: <Text style={styles.value}>{protein} g</Text></Text>
                <Text style={styles.label}>🥑 Lipides: <Text style={styles.value}>{fat} g</Text></Text>
            </View>
            {/* Boutons */}
            <View style={styles.buttonContainer}>
                <Button mode="contained" onPress={handleLogMeal} style={styles.logButton}>
                    Log This Meal
                </Button>
            </View>
            
            {/* Retour */}
            <Button 
                mode="text"  
                onPress={() => router.replace("reel")} 
                style={styles.backButton}
            >
                ⬅ Retour
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center", 
        padding: 20, 
        backgroundColor: "#F8F8F8" 
    },
    title: { 
        fontSize: 26, 
        fontWeight: "bold", 
        marginBottom: 15, 
        color: "#333",
        textTransform: "capitalize", // ✅ Met la première lettre en majuscule
    },
    card: { 
        backgroundColor: "white", 
        padding: 20, 
        borderRadius: 15, 
        shadowOpacity: 0.3, 
        shadowRadius: 6, 
        elevation: 6, 
        width: "90%",
    },
    label: { 
        fontSize: 18, 
        fontWeight: "bold", 
        marginBottom: 8, 
        color: "#555",
    },
    value: { 
        fontSize: 18, 
        color: "#4CAF50", 
        fontWeight: "bold",
    },
    nutritionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
    divider: { marginVertical: 5 },
    buttonContainer: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 20 },
    fixButton: { backgroundColor: "#FFF", borderColor: "#4CAF50", borderWidth: 1, flex: 1, marginRight: 5 },
    logButton: { backgroundColor: "#4CAF50", flex: 1, marginLeft: 5 },
    backButton: { marginTop: 20, fontSize: 16 },
});