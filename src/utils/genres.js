// Canonical genre list — single source of truth for the add-game form and the
// genre filters on Game List / Library. Keep in sync with the RAWG mapping in
// GameForm.jsx (mapGenre).
export const GENRES = [
  'RPG',
  'Action Adventure',
  'FPS',
  'Racing',
  'Strategy',
  'Indie',
  'Sports',
  'Horror',
  'Platformer',
  'Simulation',
  'Fighting',
  'Arcade',
  'Puzzle',
  'MMO',
  'Card',
]

// Full option list for a genre <select>, merging the canonical genres with any
// extra genres already present in the data (e.g. legacy values), de-duplicated.
export const genreOptions = (presentGenres = []) => {
  const seen = new Set()
  const out = []
  for (const g of [...GENRES, ...presentGenres]) {
    if (!g || seen.has(g)) continue
    seen.add(g)
    out.push(g)
  }
  return out
}
