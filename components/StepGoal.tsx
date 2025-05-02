import React from "react";
import { View, Text, ProgressBarAndroid, StyleSheet } from "react-native";

interface StepGoalProps {
  goal: number;
}

const StepGoal: React.FC<StepGoalProps> = ({ goal }) => {
  const currentSteps = 14000;
  const progress = currentSteps / goal;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 Daily Step Goal</Text>
      <Text style={styles.steps}>{currentSteps} / {goal} steps</Text>
      <ProgressBarAndroid styleAttr="Horizontal" indeterminate={false} progress={progress > 1 ? 1 : progress} />
    </View>
  );
};

export default StepGoal; 

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 10,
    margin: 10,
    width: "90%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  steps: {
    fontSize: 16,
    color: "#4EC3C7",
  },
});
