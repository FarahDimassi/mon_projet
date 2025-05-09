import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
// @ts-ignore
import { useRouter, usePathname } from "expo-router";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname(); // Récupérer la route actuelle
  const [modalVisible, setModalVisible] = useState(false);

  const handleNavigation = (destination: string) => {
    setModalVisible(false); // Fermer la pop-up avant navigation
    router.push(destination);
  };

  return (
    <View style={styles.footer}>
      <TouchableOpacity 
        style={styles.iconContainer} 
        onPress={() => router.push("/user")}
      >
        <FontAwesome5 
          name="book" 
          size={24} 
          color={pathname === "/user" ? "rgba(195, 0, 0, 0.80)" : "gray"} 
        />
        <Text style={[styles.iconText, pathname === "/user" && styles.activeText]}>Diary</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.iconContainer} 
        onPress={() => router.push("/dashbord")}
      >
        <FontAwesome5 
          name="chart-line" 
          size={24} 
          color={pathname === "/dashbord" ?"rgba(195, 0, 0, 0.80)" : "gray"} 
        />
        <Text style={[styles.iconText, pathname === "/dashboard" && styles.activeText]}>Dashboard</Text>
      </TouchableOpacity>

      {/* ✅ Bouton "+" qui affiche la pop-up */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="scan" size={30} color="white" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.iconContainer} 
        onPress={() => router.push("/chatbot")}
      >
        <FontAwesome5 
          name="robot" 
          size={24} 
          color={pathname === "/chatbot" ? "rgba(195, 0, 0, 0.80)" : "gray"} 
        />
        <Text style={[styles.iconText, pathname === "/chatbot" && styles.activeText]}>Chatbot</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.iconContainer} 
        onPress={() => router.push("/plan")}
      >
        <FontAwesome5 
          name="universal-access" 
          size={24} 
          color={pathname === "/plan" ? "rgba(195, 0, 0, 0.80)" : "gray"} 
        />
        <Text style={[styles.iconText, pathname === "/plan" && styles.activeText]}>Plan</Text>
      </TouchableOpacity>

      {/* ✅ Modal avec les choix */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>📷 Ajouter un Aliment</Text>

            {/* ✅ Food Scanner */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleNavigation("/FoodScannerScreen")}
            >
              <MaterialIcons name="camera-alt" size={24} color="white" />
              <Text style={styles.optionText}>Food Scanner</Text>
            </TouchableOpacity>

            {/* ✅ Code à Barres */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleNavigation("/BarcodeScannerScreen")}
            >
              <MaterialIcons name="code" size={24} color="white" />
              <Text style={styles.optionText}>Code à Barres</Text>
            </TouchableOpacity>

            {/* ❌ Bouton Fermer */}
           {/* ✅ Bouton Fermer en Icône "X" */}
<TouchableOpacity
  style={styles.closeButton}
  onPress={() => setModalVisible(false)}
>
  <MaterialIcons name="close" size={24} color="rgba(0, 0, 0, 0.3)" />
</TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 60,
  },
  iconContainer: {
    alignItems: "center",
  },
  iconText: {
    fontSize: 12,
    color: "gray",
  },
  activeText: {
    color: "rgba(195, 0, 0, 0.8)",
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "rgba(195, 0, 0, 0.8)",
    width: 50,
    height: 50,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 20,
    left: "50%",
    marginLeft: -19,
    elevation: 5,
    top : -18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: 280,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 2, height: 2 },
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    marginLeft : -33,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(195, 0, 0, 0.8)",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    justifyContent: "center",
    marginVertical: 8,
  },
  optionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 8,
    backgroundColor: "transparent", // ✅ Plus de fond visible
  },
  closeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  
});
