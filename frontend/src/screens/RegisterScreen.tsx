import { useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";
import { ALL_ROLES, UserRole } from "@/src/utils/roleUtils";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await register(name, email, password, role);
      router.replace("/home");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>CHUTE ⚽</Text>
      <Text style={styles.subtitle}>Crie sua conta</Text>

      <TextInput
        placeholder="Nome"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
        style={styles.input}
        autoCapitalize="words"
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Text style={styles.roleLabel}>Qual é o seu perfil?</Text>
      <View style={styles.roleGrid}>
        {ALL_ROLES.map((r) => {
          const selected = role === r.value;
          return (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleChip, selected && styles.roleChipSelected]}
              onPress={() => setRole(r.value)}
            >
              <Text style={styles.roleEmoji}>{r.emoji}</Text>
              <Text style={[styles.roleText, selected && styles.roleTextSelected]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Criar conta</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.loginLink}>Já tenho uma conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFF3E6",
    justifyContent: "center",
    padding: 24,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FF6A00",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 28,
  },
  input: {
    backgroundColor: "#fff",
    color: "#1A1A1A",
    padding: 14,
    borderRadius: 50,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8D5C4",
    fontSize: 15,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 12,
    marginTop: 4,
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#E8D5C4",
    backgroundColor: "#fff",
    gap: 6,
  },
  roleChipSelected: {
    backgroundColor: "#FF6A00",
    borderColor: "#FF6A00",
  },
  roleEmoji: {
    fontSize: 16,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  roleTextSelected: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#FF6A00",
    padding: 16,
    borderRadius: 50,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 16,
  },
  loginLink: {
    color: "#FF6A00",
    textAlign: "center",
    fontWeight: "600",
  },
  error: {
    color: "#D32F2F",
    marginBottom: 12,
    textAlign: "center",
    fontSize: 13,
  },
});
