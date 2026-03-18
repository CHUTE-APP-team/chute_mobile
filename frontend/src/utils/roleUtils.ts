export type UserRole = 'player' | 'host' | 'referee' | 'coach' | 'scout' | 'photographer';

interface RoleInfo {
  label: string;
  emoji: string;
}

const ROLE_MAP: Record<UserRole, RoleInfo> = {
  player:       { label: 'Jogador',    emoji: '👟' },
  host:         { label: 'Locador',    emoji: '🏟️' },
  referee:      { label: 'Árbitro',    emoji: '🧑‍⚖️' },
  coach:        { label: 'Técnico',    emoji: '📋' },
  scout:        { label: 'Olheiro',    emoji: '🔭' },
  photographer: { label: 'Fotógrafo', emoji: '📷' },
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_MAP[role]?.label ?? 'Jogador';
}

export function getRoleEmoji(role: UserRole): string {
  return ROLE_MAP[role]?.emoji ?? '⚽';
}

export function getRoleGreeting(role: UserRole): string {
  const { label, emoji } = ROLE_MAP[role] ?? ROLE_MAP.player;
  return `Olá, ${label} ${emoji}`;
}

export const ALL_ROLES: { value: UserRole; label: string; emoji: string }[] = Object.entries(
  ROLE_MAP
).map(([value, { label, emoji }]) => ({ value: value as UserRole, label, emoji }));
