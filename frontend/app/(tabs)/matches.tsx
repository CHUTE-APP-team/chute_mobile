import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../src/context/AuthContext";
import { getMatches, Match } from "../../src/services/matchService";
import { getMyInvites, acceptInvite, declineInvite, MatchInvite } from "../../src/services/inviteService";
import MatchCard from "../../src/components/MatchCard";
import { colors } from "../../src/theme/colors";

const theme = colors;

export default function MatchesTab() {
  const { user } = useAuth();
  const [matches, setMatches]               = useState<Match[]>([]);
  const [invites, setInvites]               = useState<MatchInvite[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [respondingId, setRespondingId]     = useState<string | null>(null);

  async function fetchAll(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const [matchData, inviteData] = await Promise.all([getMatches(), getMyInvites()]);
      setMatches(Array.isArray(matchData) ? matchData : []);
      setInvites(Array.isArray(inviteData) ? inviteData : []);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as partidas.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  async function handleAccept(invite: MatchInvite) {
    setRespondingId(invite._id);
    try {
      await acceptInvite(invite._id);
      setInvites((prev) => prev.filter((i) => i._id !== invite._id));
      Alert.alert("", `Você entrou em "${invite.title}"!`);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.message ?? "Não foi possível aceitar o convite.");
    } finally {
      setRespondingId(null);
    }
  }

  async function handleDecline(invite: MatchInvite) {
    setRespondingId(invite._id);
    try {
      await declineInvite(invite._id);
      setInvites((prev) => prev.filter((i) => i._id !== invite._id));
    } catch {
      Alert.alert("Erro", "Não foi possível recusar o convite.");
    } finally {
      setRespondingId(null);
    }
  }

  function handleMatchJoined(updated: Match) {
    setMatches((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Partidas</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push("/create-match")}
          activeOpacity={0.85}
        >
          <Text style={styles.createBtnText}>+ Organizar</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); fetchAll(true); }}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListHeaderComponent={
            invites.length > 0 ? (
              <View style={styles.invitesSection}>
                <Text style={styles.invitesSectionTitle}>Convites pendentes</Text>
                {invites.map((invite) => {
                  const responding = respondingId === invite._id;
                  return (
                    <View key={invite._id} style={styles.inviteCard}>
                      <View style={styles.inviteInfo}>
                        <Text style={styles.inviteMatchTitle} numberOfLines={1}>
                          {invite.title}
                        </Text>
                        <Text style={styles.inviteMeta}>
                          📍 {invite.location}
                        </Text>
                        <Text style={styles.inviteMeta}>
                          🕐 {formatDate(invite.date)}
                        </Text>
                        <Text style={styles.inviteMeta}>
                          👤 por {invite.createdBy?.name ?? "—"}
                        </Text>
                      </View>
                      <View style={styles.inviteActions}>
                        {responding ? (
                          <ActivityIndicator color={theme.primary} />
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.acceptBtn}
                              onPress={() => handleAccept(invite)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.acceptBtnText}>Aceitar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.declineBtn}
                              onPress={() => handleDecline(invite)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.declineBtnText}>Recusar</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhuma partida aberta no momento.</Text>
          }
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              userId={user?.id}
              onJoin={handleMatchJoined}
            />
          )}
        />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.text,
  },
  createBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 50,
  },
  createBtnText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 13,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  // ─── Invites section ──────────────────────────────────────
  invitesSection: {
    marginBottom: 20,
  },
  invitesSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  inviteCard: {
    flexDirection: "row",
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.primary + "55",
    gap: 12,
  },
  inviteInfo: {
    flex: 1,
    gap: 3,
  },
  inviteMatchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 2,
  },
  inviteMeta: {
    fontSize: 12,
    color: theme.textMuted,
  },
  inviteActions: {
    justifyContent: "center",
    gap: 8,
    minWidth: 80,
  },
  acceptBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: "center",
  },
  acceptBtnText: {
    color: theme.textOnPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: "center",
  },
  declineBtnText: {
    color: theme.textMuted,
    fontWeight: "600",
    fontSize: 12,
  },
});
