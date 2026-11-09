# PicForge
PicForge is a lightweight, privacy-first photo editor that runs entirely in your browser. Open an image, adjust it, and download it with no install, no upload and no dependencies.

# Image Editor: Feature Overview

A browser-based image editor for quick, basic edits. Everything runs locally in the browser: images are never uploaded to a server.

---

## 1. Image Import

| Feature | Description |
|---|---|
| File picker | Click "Upload" to choose an image from your device |
| Drag and drop | Drop an image anywhere on the canvas area |
| Paste from clipboard | Press `Ctrl/Cmd + V` to paste a copied image |
| Supported formats | JPEG, PNG, WebP, GIF (first frame), BMP, AVIF (browser-dependent) |
| Auto-fit | Large images are scaled to fit the viewport; the original resolution is preserved for export |
| EXIF orientation | Photos from phones are auto-rotated to display correctly |

---

## 2. Adjustments

All adjustments are sliders with a numeric readout and a double-click-to-reset on each slider.

| Adjustment | Range | Effect |
|---|---|---|
| Brightness | -100 to +100 | Lightens or darkens the whole image |
| Contrast | -100 to +100 | Increases or reduces the difference between lights and darks |
| Saturation | -100 to +100 | Controls color intensity (-100 is grayscale) |
| Exposure | -2 to +2 EV | Simulates camera exposure change |
| Hue rotation | 0 to 360° | Shifts all colors around the color wheel |
| Temperature | -100 to +100 | Cooler (blue) to warmer (orange) tones |
| Tint | -100 to +100 | Green to magenta shift |
| Blur | 0 to 20 px | Gaussian blur |
| Sharpen | 0 to 100 | Increases edge definition |
| Vignette | 0 to 100 | Darkens the image edges |

---

## 3. Filters

One-click presets that apply a combination of adjustments. Each preset has a live thumbnail preview and an intensity slider (0–100%).

- **Original:** no filter
- **Grayscale:** black and white
- **Sepia:** warm vintage brown tone
- **Invert:** negative colors
- **Vivid:** boosted saturation and contrast
- **Cool:** blue-leaning tones
- **Warm:** orange-leaning tones
- **Fade:** lifted blacks, muted colors
- **Noir:** high-contrast black and white

---

## 4. Transform Tools

| Tool | Description |
|---|---|
| Crop | Drag handles to crop; free-form or locked aspect ratios (1:1, 4:3, 16:9, 3:2, original) |
| Rotate | 90° left/right buttons plus a fine-angle slider (-45° to +45°) for straightening |
| Flip | Horizontal and vertical mirror |
| Resize | Set width and height in pixels, with an aspect-ratio lock toggle |

---

## 5. Annotation Tools

| Tool | Description |
|---|---|
| Brush | Freehand drawing with adjustable size, color, and opacity |
| Eraser | Removes brush strokes |
| Text | Add text with font, size, color, bold/italic, and drag-to-position |
| Shapes | Rectangle, ellipse, line, and arrow with stroke and fill options |

---

## 6. History and Comparison

- **Undo / Redo:** step backward and forward through every edit (`Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z`)
- **Reset all:** restores the original image in one click, with a confirmation prompt
- **Before / After:** hold the compare button (or press `\`) to temporarily view the original
- **Split view:** optional draggable divider showing original and edited side by side

---

## 7. View Controls

- **Zoom:** mouse wheel, pinch gesture, or +/- buttons (10% to 800%)
- **Pan:** hold `Space` and drag, or use two-finger drag on touch devices
- **Fit to screen / 100%:** quick zoom presets
- **Live histogram:** optional RGB histogram panel that updates as you edit

---

## 8. Export

| Option | Description |
|---|---|
| Formats | PNG (lossless), JPEG, WebP |
| Quality slider | 1–100 for JPEG and WebP |
| Scale | Export at 25%, 50%, 100%, or a custom size |
| File size preview | Estimated output size shown before download |
| Filename | Editable, defaults to `original-name-edited` |
| Copy to clipboard | Copy the result as a PNG |

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + O` | Open image |
| `Ctrl/Cmd + S` | Export |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + V` | Paste image |
| `Space + drag` | Pan |
| `+` / `-` | Zoom in / out |
| `0` | Fit to screen |
| `\` | Hold to show original |
| `C` | Crop tool |
| `B` | Brush tool |
| `T` | Text tool |

---

## 10. Interface Layout

- **Top bar:** upload, undo/redo, reset, export
- **Left toolbar:** crop, rotate/flip, brush, eraser, text, shapes
- **Center:** canvas with zoom and pan
- **Right panel:** tabs for Adjust, Filters, and Histogram
- **Responsive:** panels collapse into a bottom drawer on mobile
- **Light and dark theme:** follows the system setting

---

## 11. Technical Notes

- **Rendering:** HTML5 Canvas with a non-destructive pipeline; adjustments are stored as parameters and re-applied to the original pixels, so sliders never degrade quality
- **Performance:** previews render on a downscaled copy for smooth slider dragging; full resolution is processed on export
- **Privacy:** all processing happens client-side; no image data leaves your device
- **Browser support:** current versions of Chrome, Edge, Firefox, and Safari

---

## 12. Known Limitations

- Animated GIFs are flattened to a single frame
- Very large images (over roughly 50 megapixels) may be slow or hit browser memory limits
- RAW and HEIC files are not supported directly
- No layers in this version; annotations are flattened into the image on export

---

## 13. Roadmap (Possible Future Features)

- Layers and blend modes
- Selection tools (lasso, magic wand)
- Curves and levels
- Healing and clone stamp
- Background removal
- AI upscaling and auto-enhance
- Batch editing
- Saving and loading projects
