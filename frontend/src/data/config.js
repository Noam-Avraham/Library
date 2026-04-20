// Derived helpers built from family.config.json — do not edit here.
// To change names / places / colours, edit family.config.json at the project root.
import raw from '@familyConfig';

export const LIBRARY       = raw.library;
export const OWNERS        = raw.owners;
export const REVIEWERS     = raw.reviewers;

export const DEFAULT_OWNER = raw.owners.find(o => o.isDefault)?.name ?? raw.owners[0].name;
export const OTHER_OWNER   = raw.owners.find(o => o.isOther)?.name   ?? null;

export const OWNER_HOME_MAP = Object.fromEntries(
  raw.owners.filter(o => o.home).map(o => [o.name, o.home])
);

export const REVIEWER_NAMES  = raw.reviewers.map(r => r.name);

export const REVIEWER_COLORS = Object.fromEntries(
  raw.reviewers.map(r => [r.name, r.color])
);
