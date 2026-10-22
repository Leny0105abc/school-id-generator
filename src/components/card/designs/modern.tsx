import { textOn, tint } from '@/lib/color'
import { BackNote, EmergencyInfo, HolderSignature, PersonalDetails, QrAndPrincipal } from '../back-parts'
import { FitText } from '../FitText'
import { CardSurface, Logo, Photo } from '../parts'
import { cardText, schoolContactLine } from '../text'
import { mm, pt, type CardProps } from '../types'

// Modern: slanted color block behind a rounded photo, left-aligned school header,
// role in large accent letters, and an accent stripe down the right edge.

export function ModernFront({ person, settings, images }: CardProps) {
  const t = cardText(person, settings)
  const primary = settings.primaryColor
  const onPrimary = textOn(primary)

  return (
    <CardSurface>
      <div
        style={{
          position: 'absolute',
          inset: `0 0 auto 0`,
          height: mm(42),
          background: primary,
          clipPath: 'polygon(0 0, 100% 0, 100% 62%, 0 100%)',
        }}
      />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: mm(2), background: t.accent }} />

      {/* Header */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: mm(1.2),
          padding: `${mm(2.6)} ${mm(4)} 0 ${mm(2.6)}`,
          color: onPrimary,
        }}
      >
        <Logo src={images.logoLeft} sizeMm={9.5} />
        {images.logoRight && <Logo src={images.logoRight} sizeMm={9.5} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {t.header.slice(0, 2).map((line, i) => (
            <FitText key={i} text={line} maxPt={4} minPt={3} style={{ fontWeight: 500, opacity: 0.9 }} />
          ))}
          <FitText
            text={t.schoolName}
            maxPt={7}
            minPt={4.4}
            maxLines={2}
            lineHeight={1.05}
            style={{ fontWeight: 800, textTransform: 'uppercase', marginTop: mm(0.3) }}
          />
        </div>
      </div>

      {/* Photo */}
      <Photo
        src={images.photo}
        style={{
          position: 'relative',
          width: mm(30),
          height: mm(30),
          margin: `${mm(4.2)} auto 0`,
          border: `${mm(0.9)} solid #ffffff`,
          borderRadius: mm(3.5),
          boxShadow: `0 ${mm(0.4)} ${mm(1.2)} rgb(0 0 0 / 0.18)`,
        }}
      />

      {/* Name and details */}
      <div style={{ position: 'relative', padding: `0 ${mm(4)} 0 ${mm(3)}`, textAlign: 'center' }}>
        <div style={{ height: mm(9), marginTop: mm(2), display: 'flex', alignItems: 'center' }}>
          <FitText
            text={t.name}
            maxPt={11}
            minPt={6}
            maxLines={2}
            lineHeight={1.08}
            style={{ fontWeight: 800, width: '100%', color: '#0f172a' }}
          />
        </div>
        <FitText
          text={t.detail}
          maxPt={7}
          minPt={4.8}
          style={{ fontWeight: 700, color: t.accent, marginTop: mm(0.7) }}
        />
        {t.subDetail && (
          <FitText text={t.subDetail} maxPt={5.6} minPt={4.2} style={{ fontWeight: 500, color: '#4b5563' }} />
        )}
        <div
          style={{
            display: 'inline-block',
            marginTop: mm(1.2),
            padding: `${mm(0.5)} ${mm(2)}`,
            borderRadius: mm(5),
            background: tint(primary, 0.88),
            color: primary,
            fontSize: pt(6.2),
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}
        >
          {t.idLabel} {t.idNumber}
        </div>
      </div>

      {/* Role */}
      <div
        style={{
          position: 'absolute',
          left: mm(3),
          right: mm(4),
          bottom: mm(3),
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: mm(2),
          borderTop: `${mm(0.4)} solid ${tint(t.accent, 0.6)}`,
          paddingTop: mm(1.4),
        }}
      >
        <FitText
          text={t.role}
          maxPt={13}
          minPt={7}
          style={{ fontWeight: 800, letterSpacing: '0.1em', color: t.accent, flex: 1, minWidth: 0 }}
        />
        {t.schoolYear && (
          <div style={{ fontSize: pt(5.2), fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', paddingBottom: mm(0.6) }}>
            {t.schoolYear}
          </div>
        )}
      </div>
    </CardSurface>
  )
}

export function ModernBack({ person, settings, images }: CardProps) {
  const t = cardText(person, settings)
  const primary = settings.primaryColor
  const school = schoolContactLine(settings)

  return (
    <CardSurface style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: mm(2), background: t.accent }} />

      <div style={{ padding: `${mm(3)} ${mm(4.5)} 0 ${mm(3)}`, display: 'flex', alignItems: 'center', gap: mm(1.5) }}>
        <Logo src={images.logoLeft} sizeMm={7} />
        <div style={{ flex: 1, minWidth: 0, color: primary }}>
          <FitText text={t.schoolName} maxPt={6.2} minPt={4} maxLines={2} lineHeight={1.05} style={{ fontWeight: 800, textTransform: 'uppercase' }} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${mm(2)} ${mm(4.5)} ${mm(2)} ${mm(3)}` }}>
        <EmergencyInfo
          person={person}
          accent={t.accent}
          style={{ background: tint(primary, 0.92), borderRadius: mm(2), padding: `${mm(1.8)} ${mm(2)}` }}
        />
        <PersonalDetails person={person} settings={settings} />
        <HolderSignature style={{ marginTop: mm(4) }} />
        <QrAndPrincipal person={person} settings={settings} images={images} style={{ flex: 1, marginTop: mm(1.2) }} />
        <BackNote settings={settings} style={{ marginTop: mm(1.2) }} />
      </div>

      <div style={{ padding: `0 ${mm(4.5)} ${mm(2.6)} ${mm(3)}`, textAlign: 'center' }}>
        <div style={{ borderTop: `${mm(0.3)} solid ${tint(primary, 0.6)}`, marginBottom: mm(1) }} />
        {school && <FitText text={school} maxPt={4.3} minPt={3.3} maxLines={2} style={{ color: '#374151' }} />}
        {t.schoolYear && (
          <div style={{ fontSize: pt(4.8), fontWeight: 700, color: primary, marginTop: mm(0.3) }}>
            Valid for {t.schoolYear}
          </div>
        )}
      </div>
    </CardSurface>
  )
}
