import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../src/context/AuthContext";
import { getMatch, joinMatchDetail, MatchDetail } from "../../src/services/matchService";
import { colors } from "../../src/theme/colors";
import axios from "axios";

const theme = colors;

export default function MatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function fetchMatch() {
        setIsLoading(true);
        try {
          const data = await getMatch(id);
          if (active) setMatch(data);
        } catch (err) {
          console.error("[MatchDetails] failed to fetch match:", err);
          if (active) Alert.alert("Erro", "Não foi possível carregar a partida.");
        } finally {
          if (active) setIsLoading(false);
        }
      }

      fetchMatch();
      return () => { active = false; };
    }, [id])
  );

  async function handleJoin() {
    if (!match) return;
    setIsJoining(true);
    try {
      const updated = await joinMatchDetail(match._id);
      setMatch(updated);
      Alert.alert("", "Você entrou na partida!");
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Erro ao entrar na partida.";
      Alert.alert("Erro", message);
    } finally {
      setIsJoining(false);
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

  function isAlreadyJoined() {
    if (!match || !user) return false;
    return match.players.some((p) => p._id === user.id);
  }

  function isFull() {
    if (!match) return false;
    return match.players.length >= match.maxPlayers;
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

  const joined = isAlreadyJoined();
  const full = isFull();
  const joinDisabled = joined || full || isJoining;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backLabel}>Partidas</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{match.title}</Text>

        <View style={styles.infoCard}>
          <InfoRow icon="📍" label={match.location} />
          <InfoRow icon="🕐" label={formatDate(match.date)} />
          <InfoRow
            icon="👥"
            label={`${match.players.length}/${match.maxPlayers} jogadores`}
          />
        </View>

        <Text style={styles.sectionTitle}>Jogadores</Text>

        {match.players.length === 0 ? (
          <Text style={styles.empty}>Nenhum jogador ainda</Text>
        ) : (
          <FlatList
            data={match.players}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.playerRow}>
                <View style={styles.playerIndex}>
                  <Text style={styles.playerIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.playerName}>{item.name}</Text>
              </View>
            )}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.joinButton, joinDisabled && styles.joinButtonDisabled]}
          onPress={handleJoin}
          disabled={joinDisabled}
        >
          {isJoining ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text style={styles.joinButtonText}>
              {joined ? "Você já entrou" : full ? "Partida cheia" : "Entrar na partida"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{label}</Text>
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
  },
  errorText: {
    color: theme.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backArrow: {
    color: theme.primary,
    fontSize: 22,
    marginRight: 6,
  },
  backLabel: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: "600",
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
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    color: theme.textSecondary,
    fontSize: 15,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  empty: {
    color: theme.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  playerIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  playerIndexText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 13,
  },
  playerName: {
    color: theme.text,
    fontSize: 15,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  joinButton: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 50,
    alignItems: "center",
  },
  joinButtonDisabled: {
    backgroundColor: theme.disabled,
  },
  joinButtonText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 16,
  },
});
