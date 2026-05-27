import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '@/src/theme/colors';
import { getMyTeams, createTeam, Team, EmblemShape } from '@/src/services/teamService';

const theme = colors;

// ─── Emblem config ────────────────────────────────────────────────────────────

const EMBLEM_SHAPES: { key: EmblemShape; label: string; path: string }[] = [
  { key: 'shield', label: 'Escudo',   path: 'M12 2 L20 6 L20 14 C20 18 16 21 12 23 C8 21 4 18 4 14 L4 6 Z' },
  { key: 'circle', label: 'Círculo',  path: '' },
  { key: 'star',   label: 'Estrela',  path: '' },
];

const EMBLEM_COLORS = [
  '#FF6A00', // laranja
  '#1565C0', // azul
  '#2E7D32', // verde
  '#6A1B9A', // roxo
  '#C62828', // vermelho
  '#F9A825', // amarelo
  '#00838F', // teal
  '#37474F', // cinza escuro
];

interface EmblemProps {
  shape: EmblemShape;
  color: string;
  size?: number;
  initials?: string;
}

function Emblem({ shape, color, size = 48, initials = '?' }: EmblemProps) {
  const fontSize = size * 0.38;
  const borderRadius =
    shape === 'circle' ? size / 2 :
    shape === 'star'   ? size * 0.18 :
    size * 0.14;

  const shieldStyle =
    shape === 'shield'
      ? { borderBottomLeftRadius: size * 0.5, borderBottomRightRadius: size * 0.5 }
      : {};

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          ...shieldStyle,
        },
        shape === 'star' && { transform: [{ rotate: '0deg' }] },
      ]}
    >
      {shape === 'star' ? (
        <Text style={{ fontSize: fontSize * 1.4, color: '#fff', lineHeight: size }}>★</Text>
      ) : (
        <Text style={{ fontSize, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

function teamInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string; description: string;
    city: string; state: string;
    emblemShape: EmblemShape; emblemColor: string;
  }) => Promise<void>;
}

function CreateModal({ visible, onClose, onCreate }: CreateModalProps) {
  const [name,         setName]         = useState('');
  const [desc,         setDesc]         = useState('');
  const [city,         setCity]         = useState('');
  const [state,        setState]        = useState('');
  const [emblemShape,  setEmblemShape]  = useState<EmblemShape>('shield');
  const [emblemColor,  setEmblemColor]  = useState(EMBLEM_COLORS[0]);
  const [creating,     setCreating]     = useState(false);

  function reset() {
    setName(''); setDesc(''); setCity(''); setState('');
    setEmblemShape('shield'); setEmblemColor(EMBLEM_COLORS[0]);
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Informe um nome para o time.');
      return;
    }
    setCreating(true);
    try {
      await onCreate({ name: name.trim(), description: desc.trim(), city: city.trim(), state: state.trim(), emblemShape, emblemColor });
      reset();
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o time.');
    } finally {
      setCreating(false);
    }
  }

  function handleClose() { reset(); onClose(); }

  const initials = name.trim() ? teamInitials(name) : '?';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.modalSheet}
          contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.modalTitle}>Novo time</Text>

          {/* Emblema preview */}
          <View style={styles.emblemPreview}>
            <Emblem shape={emblemShape} color={emblemColor} size={72} initials={initials} />
          </View>

          {/* Forma do emblema */}
          <Text style={styles.fieldLabel}>Formato do emblema</Text>
          <View style={styles.shapeRow}>
            {EMBLEM_SHAPES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.shapeBtn, emblemShape === s.key && styles.shapeBtnActive]}
                onPress={() => setEmblemShape(s.key)}
              >
                <View style={{ marginBottom: 4 }}>
                  <Emblem shape={s.key} color={emblemShape === s.key ? emblemColor : theme.textMuted} size={36} initials="AB" />
                </View>
                <Text style={[styles.shapeBtnText, emblemShape === s.key && styles.shapeBtnTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cor do emblema */}
          <Text style={styles.fieldLabel}>Cor do emblema</Text>
          <View style={styles.colorRow}>
            {EMBLEM_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, emblemColor === c && styles.colorDotActive]}
                onPress={() => setEmblemColor(c)}
              />
            ))}
          </View>

          {/* Nome */}
          <Text style={styles.fieldLabel}>Nome *</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Nome do time"
            placeholderTextColor={theme.textMuted}
            autoFocus
          />

          {/* Descrição */}
          <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Sobre o time..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={3}
          />

          {/* Localidade */}
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

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={creating}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={creating} activeOpacity={0.85}>
              {creating
                ? <ActivityIndicator color={theme.textOnPrimary} size="small" />
                : <Text style={styles.saveBtnText}>Criar</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TeamsTab() {
  const [teams, setTeams]               = useState<Team[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  async function fetchTeams(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await getMyTeams();
      setTeams(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os times.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchTeams(); }, []));

  async function handleCreate(data: {
    name: string; description: string;
    city: string; state: string;
    emblemShape: EmblemShape; emblemColor: string;
  }) {
    const team = await createTeam(data);
    setTeams((prev) => [team, ...prev]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Times</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.createBtnText}>+ Criar time</Text>
        </TouchableOpacity>
      </View>

      {/* Quadras shortcut */}
      <TouchableOpacity
        style={styles.courtsCard}
        onPress={() => router.push('/courts' as any)}
        activeOpacity={0.82}
      >
        <Text style={{ fontSize: 22 }}>🏟️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Quadras</Text>
          <Text style={{ fontSize: 12, color: theme.textMuted }}>Gerenciar locais de jogo</Text>
        </View>
        <Text style={{ fontSize: 18, color: theme.textMuted }}>›</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTeams(true); }}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>Você ainda não faz parte de nenhum time.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
                <Text style={styles.emptyBtnText}>Criar meu primeiro time</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const shape = item.emblemShape ?? 'shield';
            const color = item.emblemColor ?? theme.primary;
            const initials = teamInitials(item.name);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/team/${item._id}`)}
                activeOpacity={0.82}
              >
                <Emblem shape={shape} color={color} size={50} initials={initials} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {!!(item.city || item.state) && (
                    <Text style={styles.cardLocation}>
                      📍 {[item.city, item.state].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {!!item.description && (
                    <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                  )}
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardMemberCount}>{item.members.length}</Text>
                  <Text style={styles.cardMemberLabel}>
                    {item.members.length === 1 ? 'membro' : 'membros'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <CreateModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: theme.background, paddingTop: 56 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  title:       { fontSize: 22, fontWeight: '800', color: theme.text },
  createBtn:   { backgroundColor: theme.primary, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 50 },
  createBtnText: { color: theme.textOnPrimary, fontWeight: 'bold', fontSize: 13 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:        { paddingHorizontal: 16, paddingBottom: 48 },

  card:        { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardBody:    { flex: 1 },
  cardName:    { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 2 },
  cardLocation:{ fontSize: 12, color: theme.textMuted, marginBottom: 1 },
  cardDesc:    { fontSize: 12, color: theme.textMuted },
  cardRight:   { alignItems: 'center', marginLeft: 4 },
  cardMemberCount: { fontSize: 20, fontWeight: '800', color: theme.primary },
  cardMemberLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },

  emptyBox:    { alignItems: 'center', marginTop: 64, paddingHorizontal: 32 },
  emptyEmoji:  { fontSize: 48, marginBottom: 16 },
  emptyText:   { fontSize: 15, color: theme.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  emptyBtn:    { backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 50 },
  emptyBtnText:{ color: theme.textOnPrimary, fontWeight: '700', fontSize: 14 },

  courtsCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: 10, padding: 14, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet:  { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalTitle:  { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  textInput:   { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: theme.text },
  textArea:    { height: 72, textAlignVertical: 'top' },
  modalActions:{ flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:   { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  cancelBtnText:{ fontSize: 15, fontWeight: '600', color: theme.textMuted },
  saveBtn:     { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: theme.textOnPrimary },

  // Emblem picker
  emblemPreview: { alignItems: 'center', paddingVertical: 8 },
  shapeRow:    { flexDirection: 'row', gap: 10 },
  shapeBtn:    { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.background, gap: 4 },
  shapeBtnActive: { borderColor: theme.primary, backgroundColor: theme.primary + '15' },
  shapeBtnText:{ fontSize: 12, color: theme.textMuted, fontWeight: '600' },
  shapeBtnTextActive: { color: theme.primary },
  colorRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot:    { width: 34, height: 34, borderRadius: 17 },
  colorDotActive: { borderWidth: 3, borderColor: theme.text },
});
