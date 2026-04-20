import { OWNER_HOME_MAP, OTHER_OWNER } from './config.js';

export function expectedHome(owner) {
  return OWNER_HOME_MAP[owner] ?? null;
}

export function isWrongLocation(book) {
  if (!book.owner || book.owner === OTHER_OWNER) return false;
  const home = expectedHome(book.owner);
  if (!home) return false;
  return book.location !== home;
}
