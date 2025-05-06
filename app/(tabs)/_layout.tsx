// app/(tabs)/_layout.tsx
// @ts-ignore
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,             // pas de header au-dessus des onglets
        tabBarStyle: { display: "none" } // pas de tab bar en bas
      }}
    >
      <Tabs.Screen name="dashbord" />
      <Tabs.Screen name="user" />
      <Tabs.Screen name="chatbot" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="disc" />
      <Tabs.Screen name="coaches" />
      <Tabs.Screen name="conversation" />
      <Tabs.Screen name="Chconver" />
      <Tabs.Screen name="usecoach" />
      <Tabs.Screen name="planr" />
      <Tabs.Screen name="CalendarScreen" />
      <Tabs.Screen name="CalendarUser" />
      <Tabs.Screen name="CalendarUserIA" />
      <Tabs.Screen name="demandes" />
      <Tabs.Screen name="forgotpswd" />
      <Tabs.Screen name="verification" />
      <Tabs.Screen name="AnalyticsCoach" />
      <Tabs.Screen name="VideoCallsScreen" options={{ title: "Appels Vidéo" }} />
      <Tabs.Screen name="VideoInviteScreen" options={{ title: "Invitations Vidéo" }} />
     <Tabs.Screen name="admin" options={{ title: "admin" }} /> 
    </Tabs>
  );
}
