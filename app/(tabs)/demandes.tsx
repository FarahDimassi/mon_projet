import { getToken } from "@/utils/authService";
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import FooterAdmin from "@/components/FooterAdmin";
import NavbarAdmin from "@/components/NavbarAdmin";

// Interface pour représenter une invitation
interface Invitation {
  id: number;
  adminRequestMessage: string;
  coachType?: string;
  sender: {
    id: number;
    username: string;
    email: string;
  };
  removing?: boolean;
}

// Fonction pour récupérer toutes les invitations depuis le backend
async function fetchAllInvitations(): Promise<Invitation[]> {
  const token = await getToken();
  
  // Récupération des demandes de réinitialisation
  const resetResponse = await fetch("http://192.168.100.135:8080/api/admin/reset-requests", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (!resetResponse.ok) {
    throw new Error(await resetResponse.text());
  }
  
  // Récupération des demandes IA
  const iaResponse = await fetch("http://192.168.100.135:8080/api/admin/ia-requests", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (!iaResponse.ok) {
    throw new Error(await iaResponse.text());
  }
  
  const resetRequests = await resetResponse.json();
  const iaRequests = await iaResponse.json();
  
  // Combinaison des deux types de demandes
  return [...resetRequests, ...iaRequests];
}

// Fonction pour accepter la demande via l'endpoint accept-reset
async function acceptResetRequest(invitationId: number): Promise<any> {
  const token = await getToken();
  const response = await fetch(`http://192.168.100.135:8080/api/admin/accept-reset?invitationId=${invitationId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

// Fonction pour accepter une demande Coach IA
async function acceptIaRequest(invitationId: number): Promise<void> {
  const token = await getToken();
  const res = await fetch(
    `http://192.168.100.135:8080/api/admin/ia-requests/${invitationId}/accept`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error(await res.text());
}

const AdminDashboard: React.FC = () => {
  const [allInvitations, setAllInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Récupérer toutes les invitations et les filtrer
  const resetRequests = allInvitations.filter(inv => !inv.coachType);
  const iaRequests = allInvitations.filter(inv => inv.coachType);

  // Chargement des demandes lors du montage du composant
  useEffect(() => {
    loadAllInvitations();
  }, []);

  const loadAllInvitations = async () => {
    setLoading(true);
    try {
      const invitations = await fetchAllInvitations();
      // on ne garde qu'une seule instance par id
      const unique = Array.from(
        new Map(invitations.map(inv => [inv.id, inv])).values()
      );
      setAllInvitations(unique);
      
    } catch (error: any) {
      Alert.alert(
        "Erreur de chargement", 
        error.message || "Impossible de récupérer les demandes."
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllInvitations();
    setRefreshing(false);
  };

  const handleAcceptReset = async (invitationId: number) => {
    try {
      const result = await acceptResetRequest(invitationId);
      // Animation de suppression
      setAllInvitations(prev => prev.map(inv => 
        inv.id === invitationId ? {...inv, removing: true} : inv
      ));
      // Attendre un peu pour l'animation avant de supprimer
      setTimeout(() => {
        setAllInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        Alert.alert(
          "Réinitialisation acceptée", 
          result.message || "La demande a été acceptée avec succès."
        );
      }, 300);
    } catch (error: any) {
      Alert.alert(
        "Échec de l'opération", 
        error.message || "Impossible d'accepter cette demande de réinitialisation."
      );
    }
  };

  const handleAcceptIa = async (id: number) => {
    try {
      await acceptIaRequest(id);
      setAllInvitations(prev => prev.map(inv =>
        inv.id === id ? { ...inv, removing: true } : inv
      ));
      setTimeout(() => {
        setAllInvitations(prev => prev.filter(inv => inv.id !== id));
        Alert.alert("Succès", "Demande IA acceptée.");
      }, 300);
    } catch (e: any) {
      Alert.alert("Échec IA-accept", e.message);
    }
  };

  const renderResetItem = ({ item }: { item: Invitation }) => (
    <View style={[
      styles.itemContainer, 
      item.removing && styles.removingItem
    ]}>
      <View style={styles.cardHeader}>
        <Text style={styles.itemTitle}>Invitation #{item.id}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>En attente</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.senderInfo}>
        <Text style={styles.labelText}>Expéditeur:</Text>
        <Text style={styles.senderName}>{item.sender.username}</Text>
        <Text style={styles.senderEmail}>{item.sender.email}</Text>
      </View>
      <View style={styles.messageContainer}>
        <Text style={styles.labelText}>Message:</Text>
        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>{item.adminRequestMessage}</Text>
        </View>
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptReset(item.id)}
        >
          <Text style={styles.acceptButtonText}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderIaItem = ({ item }: { item: Invitation }) => (
    <View style={[styles.itemContainer, item.removing && styles.removingItem]}>
      <View style={styles.cardHeader}>
        <Text style={styles.itemTitle}>Demande IA #{item.id}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>En attente</Text>
        </View>
      </View>
      <View style={styles.divider} />

      <Text style={styles.labelText}>Utilisateur : {item.sender.username}</Text>
      <Text style={styles.labelText}>Type demandé : {item.coachType}</Text>

      <View style={styles.messageContainer}>
        <Text style={styles.labelText}>Commentaire :</Text>
        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>{item.adminRequestMessage}</Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptIa(item.id)}
        >
          <Text style={styles.acceptButtonText}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyReset = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Aucune demande</Text>
      <Text style={styles.emptySubtitle}>
        Vous n'avez pas de demandes de réinitialisation en attente pour le moment.
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={loadAllInvitations}
      >
        <Text style={styles.refreshButtonText}>Rafraîchir</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyIa = () => (
    <Text style={styles.emptySubtitle}>Aucune demande IA en attente.</Text>
  );

  const renderHeaderReset = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>
        Demandes de réinitialisation
      </Text>
      <Text style={styles.headerSubtitle}>
        {resetRequests.length} {resetRequests.length === 1 ? 'demande en attente' : 'demandes en attente'}
      </Text>
    </View>
  );

  const renderHeaderIa = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Demandes Coach IA</Text>
      <Text style={styles.headerSubtitle}>
        {iaRequests.length} {iaRequests.length === 1 ? 'demande' : 'demandes'} en attente
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <NavbarAdmin />
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.wrapper}>
        <LinearGradient
          colors={['#f8f9fa', '#ffffff']}
          style={styles.container}
        >
          {renderHeaderReset()}
          {loading && resetRequests.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4a6fa5" />
              <Text style={styles.loadingText}>Chargement des demandes...</Text>
            </View>
          ) : (
            <FlatList
              data={resetRequests}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderResetItem}
              contentContainerStyle={[
                styles.listContainer,
                resetRequests.length === 0 && styles.emptyList
              ]}
              ListEmptyComponent={renderEmptyReset}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#4a6fa5"]}
                  tintColor="#4a6fa5"
                />
              }
            />
          )}
          
          {renderHeaderIa()}
          {loading && iaRequests.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4a6fa5" />
              <Text style={styles.loadingText}>Chargement des demandes IA...</Text>
            </View>
          ) : (
            <FlatList
              data={iaRequests}
              keyExtractor={item => item.id.toString()}
              renderItem={renderIaItem}
              contentContainerStyle={[
                styles.listContainer,
                iaRequests.length === 0 && styles.emptyList
              ]}
              ListEmptyComponent={renderEmptyIa}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#4a6fa5"]}
                  tintColor="#4a6fa5"
                />
              }
            />
          )}
        </LinearGradient>
      </View>
      <FooterAdmin />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerContainer: {
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#1a3b5d",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6c757d",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#495057",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: "#e9ecef",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#495057",
    fontWeight: "600",
  },
  itemContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  removingItem: {
    opacity: 0.5,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
  },
  badge: {
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(195, 0, 0, 0.60)",
  },
  badgeText: {
    color: "rgba(195, 0, 0, 0.60)",
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#e9ecef",
    marginVertical: 12,
  },
  senderInfo: {
    marginBottom: 16,
  },
  labelText: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
    fontWeight: "500",
  },
  senderName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
  },
  senderEmail: {
    fontSize: 14,
    color: "rgba(195, 0, 0, 0.60)",
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(195, 0, 0, 0.60)",
  },
  messageText: {
    fontSize: 15,
    color: "#495057",
    lineHeight: 22,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  acceptButton: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
    borderWidth: 2,
    borderColor: "rgba(195, 0, 0, 0.60)",
  },
  acceptButtonText: {
    color: "rgba(195, 0, 0, 0.60)",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  }
});

export default AdminDashboard;