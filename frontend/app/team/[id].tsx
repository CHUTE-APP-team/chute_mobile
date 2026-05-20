import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/colors';
import {
  getTeam,
  updateTeam,
  deleteTeam,
  addMember,
  Team,
  TeamMember,
} from '@/src/services/teamService';

const theme = colors;

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [team, setTeam]                     = useState<Team | null>(null);
  const [loading, setLoading]               = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [memberEmail, setMemberEmail]       = useState('');
  const [addingMember, setAddingMember]     = useState(false);
  const [editName, setEditName]             = useState('');
  const [editDesc, setEditDesc]             = useState('');
  const [saving, setSaving]                 = useState(false);

  async function fetchTeam() {
    setLoading(true);
    try {
      const data = await getTeam(id);
      setTeam(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o time.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchTeam(); }, [id]));

  const isCreator = team?.createdBy?._id === user?.id;

  function openEditModal() {
    setEditName(team?.name ?? '');
    setEditDesc(team?.description ?? '');
    setEditModalVisible(true);
  }

  async function handleSaveEdit() {
    if (!editName.trim()) {
      Alert.alert('Nome obrigatório', 'O nome do time não pode estar vazio.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateTeam(id, { name: editName.trim(), description: editDesc.trim() });
      setTeam(updated);
      setEditModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Excluir time',
      `Deseja excluir permanentemente o time "${team?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTeam(id);
              router.back();
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o time.');
            }
          },
        },
      ]
    );
  }

  async function handleAddMember() {
    if (!memberEmail.trim()) {
      Alert.alert('Email obrigatório', 'Informe o email do jogador.');
      return;
    }
    setAddingMember(true);
    try {
      const updated = await addMember(id, memberEmail.trim());
      setTeam(updated);
      setMemberEmail('');
      setAddModalVisible(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Não foi possível adicionar o membro.';
      Alert.alert('Erro', msg);
    } finally {
      setAddingMember(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!team) return null;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{team.name}</Text>
        {isCreator && (
          <TouchableOpacity onPress={openEditModal} style={styles.editBtn} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.teamName}>{team.name}</Text>
          {!!team.description && (
            <Text style={styles.teamDesc}>{team.description}</Text>
          )}
          <Text style={styles.teamMeta}>
            {team.members.length} {team.members.length === 1 ? 'membro' : 'membros'}
          </Text>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Membros</Text>
            <TouchableOpacity
              style={styles.addMemberBtn}
              onPress={() => { setMemberEmail(''); setAddModalVisible(true); }}
              activeOpacity={0.85}
            >
              <Text style={styles.addMemberBtnText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>

          {team.members.map((member) => (
            <MemberRow
              key={member._id}
              member={member}
              isCreator={team.createdBy._id === member._id}
            />
          ))}
        </View>

        {/* Danger zone */}
        {isCreator && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
            <Text style={styles.deleteBtnText}>Excluir time</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Adicionar membro</Text>
            <Text style={styles.fieldLabel}>Email do jogador</Text>
            <TextInput
              style={styles.textInput}
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="email@exemplo.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModalVisible(false)}
                disabled={addingMember}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddMember}
                disabled={addingMember}
                activeOpacity={0.85}
              >
                {addingMember
                  ? <ActivityIndicator color={theme.textOnPrimary} size="small" />
                  : <Text style={styles.saveBtnText}>Adicionar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Editar time</Text>
            <Text style={styles.fieldLabel}>Nome *</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nome do time"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Sobre o time..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color={theme.textOnPrimary} size="small" />
                  : <Text style={styles.saveBtnText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function MemberRow({ member, isCreator }: { member: TeamMember; isCreator: boolean }) {
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>
          {member.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{member.name}</Text>
          {isCreator && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>criador</Text>
            </View>
          )}
        </View>
        <Text style={styles.memberEmail}>{member.email}</Text>
      </View>
      {member.overall !== undefined && (
        <Text style={styles.memberOverall}>{member.overall}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: theme.background },
  centered:    { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: theme.background },
  backBtn:     { padding: 4, marginRight: 8 },
  backArrow:   { fontSize: 22, color: theme.text },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.text },
  editBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.primary },
  editBtnText: { fontSize: 13, fontWeight: '600', color: theme.primary },
  scroll:      { paddingHorizontal: 16, paddingBottom: 48 },
  infoCard:    { backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.border, gap: 6 },
  teamName:    { fontSize: 22, fontWeight: 'bold', color: theme.text },
  teamDesc:    { fontSize: 14, color: theme.textMuted, lineHeight: 20 },
  teamMeta:    { fontSize: 13, color: theme.textSecondary, fontWeight: '600', marginTop: 4 },
  section:     { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border, gap: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  addMemberBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.primary },
  addMemberBtnText: { fontSize: 12, fontWeight: '700', color: theme.textOnPrimary },
  memberRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary + '33', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { fontSize: 18, fontWeight: 'bold', color: theme.primary },
  memberInfo:  { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName:  { fontSize: 15, fontWeight: '600', color: theme.text },
  memberEmail: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
  memberOverall: { fontSize: 18, fontWeight: '800', color: theme.primary, marginLeft: 8 },
  creatorBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: theme.primary + '22' },
  creatorBadgeText: { fontSize: 10, fontWeight: '700', color: theme.primary },
  deleteBtn:   { marginTop: 8, padding: 16, borderRadius: 14, alignItems: 'center' },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#E53E3E' },
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
