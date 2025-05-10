import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { getUserIdFromToken, getToken, getUsersById } from "../../utils/authService";
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from "@expo/vector-icons";
// @ts-ignore
import { useNavigation } from "expo-router";

export default function CalendarUserIA() {
  const [selectedDate, setSelectedDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [scannedProducts, setScannedProducts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<{[date: string]: any}>({});
  const [currentMonth, setCurrentMonth] = useState("");
  const calendarRef = useRef(null);

  // Récupération de l'ID utilisateur
  useEffect(() => {
    (async () => {
      try {
        const uid = await getUserIdFromToken();
        setUserId(uid);
      } catch (error) {
        console.error("Erreur récupération utilisateur :", error);
      }
    })();
  }, []);

  // Initialiser avec le mois actuel
  useEffect(() => {
    const today = new Date();
    const monthName = today.toLocaleString('default', { month: 'long' });
    setCurrentMonth(`${monthName} ${today.getFullYear()}`);
    
    // Initialiser les dates marquées
    const currentYear = today.getFullYear();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    
    // Exemple de dates marquées
    const marked = {
      [`${currentYear}-${currentMonth}-16`]: { marked: true, dotColor: '#2ecc71' },
      [`${currentYear}-${currentMonth}-03`]: { marked: true, dotColor: '#2ecc71' },
      [`${currentYear}-${currentMonth}-08`]: { marked: true, dotColor: '#2ecc71' },
    };
    
    setMarkedDates(marked);
  }, []);

  const fetchScannedProducts = async (userId: number, date: string) => {
    try {
      setScannedProducts([]); // Vide les anciens résultats
      const token = await getToken();
      const response = await fetch(
        `http://192.168.1.139:8080/api/scannedproducts/user/${userId}/date/${date}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Erreur fetch produits scannés");
      const data = await response.json();
      setScannedProducts(data);
    } catch (err) {
      console.error("Erreur chargement produits scannés :", err);
      setScannedProducts([]);
    }
  };

  const onDayPress = async (day: { dateString: string }) => {
    const newDate = day.dateString;
    setSelectedDate(newDate);
    
    // Mettre à jour les dates marquées avec la nouvelle sélection
    setMarkedDates(prev => ({
      ...prev,
      [newDate]: {
        ...(prev[newDate] || {}),
        selected: true,
        selectedColor: 'rgba(195, 0, 0, 0.7)',
      }
    }));
    
    if (!userId) return;

    try {
      const planResponse = await getDailyPlanByDate(userId, day.dateString);

      const planArray = Array.isArray(planResponse)
        ? planResponse
        : [planResponse];

      const formattedPlans = planArray.map((entry: any) => ({
        id: entry.id,
        date: entry.plan_date,
        resolvedUsername: "Coach IA",
        breakfast: entry.meal_plan?.breakfast,
        lunch: entry.meal_plan?.lunch,
        dinner: entry.meal_plan?.dinner,
        snacks: entry.meal_plan?.snacks,
        sport: entry.physical_activity,
        water: entry.recommended_water_l,
      }));

      setPlans(formattedPlans);
      await fetchScannedProducts(userId, day.dateString);
    } catch (error) {
      console.error("Erreur récupération plan :", error);
      setPlans([]);
    }

    setModalVisible(true);
  };

  // Navigation entre les mois
  const goToPreviousMonth = () => {
    if (calendarRef.current) {
      // @ts-ignore - La méthode addMonth existe sur l'instance mais n'est pas dans les types
      calendarRef.current.addMonth(-1);
    }
  };
  
  const goToNextMonth = () => {
    if (calendarRef.current) {
      // @ts-ignore - La méthode addMonth existe sur l'instance mais n'est pas dans les types
      calendarRef.current.addMonth(1);
    }
  };
  
  const onMonthChange = (month: any) => {
    const date = new Date(month.year, month.month - 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    setCurrentMonth(`${monthName} ${month.year}`);
  };

  const renderCustomHeader = () => {
    return (
      <View style={styles.customHeaderContainer}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.customHeaderTitle}>{currentMonth}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-forward" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    );
  };

  async function getDailyPlanByDate(userId: number, date: string) {
    const token = await getToken();
    const url = `http://192.168.1.139:8000/daily_plan/${userId}/date/${date}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Erreur GET Daily Plan, status = ${response.status}, message: ${errorText}`
      );
    }

    return await response.json();
  }

  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('user')}
        style={{
          position: 'absolute',
          top: 14,
          left: 11,
          zIndex: 10,
        }}>
        <Ionicons name="arrow-back" size={32} color="rgba(195, 0, 0, 0.7)" />
      </TouchableOpacity>
      
      {/* Header avec icône et titre */}
      <View style={styles.header}>
        <View style={styles.calendarHeaderContainer}>
          <Image 
            source={require('../../assets/images/calend.png')} 
            style={styles.calendarIcon}
          />
          <Text style={styles.title}>Calendrier {'\n'} du {(() => {
            const [username, setUsername] = React.useState<string | null>(null);
            
            React.useEffect(() => {
              const fetchUsername = async () => {
                try {
                  const userId = await getUserIdFromToken();
                  if (userId) {
                    const userData = await getUsersById(userId);
                    setUsername(userData?.username ?? null);
                  }
                } catch (error) {
                  console.error("Erreur lors de la récupération du nom d'utilisateur:", error);
                  setUsername("User");
                }
              };
              
              fetchUsername();
            }, []);
            
            return username;
          })()} </Text>
        </View>
      </View>
      
      {/* Calendar container with shadow */}
      <View style={styles.calendarContainer}>
        {/* Custom header for month navigation */}
        {renderCustomHeader()}
        
        {/* Custom weekday header */}
        <View style={styles.weekdayHeader}>
          <Text style={styles.weekdayText}>Dim</Text>
          <Text style={styles.weekdayText}>Lun</Text>
          <Text style={styles.weekdayText}>Mar</Text>
          <Text style={styles.weekdayText}>Mer</Text>
          <Text style={styles.weekdayText}>Jeu</Text>
          <Text style={styles.weekdayText}>Ven</Text>
          <Text style={styles.weekdayText}>Sam</Text>
        </View>
        
        <Calendar
          ref={calendarRef}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          markedDates={markedDates}
          theme={{
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#333',
            selectedDayBackgroundColor: 'rgba(195, 0, 0, 0.7)',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#3498db',
            dayTextColor: '#2d4150',
            textDisabledColor: '#d9e1e8',
            arrowColor: 'transparent',
            monthTextColor: 'transparent',
            indicatorColor: 'rgba(195, 0, 0, 0.7)',
            textDayFontWeight: '400',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '500',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
            'stylesheet.calendar.header': {
              header: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingLeft: 10,
                paddingRight: 10,
                alignItems: 'center',
                height: 0,
                opacity: 0,
              },
              dayHeader: {
                opacity: 0,
                height: 0,
              }
            },
            'stylesheet.day.basic': {
              base: {
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                marginTop: 4,
                marginBottom: 4,
              },
              today: {
                backgroundColor: '#f8f8fc',
                borderWidth: 1,
                borderColor: 'rgba(195, 0, 0, 0.3)',
              },
              selected: {
                backgroundColor: 'rgba(195, 0, 0, 0.7)',
                borderRadius: 16,
              },
            },
          }}
          hideExtraDays={false}
          enableSwipeMonths={true}
        />
        
        {/* Legend section with improved styling */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(195, 0, 0, 0.7)' }]} />
            <Text style={styles.legendText}>Date sélectionnée</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3498db' }]} />
            <Text style={styles.legendText}>Aujourd'hui</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2ecc71' }]} />
            <Text style={styles.legendText}>Avec plan</Text>
          </View>
        </View>
      </View>

      {/* Modal améliorée avec design excellent */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* En-tête avec date et bouton de fermeture */}
            <View style={styles.modalHeader}>
              <View style={styles.modalDateContainer}>
                <Ionicons name="calendar" size={24} color="rgba(195, 0, 0, 0.7)" />
                <Text style={styles.modalTitle}>{selectedDate}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close-circle" size={28} color="rgba(195, 0, 0, 0.7)" />
              </TouchableOpacity>
            </View>

            {/* Section Plans */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant-outline" size={20} color="#333" />
                <Text style={styles.sectionTitle}>Plans nutritionnels</Text>
              </View>
              
              {plans && plans.length > 0 ? (
                <FlatList
                  data={plans}
                  keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.planCard}>
                      <View style={styles.planCardHeader}>
                        <Ionicons name="person" size={18} color="rgba(195, 0, 0, 0.7)" />
                        <Text style={styles.planCardCoach}>Coach: {item.resolvedUsername || "-"}</Text>
                      </View>
                      
                      <View style={styles.mealContainer}>
                        <View style={styles.mealIconContainer}>
                          <Ionicons name="cafe" size={22} color="#8e6e5d" />
                        </View>
                        <View style={styles.mealTextContainer}>
                          <Text style={styles.mealTitle}>Petit-déjeuner</Text>
                          <Text style={styles.mealDescription}>{item.breakfast || "-"}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.mealContainer}>
                        <View style={styles.mealIconContainer}>
                          <MaterialCommunityIcons name="food-turkey" size={22} color="#5d8e5d" />
                        </View>
                        <View style={styles.mealTextContainer}>
                          <Text style={styles.mealTitle}>Déjeuner</Text>
                          <Text style={styles.mealDescription}>{item.lunch || "-"}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.mealContainer}>
                        <View style={styles.mealIconContainer}>
                          <Ionicons name="restaurant" size={22} color="#5d5d8e" />
                        </View>
                        <View style={styles.mealTextContainer}>
                          <Text style={styles.mealTitle}>Dîner</Text>
                          <Text style={styles.mealDescription}>{item.dinner || "-"}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.mealContainer}>
                        <View style={styles.mealIconContainer}>
                          <MaterialCommunityIcons name="food-apple" size={22} color="#8e5d7b" />
                        </View>
                        <View style={styles.mealTextContainer}>
                          <Text style={styles.mealTitle}>Collations</Text>
                          <Text style={styles.mealDescription}>{item.snacks || "-"}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.extraInfoContainer}>
                        <View style={styles.extraInfoItem}>
                          <Ionicons name="barbell" size={18} color="#8e5d5d" />
                          <Text style={styles.extraInfoText}>{item.sport || "Aucun sport"}</Text>
                        </View>
                        
                        <View style={styles.extraInfoItem}>
                          <Feather name="droplet" size={18} color="#5d8e8e" />
                          <Text style={styles.extraInfoText}>{item.water || "0"} L</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  style={styles.plansList}
                />
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="calendar-outline" size={40} color="#cccccc" />
                  <Text style={styles.emptyStateText}>Aucun plan pour cette date</Text>
                </View>
              )}
            </View>

            {/* Section Produits scannés */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="scan-outline" size={20} color="#333" />
                <Text style={styles.sectionTitle}>Produits scannés</Text>
              </View>
              
              {scannedProducts.length > 0 ? (
                <FlatList
                  data={scannedProducts}
                  keyExtractor={(item, idx) => item.id?.toString() ?? idx.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.productCard}>
                      <View style={styles.productImageContainer}>
                        <FontAwesome5 name="shopping-basket" size={24} color="#777" />
                      </View>
                      <View style={styles.productDetails}>
                        <Text style={styles.productName}>{item.productName}</Text>
                        <View style={styles.nutritionFacts}>
                          <View style={styles.nutritionItem}>
                            <MaterialCommunityIcons name="fire" size={16} color="#ff6b6b" />
                            <Text style={styles.nutritionText}>{item.calories} kcal</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                  style={styles.productsList}
                />
              ) : (
                <View style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons name="barcode-off" size={40} color="#cccccc" />
                  <Text style={styles.emptyStateText}>Aucun produit scanné</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ------ Styles ------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    marginHorizontal: 5,
    marginBottom: 20,
  },
  customHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  customHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize', 
  },
  arrowButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekdayText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  calendarHeaderContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    height: 159,
    top: 10,
  },
  calendarIcon: {
    width: 188,
    height: 188,
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 0,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 10,
    color: '#333',
  },
  modalCloseIcon: {
    padding: 2,
  },
  sectionContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  plansList: {
    maxHeight: 280,
  },
  planCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  planCardCoach: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  mealContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mealTextContainer: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginBottom: 2,
  },
  mealDescription: {
    fontSize: 14,
    color: '#666',
  },
  extraInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  extraInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  extraInfoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  productsList: {
    maxHeight: 220,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 15,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  productImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  nutritionFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 5,
  },
  nutritionText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#555',
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "rgba(195, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});