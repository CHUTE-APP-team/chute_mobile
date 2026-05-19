import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../src/context/AuthContext";
import { getMatches, Match } from "../../src/services/matchService";
import MatchCard from "../../src/components/MatchCard";
import { colors } from "../../src/theme/colors";

const theme = colors;

export default function MatchesTab() {
  const { user } = useAuth();
  const [matches, setMatches]         = useState<Match[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchMatches(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const data = await getMatches();
      setMatches(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as partidas.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchMatches(); }, []));

  function handleMatchJoined(updated: Match) {
    setMatches((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
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
              onRefresh={() => { setIsRefreshing(true); fetchMatches(true); }}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
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
});
