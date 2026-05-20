import { useEffect } from "react";
import { router } from "expo-router";

export default function MatchRedirect() {
  useEffect(() => {
    router.replace("/(tabs)/matches");
  }, []);
  return null;
}
