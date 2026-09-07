import { useState } from 'react'
import { Plus, BookOpen, Search, Edit2, Trash2, Calendar, Star } from 'lucide-react'
import { useJournal } from '../../hooks/useJournal'
import { useAuth } from '../../context/AuthContext'
import { getTodayString, formatLongDate, getTransformationStats } from '../../lib/dateUtils'
import {
  PageHeader,
  Button,
  Card,
  Modal,
  Input,
  Textarea,
  Select,
  ConfirmDialog,
  EmptyState,
} from '../../components/ui'
import type { JournalEntry } from '../../types'

export function Journal() {
  const { entries, createEntry, updateEntry, deleteEntry, isLoading } = useJournal()
  const { profile } = useAuth()

  const startDate = profile?.transformation_start_date || '2026-09-05'
  const targetDate = profile?.transformation_target_date || '2029-09-05'

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(getTodayString())
  const [mood, setMood] = useState('4')

  const resetForm = () => {
    setTitle('')
    setContent('')
    setEntryDate(getTodayString())
    setMood('4')
    setEditingEntry(null)
  }

  const openEdit = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setTitle(entry.title)
    setContent(entry.content)
    setEntryDate(entry.entry_date)
    setMood(String(entry.mood || 4))
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    if (editingEntry) {
      await updateEntry(editingEntry.id, {
        title: title.trim(),
        content: content.trim(),
        entry_date: entryDate,
        mood: parseInt(mood, 10),
      })
    } else {
      await createEntry({
        title: title.trim(),
        content: content.trim(),
        entry_date: entryDate,
        mood: parseInt(mood, 10),
      })
    }
    resetForm()
    setIsModalOpen(false)
  }

  const filteredEntries = entries.filter((entry) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchTitle = entry.title.toLowerCase().includes(q)
      const matchContent = entry.content.toLowerCase().includes(q)
      if (!matchTitle && !matchContent) return false
    }
    if (dateFilter && entry.entry_date !== dateFilter) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Personal Journal"
        description="A calm, distraction-free record of your thoughts, decisions, and mindset"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Entry
          </Button>
        }
      />

      {/* Search & Date Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1">
          <Input
            placeholder="Search entries by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-400" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline whitespace-nowrap"
          >
            Clear date filter
          </button>
        )}
      </div>

      {/* Journal Cards List */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-44 bg-zinc-800/40 rounded-2xl animate-pulse" />
          <div className="h-44 bg-zinc-800/40 rounded-2xl animate-pulse" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-7 h-7" />}
          title="No journal entries found"
          description="Capture today's insights, breakthrough thoughts, or struggles."
          actionLabel="Write First Entry"
          onAction={() => {
            resetForm()
            setIsModalOpen(true)
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const { currentDay } = getTransformationStats(startDate, targetDate, entry.entry_date)

            return (
              <Card
                key={entry.id}
                className="p-6 bg-zinc-900/80 border-zinc-800 hover:border-zinc-700/80 transition-all group"
              >
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-800/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-xs text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                        Day {currentDay}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {formatLongDate(entry.entry_date)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100 font-heading pt-1">
                      {entry.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.mood && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-amber-400 text-xs font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{entry.mood}/5</span>
                      </div>
                    )}

                    <button
                      onClick={() => openEdit(entry)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      title="Edit Entry"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingId(entry.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {entry.content}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingEntry ? 'Edit Journal Entry' : 'Write Journal Entry'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Breakthrough on distributed consensus"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
            <Select
              label="Mood Rating"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              options={[
                { label: '5 - Peak Flow / Victorious', value: '5' },
                { label: '4 - Strong / Consistent', value: '4' },
                { label: '3 - Normal / Average', value: '3' },
                { label: '2 - Challenging', value: '2' },
                { label: '1 - Heavy Struggle', value: '1' },
              ]}
            />
          </div>

          <Textarea
            label="Entry"
            placeholder="Write openly. Capture what worked, what needs improvement, and where your focus is heading..."
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingEntry ? 'Save Changes' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (deletingId) {
            await deleteEntry(deletingId)
            setDeletingId(null)
          }
        }}
        title="Delete Journal Entry"
        message="Are you sure you want to delete this journal entry?"
        confirmText="Delete"
      />
    </div>
  )
}
