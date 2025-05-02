import React, { useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import foodIcon from "../../assets/images/food.png";
// @ts-ignore
import { useNavigation } from "expo-router";

export default function CalendarUserIA() {
  const [selectedDate, setSelectedDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [scannedProducts, setScannedProducts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState({});

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

  // Exemple de dates marquées pour correspondre à l'image
  useEffect(() => {
    // Simulation de dates avec différents états
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    // Exemple de dates marquées
    const marked = {
      [`${year}-${month}-16`]: { selected: true, selectedColor: 'rgba(195, 0, 0, 0.5)' },
      [`${year}-${month}-03`]: { marked: true, dotColor: '#FF5252' },
      [`${year}-${month}-08`]: { marked: true, dotColor: '#4CAF50' },
    };
    
    setMarkedDates(marked);
  }, []);

  const fetchScannedProducts = async (userId: number, date: string) => {
    try {
      setScannedProducts([]); // ✅ Vide les anciens résultats
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
    setSelectedDate(day.dateString);
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
      setScannedProducts([]); // ✅ Vide les anciens produits scannés
      await fetchScannedProducts(userId, day.dateString);
      
    } catch (error) {
      console.error("Erreur récupération plan :", error);
      setPlans([]);
    }

    setModalVisible(true);
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

  const renderPlanItem = ({ item }: { item: any }) => (
    <View style={styles.planCard}>
      <Text style={styles.planText}>Date : {item.date}</Text>
      <Text style={styles.planText}>
        <Ionicons name="person" size={16} color="black" /> Coach : {item.resolvedUsername}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="cafe" size={16} color="brown" /> Breakfast : {item.breakfast || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="restaurant" size={16} color="green" /> Lunch : {item.lunch || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="restaurant" size={16} color="blue" /> Dinner : {item.dinner || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="fast-food" size={16} color="orange" /> Snacks : {item.snacks || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="barbell" size={16} color="purple" /> Sport : {item.sport || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="water" size={16} color="skyblue" /> Water : {item.water || "-"} L
      </Text>
    </View>
  );

  const renderScannedProduct = ({ item }: { item: any }) => (
    <View style={styles.productRow}>
      <Image
        source={foodIcon} // ✅ Icône locale
        style={styles.productImage}
      />
      <View>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.productCalories}>{item.calories} kcal</Text>
      </View>
    </View>
  );
const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('user')}
        style={{
          position: 'absolute',
          top: 14,
          left: 11,
          zIndex: 10, // pour qu’il soit au-dessus si nécessaire
        }}>
    <Ionicons name="arrow-back"  size={32} color="#rgba(195, 0, 0, 0.7)" />
  </TouchableOpacity>
      <View style={styles.headerContainer}>
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
      
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...markedDates,
          [selectedDate]: { selected: true, selectedColor: 'rgba(195, 0, 0, 0.3)' },
        }}
        theme={{
          backgroundColor: '#F5F7FA',
          calendarBackground: '#F5F7FA',
          textSectionTitleColor: '#333',
          selectedDayBackgroundColor: 'rgba(195, 0, 0, 0.3)',
          selectedDayTextColor: '#fff',
          todayTextColor: 'rgba(195, 0, 0, 0.5)',
          dayTextColor: '#333',
          textDisabledColor: '#aaa',
          dotColor: '#FF5252',
          selectedDotColor: '#fff',
          arrowColor: 'rgba(195, 0, 0, 0.5)',
          monthTextColor: '#333',
          indicatorColor: 'rgba(195, 0, 0, 0.5)',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: 'bold',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 13
        }}
      />
      
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4285F4' }]} />
          <Text style={styles.legendText}>Date sélectionnée</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} />
          <Text style={styles.legendText}>Avec remarques</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Avec plan</Text>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Plan du {selectedDate}</Text>

            {scannedProducts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🍽️ Produits Scannés</Text>
                <FlatList
                  data={scannedProducts}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={renderScannedProduct}
                  contentContainerStyle={{ paddingBottom: 10 }}
                />
              </>
            )}

            {plans.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>📋 Plan du jour</Text>
                <FlatList
                  data={plans}
                  keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                  renderItem={renderPlanItem}
                  contentContainerStyle={{ paddingBottom: 10 }}
                />
              </>
            )}

            {plans.length === 0 && scannedProducts.length === 0 && (
              <Text style={{ textAlign: "center", marginVertical: 20 }}>
                Aucun contenu disponible pour cette date.
              </Text>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
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
    backgroundColor: "#F5F7FA",
    padding: 10,
  },
  headerContainer: {
    marginVertical: 10,
    padding: 10,
  },
  calendarTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginBottom: 5,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    paddingHorizontal: 20,
  },
  navArrow: {
    fontSize: 20,
    color: "rgba(195, 0, 0, 0.5)",
    fontWeight: "bold",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  planCard: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  planText: {
    fontSize: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  productImage: {
    width: 30,
    height: 30,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: "#eee",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
  },
  productCalories: {
    color: "#888",
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
  calendarHeaderContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
  //  backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    height: 159,
    top:10,
  },
  
  // Style pour l'icône du calendrier
  calendarIcon: {
    width: 188,
    height: 188,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});