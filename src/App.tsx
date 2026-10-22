import { lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { requestPersistentStorage } from '@/lib/storage'
import PeoplePage from '@/pages/PeoplePage'

// Pages with heavy libraries (Excel, PDF, cropping) load only when opened.
const ImportPage = lazy(() => import('@/pages/ImportPage'))
const PhotosPage = lazy(() => import('@/pages/PhotosPage'))
const DesignPage = lazy(() => import('@/pages/DesignPage'))
const PrintPage = lazy(() => import('@/pages/PrintPage'))
const BackupPage = lazy(() => import('@/pages/BackupPage'))

export default function App() {
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<PeoplePage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="photos" element={<PhotosPage />} />
            <Route path="design" element={<DesignPage />} />
            <Route path="print" element={<PrintPage />} />
            <Route path="backup" element={<BackupPage />} />
            <Route path="*" element={<PeoplePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </TooltipProvider>
  )
}
