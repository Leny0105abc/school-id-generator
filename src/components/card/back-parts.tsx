import type { CSSProperties } from 'react'
import type { PersonInput, Settings } from '@/lib/types'
import { FitText } from './FitText'
import { Caption } from './parts'
import { cardText } from './text'
import { QrCode } from './QrCode'
import { mm, pt, type CardImages } from './types'

// Building blocks shared by the back of every design.

export function EmergencyInfo({ person, accent, style }: { person: PersonInput; accent: string; style?: CSSProperties }) {
  const hasContact = person.emergencyName || person.emergencyPhone
  const contactLine = [person.emergencyRelationship, person.emergencyPhone].filter(Boolean).join(' · ')
  return (
    <div style={style}>
      <Caption color={accent}>In case of emergency, please notify</Caption>
      <FitText
        text={hasContact ? person.emergencyName || '—' : '________________________'}
        maxPt={7.6}
        minPt={5}
        style={{ fontWeight: 700, marginTop: mm(0.6) }}
      />
      {contactLine && (
        <FitText text={contactLine} maxPt={6.2} minPt={4.5} style={{ fontWeight: 500, color: '#374151' }} />
      )}
      {person.address && (
        <>
          <Caption style={{ marginTop: mm(1.4) }}>Address</Caption>
          <FitText
            text={person.address}
            maxPt={5.8}
            minPt={4.2}
            maxLines={2}
            style={{ fontWeight: 500, color: '#1f2937', marginTop: mm(0.3) }}
          />
        </>
      )}
    </div>
  )
}

export function PersonalDetails({ person, settings }: { person: PersonInput; settings: Settings }) {
  const { birthDate } = cardText(person, settings)
  const details = [
    birthDate && { label: 'Birth date', value: birthDate },
    person.bloodType && { label: 'Blood type', value: person.bloodType },
  ].filter(Boolean) as { label: string; value: string }[]
  if (details.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: mm(3), marginTop: mm(1.6) }}>
      {details.map((d) => (
        <div key={d.label} style={{ minWidth: 0 }}>
          <Caption>{d.label}</Caption>
          <div style={{ fontSize: pt(6), fontWeight: 700, marginTop: mm(0.3), whiteSpace: 'nowrap' }}>{d.value}</div>
        </div>
      ))}
    </div>
  )
}

export function HolderSignature({ style }: { style?: CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ borderTop: '0.25mm solid #374151' }} />
      <Caption style={{ marginTop: mm(0.5), textAlign: 'center' }}>Cardholder's signature</Caption>
    </div>
  )
}

/** QR code on the left, principal's signature on the right. */
export function QrAndPrincipal({
  person,
  settings,
  images,
  style,
}: {
  person: PersonInput
  settings: Settings
  images: CardImages
  style?: CSSProperties
}) {
  const { idNumber } = cardText(person, settings)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: settings.showQr ? 'space-between' : 'center',
        gap: mm(2),
        ...style,
      }}
    >
      {settings.showQr && (
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <QrCode value={idNumber} sizeMm={19} />
          <div style={{ fontSize: pt(4.6), fontWeight: 600, marginTop: mm(0.3), letterSpacing: '0.03em' }}>
            {idNumber}
          </div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, maxWidth: mm(30), textAlign: 'center' }}>
        <div style={{ height: mm(9), display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          {images.signature && (
            <img
              src={images.signature}
              alt=""
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}
        </div>
        <div style={{ borderTop: '0.25mm solid #111827', marginTop: mm(-1.2) }} />
        <FitText
          text={settings.principalName || 'Name of Principal'}
          maxPt={5.8}
          minPt={4}
          style={{ fontWeight: 700, marginTop: mm(0.5) }}
        />
        <FitText text={settings.principalTitle} maxPt={4.8} minPt={3.6} style={{ color: '#4b5563' }} />
      </div>
    </div>
  )
}

export function BackNote({ settings, style }: { settings: Settings; style?: CSSProperties }) {
  if (!settings.backNote) return null
  return (
    <FitText
      text={settings.backNote}
      maxPt={4.4}
      minPt={3.4}
      maxLines={3}
      lineHeight={1.2}
      style={{ textAlign: 'center', color: '#4b5563', fontStyle: 'italic', ...style }}
    />
  )
}
