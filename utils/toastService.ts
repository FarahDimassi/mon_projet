// utils/toastService.ts
import Toast from "react-native-toast-message";

type ToastType = "success" | "error" | "info";

interface ShowToastOptions {
  type: ToastType;
  text1: string;
  text2?: string;
  visibilityTime?: number;    // en ms, défaut 4000
  position?: "top" | "bottom"; 
}

export const showToast = ({
  type,
  text1,
  text2,
  visibilityTime = 4000,
  position = "top",
}: ShowToastOptions) => {
  Toast.show({
    type,
    text1,
    text2,
    visibilityTime,
    position,
    topOffset: 50,
    bottomOffset: 50,
  });
};
