import { textOn } from '@/lib/color'
import { FitText } from '../FitText'
import { BackNote, EmergencyInfo, HolderSignature, PersonalDetails, QrAndPrincipal } from '../back-parts'
import { CardSurface, Logo, Photo } from '../parts'
import { cardText, schoolContactLine } from '../text'
import { mm, pt, type CardProps } from '../types'

// Classic: colored header with both logos, centered square photo, colored role band.

export function ClassicFront({ person, settings, images }: CardProps) {
  const t = cardText(person, settings)
  const primary = settings.primaryColor
  const onPrimary = textOn(primary)
  const onAccent = textOn(t.accent)

  return (
    <CardSurface>
      {/* Header */}
      <div
        style={{
          height: mm(21),
          background: primary,
          color: onPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: mm(1.2),
          padding: `0 ${mm(2)}`,
          boxSizing: 'border-box',
        }}
      >
        <Logo src={images.logoLeft} sizeMm={11} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          {t.header.map((line, i) => (
            <FitText key={i} text={line} maxPt={4.4} minPt={3.2} style={{ fontWeight: 500, opacity: 0.92 }} />
          ))}
          <FitText
            text={t.schoolName}
            maxPt={7.6}
            minPt={4.6}
            maxLines={2}
            lineHeight={1.05}
            style={{ fontWeight: 800, textTransform: 'uppercase', marginTop: mm(0.5) }}
          />
        </div>
        <Logo src={images.logoRight} sizeMm={11} />
      </div>
      <div style={{ height: mm(1.2), background: t.accent }} />

      {/* Photo */}
      <Photo
        src={images.photo}
        style={{
          width: mm(28),
          height: mm(28),
          margin: `${mm(3.2)} auto 0`,
          border: `${mm(0.6)} solid ${primary}`,
          borderRadius: mm(1),
        }}
      />

      {/* Name and details */}
      <div style={{ padding: `0 ${mm(2.5)}`, textAlign: 'center' }}>
        <div
          style={{
            height: mm(9),
            marginTop: mm(1.8),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FitText
            text={t.name}
            maxPt={11}
            minPt={6}
            maxLines={2}
            lineHeight={1.08}
            style={{ fontWeight: 800, width: '100%', color: '#0f172a' }}
          />
        </div>
        <div style={{ fontSize: pt(6.6), fontWeight: 600, color: '#374151', marginTop: mm(0.8) }}>
          {t.idLabel}: <span style={{ fontWeight: 700, letterSpacing: '0.03em' }}>{t.idNumber}</span>
        </div>
        <FitText
          text={t.detail}
          maxPt={7}
          minPt={4.8}
          style={{ fontWeight: 700, color: t.accent, marginTop: mm(0.6) }}
        />
        {t.subDetail && (
          <FitText text={t.subDetail} maxPt={5.6} minPt={4.2} style={{ fontWeight: 500, color: '#4b5563' }} />
        )}
      </div>

      {/* Role band */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: mm(10.5),
          background: t.accent,
          color: onAccent,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <FitText
          text={t.role}
          maxPt={12.5}
          minPt={7}
          style={{ fontWeight: 800, letterSpacing: '0.14em', width: '90%' }}
        />
        {t.schoolYear && <div style={{ fontSize: pt(5.4), fontWeight: 600, opacity: 0.95 }}>{t.schoolYear}</div>}
      </div>
    </CardSurface>
  )
}

export function ClassicBack({ person, settings, images }: CardProps) {
  const t = cardText(person, settings)
  const primary = settings.primaryColor
  const onPrimary = textOn(primary)
  const school = schoolContactLine(settings)

  return (
    <CardSurface style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: mm(2.2), background: primary, flexShrink: 0 }} />
      <div style={{ height: mm(0.8), background: t.accent, flexShrink: 0 }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${mm(2.6)} ${mm(3)} ${mm(2)}` }}>
        <EmergencyInfo person={person} accent={t.accent} />
        <PersonalDetails person={person} settings={settings} />
        <HolderSignature style={{ marginTop: mm(4.2) }} />
        <QrAndPrincipal person={person} settings={settings} images={images} style={{ flex: 1, marginTop: mm(1.5) }} />
        <BackNote settings={settings} style={{ marginTop: mm(1.5) }} />
      </div>

      <div
        style={{
          background: primary,
          color: onPrimary,
          padding: `${mm(1.4)} ${mm(2.5)}`,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <FitText text={t.schoolName} maxPt={5.6} minPt={4} style={{ fontWeight: 800, textTransform: 'uppercase' }} />
        {school && <FitText text={school} maxPt={4.3} minPt={3.3} maxLines={2} style={{ opacity: 0.92 }} />}
        {t.schoolYear && (
          <div style={{ fontSize: pt(4.6), fontWeight: 700, marginTop: mm(0.3) }}>Valid for {t.schoolYear}</div>
        )}
      </div>
    </CardSurface>
  )
}
