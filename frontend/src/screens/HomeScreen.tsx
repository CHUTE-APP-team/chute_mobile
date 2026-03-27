import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getMatches, joinMatch, Match } from "../services/matchService";
import { colors } from "../theme/colors";
import MatchCard from "../components/MatchCard";
import Logo from "../components/Logo";
import axios from "axios";

const theme = colors;

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBox({
  width,
  height,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: theme.borderWarm,
          borderRadius: 12,
          opacity,
        },
        style,
      ]}
    />
  );
}

function HomeSkeleton() {
  return (
    <View>
      <SkeletonBox width="100%" height={168} style={sk.hero} />
      <SkeletonBox width={140} height={13} style={sk.label} />
      <View style={sk.row}>
        <SkeletonBox width={240} height={148} style={sk.hCard} />
        <SkeletonBox width={240} height={148} style={sk.hCard} />
      </View>
      <SkeletonBox width={120} height={13} style={sk.label2} />
      <SkeletonBox width="100%" height={114} style={sk.vCard} />
      <SkeletonBox width="100%" height={114} style={sk.vCard} />
    </View>
  );
}

const sk = StyleSheet.create({
  hero: { borderRadius: 20, marginBottom: 28 },
  label: { marginBottom: 12 },
  row: { flexDirection: "row", marginBottom: 0 },
  hCard: { borderRadius: 16, marginRight: 12 },
  label2: { marginTop: 28, marginBottom: 12 },
  vCard: { borderRadius: 16, marginBottom: 12 },
});

// ─── Hero Card ────────────────────────────────────────────────────────────────

interface HeroCardProps {
  match: Match;
  userId: string | undefined;
  isJoining: boolean;
  onJoin: (matchId: string) => void;
}

function HeroCard({ match, userId, isJoining, onJoin }: HeroCardProps) {
  const spotsLeft = match.maxPlayers - match.players.length;
  const isJoined = userId ? match.players.includes(userId) : false;
  const joinDisabled = isJoined || isJoining;

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <TouchableOpacity
      style={hero.card}
      onPress={() => router.push(`/match/${match._id}` as any)}
      activeOpacity={0.88}
    >
      <View style={hero.tag}>
        <Text style={hero.tagText}>🔥 Destaque</Text>
      </View>

      <Text style={hero.title} numberOfLines={2}>
        {match.title}
      </Text>

      <Text style={hero.info}>📍 {match.location}</Text>
      <Text style={hero.info}>🕐 {formatDate(match.date)}</Text>

      <View style={hero.footer}>
        <Text style={hero.spotsText}>
          {isJoined
            ? "✓ Você já entrou"
            : `Faltam ${spotsLeft} vaga${spotsLeft !== 1 ? "s" : ""}`}
        </Text>
        <TouchableOpacity
          style={[hero.button, joinDisabled && hero.buttonJoined]}
          onPress={(e) => {
            e.stopPropagation?.();
            onJoin(match._id);
          }}
          disabled={joinDisabled}
          activeOpacity={0.8}
        >
          {isJoining ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <Text
              style={[
                hero.buttonText,
                joinDisabled && hero.buttonTextJoined,
              ]}
            >
              {isJoined ? "Entrou" : "Entrar agora"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const hero = StyleSheet.create({
  card: {
    backgroundColor: theme.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  tagText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
    lineHeight: 28,
  },
  info: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginBottom: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    gap: 12,
  },
  spotsText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
  },
  button: {
    backgroundColor: "#fff",
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: "center",
  },
  buttonJoined: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  buttonText: {
    color: theme.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  buttonTextJoined: {
    color: "rgba(255,255,255,0.9)",
  },
});

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={empty.container}>
      <View style={empty.illustration}>
        <Text style={empty.playerEmoji}>🧍</Text>
        <Text style={empty.ballEmoji}>⚽</Text>
      </View>
      <Text style={empty.title}>Nenhuma partida ainda</Text>
      <Text style={empty.subtitle}>Crie ou entre na próxima pelada ⚽</Text>
      <TouchableOpacity
        style={empty.button}
        onPress={() => router.push("/create-match")}
      >
        <Text style={empty.buttonText}>+ Organizar partida</Text>
      </TouchableOpacity>
    </View>
  );
}

