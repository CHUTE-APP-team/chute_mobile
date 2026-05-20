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
import { useAuth } from "@/src/context/AuthContext";
import { getMatches, joinMatch, Match } from "@/src/services/matchService";
import { getMyTeams, Team } from "@/src/services/teamService";
import { colors } from "@/src/theme/colors";
import MatchCard from "@/src/components/MatchCard";
import Logo from "@/src/components/Logo";
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
            <Text style={[hero.buttonText, joinDisabled && hero.buttonTextJoined]}>
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
  info: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 4 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    gap: 12,
  },
  spotsText: { color: "#fff", fontWeight: "700", fontSize: 15, flex: 1 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: "center",
  },
  buttonJoined: { backgroundColor: "rgba(255,255,255,0.3)" },
  buttonText: { color: theme.primary, fontWeight: "800", fontSize: 14 },
  buttonTextJoined: { color: "rgba(255,255,255,0.9)" },
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
  container: { alignItems: "center", marginTop: 48, gap: 10 },
  illustration: { flexDirection: "row", alignItems: "flex-end", marginBottom: 8 },
  playerEmoji: { fontSize: 72, lineHeight: 80 },
  ballEmoji: { fontSize: 32, lineHeight: 40, marginLeft: -8, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "700", color: theme.text, textAlign: "center" },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginBottom: 8, textAlign: "center" },
  button: { marginTop: 8, backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 50 },
  buttonText: { color: theme.textOnPrimary, fontWeight: "700", fontSize: 14 },
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
  const [teams, setTeams]     = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function fetchAll(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const [matchData, teamData] = await Promise.all([getMatches(), getMyTeams()]);
      setMatches(Array.isArray(matchData) ? matchData : []);
      setTeams(Array.isArray(teamData) ? teamData : []);
    } catch (err) {
      console.error("[HomeScreen] failed to fetch:", err);
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  function handleRefresh() {
    setIsRefreshing(true);
    fetchAll(true);
  }

  async function handleJoin(matchId: string) {
    setJoiningId(matchId);
    try {
      const updated = await joinMatch(matchId);
      setMatches((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
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

  function handleMatchJoined(updated: Match) {
    setMatches((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  }

  const { heroMatch, upcomingMatches, almostFullMatches } = useMemo(() => {
    const open = matches.filter((m) => m.maxPlayers - m.players.length > 0);
    const heroMatch =
      open.length > 0
        ? [...open].sort((a, b) => a.maxPlayers - a.players.length - (b.maxPlayers - b.players.length))[0]
        : null;
    const heroId = heroMatch?._id;
    const upcomingMatches = open
      .filter((m) => m._id !== heroId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
    const almostFullMatches = open.filter(
      (m) => m._id !== heroId && m.maxPlayers - m.players.length <= 3
    );
    return { heroMatch, upcomingMatches, almostFullMatches };
  }, [matches]);

  const greeting = user?.name ? `Olá, ${user.name} 👋` : "Olá ⚽";
  const refreshControl = (
    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Logo size="small" />
        <TouchableOpacity style={styles.createButton} onPress={() => router.push("/create-match")} activeOpacity={0.85}>
          <Text style={styles.createButtonText}>+ Organizar</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.greeting}>{greeting}</Text>
          <HomeSkeleton />
        </ScrollView>
      ) : matches.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
          <Text style={styles.greeting}>{greeting}</Text>
          <EmptyState />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={refreshControl} nestedScrollEnabled>
          <Text style={styles.greeting}>{greeting}</Text>

          {heroMatch && (
            <HeroCard match={heroMatch} userId={user?.id} isJoining={joiningId === heroMatch._id} onJoin={handleJoin} />
          )}

          {/* ── Seus times ─────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <SectionHeader label="Seus times" />
              <TouchableOpacity onPress={() => router.push("/(tabs)/teams")} activeOpacity={0.7}>
                <Text style={styles.seeAll}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {teams.length === 0 ? (
              <TouchableOpacity style={styles.emptyTeamsCard} onPress={() => router.push("/(tabs)/teams")} activeOpacity={0.8}>
                <Text style={styles.emptyTeamsText}>👥 Crie ou entre em um time</Text>
              </TouchableOpacity>
            ) : (
              <FlatList
                horizontal
                data={teams}
                keyExtractor={(t) => t._id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.teamChip}
                    onPress={() => router.push(`/team/${item._id}` as any)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.teamChipName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.teamChipMeta}>
                      {item.members.length} {item.members.length === 1 ? "membro" : "membros"}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>

          {/* ── Suas estatísticas ──────────────────────────────── */}
          {user && (
            <View style={styles.section}>
              <SectionHeader label="Suas estatísticas" />
              <View style={styles.statsGrid}>
                <StatCard label="Overall" value={String(user.overall ?? 70)} icon="⚡" />
                <StatCard label="Partidas" value={String(user.totalMatches ?? 0)} icon="⚽" />
                <StatCard label={`Nível ${user.level ?? 1}`} value={`${user.xp ?? 0} XP`} icon="🏅" />
              </View>
            </View>
          )}

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
                    <MatchCard match={item} userId={user?.id} onJoin={handleMatchJoined} />
                  </View>
                )}
              />
            </View>
          )}

          {almostFullMatches.length > 0 && (
            <View style={styles.section}>
              <SectionHeader label="🔥 Quase lotando" />
              {almostFullMatches.map((item) => (
                <MatchCard key={item._id} match={item} userId={user?.id} onJoin={handleMatchJoined} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={stat.card}>
      <Text style={stat.icon}>{icon}</Text>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  card:  { flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: theme.border, gap: 4 },
  icon:  { fontSize: 20 },
  value: { fontSize: 18, fontWeight: "800", color: theme.text },
  label: { fontSize: 11, color: theme.textMuted, fontWeight: "600", textAlign: "center" },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background, paddingTop: 56 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 4 },
  greeting: { fontSize: 18, color: theme.text, fontWeight: "600", marginBottom: 20 },
  createButton: { backgroundColor: theme.primary, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 50 },
  createButtonText: { color: theme.textOnPrimary, fontWeight: "bold", fontSize: 13 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  section: { marginBottom: 16 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seeAll: { fontSize: 12, color: theme.primary, fontWeight: "600", marginBottom: 12 },
  hList: { paddingRight: 4 },
  hCard: { width: 280, marginRight: 12 },
  // Teams
  emptyTeamsCard: { backgroundColor: theme.card, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: theme.border, borderStyle: "dashed" },
  emptyTeamsText: { fontSize: 14, color: theme.textMuted, fontWeight: "600" },
  teamChip: { backgroundColor: theme.card, borderRadius: 14, padding: 14, marginRight: 10, borderWidth: 1, borderColor: theme.border, minWidth: 120, maxWidth: 160 },
  teamChipName: { fontSize: 14, fontWeight: "700", color: theme.text, marginBottom: 4 },
  teamChipMeta: { fontSize: 11, color: theme.textMuted },
  // Stats
  statsGrid: { flexDirection: "row", gap: 10 },
});
