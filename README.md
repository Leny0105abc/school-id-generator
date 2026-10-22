# School ID Generator

Make print-ready ID cards for learners and teachers, right in the browser.

- **Private by design.** Records, photos, logos and signatures are saved in your browser
  (IndexedDB) and never leave your computer. There is no server, no account and no analytics.
  The site's Content-Security-Policy blocks connections to any other website.
- **Standard ID size.** CR80 cards (53.98 × 85.60 mm), portrait, front and back.
- **Bulk friendly.** Import a class list from Excel/CSV, drop in a folder of photos named by LRN
  or employee number, and download a PDF with 9 cards per page and cut marks.

## Features

- Learners (Grades 7–12, section, SHS strand, LRN) and teachers (employee no., position)
- Excel template, .xlsx/.csv import with row-by-row checks, export back to Excel
  - Recognizes common headers ("LRN", "Last Name", "Birth Date (mm/dd/yyyy)", "Contact No.")
    and SF1-style single name columns ("Last, First, Middle")
  - Reads the grade from a sheet name such as "Grade 9 Rizal"
  - Updating existing people never erases values that are blank in the file
- Bulk photo upload matched by file name, with in-browser square cropping
- Two card designs (Classic, Modern) with school name, header lines, two logos, colors,
  school year, principal's e-signature (white background removed automatically), and a QR code
- PDF on A4, Short (Letter), Long (8.5 × 13 in) or Legal paper at 300 DPI, with backs
  mirrored for duplex printing, cut marks, a 50 mm scale line, and a back-side offset
- Backup and restore to a single `.zip` file; merge or replace

## Using it

1. **Design** — enter the school name, header lines, school year and principal, and upload
   the logos and signature.
2. **Import** — download the template, fill it in Excel, and import it (or add people one by one
   on the People page).
3. **Photos** — name photo files with the LRN or employee number (e.g. `301234250001.jpg`)
   and drop them all at once. Click any photo to adjust the crop.
4. **Print** — choose a section or a selection, pick the paper size, and make the PDF.
5. **Backup** — download a backup after every big change. Clearing browser data deletes
   everything stored by the app.

### Printing tips

- Print at **Actual size** / 100%, not "Fit to page". Check the 50 mm line with a ruler.
- Two-sided printers: choose **Flip on long edge**. Without one, choose "All fronts, then all
  backs", print the fronts, put the stack back in the tray, and print the backs.
- Print one test sheet and hold it up to a light. If the backs are shifted, set the
  back-side adjustment (in mm) on the Print page.
- Use thick paper (200–250 gsm) or ID card sheets, then laminate or use ID jackets.

## Development

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # unit tests (Vitest)
npm run lint     # oxlint
npm run build    # production build in dist/
npm run preview  # serve the build with the same security headers as Vercel
```

Stack: Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Dexie (IndexedDB), SheetJS
(loaded only on the Import page), modern-screenshot + jsPDF for the PDF, fflate for backups.

How the PDF is made: each card side is a React component sized in real millimetres. The same
component is shown on screen and, for printing, drawn off screen and turned into a 300 DPI
JPEG that jsPDF places at its exact size. So the PDF always matches the preview.

During development, `/dev/cards?i=0&w=420&design=modern` shows large card previews.

## Deploying to Vercel

1. Push this repository to GitHub.
2. On [vercel.com/new](https://vercel.com/new), choose **Import Git Repository** and pick this
   repo. The settings come from `vercel.json` (framework Vite, build `npm run build`, output
   `dist`).
3. Click **Deploy**. Every push to `main` deploys again automatically.

The security headers (Content-Security-Policy and others) are in `vercel.json` and mirrored in
`src/lib/csp.ts` for `npm run preview`; a unit test keeps the two in sync.

## License

MIT
