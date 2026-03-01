import { colors } from '../theme/colors';

export function getTeamColor(team) {
  return team === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;
}

export function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
