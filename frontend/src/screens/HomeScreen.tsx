import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
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

export default function HomeScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

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

  // ─── Join ────────────────────────────────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Greeting */}
      <Text style={styles.greeting}>
        {user?.name ? `Olá, ${user.name} 👋` : "Olá ⚽"}
      </Text>

      <Text style={styles.sectionLabel}>Partidas disponíveis</Text>

      {/* Initial loading */}
      {isLoading ? (
        <ActivityIndicator
          color={theme.primary}
          size="large"
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={matches}
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
            <View style={styles.emptyContainer}>
              {/* Swap the emoji block below for an Image when player.png is available:
                  <Image source={require("../../assets/images/player.png")}
                    style={styles.playerImage} resizeMode="contain" /> */}
              <View style={styles.playerIllustration}>
                <Text style={styles.playerEmoji}>🧍</Text>
                <Text style={styles.ballEmoji}>⚽</Text>
              </View>
              <Text style={styles.emptyTitle}>Nenhuma partida ainda</Text>
              <Text style={styles.emptySubtitle}>
                Crie ou entre na próxima pelada ⚽
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/create-match")}
              >
                <Text style={styles.emptyButtonText}>+ Organizar partida</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              userId={user?.id}
              isJoining={joiningId === item._id}
              onJoin={handleJoin}
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
    paddingHorizontal: 16,
  },

  // ─── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 18,
    color: theme.text,
    fontWeight: "600",
    marginBottom: 16,
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

  // ─── Section label ────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 2,
  },

  // ─── List ────────────────────────────────────────────────────────
  loader: {
    marginTop: 48,
  },
  list: {
    paddingBottom: 32,
  },

  // ─── Empty state ─────────────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    marginTop: 48,
    gap: 10,
  },
  playerIllustration: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  playerEmoji: {
    fontSize: 72,
    lineHeight: 80,
  },
  ballEmoji: {
    fontSize: 32,
    lineHeight: 40,
    marginLeft: -8,
    marginBottom: 4,
  },
  // Uncomment when player.png is available:
  // playerImage: { width: 160, height: 160, marginBottom: 8 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 8,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 50,
  },
  emptyButtonText: {
    color: theme.textOnPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
});
