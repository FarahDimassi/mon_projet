import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Image,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Footer from "../../components/Footer";
import ProtectedRoute from "../../utils/ProtectedRoute";
import { getUserIdFromToken } from "../../utils/authService";
import NavbarIA from "@/components/NavbarIA";

// Durée de validité du plan (14 jours) en millisecondes
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export default function Plan(): JSX.Element {
  // État pour stocker l'ID utilisateur
  const [userId, setUserId] = useState<number | null>(null);

  // État pour la progression du quiz
  const [step, setStep] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  // Stocke les réponses du quiz (9 questions)
  const [answers, setAnswers] = useState<string[]>([]);

  // Champs supplémentaires de l’étape finale
  const [location, setLocation] = useState<string>("");
  const [targetWeight, setTargetWeight] = useState<string>("");

  // Stocke le plan généré (ou récupéré) pour l’utilisateur
  const [plan, setPlan] = useState<string | null>(null);

  // Animation pour la transition entre étapes
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // États pour les inputs numériques
  const [age, setAge] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");

  // Nombre total d’étapes = 9 questions + 1 étape (location + targetWeight)
  const totalSteps = 10;
  const progress = (step + 1) / totalSteps;

  // Les 9 étapes du quiz
  const stepsQuiz = [
    {
      title: "What is your gender?",
      options: ["Male", "Female"],
      images: [
        require("../../assets/images/men.png"),
        require("../../assets/images/women.png"),
      ],
    },
    {
      title: "How old are you?",
      inputField: {
        value: age,
        onChange: setAge,
        placeholder: "Enter your age",
        keyboardType: "numeric",
        unit: "Years",
      },
    },
    {
      title: "What is your height?",
      inputField: {
        value: height,
        onChange: setHeight,
        placeholder: "Enter your height",
        keyboardType: "numeric",
        unit: "cm",
      },
    },
    {
      title: "What is your weight?",
      inputField: {
        value: weight,
        onChange: setWeight,
        placeholder: "Enter your weight",
        keyboardType: "numeric",
        unit: "kg",
      },
    },
    {
      title: "What is your goal?",
      options: ["Lose Weight", "Maintain Weight", "Gain Weight"],
      images: [],
    },
    {
      title: "What is your activity level?",
      options: [
        "Not Active",
        "Somewhat Active",
        "Highly Active",
        "Extremely Active",
      ],
      images: [],
    },
    {
      title: "What are your preferred foods?",
      options: [
        "Chicken",
        "Fish",
        "Vegetables",
        "Fruits",
        "Dairy",
        "Nuts",
        "Grains",
      ],
      images: [
        require("../../assets/images/ckicken.png"),
        require("../../assets/images/fish.png"),
        require("../../assets/images/vegetables.png"),
        require("../../assets/images/fruits.png"),
        require("../../assets/images/diary.png"),
        require("../../assets/images/nuts.png"),
        require("../../assets/images/grains.png"),
      ],
    },
    {
      title: "What foods do you dislike?",
      options: [
        "Chicken",
        "Fish",
        "Vegetables",
        "Fruits",
        "Dairy",
        "Nuts",
        "Grains",
      ],
      images: [
        require("../../assets/images/ckicken.png"),
        require("../../assets/images/fish.png"),
        require("../../assets/images/vegetables.png"),
        require("../../assets/images/fruits.png"),
        require("../../assets/images/diary.png"),
        require("../../assets/images/nuts.png"),
        require("../../assets/images/grains.png"),
      ],
    },
    {
      title: "What is your favorite cuisine?",
      options: [
        "Japanese Cuisine",
        "American Cuisine",
        "Italian Cuisine",
        "Chinese Cuisine",
        "Mexican Cuisine",
      ],
      images: [
        require("../../assets/images/japenese.png"),
        require("../../assets/images/american.png"),
        require("../../assets/images/italian.png"),
        require("../../assets/images/chinese.png"),
        require("../../assets/images/mexican.png"),
      ],
    },
  ];

  // Récupère l'ID utilisateur au montage du composant
  useEffect(() => {
    async function fetchUserId() {
      const uid = await getUserIdFromToken();
      if (uid !== null) {
        setUserId(uid);
      }
    }
    fetchUserId();
  }, []);

  // Vérifie si un plan est déjà stocké pour cet utilisateur et s’il est encore valide
  useEffect(() => {
    async function checkStoredPlan() {
      if (userId !== null) {
        const planKey = `generatedPlan_${userId}`;
        const timestampKey = `planTimestamp_${userId}`;
        try {
          const storedPlan = await AsyncStorage.getItem(planKey);
          const timestampStr = await AsyncStorage.getItem(timestampKey);
          if (storedPlan && timestampStr) {
            const timestamp = Number(timestampStr);
            const now = Date.now();
            if (now - timestamp < FOURTEEN_DAYS_MS) {
              setPlan(storedPlan);
            } else {
              // Si expiré, on supprime
              await AsyncStorage.removeItem(planKey);
              await AsyncStorage.removeItem(timestampKey);
            }
          }
        } catch (error) {
          console.error("Erreur lors de la lecture du plan stocké :", error);
        }
      }
    }
    checkStoredPlan();
  }, [userId]);

  // Passe à l’étape suivante dans le quiz
  const nextStep = () => {
    if (!selectedOption) return;
    setAnswers([...answers, selectedOption]);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setStep((prev) => prev + 1);
      setSelectedOption(null);
      fadeAnim.setValue(1);
    });
  };

  // Au clic sur "Generate Plan", on construit le payload et on envoie la requête
  const generatePlan = async () => {
    if (!location || !targetWeight) return;
    if (answers.length < 9) {
      console.error("Not all quiz questions have been answered.");
      return;
    }
    if (userId === null) {
      console.error("User ID not found in token");
      return;
    }

    const payload = {
      user_id: userId.toString(),
      gender: answers[0],
      age: parseInt(answers[1], 10),
      height_cm: parseInt(answers[2].replace(" cm", ""), 10),
      weight_kg: parseInt(answers[3].replace(" kg", ""), 10),
      goal: answers[4],
      activity_level: answers[5],
      preferred_foods: [answers[6]],
      disliked_foods: [answers[7]],
      favorite_cuisine: answers[8],
      location: location,
      target_weight: parseFloat(targetWeight),
    };

    try {
      const response = await fetch("http://192.168.1.139:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getUserToken()}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      console.log("Plan généré :", data);

      const planString = JSON.stringify(data, null, 2);
      setPlan(planString);

      const planKey = `generatedPlan_${userId}`;
      const timestampKey = `planTimestamp_${userId}`;
      await AsyncStorage.setItem(planKey, planString);
      await AsyncStorage.setItem(timestampKey, Date.now().toString());
    } catch (error) {
      console.error("Erreur lors de l'appel de l'API /predict :", error);
    }
  };

  // Exemple de fonction pour récupérer un token complet (à adapter)
  async function getUserToken(): Promise<string> {
    return "votreTokenIci";
  }

  // Si un plan existe déjà, on l’affiche
  if (plan) {
    let parsedPlan: any = null;
    try {
      parsedPlan = JSON.parse(plan);
    } catch (error) {
      console.error("Erreur lors du parsing du plan :", error);
    }

    return (
      <ProtectedRoute>
        <NavbarIA />
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.headerTitle}>Your Two-Week Plan</Text>

          {parsedPlan && (parsedPlan.initial_weight || parsedPlan.target_weight) && (
            <View style={styles.globalInfoCard}>
              <Text style={styles.planDay}>Plan Info</Text>
              {parsedPlan.initial_weight && (
                <Text style={styles.planMeals}>
                  <Text style={styles.bold}>Initial Weight: </Text>
                  {parsedPlan.initial_weight}
                </Text>
              )}
              {parsedPlan.target_weight && (
                <Text style={styles.planMeals}>
                  <Text style={styles.bold}>Target Weight: </Text>
                  {parsedPlan.target_weight}
                </Text>
              )}
            </View>
          )}

          {parsedPlan && Array.isArray(parsedPlan.two_week_plan) ? (
            parsedPlan.two_week_plan.map((dayData: any, index: number) => (
              <View key={index} style={styles.planCard}>
                <Text style={styles.planDay}>Day {dayData.day}</Text>
                {dayData.daily_message && (
                  <Text style={styles.dailyMessage}>{dayData.daily_message}</Text>
                )}
                {dayData.physical_activity && (
                  <Text style={styles.planMeals}>
                    <Text style={styles.bold}>Physical Activity: </Text>
                    {dayData.physical_activity}
                  </Text>
                )}
                {dayData.recommended_steps !== undefined && (
                  <Text style={styles.planMeals}>
                    <Text style={styles.bold}>Recommended Steps: </Text>
                    {dayData.recommended_steps}
                  </Text>
                )}
                {dayData.recommended_distance_km !== undefined && (
                  <Text style={styles.planMeals}>
                    <Text style={styles.bold}>Recommended Distance (km): </Text>
                    {dayData.recommended_distance_km}
                  </Text>
                )}
                {dayData.recommended_water_l !== undefined && (
                  <Text style={styles.planMeals}>
                    <Text style={styles.bold}>Recommended Water (l): </Text>
                    {dayData.recommended_water_l}
                  </Text>
                )}
                {dayData.recommended_calories !== undefined && (
                  <Text style={styles.planMeals}>
                    <Text style={styles.bold}>Recommended Calories: </Text>
                    {dayData.recommended_calories}
                  </Text>
                )}

                {dayData.meal_plan && (
                  <>
                    <Text style={[styles.planMeals, { marginTop: 10 }]}>
                      <Text style={styles.bold}>Breakfast: </Text>
                      {dayData.meal_plan.breakfast}
                    </Text>
                    <Text style={styles.planMeals}>
                      <Text style={styles.bold}>Lunch: </Text>
                      {dayData.meal_plan.lunch}
                    </Text>
                    <Text style={styles.planMeals}>
                      <Text style={styles.bold}>Dinner: </Text>
                      {dayData.meal_plan.dinner}
                    </Text>
                    <Text style={styles.planMeals}>
                      <Text style={styles.bold}>Snacks: </Text>
                      {dayData.meal_plan.snacks}
                    </Text>
                  </>
                )}

{dayData.places &&
  Array.isArray(dayData.places) &&
  dayData.places.length > 0 && (
    <View style={{ marginTop: 10 }}>
      <Text style={[styles.planMeals, styles.bold]}>
        Recommended Places:
      </Text>
      {dayData.places.map((place: any, i: number) => (
        <View key={i} style={styles.placeItem}>
          <Text style={styles.placeName}>
            {place.address?.shop || place.details?.leisure || "Unnamed Place"}
          </Text>
          <Text style={styles.placeAddress}>
            📍{" "}
            {(place.address?.road ?? "") +
              (place.address?.city ? ", " + place.address.city : "")}
          </Text>
        </View>
      ))}
    </View>
)}

                
              </View>
            ))
          ) : (
            <Text style={styles.planText}>{plan}</Text>
          )}
        </ScrollView>
        <Footer />
      </ProtectedRoute>
    );
  }

  // Affichage du quiz (étapes du quiz ou étape finale)
  return (
    <ProtectedRoute>
      <NavbarIA />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Barre de progression */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>

        {step < stepsQuiz.length ? (
          <>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.title}>
                {stepsQuiz[step]?.title ?? ""}
              </Text>
              {/* Vérifie si l’étape possède un inputField */}
              {stepsQuiz[step]?.inputField ? (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={stepsQuiz[step].inputField.placeholder}
                    keyboardType={
                      stepsQuiz[step].inputField.keyboardType
                    }
                    value={stepsQuiz[step].inputField.value}
                    onChangeText={(text) => {
                      stepsQuiz[step].inputField.onChange(text);
                      setSelectedOption(text);
                    }}
                  />
                  {stepsQuiz[step].inputField.unit && (
                    <Text style={styles.unitText}>
                      {stepsQuiz[step].inputField.unit}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.optionsContainer}>
                  {stepsQuiz[step]?.options?.map((option, index) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.option,
                        selectedOption === option
                          ? styles.selectedOption
                          : {},
                      ]}
                      onPress={() => setSelectedOption(option)}
                    >
                      {stepsQuiz[step]?.images?.length > index && (
                        <View style={styles.imageContainer}>
                          <Image
                            source={stepsQuiz[step].images[index]}
                            style={styles.optionImage}
                          />
                        </View>
                      )}
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
            <TouchableOpacity
              style={[
                styles.nextButton,
                !selectedOption && styles.disabledButton,
              ]}
              onPress={nextStep}
              disabled={!selectedOption}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Étape finale pour saisir la localisation et le poids cible
          <View style={styles.additionalContainer}>
            <TextInput
              style={styles.locationInput}
              placeholder="Enter your location"
              value={location}
              onChangeText={setLocation}
            />
            <TextInput
              style={styles.locationInput}
              placeholder="Enter your target weight"
              value={targetWeight}
              onChangeText={setTargetWeight}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[
                styles.generateButton,
                (!location || !targetWeight) && styles.disabledButton,
                { marginBottom: 81 },
              ]}
              onPress={generatePlan}
              disabled={!location || !targetWeight}
            >
              <Text style={styles.generateButtonText}>Generate Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <Footer />
    </ProtectedRoute>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    marginBottom: 50,
  },
  progressContainer: {
    width: "90%",
    height: 10,
    backgroundColor: "#ccc",
    borderRadius: 5,
    overflow: "hidden",
    marginVertical: 10,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#28A745",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2E8B57",
    marginVertical: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 25,
  },
  option: {
    backgroundColor: "#ffffff",
    padding: 12,
    margin: 8,
    borderRadius: 15,
    alignItems: "center",
    width: 130,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  selectedOption: {
    backgroundColor: "#C3E6CB",
    borderWidth: 2,
    borderColor: "#28A745",
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    marginBottom: 8,
  },
  optionImage: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  nextButton: {
    backgroundColor: "#28A745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "80%",
    marginTop: 20,
    marginBottom: 60,
  },
  disabledButton: {
    backgroundColor: "#A9A9A9",
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  generateButton: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "80%",
    marginTop: 20,
  },
  generateButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  locationInput: {
    width: "80%",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  additionalContainer: {
    alignItems: "center",
  },
  planText: {
    fontSize: 16,
    color: "#333",
    marginVertical: 20,
    textAlign: "center",
  },
  globalInfoCard: {
    backgroundColor: "#FFF5EE",
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginVertical: 10,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  planCard: {
    backgroundColor: "#F0F8FF",
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginVertical: 10,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  planDay: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E8B57",
    marginBottom: 10,
    textAlign: "center",
  },
  planMeals: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 5,
  },
  dailyMessage: {
    fontStyle: "italic",
    color: "#555",
    marginBottom: 10,
    textAlign: "center",
  },
  bold: {
    fontWeight: "bold",
  },
  placeItem: {
    marginTop: 5,
    padding: 8,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    marginBottom: 5,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  placeAddress: {
    fontSize: 14,
    color: "#666",
  },
  inputContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  input: {
    width: "80%",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    textAlign: "center",
  },
  unitText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
});
