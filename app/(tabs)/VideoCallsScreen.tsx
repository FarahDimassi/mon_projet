import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getUserIdFromToken, getToken } from '../../utils/tokenUtils';
import { API_URL } from '@/utils/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function VideoCallsScreen() {
  const router = useRouter();
  interface Contact {
    id: number;
    username?: string;
    fullName?: string;
    coachType?: string;
  }

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const currentUserId = await getUserIdFromToken();
        if (!currentUserId) {
          Alert.alert("Erreur", "Vous devez être connecté");
          router.replace("/AuthScreen");
          return;
        }
        
        setUserId(currentUserId);
        const token = await getToken();

        // Check if user is a coach by fetching user data
        const userResponse = await fetch(`${API_URL}/api/users/${currentUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!userResponse.ok) {
          throw new Error(`Erreur lors de la récupération des données utilisateur: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        const userRole = userData.role;
        setIsCoach(userRole === 'Coach');

        // If coach, fetch subscribers, else fetch coaches
        if (userRole === 'Coach') {
          // Get subscribers of this coach
          const subscribersResponse = await fetch(`${API_URL}/api/friends/coach-invitations/${currentUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!subscribersResponse.ok) {
            throw new Error(`Erreur lors de la récupération des abonnés: ${subscribersResponse.status}`);
          }
          
          const subscribersData = await subscribersResponse.json();
          setContacts(subscribersData);
        } else {
          // Get coaches of this user
          const coachesResponse = await fetch(`${API_URL}/api/friends/coaches/${currentUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!coachesResponse.ok) {
            throw new Error(`Erreur lors de la récupération des coachs: ${coachesResponse.status}`);
          }
          
          const coachesData = await coachesResponse.json();
          setContacts(coachesData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Erreur", "Une erreur est survenue lors du chargement des données");
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const startVideoCall = (contactId: any) => {
    if (isCoach) {
      router.push(`/VideoRoom?coachId=${userId}&userId=${contactId}`);
    } else {
      router.push(`/VideoRoom?coachId=${contactId}&userId=${userId}`);
    }
  };

  // Fonction pour naviguer vers l'écran d'invitation
  const navigateToInviteScreen = () => {
    router.push('/VideoInviteScreen');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Chargement des contacts...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isCoach ? 'Vos abonnés' : 'Vos coachs'}
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>
      
      {/* Bouton d'invitation pour les coachs */}
      {isCoach && (
        <TouchableOpacity 
          style={styles.inviteButton}
          onPress={navigateToInviteScreen}
        >
          <Ionicons name="mail" size={20} color="white" />
          <Text style={styles.inviteButtonText}>Inviter par email</Text>
        </TouchableOpacity>
      )}
      
      {contacts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Aucun {isCoach ? 'abonné' : 'coach'} disponible pour un appel vidéo
          </Text>
          <Text style={styles.subText}>
            {isCoach 
              ? "Vous n'avez pas encore d'abonnés qui ont accepté vos invitations." 
              : "Vous n'êtes pas encore abonné à des coachs."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => startVideoCall(item.id)}
            >
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>
                  {item.username || item.fullName || `Utilisateur ${item.id}`}
                </Text>
                {item.coachType && (
                  <Text style={styles.coachType}>
                    Spécialité: {item.coachType}
                  </Text>
                )}
              </View>
              <View style={styles.callButtonContainer}>
                <Ionicons name="videocam" size={24} color="#2196F3" />
                <Text style={styles.callButtonText}>Appeler</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={[
            contacts.length === 0 ? styles.centered : null,
            { paddingTop: isCoach ? 10 : 0 }
          ]}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  contactItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '500',
  },
  coachType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  callButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 8,
  },
  callButtonText: {
    color: '#2196F3',
    marginLeft: 5,
    fontWeight: '500',
  },
  // Styles pour le bouton d'invitation
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});