import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface CardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  onPress?: () => void;
}

const Card: React.FC<CardProps> = ({ title, value, unit, icon, onPress }) => {
  return (
    // On utilise TouchableOpacity pour ajouter un effet tactile
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>
        {value} {unit}
      </Text>
    </TouchableOpacity>
  );
};

export default Card;

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    width: "48%", // Ex. 2 cartes par ligne
    marginBottom: 20,
    elevation: 5, // Pour ajouter de l'ombre sur Android
    shadowColor: "#000", // Ombre sur iOS
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: "#e0e0e0", // Bordure douce
  },

  iconContainer: {
    backgroundColor: "#f0f0f0", // Fond léger pour l'icône
    borderRadius: 30, // Arrondi pour l'icône
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600", // Un peu plus léger pour une meilleure lisibilité
    color: "#333",
    marginBottom: 6,
  },
  value: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#4CAF50", // Une couleur vibrante pour la valeur
  },
});
