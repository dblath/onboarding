# Unity branding assets

- `unity.png`: original 267 x 331 Unity / A Stronger Frontdoor image. No crop, color changes, redraw, stretching or re-encoding. SHA-256: `88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1`.
- The requested asset was absent from this checkout. This copy came from `../unityOne/public/unity.png`; copies in the homeitem projects have the identical SHA-256. It is copied unchanged to the requested `public/assets/unity.png` location.
- `unity-favicon.png`: 331 x 331 transparent canvas. The original image is placed unscaled at x=32, y=0. Every original pixel is preserved; only transparent left/right padding is added.
- `unity-favicon-32.png`: 32 x 32 transparent canvas. The entire original is scaled proportionally by 32/331 and centered horizontally, using high-quality bicubic resampling. No cropping. The browser may further downsample the icon for its tab display.

Favicons were derived deterministically using Windows System.Drawing. No generative image tool or new runtime dependency is involved. Production HTML references both PNG sizes via Vite's relative base. Shared application branding uses the untouched source with `object-fit: contain`, one constrained dimension and the other automatic, preserving the original aspect ratio.
