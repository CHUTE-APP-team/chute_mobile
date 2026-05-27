import { useEffect, useRef, useState, useCallback } from 'react';
import { rateUserStars } from '@/src/services/drawService';
import {
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/colors';
import { Rank, getPlayerStats, PlayerStats } from '@/src/services/userService';
import { ALL_ROLES, UserRole } from '@/src/utils/roleUtils';

const theme = colors;

function calcAge(birthDateStr: string): number {
  const birth = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const RANK_CONFIG: Record<Rank, { color: string; icon: string }> = {
  Bronze: { color: '#CD7F32', icon: '🥉' },
  Prata:  { color: '#A8A8A8', icon: '🥈' },
  Ouro:   { color: '#FFD700', icon: '⭐' },
  Elite:  { color: '#FF6A00', icon: '🔥' },
};

function StarDisplay({ value, size = 20 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={{ fontSize: size, color: value >= s ? '#FFB800' : '#CCCCCC' }}>
          ★
        </Text>
      ))}
    </View>
  );
}

function xpForNextLevel(level: number): number {
  return level * 100;
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const baseXp   = (level - 1) * 100;
  const needed   = xpForNextLevel(level);
  const progress = Math.min((xp - baseXp) / needed, 1);
  const anim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 700, useNativeDriver: false }).start();
  }, [progress]);

  const widthInterpolated = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.xpBarTrack}>
      <Animated.View style={[styles.xpBarFill, { width: widthInterpolated }]} />
    </View>
  );
}

