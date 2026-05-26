import { useEffect, useRef, useState } from "react";
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
  Modal,
  FlatList,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import axios from "axios";
import { createMatch } from "@/src/services/matchService";
import { colors } from "@/src/theme/colors";
import {
  listCourts,
  Court,
  MODALITY_LABELS,
  MODALITY_ICONS,
} from "@/src/services/courtService";

const theme = colors;

export default function CreateMatchScreen() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [maxPlayers, setMaxPlayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showCourtPicker, setShowCourtPicker] = useState(false);

  const maxPlayersRef = useRef<TextInput>(null);

  useEffect(() => {
    listCourts().then(setCourts).catch(() => {});
  }, []);

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }
    if (selected) {
      const next = new Date(date);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setDate(next);
    }
    setShowDatePicker(false);
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

  function formatDisplay(d: Date): string {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function validate(): string | null {
    if (!title.trim()) return "Informe o título da partida.";
    if (!selectedCourt && !location.trim()) return "Selecione uma quadra ou informe o local.";
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
        location: selectedCourt
          ? `${selectedCourt.name} — ${selectedCourt.address}`
          : location.trim(),
        courtId: selectedCourt?._id,
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

        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Pelada de quinta"
          placeholderTextColor={theme.textMuted}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="next"
        />

        {/* Court / Location selector */}
        <Text style={styles.label}>Quadra / Local</Text>
        <TouchableOpacity
          style={styles.courtSelector}
          onPress={() => setShowCourtPicker(true)}
          activeOpacity={0.75}
        >
          {selectedCourt ? (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text }}>
                {MODALITY_ICONS[selectedCourt.modality]} {selectedCourt.name}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                {selectedCourt.address} · {MODALITY_LABELS[selectedCourt.modality]}
              </Text>
            </View>
          ) : (
            <Text style={{ color: theme.textMuted, flex: 1 }}>
              Selecionar quadra cadastrada...
            </Text>
          )}
          <Text style={{ fontSize: 20, color: theme.textMuted }}>›</Text>
        </TouchableOpacity>

        {selectedCourt && (
          <TouchableOpacity onPress={() => setSelectedCourt(null)} style={{ marginTop: 4, marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: theme.error }}>✕ Usar local livre em vez disso</Text>
          </TouchableOpacity>
        )}

        {!selectedCourt && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={location}
            onChangeText={setLocation}
            placeholder="Ou digite o local manualmente"
            placeholderTextColor={theme.textMuted}
            returnKeyType="next"
            onSubmitEditing={() => maxPlayersRef.current?.focus()}
          />
        )}

        <Text style={styles.label}>Data e hora</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>{formatDisplay(date)}</Text>
        </TouchableOpacity>

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

      {/* Court Picker Modal */}
      <Modal
        visible={showCourtPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCourtPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
            backgroundColor: theme.card,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.primary }}>
              Selecionar Quadra
            </Text>
            <TouchableOpacity onPress={() => setShowCourtPicker(false)}>
              <Text style={{ color: theme.textMuted, fontSize: 20, padding: 4 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={courts}
            keyExtractor={(c) => c._id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={
              <Text style={{ color: theme.textMuted, textAlign: "center", marginTop: 40 }}>
                Nenhuma quadra cadastrada.{"\n"}Acesse Menu → Quadras para cadastrar.
              </Text>
            }
            renderItem={({ item: court }) => (
              <TouchableOpacity
                style={{
                  backgroundColor: selectedCourt?._id === court._id
                    ? "rgba(255,106,0,0.08)" : theme.card,
                  borderRadius: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: selectedCourt?._id === court._id ? theme.primary : theme.border,
                }}
                onPress={() => { setSelectedCourt(court); setShowCourtPicker(false); }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text }}>
                  {MODALITY_ICONS[court.modality]} {court.name}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  {court.address}
                </Text>
                <Text style={{ fontSize: 11, color: theme.primary, fontWeight: "600", marginTop: 2 }}>
                  {MODALITY_LABELS[court.modality]}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
  courtSelector: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.borderWarm,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 18,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
