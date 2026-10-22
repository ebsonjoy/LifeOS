export function Brand({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className="lifeos-brand">
      <img src="/favicon.svg" width="42" height="42" alt="" />
      <span>
        <span className="lifeos-wordmark">
          Life<span>OS</span>
          <i aria-hidden="true">.</i>
        </span>
        {tagline && <small>A little better, every day.</small>}
      </span>
    </span>
  )
}