function LevelUpToast({ xpGained }: { xpGained: number }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity,     { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY,  { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.toastText}>Você ganhou +{xpGained} XP ⚡</Text>
    </Animated.View>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  visible: boolean;
  initialName: string;
  initialRole: UserRole;
  initialCity?: string;
  initialState?: string;
  initialBirthDate?: string;
  initialStrongFoot?: 'right' | 'left';
  email: string;
  onClose: () => void;
  onSave: (data: {
    name: string; role: UserRole;
    city: string; state: string;
    birthDate: string; strongFoot: 'right' | 'left';
  }) => Promise<void>;
}

function EditModal({
  visible, initialName, initialRole, initialCity, initialState,
  initialBirthDate, initialStrongFoot, email, onClose, onSave,
}: EditModalProps) {
  const [name,       setName]       = useState(initialName);
  const [role,       setRole]       = useState<UserRole>(initialRole);
  const [city,       setCity]       = useState(initialCity ?? '');
  const [state,      setState]      = useState(initialState ?? '');
  const [birthDate,  setBirthDate]  = useState(initialBirthDate ?? '');
  const [strongFoot, setStrongFoot] = useState<'right' | 'left'>(initialStrongFoot ?? 'right');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setRole(initialRole);
      setCity(initialCity ?? '');
      setState(initialState ?? '');
      setBirthDate(initialBirthDate ?? '');
      setStrongFoot(initialStrongFoot ?? 'right');
    }
  }, [visible]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'O nome não pode estar vazio.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), role, city, state, birthDate, strongFoot });
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.modalSheet} contentContainerStyle={{ gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalTitle}>Editar perfil</Text>

          <Text style={styles.fieldLabel}>Nome</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholderTextColor={theme.textMuted}
            placeholder="Seu nome"
            autoFocus
          />

          <Text style={styles.fieldLabel}>Email (não editável)</Text>
          <TextInput
            style={[styles.textInput, styles.textInputDisabled]}
            value={email}
            editable={false}
          />

          <Text style={styles.fieldLabel}>Cidade</Text>
          <TextInput
            style={styles.textInput}
            value={city}
            onChangeText={setCity}
            placeholder="Ex: São Paulo"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={styles.fieldLabel}>Estado (UF)</Text>
          <TextInput
            style={styles.textInput}
            value={state}
            onChangeText={(v) => setState(v.toUpperCase().slice(0, 2))}
            placeholder="Ex: SP"
            placeholderTextColor={theme.textMuted}
            maxLength={2}
            autoCapitalize="characters"
          />

          <Text style={styles.fieldLabel}>Data de nascimento (AAAA-MM-DD)</Text>
          <TextInput
            style={styles.textInput}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="Ex: 1998-05-20"
            placeholderTextColor={theme.textMuted}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.fieldLabel}>Perna boa</Text>
          <View style={styles.footRow}>
            {(['right', 'left'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.footChip, strongFoot === f && styles.footChipActive]}
                onPress={() => setStrongFoot(f)}
              >
                <Text style={[styles.footChipText, strongFoot === f && styles.footChipTextActive]}>
                  {f === 'right' ? '🦵 Destro' : '🦵 Canhoto'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Posição / Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow}>
            {ALL_ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleChip, role === r.value && styles.roleChipActive]}
                onPress={() => setRole(r.value)}
                activeOpacity={0.75}
              >
                <Text style={styles.roleChipEmoji}>{r.emoji}</Text>
                <Text style={[styles.roleChipLabel, role === r.value && styles.roleChipLabelActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color={theme.textOnPrimary} size="small" />
                : <Text style={styles.saveBtnText}>Salvar</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, isLoading, updateUser, deleteAccount } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const prevXpRef = useRef<number | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (prevXpRef.current !== null && user.xp > prevXpRef.current) {
      setXpGained(user.xp - prevXpRef.current);
      const t = setTimeout(() => setXpGained(null), 3000);
      return () => clearTimeout(t);
    }
    prevXpRef.current = user.xp;
  }, [user?.xp]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      getPlayerStats(user.id).then(setStats).catch(() => null);
    }, [user?.id])
  );

  function handleDeleteAccount() {
    Alert.alert(
      'Excluir conta',
      'Essa ação é permanente e não pode ser desfeita. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar exclusão',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount();
            } catch {
              setDeletingAccount(false);
              Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
            }
          },
        },
      ]
    );
  }

  if (isLoading || !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (deletingAccount) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={[styles.email, { marginTop: 16 }]}>Excluindo conta...</Text>
      </View>
    );
  }

  const rank        = user.rank ?? 'Bronze';
  const rankCfg     = RANK_CONFIG[rank];
  const baseXp      = (user.level - 1) * 100;
  const nextLevelXp = xpForNextLevel(user.level);

  return (
    <View style={styles.container}>
      {xpGained !== null && <LevelUpToast xpGained={xpGained} />}

      <EditModal
        visible={editVisible}
        initialName={user.name}
        initialRole={user.role as UserRole}
        initialCity={user.city}
        initialState={user.state}
        initialBirthDate={user.birthDate}
        initialStrongFoot={user.strongFoot}
        email={user.email}
        onClose={() => setEditVisible(false)}
        onSave={async (data) => { await updateUser(data); }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.rankBadge, { borderColor: rankCfg.color }]}>
          <Text style={styles.rankIcon}>{rankCfg.icon}</Text>
          <Text style={[styles.rankLabel, { color: rankCfg.color }]}>{rank.toUpperCase()}</Text>
        </View>

        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>

        {/* Personal info chips */}
        <View style={styles.infoChips}>
          {(user.city || user.state) && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                📍 {[user.city, user.state].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          {user.birthDate && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                🎂 {calcAge(user.birthDate)} anos
              </Text>
            </View>
          )}
          {user.strongFoot && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                🦵 {user.strongFoot === 'right' ? 'Destro' : 'Canhoto'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.editButton} onPress={() => setEditVisible(true)} activeOpacity={0.85}>
          <Text style={styles.editButtonText}>✏️ Editar perfil</Text>
        </TouchableOpacity>

        <View style={styles.progressCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Level {user.level}</Text>
            <Text style={styles.xpLabel}>XP: {user.xp} / {baseXp + nextLevelXp}</Text>
          </View>
          <XpBar xp={user.xp} level={user.level} />
          <Text style={styles.xpHint}>{nextLevelXp - (user.xp - baseXp)} XP para o próximo nível</Text>
        </View>

        {/* Stars display */}
        <View style={[styles.ratingCard, { marginTop: 0, marginBottom: 12 }]}>
          <Text style={styles.ratingCardTitle}>Reputação pública</Text>
          <StarDisplay value={user.stars ?? 3} size={28} />
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
            {(user.stars ?? 3).toFixed(0)} estrela{(user.stars ?? 3) !== 1 ? 's' : ''} · {user.starRatingsCount ?? 0} avaliação{(user.starRatingsCount ?? 0) !== 1 ? 'ões' : ''}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Level" value={String(user.level)} />
          <StatBox label="XP"    value={String(user.xp)} />
        </View>

        <View style={styles.ratingCard}>
          <Text style={styles.ratingCardTitle}>Desempenho</Text>
          <View style={styles.ratingRow}>
            <RatingStat
              label="Média de notas"
              value={stats && stats.totalMatches > 0 ? `${stats.averageRating.toFixed(1)}/10` : "—"}
              highlight={!!stats && stats.totalMatches > 0}
            />
            <View style={styles.ratingDivider} />
            <RatingStat label="Partidas avaliadas" value={stats ? String(stats.totalMatches) : "0"} />
          </View>
          {(!stats || stats.totalMatches === 0) && (
            <Text style={styles.ratingHint}>
              Participe de partidas para receber avaliações e melhorar seu overall
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.leaderboardButton} onPress={() => router.push('/(tabs)/ranking')} activeOpacity={0.85}>
          <Text style={styles.leaderboardButtonText}>🏆 Ver Ranking Global</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.85}>
          <Text style={styles.deleteButtonText}>Excluir conta</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RatingStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.ratingStat}>
      <Text style={[styles.ratingStatValue, highlight && styles.ratingStatValueHighlight]}>{value}</Text>
      <Text style={styles.ratingStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: theme.background, paddingTop: 56 },
  centered:     { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  scroll:       { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 48 },
  rankBadge:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderRadius: 32, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 20, marginTop: 8 },
  rankIcon:     { fontSize: 22 },
  rankLabel:    { fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },
  name:         { fontSize: 26, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  email:        { fontSize: 14, color: theme.textMuted, marginBottom: 12 },
  editButton:   { marginBottom: 20, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.primary },
  editButtonText: { fontSize: 14, fontWeight: '600', color: theme.primary },
  progressCard: { width: '100%', backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.border, gap: 10 },
  levelRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelLabel:   { fontSize: 18, fontWeight: 'bold', color: theme.text },
  xpLabel:      { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
  xpBarTrack:   { height: 10, backgroundColor: theme.border, borderRadius: 5, overflow: 'hidden' },
  xpBarFill:    { height: '100%', backgroundColor: theme.primary, borderRadius: 5 },
  xpHint:       { fontSize: 12, color: theme.textMuted, textAlign: 'right' },
  statsRow:     { flexDirection: 'row', gap: 12, width: '100%' },
  statBox:      { flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statValue:    { fontSize: 22, fontWeight: 'bold', color: theme.text },
  statLabel:    { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  ratingCard:   { width: '100%', backgroundColor: theme.card, borderRadius: 16, padding: 20, marginTop: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border, gap: 12 },
  ratingCardTitle: { fontSize: 13, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center' },
  ratingDivider: { width: 1, height: 40, backgroundColor: theme.border, marginHorizontal: 20 },
  ratingStat:   { flex: 1, alignItems: 'center', gap: 4 },
  ratingStatValue: { fontSize: 22, fontWeight: 'bold', color: theme.textSecondary },
  ratingStatValueHighlight: { color: theme.primary },
  ratingStatLabel: { fontSize: 12, color: theme.textMuted, textAlign: 'center' },
  ratingHint:   { fontSize: 12, color: theme.textMuted, textAlign: 'center', lineHeight: 17, marginTop: 4 },
  leaderboardButton: { marginTop: 20, width: '100%', backgroundColor: theme.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  leaderboardButtonText: { fontSize: 15, fontWeight: '700', color: theme.primary },
  deleteButton: { marginTop: 12, width: '100%', borderRadius: 14, padding: 16, alignItems: 'center' },
  deleteButtonText: { fontSize: 14, fontWeight: '600', color: '#E53E3E' },
  infoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 8 },
  infoChip: { backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: theme.border },
  infoChipText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  footRow: { flexDirection: 'row', gap: 10 },
  footChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, alignItems: 'center' },
  footChipActive: { borderColor: theme.primary, backgroundColor: theme.primary + '22' },
  footChipText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  footChipTextActive: { color: theme.primary },
  toast:        { position: 'absolute', top: 72, alignSelf: 'center', backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, zIndex: 99 },
  toastText:    { color: theme.textOnPrimary, fontWeight: 'bold', fontSize: 14 },
  // Modal
  modalOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet:      { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40, gap: 12 },
  modalTitle:      { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  fieldLabel:      { fontSize: 12, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput:       { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: theme.text },
  textInputDisabled: { opacity: 0.5 },
  roleRow:         { flexDirection: 'row', marginVertical: 4 },
  roleChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border, marginRight: 8, backgroundColor: theme.background },
  roleChipActive:  { borderColor: theme.primary, backgroundColor: theme.primary + '22' },
  roleChipEmoji:   { fontSize: 16 },
  roleChipLabel:   { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  roleChipLabelActive: { color: theme.primary },
  modalActions:    { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:       { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  cancelBtnText:   { fontSize: 15, fontWeight: '600', color: theme.textMuted },
  saveBtn:         { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' },
  saveBtnText:     { fontSize: 15, fontWeight: '700', color: theme.textOnPrimary },
});
