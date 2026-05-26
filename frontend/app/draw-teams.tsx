import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { getMyTeams, Team } from '../src/services/teamService'
import {
  drawTeamsStandalone,
  DrawPlayer,
  DrawnTeam,
  DrawResult,
} from '../src/services/drawService'
import { colors } from '../src/theme/colors'

const TEAM_SIZES = [3, 4, 5, 6, 7]

const TEAM_COLORS: { bg: string; border: string; text: string }[] = [
  { bg: 'rgba(245,184,0,0.12)',  border: '#F5B800', text: '#A07800' },
  { bg: 'rgba(33,150,243,0.12)', border: '#1976D2', text: '#1565C0' },
  { bg: 'rgba(76,175,80,0.12)',  border: '#388E3C', text: '#2E7D32' },
  { bg: 'rgba(156,39,176,0.12)', border: '#7B1FA2', text: '#6A1B9A' },
]

interface PlayerEntry extends DrawPlayer {
  id: string
}

let _idCounter = 0
function genId() { return String(++_idCounter) }

function StarPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} hitSlop={6}>
          <Text style={{ fontSize: 18, color: s <= value ? '#F5B800' : colors.border }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function DrawTeamsScreen() {
  const [teamSize, setTeamSize] = useState(5)
  const [players, setPlayers] = useState<PlayerEntry[]>([])
  const [newName, setNewName] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [result, setResult] = useState<DrawResult | null>(null)

  // Import modal
  const [importVisible, setImportVisible] = useState(false)
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [importTeamId, setImportTeamId] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (importVisible) {
      setLoadingTeams(true)
      getMyTeams()
        .then((data) => {
          setMyTeams(data)
          if (data.length > 0) setImportTeamId(data[0]._id)
        })
        .catch(() => {})
        .finally(() => setLoadingTeams(false))
    }
  }, [importVisible])

  function addPlayer() {
    const name = newName.trim()
    if (!name) return
    setPlayers((prev) => [...prev, { id: genId(), name, stars: 3 }])
    setNewName('')
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  function setStars(id: string, stars: number) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, stars } : p)))
  }

  function setName(id: string, name: string) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  async function handleDraw() {
    if (players.length < 2) {
      Alert.alert('Atenção', 'Adicione pelo menos 2 jogadores.')
      return
    }
    setDrawing(true)
    try {
      const data = await drawTeamsStandalone(
        players.map(({ name, stars }) => ({ name, stars })),
        teamSize
      )
      setResult(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível sortear os times.')
    } finally {
      setDrawing(false)
    }
  }

  // Import modal handlers
  function toggleMember(memberId: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  function confirmImport() {
    const team = myTeams.find((t) => t._id === importTeamId)
    if (!team) return
    const existingNames = new Set(players.map((p) => p.name.toLowerCase()))
    const toAdd = team.members
      .filter((m) => selectedMembers.has(m._id) && !existingNames.has(m.name.toLowerCase()))
      .map((m) => ({ id: genId(), name: m.name, stars: 3 } as PlayerEntry))
    setPlayers((prev) => [...prev, ...toAdd])
    setSelectedMembers(new Set())
    setImportVisible(false)
  }

  // ── Result view
  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Times Sorteados</Text>
        </View>
        <ScrollView contentContainerStyle={styles.resultBody}>
          {result.teams.map((team, idx) => {
            const c = TEAM_COLORS[idx % TEAM_COLORS.length]
            return (
              <View
                key={team.name}
                style={[styles.teamCard, { backgroundColor: c.bg, borderColor: c.border }]}
              >
                <View style={styles.teamCardHeader}>
                  <Text style={[styles.teamCardName, { color: c.text }]}>{team.name}</Text>
                  <Text style={[styles.teamCardAvg, { color: c.text }]}>
                    ⭐ {team.avgStars.toFixed(1)} média
                  </Text>
                </View>
                {team.players.map((p) => (
                  <View key={p.name} style={styles.resultPlayerRow}>
                    <Text style={styles.resultPlayerName}>{p.name}</Text>
                    <Text style={styles.resultPlayerStars}>
                      {'★'.repeat(p.stars)}{'☆'.repeat(5 - p.stars)}
                    </Text>
                  </View>
                ))}
              </View>
            )
          })}

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 24 }]}
            onPress={handleDraw}
            disabled={drawing}
          >
            {drawing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>🔀 Sortear Novamente</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setResult(null)}
          >
            <Text style={styles.secondaryBtnText}>✏️ Editar Jogadores</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // ── Form view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sortear Times</Text>
        <TouchableOpacity
          style={styles.importBtn}
          onPress={() => { setSelectedMembers(new Set()); setImportVisible(true) }}
        >
          <Text style={styles.importBtnText}>📋 Importar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.formBody}>
        {/* Team size */}
        <Text style={styles.sectionLabel}>Tamanho do time</Text>
        <View style={styles.sizeRow}>
          {TEAM_SIZES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sizeChip, teamSize === s && styles.sizeChipActive]}
              onPress={() => setTeamSize(s)}
            >
              <Text style={[styles.sizeChipText, teamSize === s && styles.sizeChipTextActive]}>
                {s}v{s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Add player */}
        <Text style={styles.sectionLabel}>Jogadores ({players.length})</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome do jogador"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addPlayer}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Player list */}
        {players.map((p) => (
          <View key={p.id} style={styles.playerCard}>
            <View style={styles.playerCardTop}>
              <TextInput
                style={styles.playerNameInput}
                value={p.name}
                onChangeText={(v) => setName(p.id, v)}
                placeholder="Nome"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity onPress={() => removePlayer(p.id)} hitSlop={8}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <StarPicker value={p.stars} onChange={(v) => setStars(p.id, v)} />
          </View>
        ))}

        {players.length === 0 && (
          <View style={styles.emptyPlayers}>
            <Text style={styles.emptyPlayersText}>
              Adicione jogadores acima ou importe de um time.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 24 }, drawing && { opacity: 0.6 }]}
          onPress={handleDraw}
          disabled={drawing}
        >
          {drawing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              🎲 Sortear {players.length > 0 ? `(${players.length} jogadores)` : ''}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Import Modal */}
      <Modal
        visible={importVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setImportVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Importar de Time</Text>
            <TouchableOpacity onPress={() => setImportVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingTeams ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : myTeams.length === 0 ? (
            <View style={styles.emptyPlayers}>
              <Text style={styles.emptyPlayersText}>Você não tem times cadastrados.</Text>
            </View>
          ) : (
            <>
              {/* Team chips */}
              {myTeams.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.importTeamChips}
                >
                  {myTeams.map((t) => (
                    <TouchableOpacity
                      key={t._id}
                      style={[styles.sizeChip, importTeamId === t._id && styles.sizeChipActive]}
                      onPress={() => { setImportTeamId(t._id); setSelectedMembers(new Set()) }}
                    >
                      <Text style={[styles.sizeChipText, importTeamId === t._id && styles.sizeChipTextActive]}>
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Members */}
              <FlatList
                data={myTeams.find((t) => t._id === importTeamId)?.members ?? []}
                keyExtractor={(m) => m._id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 8 }}
                renderItem={({ item }) => {
                  const checked = selectedMembers.has(item._id)
                  return (
                    <TouchableOpacity
                      style={[styles.memberRow, checked && styles.memberRowChecked]}
                      onPress={() => toggleMember(item._id)}
                    >
                      <Text style={styles.memberCheck}>{checked ? '☑' : '☐'}</Text>
                      <Text style={styles.memberName}>{item.name}</Text>
                    </TouchableOpacity>
                  )
                }}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { margin: 20 }]}
                onPress={confirmImport}
                disabled={selectedMembers.size === 0}
              >
                <Text style={styles.primaryBtnText}>
                  Adicionar {selectedMembers.size > 0 ? `${selectedMembers.size} ` : ''}jogadores
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  importBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  importBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },

  formBody: { padding: 20, gap: 8, paddingBottom: 60 },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 8 },

  sizeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sizeChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(255,106,0,0.08)' },
  sizeChipText: { fontSize: 14, color: colors.textSecondary },
  sizeChipTextActive: { color: colors.primary, fontWeight: '700' },

  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
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
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  playerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  playerCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerNameInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  removeText: { color: colors.error, fontSize: 16 },

  emptyPlayers: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  emptyPlayersText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: '600' },

  // Result
  resultBody: { padding: 20, gap: 12 },
  teamCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    gap: 8,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  teamCardName: { fontSize: 18, fontWeight: '800' },
  teamCardAvg: { fontSize: 13, fontWeight: '600' },
  resultPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  resultPlayerName: { fontSize: 14, color: colors.text },
  resultPlayerStars: { fontSize: 14, color: '#F5B800' },

  // Modal
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
  importTeamChips: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberRowChecked: { borderColor: colors.primary, backgroundColor: 'rgba(255,106,0,0.06)' },
  memberCheck: { fontSize: 20 },
  memberName: { fontSize: 15, color: colors.text },
})
