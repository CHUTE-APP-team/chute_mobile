import { useState } from "react";
import { login } from "@/src/services/authService";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";


export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      const user = await login(email, password);
      console.log(user);
      router.push("/home");
    } catch (error) {
      console.log("Erro no login", error);
    }
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>CHUTE ⚽</Text>

      <TextInput
  placeholder="Email"
  value={email}
  onChangeText={setEmail}
/>

<TextInput
  placeholder="Senha"
  value={password}
  onChangeText={setPassword}
/>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/home")}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/register")}>
        <Text style={styles.register}>Criar conta</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#ff9900",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 16,
  },
  register: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 20,
  },
});