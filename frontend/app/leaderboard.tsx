import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { getLeaderboard, LeaderboardEntry } from "../src/services/leaderboardService";
import { colors } from "../src/theme/colors";
import { Rank } from "../src/services/userService";

const theme = colors;

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITION_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const RANK_COLOR: Record<Rank, string> = {
  Bronze: "#CD7F32",
  Prata:  "#A8A8A8",
  Ouro:   "#FFD700",
  Elite:  "#FF6A00",
};

// ─── Row ──────────────────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const medal = POSITION_MEDAL[entry.position];
  const rankColor = RANK_COLOR[entry.rank];
  const isTop3 = entry.position <= 3;

  return (
    <View
      style={[
        styles.row,
        isTop3 && styles.rowTop3,
        isCurrentUser && styles.rowCurrentUser,
      ]}
    >
      {/* Position */}
      <View style={styles.positionCell}>
        {medal ? (
          <Text style={styles.medal}>{medal}</Text>
        ) : (
          <Text style={[styles.positionText, isCurrentUser && styles.positionTextHighlight]}>
            #{entry.position}
          </Text>
        )}
      </View>

      {/* Name + rank badge */}
      <View style={styles.nameCell}>
        <Text
          style={[styles.name, isTop3 && styles.nameTop3, isCurrentUser && styles.nameHighlight]}
          numberOfLines={1}
        >
          {entry.name}
          {isCurrentUser ? "  (você)" : ""}
        </Text>
        <View style={[styles.rankPill, { borderColor: rankColor }]}>
          <Text style={[styles.rankPillText, { color: rankColor }]}>{entry.rank}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsCell}>
        <Text style={[styles.statMain, isCurrentUser && styles.statMainHighlight]}>
          {entry.xp} XP
        </Text>
        <Text style={styles.statSub}>Lv {entry.level}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getLeaderboard();
      setEntries(data);
    } catch (err) {
      console.error("[Leaderboard] failed to fetch:", err);
      Alert.alert("Erro", "Não foi possível carregar o ranking.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load on mount
  useState(() => { fetchLeaderboard(); });

  function handleRefresh() {
    setIsRefreshing(true);
    fetchLeaderboard(true);
  }

  const currentUserPosition = entries.find((e) => e._id === user?.id)?.position ?? null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ranking Global</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* "Você está em #X" banner */}
      {currentUserPosition !== null && (
        <View style={styles.myPositionBanner}>
          <Text style={styles.myPositionText}>
            🎯 Você está em #{currentUserPosition} do ranking
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum jogador ainda.</Text>
          }
          renderItem={({ item }) => (
            <LeaderboardRow
              entry={item}
              isCurrentUser={item._id === user?.id}
            />
          )}
        />
      )}
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
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backRow: {
    width: 32,
    alignItems: "flex-start",
  },
  backArrow: {
    color: theme.primary,
    fontSize: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.text,
  },
  myPositionBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  myPositionText: {
    color: theme.textOnPrimary,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  empty: {
    textAlign: "center",
    marginTop: 48,
    color: theme.textMuted,
    fontSize: 15,
  },
  // ─── Row ─────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  rowTop3: {
    borderColor: theme.borderWarm,
    backgroundColor: "#FFFAF5",
  },
  rowCurrentUser: {
    borderColor: theme.primary,
    backgroundColor: "#FFF3E6",
  },
  positionCell: {
    width: 36,
    alignItems: "center",
  },
  medal: {
    fontSize: 22,
  },
  positionText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.textMuted,
  },
  positionTextHighlight: {
    color: theme.primary,
  },
  nameCell: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
  },
  nameTop3: {
    fontWeight: "800",
  },
  nameHighlight: {
    color: theme.primary,
  },
  rankPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statsCell: {
    alignItems: "flex-end",
    gap: 2,
  },
  statMain: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
  },
  statMainHighlight: {
    color: theme.primary,
  },
  statSub: {
    fontSize: 12,
    color: theme.textMuted,
  },
});
