import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, Button, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome5 } from "@expo/vector-icons";
import { getMyReviews, updateReview, deleteReview } from "../../utils/authService";

export default function MyReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    async function fetchReviews() {
      try {
        const fetchedReviews = await getMyReviews();
        setReviews(fetchedReviews);
      } catch (error) {
        Alert.alert("Erreur", "Impossible de récupérer vos avis.");
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, []);

  const handleEdit = (review: any) => {
    setEditingReview(review);
    setNewRating(review.rating);
    setNewComment(review.comment);
    setIsEditModalVisible(true);
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    try {
      await updateReview(editingReview.userId, editingReview.id, newRating, newComment);
      Alert.alert("Succès", "Avis mis à jour !");
      const fetchedReviews = await getMyReviews();
      setReviews(fetchedReviews);
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour l'avis.");
    }
  };

  const handleDeleteReview = async (review: any) => {
    Alert.alert("Confirmation", "Êtes-vous sûr de vouloir supprimer cet avis ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReview(review.userId, review.id);
            Alert.alert("Succès", "Avis supprimé !");
            const fetchedReviews = await getMyReviews();
            setReviews(fetchedReviews);
          } catch (error) {
            Alert.alert("Erreur", "Impossible de supprimer l'avis.");
          }
        }
      }
    ]);
  };

  const renderReviewItem = ({ item }: { item: any }) => (
    <View style={styles.reviewItem}>
      <Text style={styles.reviewText}>Coach ID: {item.coachId}</Text>
      <Text style={styles.reviewText}>Note: {item.rating}</Text>
      <Text style={styles.reviewText}>Commentaire: {item.comment}</Text>
      <View style={styles.reviewActions}>
        <TouchableOpacity onPress={() => handleEdit(item)}>
          <FontAwesome5 name="edit" size={20} color="#007bff" style={styles.icon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteReview(item)}>
          <FontAwesome5 name="trash" size={20} color="#dc3545" style={styles.icon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Avis</Text>
      {loading ? (
        <Text>Chargement...</Text>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier Avis</Text>
            <Text style={styles.label}>Nouvelle note :</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNewRating(star)}>
                  <FontAwesome5
                    name="star"
                    size={30}
                    color={star <= newRating ? "#FFD700" : "#ccc"}
                    style={styles.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Nouveau commentaire :</Text>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Votre avis..."
              style={styles.commentInput}
              multiline
            />
            <View style={styles.modalButtons}>
              <Button title="Mettre à jour" onPress={handleUpdateReview} />
              <Button title="Annuler" onPress={() => setIsEditModalVisible(false)} color="#dc3545" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  listContainer: {
    paddingBottom: 20,
  },
  reviewItem: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  reviewText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#555",
  },
  reviewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  icon: {
    marginHorizontal: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#007bff",
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  starIcon: {
    marginHorizontal: 5,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    height: 80,
    marginBottom: 15,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
});
