import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
// @ts-ignore
import { useRouter } from "expo-router";

const BarcodeScannerScreen: React.FC = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedData, setScannedData] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const fetchProductInfo = async (barcode: string) => {
        try {
            console.log(`🔍 Recherche du produit avec code-barres : ${barcode}`);
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
            const data = await response.json();

            if (!data.product) {
                alert("⚠️ Produit non trouvé !");
                return;
            }

            const product = {
                name: data.product.product_name || "Produit inconnu",
                calories: data.product.nutriments["energy-kcal_100g"] || 0,
                carbs: data.product.nutriments["carbohydrates_100g"] || 0,
                protein: data.product.nutriments["proteins_100g"] || 0,
                fat: data.product.nutriments["fat_100g"] || 0,
            };

            router.push({
                pathname: "/ProtDetails",
                params: product,
            });

        } catch (error) {
            console.error("❌ Erreur API :", error);
            alert("Impossible de récupérer les infos du produit.");
        }
    };

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        console.log(`🟢 Type détecté : ${type}`);
        console.log(`🟢 Données scannées : "${data}"`);

        if (!data || data.trim() === "") {
            alert("❌ No usable data found");
            return;
        }

        setScannedData(data);
        fetchProductInfo(data);
    };

    if (!permission) return <Text>📸 Vérification des permissions...</Text>;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text>❌ Accès refusé à la caméra.</Text>
                <Button title="Autoriser la caméra" onPress={requestPermission} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8"],
                }}
                onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
            />
            {scannedData && <Button title="📷 Scanner à nouveau" onPress={() => setScannedData(null)} />}
            <Button title="⬅ Retour" onPress={() => router.back()} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center" },
    camera: { width: "100%", height: 500 },
});

export default BarcodeScannerScreen;
