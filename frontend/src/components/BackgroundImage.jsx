import { useState } from 'react'

/**
 * Global, full-viewport backdrop: a slowly drifting neon biotech image, with
 * the particle field (rendered by App.jsx right after this) layered on top
 * of it, and a light vignette underneath the actual page content so text
 * stays legible without smothering the art.
 *
 * If a matching video file is dropped into public/media/ (see that folder's
 * README), it fades in over the still image and plays instead — the image
 * is always the guaranteed fallback, so nothing ever shows a blank/broken
 * background.
 */
export default function BackgroundImage({ image, video }) {
  const [videoReady, setVideoReady] = useState(false)

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-void">
      <div
        className="absolute inset-0 animate-kenburns bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${image})` }}
      />
      {video && (
        <video
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            videoReady ? 'opacity-35' : 'opacity-0'
          }`}
          src={video}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/75 to-void/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
    </div>
  )
}
