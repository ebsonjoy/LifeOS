import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Editable names with a keyboard- and touch-accessible list of saved choices.
export function SavedNameInput({
  label,
  name,
  options,
  value,
  defaultValue = '',
  onChange,
  placeholder,
  ariaLabel,
}: {
  label: string
  name?: string
  options: string[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const savedLabel =
    label === 'Exercise' ? 'Saved exercises' : 'Saved workout names'
  const [draft, setDraft] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  useEffect(() => {
    if (open && active >= 0)
      list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active, open])
  const text = value ?? draft
  const matches = options.filter((option) =>
    option.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  const change = (next: string) => {
    setDraft(next)
    onChange?.(next)
  }
  const choose = (next: string) => {
    change(next)
    setOpen(false)
    setActive(-1)
  }
  return (
    <div
      className="field saved-name-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false)
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="saved-name-control">
        <input
          ref={input}
          id={id}
          name={name}
          required
          role="combobox"
          aria-label={ariaLabel || label}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={id + '-list'}
          aria-activedescendant={
            open && active >= 0 && matches[active]
              ? `${id}-option-${active}`
              : undefined
          }
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true)
            setQuery('')
            setActive(-1)
          }}
          onChange={(event) => {
            change(event.target.value)
            setQuery(event.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setOpen(true)
              if (matches.length)
                setActive((index) =>
                  event.key === 'ArrowDown'
                    ? (index + 1) % matches.length
                    : index <= 0
                      ? matches.length - 1
                      : index - 1,
                )
            } else if (
              event.key === 'Enter' &&
              open &&
              active >= 0 &&
              matches[active]
            ) {
              event.preventDefault()
              choose(matches[active])
            } else if (event.key === 'Escape' && open) {
              event.preventDefault()
              event.stopPropagation()
              setOpen(false)
              setActive(-1)
            }
          }}
        />
        <button
          type="button"
          className="saved-name-toggle"
          aria-label={`Show ${savedLabel.toLowerCase()}`}
          aria-expanded={open}
          aria-controls={id + '-list'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            input.current?.focus()
            setQuery('')
            setActive(-1)
            setOpen(!open)
          }}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      {open && (
        <div className="saved-name-popup">
          <div className="saved-name-caption">
            Saved names · or type a new one
          </div>
          <ul
            id={id + '-list'}
            role="listbox"
            aria-label={savedLabel}
            ref={list}
          >
            {matches.map((option, index) => (
              <li
                id={`${id}-option-${index}`}
                key={option}
                role="option"
                aria-selected={active === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option}
              </li>
            ))}
          </ul>
          {!matches.length && (
            <p className="saved-name-empty">
              {options.length
                ? 'No matching saved names. You can use what you typed.'
                : 'Names you save will appear here next time.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
