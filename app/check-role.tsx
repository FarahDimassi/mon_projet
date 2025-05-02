import { useEffect } from "react";
import { useRouter } from "expo-router";
import { getRole } from  "../utils/authService";
import { ActivityIndicator, View } from "react-native";

export default function CheckRole() {
  const router = useRouter();

  useEffect(() => {
    const checkUserRole = async () => {
      const role = await getRole();
      if (role === "ROLE_ADMIN") {
        router.replace("/admin");
      } else {
        router.replace("/user");
      }
    };
    checkUserRole();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
