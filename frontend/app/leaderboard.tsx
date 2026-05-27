import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../src/context/AuthContext";
import { getRanking, RankingEntry } from "../src/services/leaderboardService";
import { colors } from "../src/theme/colors";

const theme = colors;

// ─── Top-3 accent palette ─────────────────────────────────────────────────────

const TOP3: Record<number, { bg: string; border: string; label: string }> = {
  1: { bg: "#FFF8E1", border: "#FFD700", label: "🥇" },
  2: { bg: "#F5F5F5", border: "#A8A8A8", label: "🥈" },
  3: { bg: "#FBF0E8", border: "#CD7F32", label: "🥉" },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[sk.row, { opacity }]}>
      <View style={sk.pos} />
      <View style={sk.nameBlock}>
        <View style={sk.nameLine} />
        <View style={sk.subLine} />
      </View>
      <View style={sk.overall} />
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pos:       { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.borderWarm },
  nameBlock: { flex: 1, gap: 6 },
  nameLine:  { height: 13, width: "60%", borderRadius: 6, backgroundColor: theme.borderWarm },
  subLine:   { height: 10, width: "40%", borderRadius: 5, backgroundColor: theme.borderWarm },
  overall:   { width: 40, height: 40, borderRadius: 8, backgroundColor: theme.borderWarm },
});

function RankingSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
    </View>
  );
}

// ─── Ranking Row ──────────────────────────────────────────────────────────────

function RankingRow({
  entry,
  isCurrentUser,
}: {
  entry: RankingEntry;
  isCurrentUser: boolean;
}) {
  const top3     = TOP3[entry.position];
  const isTop3   = !!top3;

  const rowStyle = [
    styles.row,
    isTop3   && { backgroundColor: top3.bg, borderColor: top3.border },
    isCurrentUser && styles.rowMe,
  ];

  return (
    <View style={rowStyle}>
      {/* Position badge */}
      <View style={styles.posBadge}>
        {isTop3 ? (
          <Text style={styles.medal}>{top3.label}</Text>
        ) : (
          <Text style={[styles.posText, isCurrentUser && { color: theme.primary }]}>
            #{entry.position}
          </Text>
        )}
      </View>

      {/* Name block */}
      <View style={styles.nameBlock}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, isTop3 && styles.nameTop3, isCurrentUser && styles.nameMe]}
            numberOfLines={1}
          >
            {entry.name}
          </Text>
          {isCurrentUser && <View style={styles.youBadge}><Text style={styles.youText}>você</Text></View>}
        </View>

        <Text style={styles.subStats}>
          {entry.totalMatches > 0
            ? `${entry.totalMatches} partida${entry.totalMatches !== 1 ? "s" : ""}  •  nota ${entry.averageRating.toFixed(1)}`
            : "Sem partidas avaliadas"}
        </Text>
      </View>

      {/* Stars */}
      <View style={[styles.overallBox, isTop3 && { borderColor: top3.border }]}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Text key={s} style={{ fontSize: 11, color: (entry.stars ?? 3) >= s ? '#FFB800' : '#CCCCCC' }}>★</Text>
          ))}
        </View>
        <Text style={styles.overallLabel}>{(entry.stars ?? 3).toFixed(1)}★</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [entries, setEntries]       = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const [page, setPage]             = useState(1);

  const myPosition = entries.find((e) => e._id === user?.id)?.position ?? null;

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchPage(pageNum: number, replace: boolean) {
    try {
      const data = await getRanking(pageNum, PAGE_SIZE);
      setEntries((prev) => replace ? data.ranking : [...prev, ...data.ranking]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o ranking.");
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchPage(1, true).finally(() => setIsLoading(false));
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchPage(1, true);
    setIsRefreshing(false);
  }

  async function handleLoadMore() {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    await fetchPage(page + 1, false);
    setIsLoadingMore(false);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Fixed header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Ranking Global</Text>
        {myPosition !== null && (
          <View style={styles.myPosPill}>
            <Text style={styles.myPosText}>Você: #{myPosition}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <RankingSkeleton />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item._id.toString()}
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                color={theme.primary}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum jogador ainda.</Text>
          }
          renderItem={({ item }) => (
            <RankingRow
              entry={item}
              isCurrentUser={item._id.toString() === user?.id}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 56,
  },

  // ─── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.text,
  },
  myPosPill: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  myPosText: {
    color: theme.textOnPrimary,
    fontWeight: "700",
    fontSize: 13,
  },

  // ─── List ──────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  empty: {
    textAlign: "center",
    marginTop: 48,
    color: theme.textMuted,
    fontSize: 15,
  },

  // ─── Row ───────────────────────────────────────────────────────────
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
  rowMe: {
    borderColor: theme.primary,
    backgroundColor: "#FFF3E6",
  },

  // ─── Position ──────────────────────────────────────────────────────
  posBadge: {
    width: 36,
    alignItems: "center",
  },
  medal: {
    fontSize: 24,
  },
  posText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textMuted,
  },

  // ─── Name block ────────────────────────────────────────────────────
  nameBlock: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    flexShrink: 1,
  },
  nameTop3: {
    fontWeight: "800",
  },
  nameMe: {
    color: theme.primary,
  },
  youBadge: {
    backgroundColor: theme.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youText: {
    color: theme.textOnPrimary,
    fontSize: 10,
    fontWeight: "700",
  },
  subStats: {
    fontSize: 12,
    color: theme.textMuted,
  },

  // ─── Overall box ───────────────────────────────────────────────────
  overallBox: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  starsRow: {
    flexDirection: "row",
    gap: 1,
  },
  overallLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.textMuted,
    letterSpacing: 0.3,
  },
});
