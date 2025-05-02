import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart } from "react-native-chart-kit";
import { getUserIdFromToken } from "../utils/authService";

const screenWidth = Dimensions.get("window").width;

// Fonction utilitaire pour forcer une valeur numérique sûre
const safeNumber = (value: any): number => {
  const num = Number(value);
  return isFinite(num) ? num : 0;
};

const CaloriesChart: React.FC = () => {
  const [plan, setPlan] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);
  const [diaryCalories, setDiaryCalories] = useState<number>(0);
  const [caloriesData, setCaloriesData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1) Récupération du plan et calcul du jour courant
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const id = await getUserIdFromToken();
        if (!id) {
          console.log("Aucun ID utilisateur trouvé");
          setIsLoading(false);
          return;
        }
        const planKey = `generatedPlan_${id}`;
        const timestampKey = `planTimestamp_${id}`;
        const storedPlan = await AsyncStorage.getItem(planKey);
        const timestampStr = await AsyncStorage.getItem(timestampKey);
        if (storedPlan && timestampStr) {
          const parsedPlan = JSON.parse(storedPlan);
          const timestamp = safeNumber(timestampStr);
          if (parsedPlan.two_week_plan && Array.isArray(parsedPlan.two_week_plan)) {
            setPlan(parsedPlan.two_week_plan);
            let dayNum = 1;
            if (timestamp > 0) {
              dayNum = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)) + 1;
            }
            if (!isFinite(dayNum) || dayNum < 1) dayNum = 1;
            setCurrentDay(dayNum);
          } else {
            console.log("Plan invalide : 'two_week_plan' non défini ou non tableau.");
          }
        } else {
          console.log("Plan ou timestamp introuvable dans AsyncStorage.");
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du plan :", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlan();
  }, []);

  // 2) Récupération des repas scannés (calories)
  useEffect(() => {
    const fetchLoggedMeals = async () => {
      try {
        const mealsStr = await AsyncStorage.getItem("loggedMeals");
        if (mealsStr) {
          setLoggedMeals(JSON.parse(mealsStr));
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des repas scannés :", error);
      }
    };
    fetchLoggedMeals();
  }, []);

  // 3) Récupération du diary (calories)
  useEffect(() => {
    const fetchDiaryData = async () => {
      try {
        const dataStr = await AsyncStorage.getItem("dailyData");
        if (dataStr) {
          const dailyObj = JSON.parse(dataStr);
          setDiaryCalories(safeNumber(dailyObj.mealCal));
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du dailyData :", error);
      }
    };
    fetchDiaryData();
  }, []);

  // 4) Calcul et sanitization des données de calories pour chaque jour
  useEffect(() => {
    if (plan.length > 0) {
      const computedData: number[] = [];
      const limit = Math.min(currentDay, plan.length);
      for (let i = 0; i < limit; i++) {
        const planCalories = safeNumber(plan[i].recommended_calories);
        let dayValue = planCalories;

        // Pour le jour courant, on ajoute scanné + diary
        if (i === currentDay - 1) {
          const scannedCalories = loggedMeals.reduce(
            (acc: number, meal: any) => acc + safeNumber(meal.calories),
            0
          );
          const total = planCalories + scannedCalories + diaryCalories;
          dayValue = isFinite(total) ? total : 0;
        }

        computedData.push(safeNumber(dayValue));
      }

      // Si le tableau est vide, fallback
      let finalData = computedData.length > 0 ? computedData.slice() : [0, 0];

      // Si moins de 2 points, on duplique
      if (finalData.length < 2) {
        finalData = finalData.length === 1 ? [finalData[0], finalData[0]] : [0, 0];
      }

      // Si toutes les valeurs sont identiques, on force une légère variation
      if (new Set(finalData).size === 1) {
        const base = finalData[0];
        const delta = base === 0 ? 1 : Math.abs(base) * 0.05;
        finalData = [base - delta, base + delta];
      }
      setCaloriesData(finalData);
      console.log("Tableau final de calories :", finalData);
    } else {
      setCaloriesData([0, 0]);
    }
  }, [plan, currentDay, loggedMeals, diaryCalories]);

  // 5) Préparation des données pour le graphique
  const chartData = {
    labels: caloriesData.map((_, index) => `J${index + 1}`), // J1, J2, J3, ...
    datasets: [
      {
        data: caloriesData,
      },
    ],
  };

  // Configuration du design du graphique
  const chartConfig = {
    // Fond
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",

    // Nombre de décimales
    decimalPlaces: 0,

    // Couleur principale de la ligne
    color: (opacity = 1) => `rgba(255, 153, 153, ${opacity})`, // rose clair
    // Couleur des labels (axes)
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,

    style: {
      borderRadius: 16,
    },

    // Personnalisation des points
    propsForDots: {
      r: "7", // taille du point
      strokeWidth: "2",
      stroke: "#FF9900", // contour orange
      fill: "#FF0000",   // centre rouge
    },

    // Personnalisation des lignes de fond (pointillées)
    propsForBackgroundLines: {
      strokeDasharray: "4,4",        // tirets
      stroke: "rgba(255, 192, 203, 0.4)", // rose très clair
    },

    // Couleur du remplissage sous la ligne (si fillShadowGradient est utilisé)
    fillShadowGradient: "rgba(255, 153, 153, 0.3)",
    fillShadowGradientOpacity: 1,
  };

  // Loader si en cours de chargement
  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF454A" />
      </View>
    );
  }

  // Rendu principal
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {plan.length === 0 ? (
          <Text style={styles.noDataText}>Aucune donnée de plan disponible.</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Calories Intake Chart</Text>
            <LineChart
              data={chartData}
              width={screenWidth - 80} // Ajuster selon la mise en page
              height={250}
              chartConfig={chartConfig}
              bezier               // ligne courbe
              fromZero={false}     // auto-scale
              style={styles.chartStyle}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CaloriesChart;

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContainer: {
    alignItems: "center",
    padding: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: screenWidth - 40,
    // Ombre iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    // Élévation Android
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  chartStyle: {
    borderRadius: 16,
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
    marginTop: 40,
    textAlign: "center",
  },
});
