import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getUserIdFromToken } from "./tokenUtils";
import { Platform } from "react-native";
import { API_URL } from "./config";

export async function registerForPushNotificationsAsync() {
  if (!Constants.isDevice) return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  const userId = await getUserIdFromToken();
  await fetch(`${API_URL}/api/notifications/register-device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: String(userId), token, deviceType: Platform.OS }),
  });
}
