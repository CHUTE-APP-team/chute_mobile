import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { getMyTeams, Team } from '../src/services/teamService'
import {
  listStatSessions,
  createStatSession,
  updateStatSession,
  deleteStatSession,
  aggregateTeamStats,
  StatSession,
  StatPlayer,
  AggregatedPlayer,
  TeamStatsAggregate,
} from '../src/services/statSessionService'
import { colors } from '../src/theme/colors'

type Tab = 'table' | 'sessions'
type ScreenView = 'tabs' | 'entry'

const MONTH_NAMES = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
]

const MEDAL = ['🥇', '🥈', '🥉']

interface EntryPlayer extends StatPlayer {
  selected: boolean
}

export default function StatsScreen() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [loadingTeams, setLoadingTeams] = useState(true)

  const [tab, setTab] = useState<Tab>('table')
  const [screenView, setScreenView] = useState<ScreenView>('tabs')

  // Table
  const [aggregate, setAggregate] = useState<TeamStatsAggregate | null>(null)
  const [loadingAggregate, setLoadingAggregate] = useState(false)

  // Sessions
  const [sessions, setSessions] = useState<StatSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  // Entry form
  const [editingSession, setEditingSession] = useState<StatSession | null>(null)
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [entryLabel, setEntryLabel] = useState('')
  const [entryPlayers, setEntryPlayers] = useState<EntryPlayer[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [saving, setSaving] = useState(false)

  // Load teams
  useEffect(() => {
    getMyTeams()
      .then((data) => {
        setTeams(data)
        if (data.length > 0) setSelectedTeamId(data[0]._id)
      })
      .catch(() => {})
      .finally(() => setLoadingTeams(false))
  }, [])

  // Load data when team changes
  useEffect(() => {
    if (!selectedTeamId) return
    loadAggregate()
    loadSessions()
  }, [selectedTeamId])

  async function loadAggregate() {
    if (!selectedTeamId) return
    setLoadingAggregate(true)
    try {
      const data = await aggregateTeamStats(selectedTeamId)
      setAggregate(data)
    } catch {
      setAggregate(null)
    } finally {
      setLoadingAggregate(false)
    }
  }

  async function loadSessions() {
    if (!selectedTeamId) return
    setLoadingSessions(true)
    try {
      const data = await listStatSessions(selectedTeamId)
      setSessions(data)
    } catch {
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  function openNewEntry() {
    setEditingSession(null)
    setEntryDate(new Date().toISOString().slice(0, 10))
    setEntryLabel('')
    setEntryPlayers([])
    setNewPlayerName('')
    setScreenView('entry')
  }

  function openEditEntry(session: StatSession) {
    setEditingSession(session)
    setEntryDate(session.date.slice(0, 10))
    setEntryLabel(session.label ?? '')
    setEntryPlayers(
      session.players.map((p) => ({ ...p, selected: true }))
    )
    setNewPlayerName('')
    setScreenView('entry')
  }

  function addEntryPlayer() {
    const name = newPlayerName.trim()
    if (!name) return
    if (entryPlayers.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setNewPlayerName('')
      return
    }
    setEntryPlayers((prev) => [...prev, { name, goals: 0, assists: 0, selected: true }])
    setNewPlayerName('')
  }

  function togglePlayer(idx: number) {
    setEntryPlayers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p))
    )
  }

  function setPlayerGoals(idx: number, val: string) {
    const n = Math.max(0, parseInt(val, 10) || 0)
    setEntryPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, goals: n } : p)))
  }

  function setPlayerAssists(idx: number, val: string) {
    const n = Math.max(0, parseInt(val, 10) || 0)
    setEntryPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, assists: n } : p)))
  }

  function removePlayer(idx: number) {
    setEntryPlayers((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSaveEntry() {
    if (!selectedTeamId) return
    const selected = entryPlayers.filter((p) => p.selected)
    if (selected.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um jogador.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        teamId: selectedTeamId,
        date: entryDate,
        label: entryLabel.trim(),
        players: selected.map(({ name, goals, assists }) => ({ name, goals, assists })),
      }
      if (editingSession) {
        await updateStatSession(editingSession._id, {
          label: payload.label,
          date: payload.date,
          players: payload.players,
        })
      } else {
        await createStatSession(payload)
      }
      setScreenView('tabs')
      setTab('table')
      await Promise.all([loadAggregate(), loadSessions()])
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o racha.')
    } finally {
      setSaving(false)
    }
  }

  function confirmDeleteEntry(session: StatSession) {
    Alert.alert(
      'Remover racha',
      `Remover racha de ${formatDate(session.date)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStatSession(session._id)
              setScreenView('tabs')
              await Promise.all([loadAggregate(), loadSessions()])
            } catch {
              Alert.alert('Erro', 'Não foi possível remover o racha.')
            }
          },
        },
      ]
    )
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  function prevMonth() {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear((y) => y - 1) }
    else setFilterMonth((m) => m - 1)
  }

  function nextMonth() {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear((y) => y + 1) }
    else setFilterMonth((m) => m + 1)
  }

  const filteredSessions = sessions.filter((s) => {
    const d = new Date(s.date)
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear
  })

  // ── No teams state
  if (!loadingTeams && teams.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Estatísticas</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📊</Text>
          <Text style={styles.emptyStateTitle}>Nenhum time cadastrado</Text>
          <Text style={styles.emptyStateText}>Crie um time para começar a lançar estatísticas.</Text>
          <TouchableOpacity style={styles.emptyStateBtn} onPress={() => router.push('/(tabs)/teams')}>
            <Text style={styles.emptyStateBtnText}>Ir para Times</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Entry form
  if (screenView === 'entry') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreenView('tabs')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingSession ? 'Editar Racha' : 'Novo Racha'}</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView contentContainerStyle={styles.entryBody}>
          <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={entryDate}
            onChangeText={setEntryDate}
            placeholder="2026-05-25"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={styles.input}
            value={entryLabel}
            onChangeText={setEntryLabel}
            placeholder="Ex: Racha de sábado"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Jogadores</Text>

          {/* Add player input */}
          <View style={styles.addPlayerRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              placeholder="Nome do jogador"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={addEntryPlayer}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addPlayerBtn} onPress={addEntryPlayer}>
              <Text style={styles.addPlayerBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Player rows */}
          {entryPlayers.map((p, idx) => (
            <View key={idx} style={[styles.playerRow, !p.selected && { opacity: 0.45 }]}>
              <TouchableOpacity onPress={() => togglePlayer(idx)} style={styles.checkbox}>
                <Text style={styles.checkboxText}>{p.selected ? '☑' : '☐'}</Text>
              </TouchableOpacity>
              <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
              <TextInput
                style={[styles.statInput, !p.selected && styles.statInputDisabled]}
                value={String(p.goals)}
                onChangeText={(v) => setPlayerGoals(idx, v)}
                keyboardType="numeric"
                editable={p.selected}
                placeholder="G"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.statSep}>G</Text>
              <TextInput
                style={[styles.statInput, !p.selected && styles.statInputDisabled]}
                value={String(p.assists)}
                onChangeText={(v) => setPlayerAssists(idx, v)}
                keyboardType="numeric"
                editable={p.selected}
                placeholder="A"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.statSep}>A</Text>
              <TouchableOpacity onPress={() => removePlayer(idx)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveEntry}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {editingSession ? 'Atualizar Racha' : 'Salvar Racha'}
              </Text>
            )}
          </TouchableOpacity>

          {editingSession && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => confirmDeleteEntry(editingSession)}
            >
              <Text style={styles.deleteBtnText}>🗑 Remover Racha</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    )
  }

  // ── Main tabs view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estatísticas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNewEntry}>
          <Text style={styles.addBtnText}>+ Lançar</Text>
        </TouchableOpacity>
      </View>

      {/* Team selector */}
      {teams.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.teamChips}
        >
          {teams.map((t) => (
            <TouchableOpacity
              key={t._id}
              style={[styles.teamChip, selectedTeamId === t._id && styles.teamChipActive]}
              onPress={() => setSelectedTeamId(t._id)}
            >
              <Text style={[styles.teamChipText, selectedTeamId === t._id && styles.teamChipTextActive]}>
                {t.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'table' && styles.tabBtnActive]}
          onPress={() => setTab('table')}
        >
          <Text style={[styles.tabBtnText, tab === 'table' && styles.tabBtnTextActive]}>
            📊 Tabela Geral
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'sessions' && styles.tabBtnActive]}
          onPress={() => setTab('sessions')}
        >
          <Text style={[styles.tabBtnText, tab === 'sessions' && styles.tabBtnTextActive]}>
            📅 Por Racha
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {tab === 'table' ? (
        <ScrollView
          contentContainerStyle={styles.tableBody}
          refreshControl={
            <RefreshControl
              refreshing={loadingAggregate}
              onRefresh={loadAggregate}
              tintColor={colors.primary}
            />
          }
        >
          {loadingAggregate ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : !aggregate || aggregate.players.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text style={styles.emptyStateTitle}>Sem dados</Text>
              <Text style={styles.emptyStateText}>Lance o primeiro racha com "+ Lançar".</Text>
            </View>
          ) : (
            <>
              {/* Table header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: 28 }]}>#</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>Jogador</Text>
                <Text style={[styles.tableCell, styles.tableCellCenter, { width: 36 }]}>G</Text>
                <Text style={[styles.tableCell, styles.tableCellCenter, { width: 36 }]}>A</Text>
                <Text style={[styles.tableCell, styles.tableCellCenter, { width: 44 }]}>Total</Text>
                <Text style={[styles.tableCell, styles.tableCellCenter, { width: 48 }]}>Rachas</Text>
              </View>

              {aggregate.players.map((p, idx) => (
                <View
                  key={p.name}
                  style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}
                >
                  <Text style={[styles.tableCell, { width: 28, fontSize: 16 }]}>
                    {idx < 3 ? MEDAL[idx] : `${idx + 1}`}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.tableCell, styles.tableCellCenter, { width: 36 }]}>{p.goals}</Text>
                  <Text style={[styles.tableCell, styles.tableCellCenter, { width: 36 }]}>{p.assists}</Text>
                  <Text style={[styles.tableCell, styles.tableCellCenter, styles.tableCellBold, { width: 44 }]}>
                    {p.total}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellCenter, { width: 48, color: colors.textMuted }]}>
                    {p.sessions}
                  </Text>
                </View>
              ))}

              {/* Footer totals */}
              <View style={[styles.tableRow, styles.tableFooter]}>
                <Text style={[styles.tableCell, { width: 28 }]} />
                <Text style={[styles.tableCell, { flex: 1, color: colors.textSecondary }]}>
                  {aggregate.totalSessions} rachas
                </Text>
                <Text style={[styles.tableCell, styles.tableCellCenter, styles.tableCellBold, { width: 36 }]}>
                  {aggregate.players.reduce((s, p) => s + p.goals, 0)}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellCenter, styles.tableCellBold, { width: 36 }]}>
                  {aggregate.players.reduce((s, p) => s + p.assists, 0)}
                </Text>
                <Text style={[styles.tableCell, { width: 44 }]} />
                <Text style={[styles.tableCell, { width: 48 }]} />
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Month navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthBtn}>
              <Text style={styles.monthBtnText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[filterMonth]} {filterYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthBtn}>
              <Text style={styles.monthBtnText}>▶</Text>
            </TouchableOpacity>
          </View>

          {loadingSessions ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : filteredSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📅</Text>
              <Text style={styles.emptyStateText}>Nenhum racha neste mês.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredSessions}
              keyExtractor={(s) => s._id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => {
                const totalGoals = item.players.reduce((s, p) => s + p.goals, 0)
                const totalAssists = item.players.reduce((s, p) => s + p.assists, 0)
                const mvp = item.players.reduce(
                  (best, p) =>
                    p.goals + p.assists > (best ? best.goals + best.assists : -1) ? p : best,
                  null as StatPlayer | null
                )
                return (
                  <TouchableOpacity
                    style={styles.sessionCard}
                    onPress={() => openEditEntry(item)}
                  >
                    <View style={styles.sessionCardTop}>
                      <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
                      {item.label ? (
                        <Text style={styles.sessionLabel}>{item.label}</Text>
                      ) : null}
                    </View>
                    <View style={styles.sessionStats}>
                      <Text style={styles.sessionStat}>👥 {item.players.length}</Text>
                      <Text style={styles.sessionStat}>⚽ {totalGoals} gols</Text>
                      <Text style={styles.sessionStat}>🎯 {totalAssists} assists</Text>
                    </View>
                    {mvp && (
                      <Text style={styles.sessionMvp}>
                        🏆 MVP: {mvp.name} ({mvp.goals}G {mvp.assists}A)
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              }}
            />
          )}
        </View>
      )}
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

  backBtn: { padding: 4 },
  backBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  teamChips: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  teamChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  teamChipText: { fontSize: 13, color: colors.textSecondary },
  teamChipTextActive: { color: '#fff', fontWeight: '600' },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontSize: 13, color: colors.textSecondary },
  tabBtnTextActive: { color: '#fff', fontWeight: '700' },

  // Table
  tableBody: { padding: 16 },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tableRowAlt: { backgroundColor: 'rgba(255,255,255,0.6)' },
  tableFooter: {
    marginTop: 4,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableCell: { fontSize: 13, color: colors.text },
  tableCellCenter: { textAlign: 'center' },
  tableCellBold: { fontWeight: '700', color: colors.primary },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 20,
  },
  monthBtn: { padding: 8 },
  monthBtnText: { fontSize: 16, color: colors.primary },
  monthLabel: { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 120, textAlign: 'center' },

  // Session cards
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  sessionCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionDate: { fontSize: 14, fontWeight: '700', color: colors.text },
  sessionLabel: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  sessionStats: { flexDirection: 'row', gap: 12 },
  sessionStat: { fontSize: 13, color: colors.textSecondary },
  sessionMvp: { fontSize: 12, color: '#F5B800', fontWeight: '600' },

  // Entry form
  entryBody: { padding: 20, gap: 4, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 8 },
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
  addPlayerRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addPlayerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addPlayerBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: { width: 28 },
  checkboxText: { fontSize: 18 },
  playerName: { flex: 1, fontSize: 14, color: colors.text },
  statInput: {
    width: 44,
    textAlign: 'center',
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
  },
  statInputDisabled: { backgroundColor: colors.border, color: colors.textMuted },
  statSep: { fontSize: 11, color: colors.textMuted, marginRight: 2 },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 14, color: colors.error },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteBtnText: { color: colors.error, fontSize: 15, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyStateIcon: { fontSize: 40 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyStateText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 30 },
  emptyStateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyStateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
