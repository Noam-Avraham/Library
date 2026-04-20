import { DEFAULT_OWNER, OTHER_OWNER, OWNER_HOME_MAP } from './config.js';

export function sortedMembers(dbMembers) {
  return [
    ...dbMembers.filter(m => m.name === DEFAULT_OWNER),
    ...dbMembers.filter(m => m.name !== DEFAULT_OWNER && m.name !== OTHER_OWNER)
               .sort((a, b) => a.name.localeCompare(b.name, 'he')),
    ...(OTHER_OWNER ? dbMembers.filter(m => m.name === OTHER_OWNER) : []),
  ];
}

export function locationOptions() {
  const homes = [...new Set(Object.values(OWNER_HOME_MAP))];
  return [...homes, 'אחר'];
}
