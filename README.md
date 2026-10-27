# ICT Kalika ID card generator

A static, browser-only application using the supplied Canva artwork. The form, uploaded photograph, and generated card stay on the user's device.

## Run locally

From this folder, run `python3 -m http.server 8000`, then open `http://localhost:8000` in a browser. Any static file server works. The app needs no backend, database, build step, or network service. A local server is needed because JavaScript modules do not load reliably from `file://` pages.

## Host on Vercel

The folder containing this README and `index.html` is the complete deployable site. For the simplest upload, drag the whole `id-card-generator` folder (or its ZIP archive) onto [Vercel Drop](https://vercel.com/drop). If importing a Git repository instead, set this folder as the project **Root Directory**, choose the **Other** framework preset, and leave the build command blank. No environment variables or server functions are needed.

## Use

Select class 9–12 and one division A–T. Enter a name and a phone number of exactly 10 digits. Add a JPG, PNG, or WebP photograph by clicking the upload area, dropping a file on it, or pasting an image with Ctrl+V (⌘+V on Mac). A selected photo has its own preview and replace/remove controls. The image is cropped to the hexagonal opening; use the sliders or drag in the card preview to position it. Download PDF, JPG, or PNG. Reset clears the form and loaded image.

The interface starts in the device's preferred light or dark theme. The navbar switch saves a manual choice in browser `localStorage` for this site, so it remains selected after reload. Card downloads always retain the original Canva design colors.

The PDF is one card-sized page, approximately 50.57 × 86 mm, preserving the supplied design proportions. JPG and PNG use the template's native 1033 × 1757 pixels (about 519 DPI at that print size). The PDF embeds a high-quality JPEG of that same rendering. PDF output is deliberately raster-based because the original Canva background is a PNG.

## Change the template

Replace `assets/id-card-template.png` with a clean export containing no sample member details or photo. Use the same 1033 × 1757 dimensions, or update the dimensions and all positions in `js/template-config.js`. Keep the photo frame and static labels in the image. The app only uses local asset files; it does not access Canva at runtime.

## Adjust placement

Edit `js/template-config.js`. `text` entries hold each field's horizontal position, baseline, width, font size, and color in source-image pixels. `photo.bounds` and the rounded hexagon path in `js/renderer.js` control the photograph crop. `printHeightMm` controls the PDF's physical height; width is calculated from the PNG ratio. Both preview and downloads use these same settings.

The font uses locally bundled Poppins files as a close visual match to the example. Canva's exact font metadata was unavailable, so very fine typographic differences may remain. For maximum print quality, start with a higher-resolution clean Canva export and update the configuration coordinates proportionally.
