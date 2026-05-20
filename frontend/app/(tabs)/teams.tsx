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
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '@/src/theme/colors';
import { getMyTeams, createTeam, Team } from '@/src/services/teamService';

const theme = colors;

export default function TeamsTab() {
  const [teams, setTeams]             = useState<Team[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [newName, setNewName]         = useState('');
  const [newDesc, setNewDesc]         = useState('');

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

  function openModal() {
    setNewName('');
    setNewDesc('');
    setModalVisible(true);
  }

  async function handleCreate() {
    if (!newName.trim()) {
      Alert.alert('Nome obrigatório', 'Informe um nome para o time.');
      return;
    }
    setCreating(true);
    try {
      const team = await createTeam({ name: newName.trim(), description: newDesc.trim() });
      setTeams((prev) => [team, ...prev]);
      setModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o time.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Times</Text>
        <TouchableOpacity style={styles.createBtn} onPress={openModal} activeOpacity={0.85}>
          <Text style={styles.createBtnText}>+ Criar time</Text>
        </TouchableOpacity>
      </View>

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
              <TouchableOpacity style={styles.emptyBtn} onPress={openModal} activeOpacity={0.85}>
                <Text style={styles.emptyBtnText}>Criar meu primeiro time</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/team/${item._id}`)}
              activeOpacity={0.82}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardName}>{item.name}</Text>
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
          )}
        />
      )}

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Novo time</Text>

            <Text style={styles.fieldLabel}>Nome *</Text>
            <TextInput
              style={styles.textInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nome do time"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Sobre o time..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreate}
                disabled={creating}
                activeOpacity={0.85}
              >
                {creating
                  ? <ActivityIndicator color={theme.textOnPrimary} size="small" />
                  : <Text style={styles.saveBtnText}>Criar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardLeft:    { flex: 1 },
  cardName:    { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 2 },
  cardDesc:    { fontSize: 13, color: theme.textMuted },
  cardRight:   { alignItems: 'center', marginLeft: 12 },
  cardMemberCount: { fontSize: 22, fontWeight: '800', color: theme.primary },
  cardMemberLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  emptyBox:    { alignItems: 'center', marginTop: 64, paddingHorizontal: 32 },
  emptyEmoji:  { fontSize: 48, marginBottom: 16 },
  emptyText:   { fontSize: 15, color: theme.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  emptyBtn:    { backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 50 },
  emptyBtnText: { color: theme.textOnPrimary, fontWeight: '700', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet:  { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40, gap: 10 },
  modalTitle:  { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput:   { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: theme.text },
  textArea:    { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:   { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: theme.textMuted },
  saveBtn:     { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: theme.textOnPrimary },
});
