import { LevelConfig } from '../types';

export const LEVEL_CONFIG: LevelConfig[] = [
  { name: 'SIGNAL', order: 0, threshold: 0, description: 'Sinal recebido. O início da jornada.', benefits: ['Acesso básico'] },
  { name: 'FREQUENCY', order: 1, threshold: 500, description: 'Você sintonizou a frequência PUPA.', benefits: ['Benefício 1'] },
  { name: 'RAVER', order: 2, threshold: 1500, description: 'Raver do movimento underground.', benefits: ['Benefício 2'] },
  { name: 'PUPA', order: 3, threshold: 3000, description: 'Membro oficial da cultura PUPA.', benefits: ['Benefício 3'] },
  { name: 'INNER', order: 4, threshold: 6000, description: 'Aproximando-se do núcleo.', benefits: ['Benefício 4'] },
  { name: 'INNER CIRCLE', order: 5, threshold: 10000, description: 'O núcleo do movimento.', benefits: ['Benefício 5', 'Acesso Restrito'] }
];

export function getLevelInfo(points: number) {
  let currentLevelIndex = 0;
  for (let i = 0; i < LEVEL_CONFIG.length; i++) {
    if (points >= LEVEL_CONFIG[i].threshold) {
      currentLevelIndex = i;
    } else {
      break;
    }
  }

  const currentLevel = LEVEL_CONFIG[currentLevelIndex];
  const nextLevel = currentLevelIndex < LEVEL_CONFIG.length - 1 ? LEVEL_CONFIG[currentLevelIndex + 1] : null;
  const pointsToNext = nextLevel ? nextLevel.threshold - points : 0;
  const progressPercent = nextLevel 
    ? ((points - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100 
    : 100;

  return {
    currentLevel,
    nextLevel,
    pointsToNext,
    progressPercent: Math.min(100, Math.max(0, progressPercent))
  };
}
