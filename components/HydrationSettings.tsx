import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Switch,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleHydrationReminder, cancelHydrationReminders } from '../utils/notification';

interface HydrationSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const HydrationSettings: React.FC<HydrationSettingsProps> = ({ visible, onClose }) => {
  const [isHydrationEnabled, setIsHydrationEnabled] = useState(true);
  const [hydrationInterval, setHydrationInterval] = useState(7200); // 2 heures par défaut (en secondes)
  
  // Liste des intervalles prédéfinis en secondes
  const intervals = [
    { label: "30 minutes", value: 1800 },
    { label: "1 heure", value: 3600 },
    { label: "1 heure 30", value: 5400 },
    { label: "2 heures", value: 7200 },
    { label: "3 heures", value: 10800 },
    { label: "4 heures", value: 14400 },
  ];

  // Charger les paramètres enregistrés
  useEffect(() => {
    async function loadSettings() {
      try {
        // Charger l'état d'activation
        const enabled = await AsyncStorage.getItem('hydrationEnabled');
        if (enabled !== null) {
          setIsHydrationEnabled(enabled === 'true');
        }
        
        // Charger l'intervalle
        const interval = await AsyncStorage.getItem('hydrationInterval');
        if (interval !== null) {
          setHydrationInterval(parseInt(interval));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres d\'hydratation:', error);
      }
    }
    
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  // Activer/désactiver les notifications d'hydratation
  const toggleHydrationReminders = async (value: boolean) => {
    setIsHydrationEnabled(value);
    await AsyncStorage.setItem('hydrationEnabled', value.toString());
    
    if (value) {
      // Activer les notifications
      await scheduleHydrationReminder(hydrationInterval);
    } else {
      // Désactiver les notifications
      await cancelHydrationReminders();
    }
  };

  // Changer l'intervalle des notifications
  const changeInterval = async (intervalSeconds: number) => {
    setHydrationInterval(intervalSeconds);
    await AsyncStorage.setItem('hydrationInterval', intervalSeconds.toString());
    
    if (isHydrationEnabled) {
      await scheduleHydrationReminder(intervalSeconds);
    }
  };

  // Déclencher une notification de test
  const sendTestNotification = async () => {
    await scheduleHydrationReminder(0, 0); // Notification immédiate
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Rappels d'hydratation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#4b5563" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content}>
            {/* Activer/désactiver les rappels */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activer les rappels</Text>
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Notifications d'hydratation</Text>
                <Switch
                  value={isHydrationEnabled}
                  onValueChange={toggleHydrationReminders}
                  trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
                  thumbColor={isHydrationEnabled ? "#ffffff" : "#f3f4f6"}
                  ios_backgroundColor="#d1d5db"
                />
              </View>
              <Text style={styles.description}>
                Recevez des rappels réguliers pour rester hydraté(e) tout au long de la journée.
              </Text>
            </View>
            
            {/* Sélection de l'intervalle */}
            {isHydrationEnabled && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fréquence des rappels</Text>
                <View style={styles.intervalOptions}>
                  {intervals.map((interval) => (
                    <TouchableOpacity
                      key={interval.value}
                      style={[
                        styles.intervalOption,
                        hydrationInterval === interval.value && styles.selectedInterval
                      ]}
                      onPress={() => changeInterval(interval.value)}
                    >
                      <Text
                        style={[
                          styles.intervalText,
                          hydrationInterval === interval.value && styles.selectedIntervalText
                        ]}
                      >
                        {interval.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {/* Bouton pour tester la notification */}
            {isHydrationEnabled && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tester la notification</Text>
                <TouchableOpacity 
                  style={styles.testButton}
                  onPress={sendTestNotification}
                >
                  <Feather name="bell" size={18} color="#ffffff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Envoyer une notification test</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          
          <TouchableOpacity style={styles.saveButton} onPress={onClose}>
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  content: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#4b5563',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  intervalOption: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedInterval: {
    backgroundColor: '#3b82f6',
  },
  intervalText: {
    fontSize: 14,
    color: '#4b5563',
  },
  selectedIntervalText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HydrationSettings;