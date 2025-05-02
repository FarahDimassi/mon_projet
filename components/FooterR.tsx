import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Modal } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
// @ts-ignore
import { useRouter, usePathname } from "expo-router";

const FooterR = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [modalVisible, setModalVisible] = useState(false);
  
  const handleNavigation = (screen: string) => {
    // Ferme le modal automatiquement lorsqu'un bouton est cliqué
    setModalVisible(false);
    router.push(screen);
  };

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/reel")}
      >
        <Ionicons
          name="home-outline"
          size={24}
          color={pathname === "/reel" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text
          style={[styles.iconText, pathname === "/reel" && styles.activeText]}
        >
          Dashboard
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/planr")}
      >
        <Ionicons
          name="fast-food-outline"
          size={24}
          color={pathname === "/planr" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/planr" && styles.activeText]}>
          Plans
        </Text>
      </TouchableOpacity>
      
      {/* ✅ Bouton "+" qui affiche la pop-up */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add" size={30} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/coaches")}
      >
        <Ionicons
          name="person-outline"
          size={24}
          color={pathname === "/coaches" ? "rgba(195, 0, 0, 1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/coaches" && styles.activeText]}>
          Coaches
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => handleNavigation("/conversation")}
      >
        <Ionicons
          name="chatbubble-outline"
          size={24}
          color={pathname === "/conversation" ? "rgba(195, 0, 0,1.00)" : "gray"}
        />
        <Text style={[styles.iconText, pathname === "/conversation" && styles.activeText]}>
          Chat
        </Text>
      </TouchableOpacity>
      
      {/* ✅ Modal avec les choix */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>📷 Ajouter un Aliment</Text>

            {/* ✅ Food Scanner */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleNavigation("/SCANFOOD")}
            >
              <MaterialIcons name="camera-alt" size={24} color="white" />
              <Text style={styles.optionText}>Food Scanner</Text>
            </TouchableOpacity>

            {/* ✅ Code à Barres */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleNavigation("/CodeQR")}
            >
              <MaterialIcons name="code" size={24} color="white" />
              <Text style={styles.optionText}>Code à Barres</Text>
            </TouchableOpacity>

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
};

export default FooterR;

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#eaeaea",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
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
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  iconText: {
    fontSize: 12,
    color: "gray",
    marginTop: 4,
  },
  activeText: {
    color: "rgba(195, 0, 0, 0.8)",
    fontWeight: "bold",
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