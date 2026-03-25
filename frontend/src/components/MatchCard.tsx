import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Match } from "../services/matchService";
import { colors } from "../theme/colors";

const theme = colors;

interface Props {
  match: Match;
  userId: string | undefined;
  isJoining: boolean;
  onJoin: (matchId: string) => void;
}

export default function MatchCard({ match, userId, isJoining, onJoin }: Props) {
  const playersCount = match.players.length;
  const spotsLeft = match.maxPlayers - playersCount;
  const isFull = spotsLeft <= 0;
  const isJoined = userId ? match.players.includes(userId) : false;

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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/match/${match._id}` as any)}
      activeOpacity={0.88}
    >
      {/* Header row: ball icon + title + status badge */}
      <View style={styles.headerRow}>
        <Text style={styles.cardIcon}>⚽</Text>
        <Text style={styles.title} numberOfLines={1}>{match.title}</Text>
        <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeOpen]}>
          <Text style={[styles.badgeText, isFull ? styles.badgeTextFull : styles.badgeTextOpen]}>
            {isFull ? "Lotado" : `${spotsLeft} vagas`}
          </Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>📍</Text>
        <Text style={styles.infoText} numberOfLines={1}>{match.location}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>🕐</Text>
        <Text style={styles.infoText}>{formatDate(match.date)}</Text>
      </View>

      {/* Players bar */}
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
                width: `${Math.min((playersCount / match.maxPlayers) * 100, 100)}%` as any,
                backgroundColor: isFull ? theme.disabled : theme.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* CTA button */}
      <TouchableOpacity
        style={[styles.button, joinDisabled && styles.buttonDisabled]}
        onPress={(e) => {
          e.stopPropagation?.();
          onJoin(match._id);
        }}
        disabled={joinDisabled}
        activeOpacity={0.8}
      >
        {isJoining ? (
          <ActivityIndicator color={theme.textOnPrimary} size="small" />
        ) : (
          <Text style={[styles.buttonText, joinDisabled && styles.buttonTextDisabled]}>
            {isJoined ? "✓ Você já entrou" : isFull ? "Lotado" : "Entrar"}
          </Text>
        )}
      </TouchableOpacity>
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
  cardIcon: {
    fontSize: 18,
  },
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
  badgeFull: {
    backgroundColor: theme.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextOpen: {
    color: theme.primary,
  },
  badgeTextFull: {
    color: theme.disabledText,
  },

  // ─── Info rows ────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 7,
  },
  infoIcon: {
    fontSize: 14,
    width: 20,
  },
  infoText: {
    fontSize: 13,
    color: theme.textSecondary,
    flex: 1,
  },

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
  barFill: {
    height: 4,
    borderRadius: 2,
  },

  // ─── Button ───────────────────────────────────────────────────────
  button: {
    backgroundColor: theme.primary,
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: theme.border,
  },
  buttonText: {
    color: theme.textOnPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  buttonTextDisabled: {
    color: theme.disabledText,
  },
});
