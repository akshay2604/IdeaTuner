import { useState, useCallback } from 'react'
import type { ImageAttachment } from '@shared/types'
import { MAX_IMAGE_SIZE, ACCEPTED_IMAGE_TYPES } from '@shared/constants'

export function useImageAttachments() {
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([])
  const [imageError, setImageError] = useState<string | null>(null)

  const addImageFromFile = useCallback((file: File) => {
    setImageError(null)

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setImageError(`Unsupported format. Use PNG, JPEG, GIF, or WebP.`)
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError(`Image too large. Max size is 5MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix to get raw base64
      const base64 = result.split(',')[1]
      setPendingImages((prev) => [
        ...prev,
        {
          data: base64,
          mediaType: file.type as ImageAttachment['mediaType'],
          name: file.name
        }
      ])
    }
    reader.onerror = () => {
      setImageError('Failed to read image file.')
    }
    reader.readAsDataURL(file)
  }, [])

  const addImageFromClipboard = useCallback(
    (clipboardData: DataTransfer): boolean => {
      const items = Array.from(clipboardData.items)
      const imageItem = items.find((item) => item.type.startsWith('image/'))
      if (!imageItem) return false

      const file = imageItem.getAsFile()
      if (!file) return false

      addImageFromFile(file)
      return true
    },
    [addImageFromFile]
  )

  const addImagesFromDataTransfer = useCallback(
    (dataTransfer: DataTransfer) => {
      const files = Array.from(dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      )
      for (const file of files) {
        addImageFromFile(file)
      }
    },
    [addImageFromFile]
  )

  const removeImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index))
    setImageError(null)
  }, [])

  const clearImages = useCallback(() => {
    setPendingImages([])
    setImageError(null)
  }, [])

  return {
    pendingImages,
    imageError,
    addImageFromFile,
    addImageFromClipboard,
    addImagesFromDataTransfer,
    removeImage,
    clearImages
  }
}
