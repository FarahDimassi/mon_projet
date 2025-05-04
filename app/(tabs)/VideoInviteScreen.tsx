import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getUserIdFromToken, getToken } from '../../utils/tokenUtils';
import { VideoCallService } from '../../utils/VideoCallService';
let API_URL = "http://192.168.1.139:8080";

type Subscriber = {
  id: number;
  email: string;
  fullName: string;
  username: string;
  selected?: boolean;
};

export default function VideoInviteScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [coachId, setCoachId] = useState<number | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  
  // Session info
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Vérifier si l'utilisateur est un coach et charger ses abonnés
  useEffect(() => {
    async function checkUserAndLoadData() {
      try {
        const userId = await getUserIdFromToken();
        if (!userId) {
          Alert.alert("Erreur", "Vous devez être connecté");
          router.replace("/AuthScreen");
          return;
        }
        
        setCoachId(userId);
        const token = await getToken();
        
        // Vérifier si l'utilisateur est un coach
        const userResponse = await fetch(`${API_URL}/api/users/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!userResponse.ok) {
          throw new Error("Impossible de récupérer les informations de l'utilisateur");
        }
        
        const userData = await userResponse.json();
        const userIsCoach = userData.role === 'Coach';
        setIsCoach(userIsCoach);
        
        if (userIsCoach) {
          // Utiliser l'API pour récupérer les abonnés du coach avec leurs emails
          const subscribersResponse = await fetch(`${API_URL}/api/coach/${userId}/subscribers/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!subscribersResponse.ok) {
            throw new Error("Impossible de récupérer la liste des abonnés");
          }
          
          const subscribersData = await subscribersResponse.json();
          setSubscribers(subscribersData.map((s: any) => ({ ...s, selected: false })));
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Erreur de chargement :', error);
        Alert.alert(
          "Erreur", 
          "Impossible de charger vos abonnés. Veuillez réessayer."
        );
        setIsLoading(false);
      }
    }
    
    checkUserAndLoadData();
  }, []);

  // Gestion de la sélection des abonnés
  const toggleSubscriberSelection = (id: number) => {
    setSubscribers(
      subscribers.map(sub => 
        sub.id === id ? { ...sub, selected: !sub.selected } : sub
      )
    );
  };

  // Gestion du date picker
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
    }
  };

  // Gestion du time picker
  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  // Envoi des invitations
  const sendInvitations = async () => {
    if (!subject.trim()) {
      Alert.alert("Information manquante", "Veuillez entrer un sujet pour la session.");
      return;
    }
    
    const selectedSubscribers = subscribers.filter(sub => sub.selected);
    if (selectedSubscribers.length === 0) {
      Alert.alert("Aucun abonné", "Veuillez sélectionner au moins un abonné.");
      return;
    }
    
    setIsSending(true);
    
    try {
      if (!coachId) throw new Error("ID du coach non disponible");
      
      // Générer un nom de salle unique
      const roomName = `coach-session-${coachId}-${Date.now()}`;
      
      // Formatage de la date au format ISO pour le backend
      const sessionDate = new Date(date);
      
      // Préparer les détails de la session
      const sessionDetails = {
        date: sessionDate.toISOString(),  // Format ISO pour le backend
        displayDate: date.toLocaleDateString('fr-FR'),  // Format lisible pour l'email
        displayTime: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        subject,
        message: message.trim() || undefined,
        roomName
      };
      
      // Collecter les emails des abonnés sélectionnés
      const subscriberIds = selectedSubscribers.map(sub => sub.id);
      
      // Créer la session vidéo d'abord
      const token = await getToken();
      const sessionResponse = await fetch(`${API_URL}/api/video-sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          coachId,
          roomName,
          scheduledFor: sessionDate.toISOString(),
          title: subject
        })
      });
      
      if (!sessionResponse.ok) {
        throw new Error("Impossible de créer la session vidéo");
      }
      
      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;
      
      // Envoyer les invitations
      const inviteResponse = await fetch(`${API_URL}/api/video-sessions/${sessionId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriberIds,
          message: message.trim() || undefined
        })
      });
      
      if (!inviteResponse.ok) {
        throw new Error("Impossible d'envoyer les invitations");
      }
      
      const result = await inviteResponse.json();
      
      Alert.alert(
        "Invitations envoyées", 
        `${result.sentCount} invitation(s) envoyée(s) avec succès`,
        [
          { 
            text: "OK", 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi des invitations :', error);
      Alert.alert(
        "Erreur", 
        "Une erreur est survenue lors de l'envoi des invitations."
      );
    } finally {
      setIsSending(false);
    }
  };

  // Affichage quand les données chargent
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Chargement de vos abonnés...</Text>
      </SafeAreaView>
    );
  }

  // Si l'utilisateur n'est pas un coach, afficher un message approprié
  if (!isCoach) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Accès réservé aux coachs</Text>
        <Text style={styles.subtitle}>
          Cette fonctionnalité est uniquement disponible pour les coachs.
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.title}>Inviter des abonnés</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Section informations de la session */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de la session</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Sujet</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Ex: Session de coaching personnalisée"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {date.toLocaleDateString('fr-FR')}
              </Text>
              <Ionicons name="calendar" size={24} color="#666" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Heure</Text>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Ionicons name="time" size={24} color="#666" />
            </TouchableOpacity>
            
            {showTimePicker && (
              <DateTimePicker
                value={date}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Message (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Ajouter un message personnalisé à l'invitation"
              multiline={true}
              numberOfLines={4}
            />
          </View>
        </View>
        
        {/* Section sélection des abonnés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sélectionner des abonnés</Text>
          
          {subscribers.length === 0 ? (
            <Text style={styles.emptyMessage}>
              Vous n'avez pas encore d'abonnés. Une fois que vous aurez des abonnés, vous pourrez les inviter à des sessions vidéo.
            </Text>
          ) : (
            <FlatList
              data={subscribers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.subscriberItem,
                    item.selected && styles.subscriberItemSelected
                  ]}
                  onPress={() => toggleSubscriberSelection(item.id)}
                >
                  <View style={styles.subscriberInfo}>
                    <Text style={styles.subscriberName}>
                      {item.fullName || item.username || "Abonné"}
                    </Text>
                    <Text style={styles.subscriberEmail}>{item.email}</Text>
                  </View>
                  
                  <View style={[
                    styles.checkbox,
                    item.selected && styles.checkboxSelected
                  ]}>
                    {item.selected && (
                      <Ionicons name="checkmark" size={18} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              style={styles.list}
            />
          )}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (isSending || subscribers.length === 0) && styles.disabledButton
          ]}
          disabled={isSending || subscribers.length === 0}
          onPress={sendInvitations}
        >
          {isSending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Envoyer les invitations</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginVertical: 10,
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#fafafa',
  },
  dateTimeText: {
    fontSize: 16,
  },
  list: {
    marginTop: 10,
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  subscriberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  subscriberItemSelected: {
    backgroundColor: '#e6f7ff',
    borderColor: '#91d5ff',
  },
  subscriberInfo: {
    flex: 1,
  },
  subscriberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  subscriberEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkboxSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  footer: {
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a0cdf7',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});