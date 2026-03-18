import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getMatches, joinMatch, Match } from "../services/matchService";
import { getRoleGreeting } from "../utils/roleUtils";
import { colors } from "../theme/colors";
import axios from "axios";

const theme = colors;

export default function HomeScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function fetchMatches() {
        setIsLoading(true);
        try {
          const data = await getMatches();
          if (active) setMatches(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("[HomeScreen] failed to fetch matches:", err);
          if (active) Alert.alert("Erro", "Não foi possível carregar as partidas.");
        } finally {
          if (active) setIsLoading(false);
        }
      }

      fetchMatches();
      return () => { active = false; };
    }, [])
  );

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

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isAlreadyJoined(match: Match) {
    return user ? match.players.includes(user.id) : false;
  }

  function isFull(match: Match) {
    return match.players.length >= match.maxPlayers;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{user ? getRoleGreeting(user.role) : "Olá ⚽"}</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/create-match")}
        >
          <Text style={styles.createButtonText}>+ Organizar</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhuma partida disponível.</Text>
          }
          renderItem={({ item }) => {
            const joined = isAlreadyJoined(item);
            const full = isFull(item);
            const isJoining = joiningId === item._id;

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/match/${item._id}` as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardInfo}>📍 {item.location}</Text>
                <Text style={styles.cardInfo}>🕐 {formatDate(item.date)}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPlayers}>
                    👥 {item.players.length}/{item.maxPlayers} jogadores
                  </Text>
                  {full && <View style={styles.fullBadge}><Text style={styles.fullBadgeText}>Cheia</Text></View>}
                </View>

                <TouchableOpacity
                  style={[styles.joinButton, (joined || full) && styles.joinButtonDisabled]}
                  onPress={(e) => { e.stopPropagation?.(); handleJoin(item._id); }}
                  disabled={joined || full || isJoining}
                >
                  {isJoining ? (
                    <ActivityIndicator color={theme.textOnPrimary} />
                  ) : (
                    <Text style={styles.joinButtonText}>
                      {joined ? "Você já entrou" : full ? "Partida cheia" : "Entrar na partida"}
                    </Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    color: theme.text,
    fontWeight: "bold",
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  createButton: {
    backgroundColor: theme.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 50,
  },
  createButtonText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 13,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    // subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardInfo: {
    color: theme.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  cardPlayers: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  fullBadge: {
    backgroundColor: theme.border,
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  fullBadgeText: {
    color: theme.disabledText,
    fontSize: 11,
    fontWeight: "600",
  },
  joinButton: {
    backgroundColor: theme.primary,
    padding: 12,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 12,
  },
  joinButtonDisabled: {
    backgroundColor: theme.disabled,
  },
  joinButtonText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 14,
  },
});
