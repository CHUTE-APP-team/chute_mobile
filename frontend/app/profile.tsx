import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/colors';
import { Rank, getPlayerStats, PlayerStats } from '@/src/services/userService';

const theme = colors;

const RANK_CONFIG: Record<Rank, { color: string; icon: string }> = {
  Bronze: { color: '#CD7F32', icon: '🥉' },
  Prata:  { color: '#A8A8A8', icon: '🥈' },
  Ouro:   { color: '#FFD700', icon: '⭐' },
  Elite:  { color: '#FF6A00', icon: '🔥' },
};

function xpForNextLevel(level: number): number {
  return level * 100;
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const baseXp    = (level - 1) * 100;
  const needed    = xpForNextLevel(level);
  const progress  = Math.min((xp - baseXp) / needed, 1);
  const anim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.xpBarTrack}>
      <Animated.View style={[styles.xpBarFill, { width: widthInterpolated }]} />
    </View>
  );
}

function LevelUpToast({ xpGained }: { xpGained: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
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

export default function ProfileScreen() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);

  const prevXpRef = useRef<number | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);

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
      getPlayerStats(user.id)
        .then(setStats)
        .catch(() => null);
    }, [user?.id])
  );

  if (isLoading || !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const rank       = user.rank ?? 'Bronze';
  const rankCfg    = RANK_CONFIG[rank];
  const baseXp     = (user.level - 1) * 100;
  const nextLevelXp = xpForNextLevel(user.level);

  return (
    <View style={styles.container}>
      {xpGained !== null && <LevelUpToast xpGained={xpGained} />}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.rankBadge, { borderColor: rankCfg.color }]}>
          <Text style={styles.rankIcon}>{rankCfg.icon}</Text>
          <Text style={[styles.rankLabel, { color: rankCfg.color }]}>{rank.toUpperCase()}</Text>
        </View>

        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.progressCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Level {user.level}</Text>
            <Text style={styles.xpLabel}>
              XP: {user.xp} / {baseXp + nextLevelXp}
            </Text>
          </View>

          <XpBar xp={user.xp} level={user.level} />

          <Text style={styles.xpHint}>
            {nextLevelXp - (user.xp - baseXp)} XP para o próximo nível
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Overall" value={String(stats?.overall ?? user.overall)} />
          <StatBox label="Level"   value={String(user.level)}   />
          <StatBox label="XP"      value={String(user.xp)}      />
        </View>

        <View style={styles.ratingCard}>
          <Text style={styles.ratingCardTitle}>Desempenho</Text>
          <View style={styles.ratingRow}>
            <RatingStat
              label="Média de notas"
              value={
                stats && stats.totalMatches > 0
                  ? `${stats.averageRating.toFixed(1)}/10`
                  : "—"
              }
              highlight={!!stats && stats.totalMatches > 0}
            />
            <View style={styles.ratingDivider} />
            <RatingStat
              label="Partidas avaliadas"
              value={stats ? String(stats.totalMatches) : "0"}
            />
          </View>
          {(!stats || stats.totalMatches === 0) && (
            <Text style={styles.ratingHint}>
              Participe de partidas para receber avaliações e melhorar seu overall
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={() => router.push('/(tabs)/ranking')}
          activeOpacity={0.85}
        >
          <Text style={styles.leaderboardButtonText}>🏆 Ver Ranking Global</Text>
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

function RatingStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.ratingStat}>
      <Text style={[styles.ratingStatValue, highlight && styles.ratingStatValueHighlight]}>
        {value}
      </Text>
      <Text style={styles.ratingStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 56,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 20,
    marginTop: 8,
  },
  rankIcon: { fontSize: 22 },
  rankLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 28,
  },
  progressCard: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  xpLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  xpBarTrack: {
    height: 10,
    backgroundColor: theme.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 5,
  },
  xpHint: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2,
  },
  ratingCard: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  ratingCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.border,
    marginHorizontal: 20,
  },
  ratingStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  ratingStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.textSecondary,
  },
  ratingStatValueHighlight: {
    color: theme.primary,
  },
  ratingStatLabel: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
  },
  ratingHint: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
  leaderboardButton: {
    marginTop: 20,
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  leaderboardButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.primary,
  },
  toast: {
    position: 'absolute',
    top: 72,
    alignSelf: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 99,
  },
  toastText: {
    color: theme.textOnPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
