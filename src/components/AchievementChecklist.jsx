// Renders a game's achievement catalog as a checklist. Rarest (most skill-y)
// achievements come first, each with a rarity badge derived from the global
// unlock percent. `selected` is a Set of achievement ids; `onToggle(id)` flips one.
export default function AchievementChecklist({ catalog, selected, onToggle, emptyHint }) {
  if (!catalog || catalog.length === 0) {
    return (
      <div className="ach-empty">
        {emptyHint || 'No achievements found for this game.'}
      </div>
    )
  }

  const rarityClass = (percent) => {
    if (percent < 5) return 'ach-rarity-legendary'
    if (percent < 20) return 'ach-rarity-rare'
    if (percent < 50) return 'ach-rarity-uncommon'
    return 'ach-rarity-common'
  }

  return (
    <div className="ach-list">
      {catalog.map(a => {
        const checked = selected.has(a.id)
        return (
          <label key={a.id} className={`ach-row ${checked ? 'ach-row-checked' : ''}`}>
            <input
              type="checkbox"
              className="ach-checkbox"
              checked={checked}
              onChange={() => onToggle(a.id)}
            />
            {a.image && (
              <img src={a.image} alt="" className="ach-icon"
                onError={e => e.target.style.display = 'none'} />
            )}
            <div className="ach-body">
              <div className="ach-name">{a.name}</div>
              {a.description && <div className="ach-desc">{a.description}</div>}
            </div>
            <div className="ach-side">
              <span className={`ach-rarity ${rarityClass(a.percent)}`}>
                {a.percent < 100 ? `${a.percent.toFixed(1)}%` : '100%'}
              </span>
              <span className="ach-weight" title="Skill points (rarer = more)">
                +{a.weight}
              </span>
            </div>
          </label>
        )
      })}
    </div>
  )
}
