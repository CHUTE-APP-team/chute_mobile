import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";
import { createMatch } from "../services/matchService";
import { colors } from "../theme/colors";

const theme = colors;

export default function CreateMatchScreen() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const locationRef = useRef<TextInput>(null);
  const dateRef = useRef<TextInput>(null);
  const maxPlayersRef = useRef<TextInput>(null);

  function validate(): string | null {
    if (!title.trim()) return "Informe o título da partida.";
    if (!location.trim()) return "Informe o local da partida.";
    if (!date.trim()) return "Informe a data da partida.";
    const parsed = new Date(date.trim());
    if (isNaN(parsed.getTime())) return "Data inválida. Use o formato DD/MM/AAAA HH:MM.";
    const players = parseInt(maxPlayers, 10);
    if (!maxPlayers.trim() || isNaN(players) || players < 2)
      return "Número de jogadores deve ser pelo menos 2.";
    return null;
  }

  function parseDate(input: string): string {
    const parts = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (parts) {
      const [, dd, mm, yyyy, hh, min] = parts;
      return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`).toISOString();
    }
    return new Date(input.trim()).toISOString();
  }

  async function handleCreate() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await createMatch({
        title: title.trim(),
        location: location.trim(),
        date: parseDate(date),
        maxPlayers: parseInt(maxPlayers, 10),
      });
      router.back();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Erro ao criar partida. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Organizar Partida</Text>
        <Text style={styles.subheading}>Preencha os detalhes da partida</Text>

        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Pelada de quinta"
          placeholderTextColor={theme.textMuted}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => locationRef.current?.focus()}
        />

        <Text style={styles.label}>Local</Text>
        <TextInput
          ref={locationRef}
          style={styles.input}
          placeholder="Ex: Quadra do Parque"
          placeholderTextColor={theme.textMuted}
          value={location}
          onChangeText={setLocation}
          returnKeyType="next"
          onSubmitEditing={() => dateRef.current?.focus()}
        />

        <Text style={styles.label}>Data e hora</Text>
        <TextInput
          ref={dateRef}
          style={styles.input}
          placeholder="DD/MM/AAAA HH:MM"
          placeholderTextColor={theme.textMuted}
          value={date}
          onChangeText={setDate}
          keyboardType="numbers-and-punctuation"
          returnKeyType="next"
          onSubmitEditing={() => maxPlayersRef.current?.focus()}
        />

        <Text style={styles.label}>Máximo de jogadores</Text>
        <TextInput
          ref={maxPlayersRef}
          style={styles.input}
          placeholder="Ex: 10"
          placeholderTextColor={theme.textMuted}
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>CRIAR PARTIDA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.borderWarm,
    borderRadius: 50,
    padding: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    color: theme.text,
    marginBottom: 18,
  },
  button: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  error: {
    color: theme.error,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
});
