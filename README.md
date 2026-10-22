# School ID Generator

Make print-ready ID cards for learners and teachers, right in the browser.

- **Private by design.** Records, photos, logos and signatures are saved in your browser
  (IndexedDB) and never leave your computer. There is no server, no account and no analytics.
  The site's Content-Security-Policy blocks connections to any other website.
- **Standard ID size.** CR80 cards (53.98 × 85.60 mm), portrait, front and back.
- **Bulk friendly.** Import learners and teachers from Excel/CSV, drop in a folder of photos
  named by LRN or employee number, and download a PDF with 9 cards per page and cut marks.

## Features

- Learners (Grades 7–12, section, SHS strand, LRN) and teachers (employee no., position)
- Excel template download, .xlsx/.csv import with row-by-row checks, export back to Excel
- Bulk photo upload matched by file name, with in-browser cropping
- School branding: name, header lines, two logos, colors, school year, principal e-signature
- QR code with the LRN / employee number
- PDF on A4, Letter, Legal or Long (8.5 × 13 in), duplex-aligned backs, cut marks, scale check
- Backup and restore to a single `.zip` file

## Development

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # unit tests
npm run build    # production build in dist/
npm run preview  # serve the build with the same security headers as Vercel
```

Stack: Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Dexie (IndexedDB), SheetJS,
modern-screenshot + jsPDF.

## Deploying to Vercel

1. Push this repository to GitHub.
2. On [vercel.com](https://vercel.com/new), choose **Import Git Repository** and pick this repo.
   The settings come from `vercel.json` (framework Vite, build `npm run build`, output `dist`).
3. Click **Deploy**. Every push to `main` deploys again automatically.

## License

MIT
