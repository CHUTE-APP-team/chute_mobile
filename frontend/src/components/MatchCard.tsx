import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { router } from "expo-router";
import axios from "axios";
import { Match, joinMatch } from "../services/matchService";
import { colors } from "../theme/colors";

const theme = colors;

interface Props {
  match: Match;
  userId: string | undefined;
  /** Called after a successful join so the parent can sync its list. */
  onJoin?: (updated: Match) => void;
}

export default function MatchCard({ match, userId, onJoin }: Props) {
  const [isJoining, setIsJoining] = useState(false);
  const [localPlayers, setLocalPlayers] = useState<string[]>(match.players);
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Keep local players in sync with parent's list, but never overwrite
  // an in-flight optimistic update.
  useEffect(() => {
    if (!isJoining) {
      setLocalPlayers(match.players);
    }
  }, [match.players]);

  const playersCount = localPlayers.length;
  const spotsLeft = match.maxPlayers - playersCount;
  const isFull = spotsLeft <= 0;
  const isJoined = userId ? localPlayers.includes(userId) : false;
  const joinDisabled = isFull || isJoined || isJoining;

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function bounceButton() {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }

  async function handleJoin() {
    if (joinDisabled || !userId) return;

    // ── Optimistic update ──────────────────────────────────────────
    setLocalPlayers((prev) => [...prev, userId]);
    setIsJoining(true);

    try {
      const updated = await joinMatch(match._id);
      // Reconcile with server truth
      setLocalPlayers(updated.players);
      bounceButton();
      onJoin?.(updated);
    } catch (err) {
      // Revert on failure
      setLocalPlayers(match.players);
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Erro ao entrar na partida.";
      Alert.alert("Erro", message);
    } finally {
      setIsJoining(false);
    }
  }

  // ── Derive button appearance ─────────────────────────────────────
  type ButtonVariant = "default" | "joining" | "joined" | "full";
  const variant: ButtonVariant = isJoining
    ? "joining"
    : isJoined
    ? "joined"
    : isFull
    ? "full"
    : "default";

  const buttonLabel: Record<ButtonVariant, string> = {
    default: "Entrar",
    joining: "Entrando...",
    joined: "Você está dentro ✓",
    full: "Lotado",
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/match/${match._id}` as any)}
      activeOpacity={0.88}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.cardIcon}>⚽</Text>
        <Text style={styles.title} numberOfLines={1}>
          {match.title}
        </Text>
        <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeOpen]}>
          <Text
            style={[
              styles.badgeText,
              isFull ? styles.badgeTextFull : styles.badgeTextOpen,
            ]}
          >
            {isFull ? "Lotado" : `${spotsLeft} vagas`}
          </Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>📍</Text>
        <Text style={styles.infoText} numberOfLines={1}>
          {match.location}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>🕐</Text>
        <Text style={styles.infoText}>{formatDate(match.date)}</Text>
      </View>

      {/* Players progress bar */}
      <View style={styles.playersRow}>
        <Text style={styles.infoIcon}>👥</Text>
        <Text style={styles.playersText}>
          {playersCount} / {match.maxPlayers} jogadores
        </Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(
                  (playersCount / match.maxPlayers) * 100,
                  100
                )}%` as any,
                backgroundColor: isFull ? theme.disabled : theme.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* CTA button */}
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          style={[
            styles.button,
            variant === "joined" && styles.buttonJoined,
            (variant === "full" || variant === "joining") &&
              styles.buttonDisabled,
          ]}
          onPress={(e) => {
            e.stopPropagation?.();
            handleJoin();
          }}
          disabled={joinDisabled}
          activeOpacity={0.8}
        >
          {variant === "joining" ? (
            <ActivityIndicator color={theme.textOnPrimary} size="small" />
          ) : (
            <Text
              style={[
                styles.buttonText,
                variant === "joined" && styles.buttonTextJoined,
                (variant === "full" || variant === "joining") &&
                  styles.buttonTextDisabled,
              ]}
            >
              {buttonLabel[variant]}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },

  // ─── Header ───────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  cardIcon: { fontSize: 18 },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
  },
  badge: {
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeOpen: {
    backgroundColor: "#FFF0E6",
    borderWidth: 1,
    borderColor: theme.primary,
  },
  badgeFull: { backgroundColor: theme.border },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeTextOpen: { color: theme.primary },
  badgeTextFull: { color: theme.disabledText },

  // ─── Info rows ────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 7,
  },
  infoIcon: { fontSize: 14, width: 20 },
  infoText: { fontSize: 13, color: theme.textSecondary, flex: 1 },

  // ─── Players bar ─────────────────────────────────────────────────
  playersRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
    gap: 7,
  },
  playersText: {
    fontSize: 13,
    color: theme.textSecondary,
    minWidth: 110,
  },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },

  // ─── Button ───────────────────────────────────────────────────────
  button: {
    backgroundColor: theme.primary,
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonJoined: {
    backgroundColor: "#2D9C4A",
  },
  buttonDisabled: {
    backgroundColor: theme.border,
  },
  buttonText: {
    color: theme.textOnPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  buttonTextJoined: {
    color: "#fff",
  },
  buttonTextDisabled: {
    color: theme.disabledText,
  },
});
