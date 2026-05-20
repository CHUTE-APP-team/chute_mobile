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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../src/context/AuthContext";
import {
  getMatch,
  joinMatchDetail,
  generateTeams,
  MatchDetail,
  Team,
} from "../../src/services/matchService";
import { inviteToMatch, leaveMatch } from "../../src/services/inviteService";
import { colors } from "../../src/theme/colors";
import axios from "axios";

const theme = colors;

const TEAM_A_COLOR = "#1565C0";
const TEAM_B_COLOR = "#2E7D32";

export default function MatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [match, setMatch]               = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [isJoining, setIsJoining]       = useState(false);
  const [isLeaving, setIsLeaving]       = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function fetchMatch() {
        setIsLoading(true);
        try {
          const data = await getMatch(id);
          if (active) setMatch(data);
        } catch {
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

  async function handleLeave() {
    if (!match) return;
    Alert.alert(
      "Sair da partida",
      "Tem certeza que deseja sair desta partida?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            setIsLeaving(true);
            try {
              await leaveMatch(match._id);
              // Refetch to get updated players list
              const updated = await getMatch(match._id);
              setMatch(updated);
            } catch (err) {
              const message =
                axios.isAxiosError(err) && err.response?.data?.message
                  ? err.response.data.message
                  : "Erro ao sair da partida.";
              Alert.alert("Erro", message);
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  }

  async function handleGenerateTeams() {
    if (!match) return;
    setIsGenerating(true);
    try {
      const teams = await generateTeams(match._id);
      setMatch((prev) => prev ? { ...prev, teams, teamsGeneratedAt: new Date().toISOString() } : prev);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Erro ao gerar times.";
      Alert.alert("Erro", message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) {
      Alert.alert("Email obrigatório", "Informe o email do jogador.");
      return;
    }
    setIsSendingInvite(true);
    try {
      await inviteToMatch(match!._id, inviteEmail.trim());
      setInviteEmail('');
      setInviteModalVisible(false);
      Alert.alert("", `Convite enviado para ${inviteEmail.trim()}`);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Não foi possível enviar o convite.";
      Alert.alert("Erro", message);
    } finally {
      setIsSendingInvite(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function isAlreadyJoined() {
    if (!match || !user) return false;
    return match.players.some((p) => p._id === user.id);
  }

  function isFull() {
    return !!match && match.players.length >= match.maxPlayers;
  }

  function isOwner() {
    return !!match && !!user && match.createdBy === user.id;
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

  const joined          = isAlreadyJoined();
  const full            = isFull();
  const owner           = isOwner();
  const hasTeams        = match.teams && match.teams.length === 2;
  const canGenerateTeams = owner && match.players.length >= 4;

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
          <InfoRow icon="👥" label={`${match.players.length}/${match.maxPlayers} jogadores`} />
        </View>

        {/* ─── Participants ─────────────────────────────────── */}
        {!hasTeams && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Jogadores ({match.players.length})
              </Text>
              {owner && (
                <TouchableOpacity
                  style={styles.inviteBtn}
                  onPress={() => { setInviteEmail(''); setInviteModalVisible(true); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.inviteBtnText}>+ Convidar</Text>
                </TouchableOpacity>
              )}
            </View>

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
                    <Text style={styles.playerOverall}>{item.overall}</Text>
                  </View>
                )}
              />
            )}

            {match.players.length < 4 && match.players.length > 0 && (
              <View style={styles.teamsHint}>
                <Text style={styles.teamsHintText}>
                  ⏳ Times serão definidos quando houver mais jogadores
                </Text>
                <Text style={styles.teamsHintSub}>
                  {4 - match.players.length} jogador{4 - match.players.length !== 1 ? "es" : ""} restante{4 - match.players.length !== 1 ? "s" : ""} para gerar os times
                </Text>
              </View>
            )}

            {canGenerateTeams && (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateTeams}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color={theme.textOnPrimary} />
                ) : (
                  <Text style={styles.generateButtonText}>⚡ Gerar Times</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ─── Teams section ─────────────────────────────────── */}
        {hasTeams && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Times</Text>
              {owner && (
                <TouchableOpacity
                  style={styles.inviteBtn}
                  onPress={() => { setInviteEmail(''); setInviteModalVisible(true); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.inviteBtnText}>+ Convidar</Text>
                </TouchableOpacity>
              )}
            </View>
            <TeamsSection teams={match.teams} />
          </>
        )}
      </ScrollView>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <View style={styles.footer}>
        {joined && match.players.length >= 2 && (
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => router.push(`/match/${match._id}/rate` as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.rateButtonText}>⭐ Avaliar jogadores</Text>
          </TouchableOpacity>
        )}

        {joined && !owner ? (
          <TouchableOpacity
            style={[styles.joinButton, styles.leaveButton]}
            onPress={handleLeave}
            disabled={isLeaving}
          >
            {isLeaving ? (
              <ActivityIndicator color={theme.textOnPrimary} />
            ) : (
              <Text style={styles.joinButtonText}>Sair da partida</Text>
            )}
          </TouchableOpacity>
        ) : !joined ? (
          <TouchableOpacity
            style={[styles.joinButton, (full || isJoining) && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={full || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator color={theme.textOnPrimary} />
            ) : (
              <Text style={styles.joinButtonText}>
                {full ? "Partida cheia" : "Entrar na partida"}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ─── Invite Modal ─────────────────────────────────────── */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Convidar jogador</Text>
            <Text style={styles.fieldLabel}>Email do jogador</Text>
            <TextInput
              style={styles.textInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="email@exemplo.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setInviteModalVisible(false)}
                disabled={isSendingInvite}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSendInvite}
                disabled={isSendingInvite}
                activeOpacity={0.85}
              >
                {isSendingInvite ? (
                  <ActivityIndicator color={theme.textOnPrimary} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Enviar convite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeamsSection({ teams }: { teams: Team[] }) {
  const [teamA, teamB] = teams;
  return (
    <View>
      <View style={styles.teamsBadgeRow}>
        <Text style={styles.teamsBadge}>⚡ Times balanceados automaticamente</Text>
      </View>
      <TeamCard team={teamA} accentColor={TEAM_A_COLOR} />
      <TeamCard team={teamB} accentColor={TEAM_B_COLOR} />
    </View>
  );
}

function TeamCard({ team, accentColor }: { team: Team; accentColor: string }) {
  return (
    <View style={[styles.teamCard, { borderLeftColor: accentColor }]}>
      <View style={styles.teamHeader}>
        <Text style={[styles.teamName, { color: accentColor }]}>{team.name}</Text>
        <View style={[styles.teamOverallBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.teamOverallText}>Overall {team.totalOverall}</Text>
        </View>
      </View>
      {team.players.map((player, index) => (
        <View key={player._id} style={styles.teamPlayerRow}>
          <Text style={styles.teamPlayerIndex}>{index + 1}</Text>
          <Text style={styles.teamPlayerName}>{player.name}</Text>
          <View style={[styles.overallPill, { borderColor: accentColor }]}>
            <Text style={[styles.overallPillText, { color: accentColor }]}>
              {player.overall}
            </Text>
          </View>
        </View>
      ))}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: theme.background, paddingTop: 56 },
  centered:     { flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center" },
  errorText:    { color: theme.textSecondary, fontSize: 16, marginBottom: 16 },
  backRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 20 },
  backArrow:    { color: theme.primary, fontSize: 22, marginRight: 6 },
  backLabel:    { color: theme.primary, fontSize: 16, fontWeight: "600" },
  backButton:   { backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 50 },
  backButtonText: { color: theme.textOnPrimary, fontWeight: "bold" },
  scroll:       { paddingHorizontal: 16, paddingBottom: 140 },
  title:        { color: theme.text, fontSize: 28, fontWeight: "bold", marginBottom: 16 },
  infoCard:     { backgroundColor: theme.card, borderRadius: 14, padding: 16, marginBottom: 24, gap: 10, borderWidth: 1, borderColor: theme.border, elevation: 2 },
  infoRow:      { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon:     { fontSize: 18 },
  infoText:     { color: theme.textSecondary, fontSize: 15 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: "bold" },
  inviteBtn:    { backgroundColor: theme.primary, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20 },
  inviteBtnText: { color: theme.textOnPrimary, fontWeight: "700", fontSize: 12 },
  empty:        { color: theme.textMuted, fontSize: 14, textAlign: "center", marginTop: 16 },
  playerRow:    { flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderRadius: 10, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: theme.border },
  playerIndex:  { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" },
  playerIndexText: { color: theme.textOnPrimary, fontWeight: "bold", fontSize: 13 },
  playerName:   { color: theme.text, fontSize: 15, flex: 1 },
  playerOverall: { color: theme.textSecondary, fontSize: 13, fontWeight: "600" },
  generateButton: { backgroundColor: theme.primary, padding: 14, borderRadius: 50, alignItems: "center", marginTop: 20 },
  generateButtonText: { color: theme.textOnPrimary, fontWeight: "bold", fontSize: 15 },
  teamsHint:    { backgroundColor: theme.card, borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: theme.border, alignItems: "center", gap: 6 },
  teamsHintText: { color: theme.textSecondary, fontSize: 14, fontWeight: "600", textAlign: "center" },
  teamsHintSub: { color: theme.textMuted, fontSize: 12, textAlign: "center" },
  teamsBadgeRow: { marginBottom: 16 },
  teamsBadge:   { color: theme.textSecondary, fontSize: 13, fontStyle: "italic" },
  teamCard:     { backgroundColor: theme.card, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 4, elevation: 2 },
  teamHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  teamName:     { fontSize: 17, fontWeight: "bold" },
  teamOverallBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  teamOverallText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  teamPlayerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.border, gap: 10 },
  teamPlayerIndex: { color: theme.textMuted, fontSize: 13, width: 18, textAlign: "center" },
  teamPlayerName: { color: theme.text, fontSize: 15, flex: 1 },
  overallPill:  { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  overallPillText: { fontSize: 12, fontWeight: "700" },
  footer:       { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: theme.background, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 },
  rateButton:   { backgroundColor: theme.card, padding: 14, borderRadius: 50, alignItems: "center", borderWidth: 1, borderColor: theme.primary },
  rateButtonText: { color: theme.primary, fontWeight: "700", fontSize: 15 },
  joinButton:   { backgroundColor: theme.primary, padding: 16, borderRadius: 50, alignItems: "center" },
  joinButtonDisabled: { backgroundColor: theme.disabled },
  leaveButton:  { backgroundColor: "#C53030" },
  joinButtonText: { color: theme.textOnPrimary, fontWeight: "bold", fontSize: 16 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  modalSheet:   { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40, gap: 10 },
  modalTitle:   { fontSize: 20, fontWeight: "bold", color: theme.text, marginBottom: 4 },
  fieldLabel:   { fontSize: 12, fontWeight: "600", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput:    { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: theme.text },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: theme.textMuted },
  saveBtn:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.primary, alignItems: "center" },
  saveBtnText:  { fontSize: 15, fontWeight: "700", color: theme.textOnPrimary },
});
