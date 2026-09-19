/**
 * Retained conversation panes.
 *
 * One mounted pane per recently visited session keeps that session's scroller
 * alive, so returning to a session is a visibility swap rather than a rebuild.
 *
 * The retained order is the order panes were first opened and is never
 * rearranged. Moving a pane's DOM node resets the `scrollTop` the pane exists to
 * preserve — verified in Chromium: `insertBefore` zeroes the offset of the node
 * that moves, while appending a sibling, inserting one before it, hiding it, and
 * removing a sibling all leave it untouched. So visibility is decided by
 * comparing a pane's id with the active session, and visit recency is consulted
 * only to choose which pane to evict; no visit can move a pane.
 *
 * How many panes stay mounted is a growth bound, not a memory budget: the feed
 * is virtualized, so a pane mounts only its visible rows plus overscan however
 * long the session is, and the store retains every session's entries either way.
 * Eviction would thus save almost nothing while costing the one thing panes
 * exist for, so the bound stays generous.
 */
const RETAINED_SESSION_PANE_LIMIT = 8

/**
 * Where a session was left, in the three facts a returning pane needs.
 *
 * `anchorId` is the entry at the top of the viewport and `top` is the pixel
 * offset it was left at. The pane returns to the *entry* and falls back to the
 * offset only when that entry is gone, because a fresh pane's first pass lays
 * rows out from estimates: a pixel offset from a fully measured layout lands on
 * a different row, while an entry index is what the virtualizer's own
 * measurement corrections are built to hold in place.
 *
 * `following` is whether the reader was on the newest entry. It is recorded by
 * the reader's own scrolling rather than derived from geometry on the way back
 * in, for the same reason: while rows are estimated, a scrolled-up pane can
 * measure as if it were at the bottom and then be dragged down as the real
 * heights arrive.
 */
export interface SessionScrollMemory {
  anchorId: string | null
  top: number
  following: boolean
}

/**
 * Appends `sessionId` and, once the limit is exceeded, drops the least recently
 * visited pane other than the one just opened.
 *
 * `visits` must already hold this visit. The input array is returned unchanged
 * when the session is already retained, so a repeat selection keeps the identity
 * every pane subscribes to.
 */
export function retainSessionPane(
  retained: readonly string[],
  visits: ReadonlyMap<string, number>,
  sessionId: string,
): readonly string[] {
  if (retained.includes(sessionId)) {
    return retained
  }

  const next = [...retained, sessionId]
  // Only this function ever builds the array, so it can exceed the limit by one
  // at most; the active session is never the victim.
  if (next.length <= RETAINED_SESSION_PANE_LIMIT) {
    return next
  }

  let victimIndex = 0
  let victimVisit = Number.POSITIVE_INFINITY
  for (const [index, id] of next.entries()) {
    if (id === sessionId) {
      continue
    }
    // A pane whose visit was never recorded counts as the oldest.
    const visit = visits.get(id) ?? -1
    if (visit < victimVisit) {
      victimVisit = visit
      victimIndex = index
    }
  }
  next.splice(victimIndex, 1)
  return next
}