const empty = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 48,
    gap: 10,
  },
  illustration: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  playerEmoji: { fontSize: 72, lineHeight: 80 },
  ballEmoji: {
    fontSize: 32,
    lineHeight: 40,
    marginLeft: -8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 50,
  },
  buttonText: {
    color: theme.textOnPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={sec.label}>{label}</Text>;
}

const sec = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 2,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  async function fetchMatches(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const data = await getMatches();
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[HomeScreen] failed to fetch matches:", err);
      Alert.alert("Erro", "Não foi possível carregar as partidas.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  function handleRefresh() {
    setIsRefreshing(true);
    fetchMatches(true);
  }

  // ─── Join ──────────────────────────────────────────────────────────────────

  async function handleJoin(matchId: string) {
    setJoiningId(matchId);
    try {
      const updated = await joinMatch(matchId);
      setMatches((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m))
      );
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Erro ao entrar na partida.";
      Alert.alert("Erro", message);
    } finally {
      setJoiningId(null);
    }
  }

  // ─── Derived lists ────────────────────────────────────────────────────────

  const { heroMatch, upcomingMatches, almostFullMatches } = useMemo(() => {
    const open = matches.filter((m) => m.maxPlayers - m.players.length > 0);

    // Hero: open match with fewest spots remaining (most in-demand)
    const heroMatch =
      open.length > 0
        ? [...open].sort(
            (a, b) =>
              a.maxPlayers - a.players.length - (b.maxPlayers - b.players.length)
          )[0]
        : null;

    const heroId = heroMatch?._id;

    // Upcoming: date ASC, excluding hero, max 5
    const upcomingMatches = open
      .filter((m) => m._id !== heroId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    // Almost full: spotsLeft 1–3, excluding hero
    const almostFullMatches = open.filter(
      (m) => m._id !== heroId && m.maxPlayers - m.players.length <= 3
    );

    return { heroMatch, upcomingMatches, almostFullMatches };
  }, [matches]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const greeting = user?.name ? `Olá, ${user.name} 👋` : "Olá ⚽";

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      tintColor={theme.primary}
      colors={[theme.primary]}
    />
  );

  return (
    <View style={styles.screen}>
      {/* Fixed header — always visible */}
      <View style={styles.header}>
        <Logo size="small" />
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/create-match")}
          activeOpacity={0.85}
        >
          <Text style={styles.createButtonText}>+ Organizar</Text>
        </TouchableOpacity>
      </View>

      {/* Loading skeleton */}
      {isLoading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Text style={styles.greeting}>{greeting}</Text>
          <HomeSkeleton />
        </ScrollView>
      ) : matches.length === 0 ? (
        /* Empty state */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={refreshControl}
        >
          <Text style={styles.greeting}>{greeting}</Text>
          <EmptyState />
        </ScrollView>
      ) : (
        /* Smart feed */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={refreshControl}
          nestedScrollEnabled
        >
          <Text style={styles.greeting}>{greeting}</Text>

          {/* Hero */}
          {heroMatch && (
            <HeroCard
              match={heroMatch}
              userId={user?.id}
              isJoining={joiningId === heroMatch._id}
              onJoin={handleJoin}
            />
          )}

          {/* Próximas partidas — horizontal scroll */}
          {upcomingMatches.length > 0 && (
            <View style={styles.section}>
              <SectionHeader label="Próximas partidas" />
              <FlatList
                horizontal
                data={upcomingMatches}
                keyExtractor={(item) => item._id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                scrollEnabled
                renderItem={({ item }) => (
                  <View style={styles.hCard}>
                    <MatchCard
                      match={item}
                      userId={user?.id}
                      isJoining={joiningId === item._id}
                      onJoin={handleJoin}
                    />
                  </View>
                )}
              />
            </View>
          )}

          {/* Quase lotando — vertical */}
          {almostFullMatches.length > 0 && (
            <View style={styles.section}>
              <SectionHeader label="🔥 Quase lotando" />
              {almostFullMatches.map((item) => (
                <MatchCard
                  key={item._id}
                  match={item}
                  userId={user?.id}
                  isJoining={joiningId === item._id}
                  onJoin={handleJoin}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 56,
  },

  // ─── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 18,
    color: theme.text,
    fontWeight: "600",
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: theme.primary,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 50,
  },
  createButtonText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 13,
  },

  // ─── Scroll ────────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // ─── Sections ──────────────────────────────────────────────────
  section: {
    marginBottom: 8,
  },
  hList: {
    paddingRight: 4,
  },
  hCard: {
    width: 280,
    marginRight: 12,
  },
});
