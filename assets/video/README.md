Crystal Forge Mascot Video
==========================

Default file:
- ./assets/video/drift-mascot.mp4

Usage:
- This file is used as the ambient mascot layer in the website background.
- The shell reads the path from `./content/Config.js` via `MASCOT_MEDIA.videoPath`.

Notes:
- Keep the video muted.
- Transparent video is not required; the CSS masking and low opacity handle the blend.
- If you replace the file with another `.mp4`, keep the same filename or update `MASCOT_MEDIA.videoPath`.
