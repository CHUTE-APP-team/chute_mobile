import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

export default function Index() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [isLoading, user]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212" }}>
      <ActivityIndicator color="#FF6A00" size="large" />
    </View>
  );
}
