import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router'
import { CardPreview } from '@/components/card/IdCard'
import { useCardImages } from '@/components/card/useCardImages'
import { db, useSettings } from '@/lib/db'
import { comparePeople } from '@/lib/people'
import type { CardDesign, Person } from '@/lib/types'

// Development only: large card previews for checking layout details.
// /dev/cards?i=0&w=420&design=modern
export default function DevCardsPage() {
  const [params] = useSearchParams()
  const settings = useSettings()
  const people = useLiveQuery(async () => (await db.people.toArray()).sort(comparePeople), [])
  const index = Number(params.get('i') ?? 0)
  const width = Number(params.get('w') ?? 420)
  const design = params.get('design')
  if (!settings || !people) return null
  const person = people[index]
  if (!person) return <p>No person at index {index}</p>
  const shown = design === 'classic' || design === 'modern' ? { ...settings, design: design as CardDesign } : settings
  return <Cards person={person} settings={shown} width={width} />
}

function Cards({ person, settings, width }: { person: Person; settings: NonNullable<ReturnType<typeof useSettings>>; width: number }) {
  const images = useCardImages(person.photoId)
  return (
    <div className="flex flex-wrap gap-6 bg-muted p-6">
      <CardPreview side="front" person={person} settings={settings} images={images} width={width} />
      <CardPreview side="back" person={person} settings={settings} images={images} width={width} />
    </div>
  )
}
