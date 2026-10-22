import { db, getSettings, newId, saveSettings } from './db'
import { preparePhoto, renderToBlob } from './photos/image'
import type { Person, PersonInput, PhotoRecord } from './types'

// Fictional people for trying the app. Names include Ñ, compound surnames and
// suffixes so the card layout gets exercised.
const LEARNERS: [string, string, string, string?][] = [
  ['Juan', 'Pascual', 'Dela Cruz', 'Jr.'],
  ['Maria Clara', 'Santos', 'Reyes'],
  ['Niño', 'Bautista', 'Peña'],
  ['Angelica', 'Mendoza', 'Garcia'],
  ['Mark Anthony', 'Ramos', 'Villanueva'],
  ['Kristine', 'Aquino', 'Castillo'],
  ['John Paul', 'Navarro', 'Domingo'],
  ['Althea', 'Flores', 'Mercado'],
  ['Carlo', 'Castro', 'Rivera'],
  ['Bea', 'Gonzales', 'Torres'],
  ['Miguel', 'Lopez', 'Fernandez'],
  ['Sofia', 'Valdez', 'De Leon'],
  ['Rafael', 'Cruz', 'Bautista', 'III'],
  ['Jasmine', 'Reyes', 'Santos'],
  ['Gabriel', 'Mercado', 'Aquino'],
  ['Maria Ysabella Francesca', 'Lim', 'Dela Cruz-Villanueva'],
  ['Paolo', 'Garcia', 'Mendoza'],
  ['Nicole', 'Torres', 'Navarro'],
  ['Joshua', 'Peña', 'Ramos'],
  ['Camille', 'Domingo', 'Flores'],
  ['Daniel', 'Rivera', 'Castro'],
  ['Patricia', 'Fernandez', 'Gonzales'],
  ['Ezekiel', 'De Leon', 'Lopez'],
  ['Andrea', 'Villanueva', 'Valdez'],
]

const TEACHERS: [string, string, string, string, string][] = [
  ['Rosario', 'Manalo', 'Villanueva', 'Master Teacher I', 'Mathematics'],
  ['Eduardo', 'Santos', 'Bautista', 'Teacher III', 'Science'],
  ['Liza', 'Ocampo', 'Fernandez', 'Teacher II', 'English'],
  ['Ramon', 'Cruz', 'Del Rosario', 'Teacher I', 'TLE'],
]

const SECTIONS: Record<number, { section: string; strand?: string }> = {
  7: { section: 'Sampaguita' },
  8: { section: 'Narra' },
  9: { section: 'Rizal' },
  10: { section: 'Mabini' },
  11: { section: 'Einstein', strand: 'STEM' },
  12: { section: 'Sy', strand: 'ABM' },
}

const BACKGROUNDS = ['#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff', '#ccfbf1', '#f3e8ff', '#ffedd5']
const CONTACTS: [string, string][] = [
  ['Elena', 'Mother'],
  ['Roberto', 'Father'],
  ['Carmen', 'Guardian'],
  ['Ricardo', 'Grandfather'],
  ['Teresa', 'Aunt'],
]

function drawSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number, bg: string) {
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.arc(w / 2, h * 0.38, w * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(w / 2, h * 1.02, w * 0.42, h * 0.4, 0, Math.PI, 0)
  ctx.fill()
}

function drawSeal(ctx: CanvasRenderingContext2D, size: number, color: string, text: string) {
  const c = size / 2
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(c, c, c - 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = size * 0.03
  ctx.beginPath()
  ctx.arc(c, c, c * 0.78, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.22}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, c, c)
}

function drawSignature(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(20, 110)
  ctx.bezierCurveTo(60, 10, 90, 10, 80, 100)
  ctx.bezierCurveTo(75, 140, 130, 40, 160, 80)
  ctx.bezierCurveTo(190, 120, 210, 30, 250, 70)
  ctx.bezierCurveTo(280, 100, 320, 60, 380, 75)
  ctx.stroke()
}

const pad = (n: number, len: number) => String(n).padStart(len, '0')

export async function loadDemoData(): Promise<number> {
  const now = Date.now()
  const people: Person[] = []
  const photos: { personIndex: number; bg: string }[] = []

  LEARNERS.forEach(([firstName, middleName, lastName, suffix = ''], i) => {
    const gradeLevel = 7 + Math.floor(i / 4)
    const { section, strand = '' } = SECTIONS[gradeLevel]
    const input: PersonInput = {
      type: 'learner',
      idNumber: `30123425${pad(i + 1, 4)}`,
      firstName,
      middleName,
      lastName,
      suffix,
      gradeLevel,
      section,
      strand,
      position: '',
      department: '',
      birthDate: `${2019 - gradeLevel}-${pad((i % 12) + 1, 2)}-${pad((i % 27) + 1, 2)}`,
      bloodType: ['O+', 'A+', 'B+', 'AB+'][i % 4],
      address: `Purok ${(i % 6) + 1}, Brgy. San Isidro, Sample City`,
      emergencyName: `${CONTACTS[i % CONTACTS.length][0]} ${lastName.split('-')[0]}`,
      emergencyRelationship: CONTACTS[i % CONTACTS.length][1],
      emergencyPhone: `0917 555 ${pad(100 + i, 4)}`,
    }
    people.push({ ...input, id: newId(), photoId: null, createdAt: now, updatedAt: now })
    // Leave two learners without a photo so the "missing photo" warnings show up.
    if (i % 11 !== 5) photos.push({ personIndex: people.length - 1, bg: BACKGROUNDS[i % BACKGROUNDS.length] })
  })

  TEACHERS.forEach(([firstName, middleName, lastName, position, department], i) => {
    const input: PersonInput = {
      type: 'teacher',
      idNumber: `45${pad(10234 + i * 37, 5)}`,
      firstName,
      middleName,
      lastName,
      suffix: '',
      gradeLevel: null,
      section: '',
      strand: '',
      position,
      department,
      birthDate: `${1975 + i * 4}-0${i + 3}-1${i}`,
      bloodType: ['A+', 'O+', 'B-', 'O-'][i],
      address: `${12 + i} Mabini St., Brgy. Poblacion, Sample City`,
      emergencyName: `${['Antonio', 'Grace', 'Jose', 'Lourdes'][i]} ${lastName}`,
      emergencyRelationship: 'Spouse',
      emergencyPhone: `0918 555 ${pad(200 + i, 4)}`,
    }
    people.push({ ...input, id: newId(), photoId: null, createdAt: now, updatedAt: now })
    photos.push({ personIndex: people.length - 1, bg: BACKGROUNDS[(i + 3) % BACKGROUNDS.length] })
  })

  // Skip people whose ID number already exists, so loading twice adds nothing.
  const existing = new Set((await db.people.toArray()).map((p) => `${p.type}:${p.idNumber}`))
  const fresh = new Set(people.filter((p) => !existing.has(`${p.type}:${p.idNumber}`)))

  const photoRecords: PhotoRecord[] = []
  for (const { personIndex, bg } of photos) {
    const person = people[personIndex]
    if (!fresh.has(person)) continue
    const source = await renderToBlob((ctx) => drawSilhouette(ctx, 600, 750, bg), 600, 750, 'image/jpeg')
    const photo = await preparePhoto(source)
    const id = newId()
    person.photoId = id
    photoRecords.push({ ...photo, id })
  }

  await db.transaction('rw', db.people, db.photos, async () => {
    await db.photos.bulkAdd(photoRecords)
    await db.people.bulkAdd([...fresh])
  })

  await loadDemoBranding()
  return fresh.size
}

/** Fills in sample school details only when none have been set yet. */
async function loadDemoBranding() {
  const settings = await getSettings()
  if (!settings.schoolName) {
    await saveSettings({
      schoolName: 'Sample National High School',
      headerLines:
        'Republic of the Philippines\nDepartment of Education\nRegion IV-A CALABARZON\nSchools Division of Sample City',
      schoolId: '301234',
      schoolAddress: 'Rizal Avenue, Brgy. Poblacion, Sample City',
      schoolContact: '(02) 8123 4567',
      principalName: 'Rosalinda M. Aquino, EdD',
    })
  }
  const now = Date.now()
  if (!(await db.assets.get('logoLeft'))) {
    const blob = await renderToBlob((ctx) => drawSeal(ctx, 400, '#166534', 'SNHS'), 400, 400)
    await db.assets.put({ id: 'logoLeft', blob, updatedAt: now })
  }
  if (!(await db.assets.get('logoRight'))) {
    const blob = await renderToBlob((ctx) => drawSeal(ctx, 400, '#1d4ed8', 'DIV'), 400, 400)
    await db.assets.put({ id: 'logoRight', blob, updatedAt: now })
  }
  if (!(await db.assets.get('signature'))) {
    const blob = await renderToBlob(drawSignature, 400, 150)
    await db.assets.put({ id: 'signature', blob, updatedAt: now })
  }
}
