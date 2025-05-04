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
import {
  getUserIdFromToken,
  getMealPlanForUserAndDate,
  getCoachById,
  getUserByIdForCoach,
  getUserById,
  getUsersById,
  getToken
} from "../../utils/authService";
import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useNavigation } from "expo-router";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [coachId, setCoachId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState("April 2025");
  const [scannedProducts, setScannedProducts] = useState<any[]>([]);
  const calendarRef = useRef(null);
  const [markedDates, setMarkedDates] = useState<{[date: string]: any}>({});
  const [loading, setLoading] = useState(false);

  // Au chargement, on récupère l'ID de l'utilisateur connecté
  useEffect(() => {
    (async () => {
      try {
        const uid = await getUserIdFromToken();
        setUserId(uid);
        setCoachId(1); // exemple statique
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'identifiant utilisateur:",
          error
        );
      }
    })();
  }, []);
  
  // Initialiser avec le mois et l'année actuels
  useEffect(() => {
    const today = new Date();
    const monthName = today.toLocaleString('default', { month: 'long' });
    setCurrentMonth(`${monthName} ${today.getFullYear()}`);
  }, []);
  
  // Au chargement, récupérer les plans pour le mois en cours
  useEffect(() => {
    loadPlansForCurrentMonth();
  }, [userId]);
  
 const resolveCoachUsername = async (item: any) => {
   const userData = await getCoachById(item.coachId);
   return { ...item, resolvedUsername: userData?.username || `User_${item.coachId}` };
 };

 const fetchScannedProducts = async (userId: number, date: string) => {
  try {
    setScannedProducts([]); // Vide les anciens
    const token = await getToken();
    const res = await fetch(
      `http://192.168.1.139:8080/api/scannedproducts/user/${userId}/date/${date}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) throw new Error("Erreur fetch produits scannés");
    const data = await res.json();
    setScannedProducts(data);
  } catch (err) {
    console.error("Erreur chargement produits scannés :", err);
    setScannedProducts([]);
  }
};

  // Fonction pour charger les plans du mois courant
  const loadPlansForCurrentMonth = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Obtenir le premier jour du mois courant
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Formater les dates pour l'API
      const firstDayStr = firstDay.toISOString().split('T')[0];
      const lastDayStr = lastDay.toISOString().split('T')[0];
      
      // Récupérer les plans du mois
      await fetchMonthPlans(firstDayStr, lastDayStr);
    } catch (error) {
      console.error("Erreur lors du chargement des plans du mois:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour récupérer les plans d'un mois spécifique
  const fetchMonthPlans = async (startDate: string, endDate: string) => {
    try {
      // Ici, vous devriez avoir un endpoint API qui retourne tous les plans 
      // entre deux dates pour un utilisateur donné.
      // Si vous n'avez pas cet endpoint, vous pouvez adapter cette fonction.
      
      // Exemple de requête pour obtenir les plans du mois
      const token = await getToken();
      const response = await fetch(
        `http://192.168.1.139:8080/api/mealplans/user/${userId}/range?startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des plans du mois");
      }
      
      const data = await response.json();
      
      // Marquer les dates qui ont des plans
      const newMarkedDates: {[date: string]: any} = {};
      data.forEach((plan: any) => {
        newMarkedDates[plan.date] = {
          marked: true,
          dotColor: '#2ecc71',
        };
      });
      
      // Combiner avec la date sélectionnée si elle existe
      if (selectedDate) {
        newMarkedDates[selectedDate] = {
          ...newMarkedDates[selectedDate],
          selected: true,
          selectedColor: 'rgba(195, 0, 0, 0.7)',
        };
      }
      
      setMarkedDates(newMarkedDates);
    } catch (error) {
      console.error("Erreur lors de la récupération des plans du mois:", error);
    }
  };

  // Fonction appelée lorsque l'utilisateur clique sur une date du calendrier
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
    
    if (userId && coachId) {
      try {
        // Récupération de la liste des Meal/Plan
        const response = await getMealPlanForUserAndDate(userId, day.dateString);
        console.log(response)
        // L'API renvoie déjà un tableau ? alors on le stocke directement
        const resolvedPlans = await Promise.all(response.map(resolveCoachUsername));
        setPlans(resolvedPlans);
        await fetchScannedProducts(userId, day.dateString);
      } catch (error) {
        console.error("Erreur lors de la récupération des plans:", error);
        setPlans([]);
        setScannedProducts([]);
      }
    }
    setModalVisible(true);
  };

  // Fonction pour gérer le changement de mois
  const onMonthChange = async (month: any) => {
    const date = new Date(month.year, month.month - 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    setCurrentMonth(`${monthName} ${month.year}`);
    
    // Charger les plans pour le nouveau mois
    const firstDay = new Date(month.year, month.month - 1, 1);
    const lastDay = new Date(month.year, month.month, 0);
    
    const firstDayStr = firstDay.toISOString().split('T')[0];
    const lastDayStr = lastDay.toISOString().split('T')[0];
    
    await fetchMonthPlans(firstDayStr, lastDayStr);
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

  // Rendu d'un item (plan) dans la liste de la modal
  const renderPlanItem = ({ item }: { item: any }) => (
    <View style={styles.planCard}>
    <Text style={styles.planText}>Date : {item.date}</Text>
      <Text style={styles.planText}>
        <Ionicons name="person" size={16} color="black" /> Coach :{" "}
        {item.resolvedUsername || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="cafe" size={16} color="brown" /> Breakfast :{" "}
        {item.breakfast || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="restaurant" size={16} color="green" /> Lunch :{" "}
        {item.lunch || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="restaurant" size={16} color="blue" /> Dinner :{" "}
        {item.dinner || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="fast-food" size={16} color="orange" /> Snacks :{" "}
        {item.snacks || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="barbell" size={16} color="purple" /> Sport :{" "}
        {item.sport || "-"}
      </Text>
      <Text style={styles.planText}>
        <Ionicons name="water" size={16} color="skyblue" /> Water :{" "}
        {item.water || "-"}
      </Text>
    </View>
  );
  const navigation = useNavigation();

  // Améliorations du style des boutons de navigation conformément à l'image de référence
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

  return (
    <View style={styles.container}>
      {/* Title header */}  <TouchableOpacity onPress={() => navigation.navigate('reel')}
              style={{
                position: 'absolute',
                top: 14,
                left: 11,
                zIndex: 10, // pour qu’il soit au-dessus si nécessaire
              }}>
          <Ionicons name="arrow-back"  size={32} color="#rgba(195, 0, 0, 0.7)" />
        </TouchableOpacity>
      <View style={styles.header}>
         <View style={styles.calendarHeaderContainer}>
         <Image 
           source={require('../../assets/images/calend.png')} 
           style={styles.calendarIcon}
         />
         <Text style={styles.title}>Calendrier {'\n'}
          du {(() => {
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
        {/* Utiliser notre en-tête personnalisé au lieu du précédent */}
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

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Plans du {selectedDate}</Text>
            {plans && plans.length > 0 ? (
              <FlatList
                data={plans}
                keyExtractor={(item, index) =>
                  item.id?.toString() || index.toString()
                }
                renderItem={renderPlanItem}
              />
            ) : (
              <Text>Aucun plan pour cette date.</Text>
            )}
               <Text style={[styles.modalTitle, { marginTop: 20 }]}>
       Produits scannés
     </Text>
     {scannedProducts.length > 0 ? (
       <FlatList
         data={scannedProducts}
         keyExtractor={(item, idx) => item.id?.toString() ?? idx.toString()}
         renderItem={({ item }) => (
           <View style={styles.planCard}>
             <Text style={styles.planText}>Produit : {item.productName}</Text>
             <Text style={styles.planText}>Calories : {item.calories}</Text>
             {/* ajoutez d’autres champs si besoin */}
           </View>
         )}
       />
     ) : (
       <Text>Aucun produit scanné.</Text>
     )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize', // Pour mettre une majuscule au nom du mois
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    maxHeight: '80%',
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
  // Style amélioré pour l'en-tête du mois conforme à l'image de référence
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
 
});