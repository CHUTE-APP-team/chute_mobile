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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import axios from "axios";
import { createMatch } from "../services/matchService";
import { colors } from "../theme/colors";

const theme = colors;

export default function CreateMatchScreen() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [maxPlayers, setMaxPlayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Controls visibility of each picker step
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const locationRef = useRef<TextInput>(null);
  const maxPlayersRef = useRef<TextInput>(null);

  // ─── Date picker handlers ─────────────────────────────────────────────────

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }
    if (selected) {
      // Preserve existing time, update only the date part
      const next = new Date(date);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setDate(next);
    }
    setShowDatePicker(false);
    // On Android, show time picker as a second step
    if (Platform.OS === "android") setShowTimePicker(true);
  }

  function onTimeChange(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === "dismissed") {
      setShowTimePicker(false);
      return;
    }
    if (selected) {
      const next = new Date(date);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDate(next);
    }
    setShowTimePicker(false);
  }

  // ─── Display helpers ──────────────────────────────────────────────────────

  function formatDisplay(d: Date): string {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ─── Validation & submit ──────────────────────────────────────────────────

  function validate(): string | null {
    if (!title.trim()) return "Informe o título da partida.";
    if (!location.trim()) return "Informe o local da partida.";
    const players = parseInt(maxPlayers, 10);
    if (!maxPlayers.trim() || isNaN(players) || players < 2)
      return "Número de jogadores deve ser pelo menos 2.";
    return null;
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
        date: date.toISOString(),
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

        {/* Título */}
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

        {/* Local */}
        <Text style={styles.label}>Local</Text>
        <TextInput
          ref={locationRef}
          style={styles.input}
          placeholder="Ex: Quadra do Parque"
          placeholderTextColor={theme.textMuted}
          value={location}
          onChangeText={setLocation}
          returnKeyType="next"
          onSubmitEditing={() => maxPlayersRef.current?.focus()}
        />

        {/* Data e hora — tap to open picker */}
        <Text style={styles.label}>Data e hora</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>{formatDisplay(date)}</Text>
        </TouchableOpacity>

        {/* iOS: inline date+time picker (spinner mode) */}
        {Platform.OS === "ios" && showDatePicker && (
          <View style={styles.iosPickerWrapper}>
            <DateTimePicker
              value={date}
              mode="datetime"
              display="spinner"
              onChange={(e, d) => {
                if (e.type !== "dismissed" && d) setDate(d);
              }}
              locale="pt-BR"
              minimumDate={new Date()}
              textColor={theme.text}
            />
            <TouchableOpacity
              style={styles.iosPickerDone}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.iosPickerDoneText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Android: two-step modal (date first, then time) */}
        {Platform.OS === "android" && showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
        {Platform.OS === "android" && showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={onTimeChange}
            is24Hour
          />
        )}

        {/* Máximo de jogadores */}
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
  // Date picker trigger button — same visual weight as a text input
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.primary,
    borderRadius: 50,
    padding: 14,
    paddingHorizontal: 18,
    marginBottom: 18,
    gap: 10,
  },
  dateIcon: {
    fontSize: 18,
  },
  dateText: {
    fontSize: 15,
    color: theme.text,
    fontWeight: "500",
  },
  // iOS inline picker container
  iosPickerWrapper: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 18,
    overflow: "hidden",
  },
  iosPickerDone: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  iosPickerDoneText: {
    color: theme.primary,
    fontWeight: "700",
    fontSize: 15,
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
