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
  RefreshControl,
  Animated,
  Dimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import FooterAdmin from "@/components/FooterAdmin";
import NavbarAdmin from "@/components/NavbarAdmin";
import { API_URL } from "@/utils/config";
import { Ionicons } from '@expo/vector-icons';

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
  const resetResponse = await fetch(`${API_URL}/api/admin/reset-requests`, {
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
  const iaResponse = await fetch( `${API_URL}/api/admin/ia-requests`, {
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
  const response = await fetch(`${API_URL}/api/admin/accept-reset?invitationId=${invitationId}`, {
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
    `${API_URL}/api/admin/ia-requests/${invitationId}/accept`,
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

// Fonction pour rejeter une demande (générique pour les deux types)
async function rejectRequest(invitationId: number, type: 'real' | 'ia'): Promise<void> {
  const token = await getToken();
  const endpoint = type === 'real' 
    ? `${API_URL}/api/admin/reject-reset?invitationId=${invitationId}`
    : `${API_URL}/api/admin/ia-requests/${invitationId}/reject`;
    
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (!res.ok) throw new Error(await res.text());
}

const AdminDashboard: React.FC = () => {
  const [allInvitations, setAllInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'real' | 'ia'>('real');
  const tabAnimation = useState(new Animated.Value(0))[0];

  const screenWidth = Dimensions.get('window').width;

  // Récupérer toutes les invitations et les filtrer
  const realCoachRequests = allInvitations.filter(inv => !inv.coachType);
  const iaCoachRequests = allInvitations.filter(inv => inv.coachType);

  // Animation de transition entre les onglets
  useEffect(() => {
    Animated.timing(tabAnimation, {
      toValue: activeTab === 'real' ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const translateXReal = tabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -screenWidth],
  });

  const translateXIA = tabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth, 0],
  });

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

  // Gestion de l'acceptation des demandes de coach réel
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
          "Demande acceptée", 
          result.message || "La demande de coach réel a été acceptée avec succès."
        );
      }, 300);
    } catch (error: any) {
      Alert.alert(
        "Échec de l'opération", 
        error.message || "Impossible d'accepter cette demande de coach réel."
      );
    }
  };

  // Gestion de l'acceptation des demandes de coach IA
  const handleAcceptIa = async (id: number) => {
    try {
      await acceptIaRequest(id);
      setAllInvitations(prev => prev.map(inv =>
        inv.id === id ? { ...inv, removing: true } : inv
      ));
      setTimeout(() => {
        setAllInvitations(prev => prev.filter(inv => inv.id !== id));
        Alert.alert("Succès", "Demande de coach IA acceptée avec succès.");
      }, 300);
    } catch (e: any) {
      Alert.alert("Échec de la demande", e.message);
    }
  };

  // Gestion du rejet des demandes (générique)
  const handleReject = async (id: number, type: 'real' | 'ia') => {
    try {
      await rejectRequest(id, type);
      setAllInvitations(prev => prev.map(inv =>
        inv.id === id ? { ...inv, removing: true } : inv
      ));
      setTimeout(() => {
        setAllInvitations(prev => prev.filter(inv => inv.id !== id));
        Alert.alert("Information", `Demande de coach ${type === 'real' ? 'réel' : 'IA'} rejetée.`);
      }, 300);
    } catch (e: any) {
      Alert.alert("Échec de l'opération", e.message);
    }
  };

  const renderRealCoachItem = ({ item }: { item: Invitation }) => (
    <Animated.View 
      style={[
        styles.itemContainer, 
        styles.realCoachItem,
        item.removing && styles.removingItem
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Ionicons name="person" size={20} color="rgba(195, 0, 0, 0.7)" />
          <Text style={styles.itemTitle}>Demande #{item.id}</Text>
        </View>
        <View style={styles.badgeReal}>
          <Text style={styles.badgeTextReal}>Coach Réel</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.senderInfo}>
        <Text style={styles.labelText}>Demandeur:</Text>
        <Text style={styles.senderName}>{item.sender.username}</Text>
        <Text style={styles.senderEmail}>{item.sender.email}</Text>
      </View>
      <View style={styles.messageContainer}>
        <Text style={styles.labelText}>Message:</Text>
        <View style={styles.messageBubbleReal}>
          <Text style={styles.messageText}>{item.adminRequestMessage}</Text>
        </View>
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id, 'real')}
        >
          <Ionicons name="close-circle-outline" size={18} color="#6c757d" style={{marginRight: 6}} />
          <Text style={styles.rejectButtonText}>Refuser</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.acceptButtonReal}
          onPress={() => handleAcceptReset(item.id)}
        >
            <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" style={{marginRight: 6}} />
          <Text style={styles.acceptButtonTextReal}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderIaItem = ({ item }: { item: Invitation }) => (
    <Animated.View 
      style={[
        styles.itemContainer, 
        styles.iaCoachItem,
        item.removing && styles.removingItem
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Ionicons name="cloud" size={20} color="rgba(195, 0, 0, 0.7)" />
          <Text style={styles.itemTitle}>Demande IA #{item.id}</Text>
        </View>
        <View style={styles.badgeIA}>
          <Text style={styles.badgeTextIA}>Coach IA</Text>
        </View>
      </View>
      <View style={styles.divider} />

      <View style={styles.senderInfo}>
        <Text style={styles.labelText}>Utilisateur:</Text>
        <Text style={styles.senderName}>{item.sender.username}</Text>
        <Text style={styles.senderEmail}>{item.sender.email}</Text>
      </View>
      
      <View style={styles.iaTypeContainer}>
        <Text style={styles.labelText}>Type demandé:</Text>
        <View style={styles.iaTypeTag}>
          <Text style={styles.iaTypeText}>{item.coachType}</Text>
        </View>
      </View>

      <View style={styles.messageContainer}>
        <Text style={styles.labelText}>Commentaire:</Text>
        <View style={styles.messageBubbleIA}>
          <Text style={styles.messageText}>{item.adminRequestMessage}</Text>
        </View>
      </View>
     
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id, 'ia')}
        >
          <Ionicons name="close-circle-outline" size={18} color="#6c757d" style={{marginRight: 6}} />
          <Text style={styles.rejectButtonText}>Refuser</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButtonIA}
          onPress={() => handleAcceptIa(item.id)}
          
        >
           <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" style={{marginRight: 6}} />
          <Text style={styles.acceptButtonTextIA}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmptyReal = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={60} color="rgba(195, 0, 0, 0.4)" />
      <Text style={styles.emptyTitle}>Aucune demande</Text>
      <Text style={styles.emptySubtitle}>
        Vous n'avez pas de demandes de coach réel en attente pour le moment.
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={loadAllInvitations}
      >
        <Ionicons name="refresh" size={16} color="rgba(195, 0, 0, 0.7)" style={styles.buttonIcon} />
        <Text style={styles.refreshButtonText}>Rafraîchir</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyIa = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cloud-offline-outline" size={60} color="rgba(195, 0, 0, 0.4)" />
      <Text style={styles.emptyTitle}>Aucune demande</Text>
      <Text style={styles.emptySubtitle}>
        Vous n'avez pas de demandes de coach IA en attente pour le moment.
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={loadAllInvitations}
      >
        <Ionicons name="refresh" size={16} color="rgba(195, 0, 0, 0.7)" style={styles.buttonIcon} />
        <Text style={styles.refreshButtonText}>Rafraîchir</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeaderSection = () => (
    <View style={styles.headerSection}>
      <Text style={styles.mainTitle}>Gestion des Demandes</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'real' && styles.activeTabButton]}
          onPress={() => setActiveTab('real')}
        >
          <Ionicons 
            name="person" 
            size={20} 
            color={activeTab === 'real' ? "rgba(195, 0, 0, 0.7)" : "#6c757d"} 
          />
          <Text 
            style={[styles.tabText, activeTab === 'real' && styles.activeTabText]}
          >
            Coach Réel ({realCoachRequests.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ia' && styles.activeTabButton]}
          onPress={() => setActiveTab('ia')}
        >
          <Ionicons 
            name="cloud" 
            size={20} 
            color={activeTab === 'ia' ? "rgba(195, 0, 0, 0.7)" : "#6c757d"} 
          />
          <Text 
            style={[styles.tabText, activeTab === 'ia' && styles.activeTabText]}
          >
            Coach IA ({iaCoachRequests.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRealCoachSection = () => (
    <Animated.View 
      style={[
        styles.tabContent, 
        { transform: [{ translateX: translateXReal }] }
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="people-circle-outline" size={24} color="rgba(195, 0, 0, 0.7)" />
          <Text style={styles.headerTitle}>Demandes de Coach Réel</Text>
        </View>
        <View style={styles.counterBadgeReal}>
          <Text style={styles.counterText}>{realCoachRequests.length}</Text>
        </View>
      </View>
      
      {loading && realCoachRequests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="rgba(195, 0, 0, 0.7)" />
          <Text style={styles.loadingText}>Chargement des demandes...</Text>
        </View>
      ) : (
        <FlatList
          data={realCoachRequests}
          keyExtractor={(item) => `real-${item.id.toString()}`}
          renderItem={renderRealCoachItem}
          contentContainerStyle={[
            styles.listContainer,
            realCoachRequests.length === 0 && styles.emptyList
          ]}
          ListEmptyComponent={renderEmptyReal}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["rgba(195, 0, 0, 0.7)"]}
              tintColor="rgba(195, 0, 0, 0.7)"
            />
          }
        />
      )}
    </Animated.View>
  );

  const renderIaCoachSection = () => (
    <Animated.View 
      style={[
        styles.tabContent, 
        { transform: [{ translateX: translateXIA }] }
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="cloud-circle-outline" size={24} color="rgba(195, 0, 0, 0.7)" />
          <Text style={styles.headerTitle}>Demandes de Coach IA</Text>
        </View>
        <View style={styles.counterBadgeIA}>
          <Text style={styles.counterText}>{iaCoachRequests.length}</Text>
        </View>
      </View>
      
      {loading && iaCoachRequests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="rgba(195, 0, 0, 0.7)" />
          <Text style={styles.loadingText}>Chargement des demandes IA...</Text>
        </View>
      ) : (
        <FlatList
          data={iaCoachRequests}
          keyExtractor={item => `ia-${item.id.toString()}`}
          renderItem={renderIaItem}
          contentContainerStyle={[
            styles.listContainer,
            iaCoachRequests.length === 0 && styles.emptyList
          ]}
          ListEmptyComponent={renderEmptyIa}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["rgba(195, 0, 0, 0.7)"]}
              tintColor="rgba(195, 0, 0, 0.7)"
            />
          }
        />
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <NavbarAdmin />
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.wrapper}>
        <LinearGradient
          colors={['#f8f8f8', '#ffffff']}
          style={styles.container}
        >
          {renderHeaderSection()}
          
          <View style={styles.contentContainer}>
            {activeTab === 'real' ? renderRealCoachSection() : renderIaCoachSection()}
          </View>
        </LinearGradient>
      </View>
      <FooterAdmin />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerSection: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.8)",
    marginBottom: 20,
    textAlign: "center",
    textShadowColor: 'rgba(195, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
    padding: 4,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(195, 0, 0, 0.1)',
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: "#ffffff",
    shadowColor: "rgba(195, 0, 0, 0.5)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(195, 0, 0, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
    marginLeft: 6,
  },
  activeTabText: {
    color: "rgba(195, 0, 0, 0.7)",
  },
  contentContainer: {
    flex: 1,
    position: "relative",
  },
  tabContent: {
    flex: 1,
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.7)",
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6c757d",
  },
  counterBadgeReal: {
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(195, 0, 0, 0.3)",
  },
  counterBadgeIA: {
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(195, 0, 0, 0.3)",
  },
  counterText: {
    color: "rgba(195, 0, 0, 0.9)",
    fontSize: 14,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "rgba(195, 0, 0, 0.6)",
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    minHeight: 300,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.7)",
    marginVertical: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "rgba(195, 0, 0, 0.5)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  refreshButton: {
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(195, 0, 0, 0.2)",
  },
  buttonIcon: {
    marginRight: 8,
  },
  refreshButtonText: {
    color: "rgba(195, 0, 0, 0.8)",
    fontWeight: "600",
    fontSize: 15,
  },
  itemContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    transform: [{ scale: 1 }],
    transition: '0.3s',
  },
  realCoachItem: {
    borderColor: "rgba(195, 0, 0, 0.2)",
    borderLeftWidth: 5,
    borderLeftColor: "rgba(195, 0, 0, 0.7)",
  },
  iaCoachItem: {
    borderColor: "rgba(195, 0, 0, 0.2)",
    borderLeftWidth: 5,
    borderLeftColor: "rgba(195, 0, 0, 0.7)",
  },
  removingItem: {
    opacity: 0.5,
    transform: [{ scale: 0.96 }],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "rgba(195, 0, 0, 0.8)",
    marginLeft: 8,
  },
  badgeReal: {
    backgroundColor: "rgba(195, 0, 0, 0.08)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(195, 0, 0, 0.2)",
  },
  badgeTextReal: {
    color: "rgba(195, 0, 0, 0.8)",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeIA: {
    backgroundColor: "rgba(195, 0, 0, 0.08)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(195, 0, 0, 0.2)",
  },
  badgeTextIA: {
    color: "rgba(195, 0, 0, 0.8)",
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(195, 0, 0, 0.1)",
    marginVertical: 12,
  },
  senderInfo: {
    marginBottom: 16,
  },
  labelText: {
    fontSize: 14,
    color: "rgba(195, 0, 0, 0.6)",
    marginBottom: 6,
    fontWeight: "500",
  },
  senderName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
  },
  senderEmail: {
    fontSize: 14,
    color: "rgba(195, 0, 0, 0.6)",
  },
  iaTypeContainer: {
    marginBottom: 16,
  },
  iaTypeTag: {
    backgroundColor: "rgba(195, 0, 0, 0.08)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: "rgba(195, 0, 0, 0.2)",
  },
  iaTypeText: {
    color: "rgba(195, 0, 0, 0.8)",
    fontWeight: "600",
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubbleReal: {
    backgroundColor: "rgba(195, 0, 0, 0.04)",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(195, 0, 0, 0.7)",
  },
  messageBubbleIA: {
    backgroundColor: "rgba(195, 0, 0, 0.04)",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(195, 0, 0, 0.7)",
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
  rejectButton: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#adb5bd",
    flexDirection: "row",
  },
  rejectButtonText: {
    color: "#6c757d",
    fontSize: 15,
    fontWeight: "600",
  },
  acceptButtonReal: {
    backgroundColor: "rgba(195, 0, 0, 0.7)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "rgba(195, 0, 0, 0.5)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: "row",
  },
  acceptButtonTextReal: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  acceptButtonIA: {
    backgroundColor: "rgba(195, 0, 0, 0.7)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "rgba(195, 0, 0, 0.5)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: "row",
  },
  acceptButtonTextIA: {
    color: "#ffffff",
    fontSize: 15,
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