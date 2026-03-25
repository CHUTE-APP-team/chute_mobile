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
import { colors } from "../theme/colors";
import Logo from "../components/Logo";

const theme = colors;

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
      <View style={styles.logoContainer}>
        <Logo size="large" />
      </View>
      <Text style={styles.subtitle}>Crie sua conta</Text>

      <TextInput
        placeholder="Nome"
        placeholderTextColor={theme.textMuted}
        value={name}
        onChangeText={setName}
        style={styles.input}
        autoCapitalize="words"
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.textMuted}
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor={theme.textMuted}
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
          <ActivityIndicator color={theme.textOnPrimary} />
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
    backgroundColor: theme.background,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 28,
  },
  input: {
    backgroundColor: theme.card,
    color: theme.text,
    padding: 14,
    paddingHorizontal: 18,
    borderRadius: 50,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: theme.borderWarm,
    fontSize: 15,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textSecondary,
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
    borderColor: theme.borderWarm,
    backgroundColor: theme.card,
    gap: 6,
  },
  roleChipSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  roleEmoji: {
    fontSize: 16,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  roleTextSelected: {
    color: theme.textOnPrimary,
  },
  button: {
    backgroundColor: theme.primary,
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
    color: theme.textOnPrimary,
    fontSize: 16,
  },
  loginLink: {
    color: theme.primary,
    textAlign: "center",
    fontWeight: "600",
  },
  error: {
    color: theme.error,
    marginBottom: 12,
    textAlign: "center",
    fontSize: 13,
  },
});
