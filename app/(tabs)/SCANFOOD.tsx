import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
// @ts-ignore
import { useRouter } from "expo-router";
import { Button, Card } from "react-native-paper";

// Interface pour structurer les données nutritionnelles
interface NutritionData {
    name: string;
    calories: number | string;
    carbs: number | string;
    protein: number | string;
    fat: number | string;
}

const FoodScannerScreen: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission requise", "L'accès à la caméra est nécessaire pour scanner un plat.");
            }
        })();
    }, []);

    const pickImage = async () => {
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            identifyFood(result.assets[0].uri);
        }
    };

    const identifyFood = async (imageUri: string) => {
        setLoading(true);
        const API_KEY = "fb5071e707564120a866d2f4507cc1b1"; // Remplace par ta clé API
        const modelId = "food-item-v1-recognition";

        try {
            console.log("📡 Conversion de l'image en base64...");

            // Convertir l'image en base64
            const base64Image = await convertImageToBase64(imageUri);

            console.log("📡 Image convertie en base64, envoi à Clarifai...");

            // Envoi de l'image en base64 à Clarifai
            const response = await fetch(`https://api.clarifai.com/v2/models/${modelId}/outputs`, {
                method: "POST",
                headers: {
                    "Authorization": `Key ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: [{ data: { image: { base64: base64Image } } }],
                }),
            });

            const data = await response.json();
            console.log("📡 Réponse API Clarifai :", JSON.stringify(data, null, 2));

            if (!data.outputs || !data.outputs[0].data.concepts) {
                throw new Error("Réponse API incorrecte !");
            }

            const foodName = data.outputs[0].data.concepts[0].name;
            console.log(`🥗 Aliment détecté : ${foodName}`);

            fetchNutritionInfo(foodName);

        } catch (error) {
            console.error("❌ Erreur API Clarifai :", error);
            Alert.alert("Erreur", "Impossible de reconnaître l'aliment.");
        } finally {
            setLoading(false);
        }
    };

    const fetchNutritionInfo = async (foodName: string) => {
        console.log(`🔍 Recherche nutritionnelle pour : ${foodName}`);

        // 🔎 Recherche sur OpenFoodFacts
        const urlOpenFoodFacts = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${foodName}&json=1`;

        try {
            const response = await fetch(urlOpenFoodFacts);
            const data = await response.json();

            if (data.products && data.products.length > 0) {
                console.log("✅ Trouvé sur OpenFoodFacts !");
                const nutrition = data.products[0].nutriments;
                const product: NutritionData = {
                    name: foodName, // ✅ Utilise le nom détecté par Clarifai
                    calories: nutrition["energy-kcal_100g"] || "Non disponible",
                    carbs: nutrition["carbohydrates_100g"] || "Non disponible",
                    protein: nutrition["proteins_100g"] || "Non disponible",
                    fat: nutrition["fat_100g"] || "Non disponible",
                };

                console.log("📡 Détails nutritionnels :", product);

                // ✅ Envoie les données nutritionnelles correctes à ProductDetails
                router.push({
                    pathname: "/DetailsReel",
                    params: {
                        detectedFood: product.name, // ✅ Correction : Utilise `product.name` qui est `foodName`
                        calories: product.calories,
                        carbs: product.carbs,
                        protein: product.protein,
                        fat: product.fat,
                    },
                });

            } else {
                console.log("❌ Non trouvé sur OpenFoodFacts, recherche sur Google...");

                // 🔎 Si non trouvé → Ouvrir Google pour chercher les infos nutritionnelles
                const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(foodName)}+nutrition+facts`;
                Alert.alert(
                    "🔎 Recherche Google",
                    `Données non trouvées. Ouvrir Google pour chercher "${foodName}" ?`,
                    [
                        { text: "Annuler", style: "cancel" },
                        { text: "OK", onPress: () => openGoogleSearch(googleSearchUrl) },
                    ]
                );
            }

        } catch (error) {
            console.error("❌ Erreur API OpenFoodFacts :", error);
            Alert.alert("Erreur", "Impossible de récupérer les informations nutritionnelles.");
        }
    };

    // Ouvre Google avec le nom du produit si OpenFoodFacts ne trouve rien
    const openGoogleSearch = (url: string) => {
        console.log("🌍 Ouverture de Google :", url);
        Linking.openURL(url);
    };

    // Fonction pour convertir une image en base64
    const convertImageToBase64 = async (imageUri: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            fetch(imageUri)
                .then((response) => response.blob())
                .then((blob) => {
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const base64Data = (reader.result as string).split(",")[1]; // Supprime l'en-tête "data:image/jpeg;base64,"
                        resolve(base64Data);
                    };
                    reader.onerror = (error) => reject(error);
                })
                .catch((error) => reject(error));
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📸 Scanner un plat</Text>

            {image && (
                <Card style={styles.card}>
                    <Card.Cover source={{ uri: image }} style={styles.image} />
                </Card>
            )}

            {loading && <ActivityIndicator size="large" color="#4CAF50" />}

            <Button mode="contained" onPress={pickImage} style={styles.button}>
                📷 Prendre une photo
            </Button>

            <Button mode="outlined" onPress={() => router.replace("/reel")} style={styles.backButton}>
                ⬅ Retour
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#F8F8F8" },
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
    card: { width: "100%", borderRadius: 15, overflow: "hidden", marginVertical: 10 },
    image: { height: 250, resizeMode: "cover" },
    button: { marginVertical: 10, backgroundColor: "#4CAF50", width: "80%" },
    backButton: { marginVertical: 10, borderColor: "#4CAF50", borderWidth: 1, width: "80%" },
});

export default FoodScannerScreen;
