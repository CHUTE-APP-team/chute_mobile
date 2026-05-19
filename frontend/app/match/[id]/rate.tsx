import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getMatch, ratePlayer, MatchDetail, Player } from "../../../src/services/matchService";
import { colors } from "../../../src/theme/colors";

const theme = colors;

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number; // 0–5
  onChange: (v: number) => void;
}) {
  return (
    <View style={star.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} activeOpacity={0.7}>
          <Text style={[star.icon, i <= value ? star.filled : star.empty]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const star = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
  icon: { fontSize: 28 },
  filled: { color: "#FF6A00" },
  empty:  { color: "#E5E5E5" },
});

// ─── Player Row ───────────────────────────────────────────────────────────────

interface PlayerRating {
  stars: number;     // 0–5
  goals: string;
  assists: string;
  mvp: boolean;
}

function PlayerRatingRow({
  player,
  rating,
  isMvpSelected,
  onChange,
  onToggleMvp,
}: {
  player: Player;
  rating: PlayerRating;
  isMvpSelected: boolean;
  onChange: (field: keyof PlayerRating, value: string | number | boolean) => void;
  onToggleMvp: () => void;
}) {
  return (
    <View style={row.card}>
      {/* Name + overall */}
      <View style={row.header}>
        <View style={row.nameBlock}>
          <Text style={row.name}>{player.name}</Text>
          <Text style={row.overall}>Overall {player.overall}</Text>
        </View>
        <TouchableOpacity
          style={[row.mvpBtn, isMvpSelected && row.mvpBtnActive]}
          onPress={onToggleMvp}
          activeOpacity={0.8}
        >
          <Text style={[row.mvpText, isMvpSelected && row.mvpTextActive]}>
            {isMvpSelected ? "⭐ MVP" : "MVP"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stars */}
      <View style={row.section}>
        <Text style={row.label}>Nota</Text>
        <View style={row.starsRow}>
          <StarRating
            value={rating.stars}
            onChange={(v) => onChange("stars", v)}
          />
          <Text style={row.ratingNum}>
            {rating.stars > 0 ? (rating.stars * 2).toFixed(0) : "—"}/10
          </Text>
        </View>
      </View>

      {/* Goals + Assists */}
      <View style={row.inputs}>
        <View style={row.inputGroup}>
          <Text style={row.label}>Gols</Text>
          <TextInput
            style={row.input}
            keyboardType="number-pad"
            value={rating.goals}
            onChangeText={(v) => onChange("goals", v.replace(/[^0-9]/g, ""))}
            placeholder="0"
            placeholderTextColor={theme.textMuted}
            maxLength={2}
          />
        </View>
        <View style={row.inputGroup}>
          <Text style={row.label}>Assist.</Text>
          <TextInput
            style={row.input}
            keyboardType="number-pad"
            value={rating.assists}
            onChangeText={(v) => onChange("assists", v.replace(/[^0-9]/g, ""))}
            placeholder="0"
            placeholderTextColor={theme.textMuted}
            maxLength={2}
          />
        </View>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameBlock: { flex: 1, gap: 2 },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
  },
  overall: {
    fontSize: 12,
    color: theme.textMuted,
  },
  mvpBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  mvpBtnActive: {
    backgroundColor: "#FFF3E0",
    borderColor: theme.primary,
  },
  mvpText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textMuted,
  },
  mvpTextActive: {
    color: theme.primary,
  },
  section: { gap: 6 },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingNum: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.textSecondary,
    minWidth: 36,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputs: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: { flex: 1, gap: 6 },
  input: {
    backgroundColor: theme.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: theme.text,
    textAlign: "center",
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RateMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Ratings keyed by player._id
  const [ratings, setRatings] = useState<Record<string, PlayerRating>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function fetchMatch() {
        setIsLoading(true);
        try {
          const data = await getMatch(id);
          if (!active) return;
          setMatch(data);

          // Initialise empty ratings for all players
          const init: Record<string, PlayerRating> = {};
          data.players.forEach((p) => {
            init[p._id] = { stars: 0, goals: "", assists: "", mvp: false };
          });
          setRatings(init);
        } catch {
          if (active) Alert.alert("Erro", "Não foi possível carregar a partida.");
        } finally {
          if (active) setIsLoading(false);
        }
      }

      fetchMatch();
      return () => { active = false; };
    }, [id])
  );

  function updateRating(
    playerId: string,
    field: keyof PlayerRating,
    value: string | number | boolean
  ) {
    setRatings((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }));
  }

  function toggleMvp(playerId: string) {
    setMvpId((prev) => (prev === playerId ? null : playerId));
  }

  async function handleSave() {
    if (!match) return;

    const rated = Object.entries(ratings).filter(([, r]) => r.stars > 0);
    if (rated.length === 0) {
      Alert.alert("Atenção", "Avalie pelo menos um jogador antes de salvar.");
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        rated.map(([playerId, r]) =>
          ratePlayer(match._id, {
            playerId,
            rating: r.stars * 2,       // 1–5 stars → 2–10 points
            goals:   parseInt(r.goals   || "0", 10),
            assists: parseInt(r.assists || "0", 10),
            mvp:    playerId === mvpId,
          })
        )
      );

      Alert.alert("", "Avaliações salvas com sucesso!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as avaliações.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Partida não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratedCount = Object.values(ratings).filter((r) => r.stars > 0).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avaliar Jogadores</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.matchTitle}>{match.title}</Text>
        <Text style={styles.hint}>
          Toque nas estrelas para dar uma nota. Gols e assists são opcionais.
        </Text>

        {match.players.map((player) => (
          <PlayerRatingRow
            key={player._id}
            player={player}
            rating={ratings[player._id] ?? { stars: 0, goals: "", assists: "", mvp: false }}
            isMvpSelected={mvpId === player._id}
            onChange={(field, value) => updateRating(player._id, field, value)}
            onToggleMvp={() => toggleMvp(player._id)}
          />
        ))}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {ratedCount > 0 && (
          <Text style={styles.footerHint}>
            {ratedCount} jogador{ratedCount !== 1 ? "es" : ""} avaliado{ratedCount !== 1 ? "s" : ""}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Salvar avaliações</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 56,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: theme.textSecondary,
    fontSize: 16,
  },
  backButton: {
    backgroundColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  backButtonText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 4,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  backArrow: {
    color: theme.primary,
    fontSize: 22,
  },
  backLabel: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.text,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  matchTitle: {
    fontSize: 15,
    color: theme.textSecondary,
    marginBottom: 4,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },
  spacer: { height: 16 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.background,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 8,
  },
  footerHint: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 50,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: theme.disabled,
  },
  saveButtonText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 16,
  },
});
