import { Loader2 } from 'lucide-react'
import { Brand } from '../brand/Brand'
import './loading.css'

export function LoadingStatus({ label }: { label: string }) {
  return (
    <p className="loading-status" role="status">
      <Loader2 size={17} aria-hidden="true" />
      <span>{label}</span>
    </p>
  )
}

export function WorkspaceLoading({
  label = 'Opening your space…',
}: {
  label?: string
}) {
  return (
    <div className="life workspace-loading">
      <div className="workspace-loading-card">
        <Brand tagline />
        <div className="loading-track" aria-hidden="true">
          <span />
        </div>
        <LoadingStatus label={label} />
        <p className="loading-hint">A little space for your next small step.</p>
      </div>
    </div>
  )
}

export function PageLoading({ name = 'page' }: { name?: string }) {
  return (
    <section className="page-loading" aria-label={`Loading ${name}`}>
      <LoadingStatus label={`Opening ${name}…`} />
      <div className="loading-placeholder" aria-hidden="true">
        <div className="loading-line loading-heading" />
        <div className="loading-line loading-description" />
        <div className="loading-card-grid">
          {[0, 1, 2].map((item) => (
            <div className="loading-card" key={item}>
              <div className="loading-line" />
              <div className="loading-line loading-value" />
              <div className="loading-line" />
            </div>
          ))}
        </div>
        <div className="loading-card loading-content">
          <div className="loading-line loading-heading" />
          {[0, 1, 2].map((item) => (
            <div className="loading-row" key={item} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function RecordsLoading() {
  return (
    <div className="records-loading">
      <LoadingStatus label="Loading your records…" />
      <div className="loading-placeholder" aria-hidden="true">
        <div className="loading-line" />
        <div className="loading-line" />
        <div className="loading-line" />
      </div>
    </div>
  )
}
