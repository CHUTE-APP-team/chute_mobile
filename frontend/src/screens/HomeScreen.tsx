import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getMatches, joinMatch, Match } from "../services/matchService";
import { getRoleGreeting } from "../utils/roleUtils";
import axios from "axios";

export default function HomeScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const data = await getMatches();
      setMatches(data);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as partidas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

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
      <Text style={styles.title}>{user ? getRoleGreeting(user.role) : "Olá ⚽"}</Text>
      <Text style={styles.userName}>{user?.name}</Text>

      {isLoading ? (
        <ActivityIndicator color="#ff9900" size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhuma partida disponível.</Text>
          }
          renderItem={({ item }) => {
            const joined = isAlreadyJoined(item);
            const full = isFull(item);
            const isJoining = joiningId === item._id;

            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardInfo}>📍 {item.location}</Text>
                <Text style={styles.cardInfo}>🕐 {formatDate(item.date)}</Text>
                <Text style={styles.cardInfo}>
                  👥 {item.players.length}/{item.maxPlayers} jogadores
                </Text>

                <TouchableOpacity
                  style={[
                    styles.button,
                    (joined || full) && styles.buttonDisabled,
                  ]}
                  onPress={() => handleJoin(item._id)}
                  disabled={joined || full || isJoining}
                >
                  {isJoining ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {joined
                        ? "Você já entrou"
                        : full
                        ? "Partida cheia"
                        : "Entrar na partida"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
    backgroundColor: "#121212",
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 20,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    color: "#888",
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardInfo: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    backgroundColor: "#ff9900",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: "#444",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
