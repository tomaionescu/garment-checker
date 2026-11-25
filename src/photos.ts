// Photos never leave the browser at full size: a phone picture is several MB,
// the label reader needs far less, and history only needs a thumbnail.

async function toJpeg(file: File, maxSide: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

/** A photo sized for the label reader (base64) and a thumbnail for history (data URL). */
export async function preparePhoto(file: File) {
  const [full, thumbnail] = await Promise.all([toJpeg(file, 1568, 0.8), toJpeg(file, 480, 0.7)])
  return { upload: { contentType: 'image/jpeg', data: full.split(',')[1] }, thumbnail }
}
