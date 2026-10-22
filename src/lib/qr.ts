import QRCode from 'qrcode'

/** Builds one SVG path for all dark modules of a QR code. */
export function qrPath(value: string): { path: string; size: number } {
  const qr = QRCode.create(value || ' ', { errorCorrectionLevel: 'M' })
  const { size, data } = qr.modules
  let path = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) path += `M${x} ${y}h1v1h-1z`
    }
  }
  return { path, size }
}
