import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '../src/context/AuthContext'
import {
  Court,
  listCourts,
  createCourt,
  updateCourt,
  deleteCourt,
  Modality,
  MODALITY_LABELS,
  MODALITY_ICONS,
} from '../src/services/courtService'
import { colors } from '../src/theme/colors'

const MODALITY_BADGE_BG: Record<Modality, string> = {
  futsal: 'rgba(33,150,243,0.15)',
  society: 'rgba(76,175,80,0.15)',
  campo: 'rgba(139,195,74,0.15)',
}

const MODALITY_BADGE_TEXT: Record<Modality, string> = {
  futsal: '#1565C0',
  society: '#2E7D32',
  campo: '#558B2F',
}

type FilterOption = 'all' | Modality

const FILTERS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'futsal', label: '🏟️ Futsal' },
  { key: 'society', label: '⚽ Society' },
  { key: 'campo', label: '🌿 Campo' },
]

const MODALITIES: Modality[] = ['futsal', 'society', 'campo']

export default function CourtsScreen() {
  const { user } = useAuth()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterOption>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Court | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [modality, setModality] = useState<Modality>('futsal')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (filterVal: FilterOption = filter) => {
    try {
      const data = await listCourts(filterVal === 'all' ? undefined : filterVal)
      setCourts(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as quadras.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setName('')
    setAddress('')
    setModality('futsal')
    setModalVisible(true)
  }

  function openEdit(court: Court) {
    setEditing(court)
    setName(court.name)
    setAddress(court.address)
    setModality(court.modality)
    setModalVisible(true)
  }

  async function handleSave() {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Atenção', 'Preencha nome e endereço.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateCourt(editing._id, { name: name.trim(), address: address.trim(), modality })
      } else {
        await createCourt({ name: name.trim(), address: address.trim(), modality })
      }
      setModalVisible(false)
      setLoading(true)
      await load()
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a quadra.')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(court: Court) {
    Alert.alert(
      'Remover quadra',
      `Remover "${court.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCourt(court._id)
              setCourts((prev) => prev.filter((c) => c._id !== court._id))
            } catch {
              Alert.alert('Erro', 'Não foi possível remover a quadra.')
            }
          },
        },
      ]
    )
  }

  async function handleFilterChange(f: FilterOption) {
    setFilter(f)
    setLoading(true)
    await load(f)
  }

  function renderCourt({ item }: { item: Court }) {
    const isOwner = user?.id === item.createdBy
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: MODALITY_BADGE_BG[item.modality] }]}>
            <Text style={[styles.badgeText, { color: MODALITY_BADGE_TEXT[item.modality] }]}>
              {MODALITY_ICONS[item.modality]} {MODALITY_LABELS[item.modality]}
            </Text>
          </View>
          {isOwner && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
                <Text style={styles.deleteBtnText}>🗑</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={styles.courtName}>{item.name}</Text>
        <Text style={styles.courtAddress}>{item.address}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quadras</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Cadastrar</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => handleFilterChange(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={courts}
          keyExtractor={(item) => item._id}
          renderItem={renderCourt}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load() }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma quadra cadastrada.</Text>
            </View>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Editar Quadra' : 'Nova Quadra'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Arena Central"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Endereço</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Ex: Rua das Flores, 123"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Modalidade</Text>
            <View style={styles.modalityRow}>
              {MODALITIES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modalityBtn, modality === m && styles.modalityBtnActive]}
                  onPress={() => setModality(m)}
                >
                  <Text style={[styles.modalityBtnText, modality === m && styles.modalityBtnTextActive]}>
                    {MODALITY_ICONS[m]} {MODALITY_LABELS[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{editing ? 'Salvar alterações' : 'Cadastrar quadra'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#F5B800' },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, color: colors.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },

  listContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(211,47,47,0.1)',
  },
  deleteBtnText: { fontSize: 14 },
  courtName: { fontSize: 16, fontWeight: '700', color: colors.text },
  courtAddress: { fontSize: 13, color: colors.textSecondary },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textMuted, fontSize: 15 },

  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalClose: { fontSize: 18, color: colors.textSecondary, padding: 4 },
  modalBody: { padding: 20, gap: 4 },

  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },

  modalityRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  modalityBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(255,106,0,0.08)' },
  modalityBtnText: { fontSize: 12, color: colors.textSecondary },
  modalityBtnTextActive: { color: colors.primary, fontWeight: '700' },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
