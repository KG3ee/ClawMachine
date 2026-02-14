# Pixel Claw Fun (3D Pixel Claw Machine PWA)

A touch-first 3D claw machine game for kids ages 4-7, built with Vite + Vanilla JS + Three.js.

## Features
- Pixel-style 3D rendering with low-res upscale and a `Pixelation` toggle.
- iPad-friendly controls (large touch targets, fixed kid-friendly camera, grid snap movement).
- Gameplay state machine: `MENU`, `PLAYING`, `DROPPING`, `GRABBING`, `RETURNING`, `RESULT`, `COLLECTION`.
- Learn Mode with prompts like "Find the bunny!" plus speech + captions.
- Collection shelf persisted in `localStorage`.
- Programmatic Web Audio music + SFX (no external audio files).
- PWA + service worker caching for offline play after first load.

## Run Locally
1. Install dependencies:
```bash
npm install
```
2. Start dev server:
```bash
npm run dev
```
3. Build production bundle:
```bash
npm run build
```
4. Preview production build:
```bash
npm run preview
```

## Deploy on Vercel
### Option A: Vercel Dashboard
1. Import this repository into Vercel.
2. Framework preset: `Vite`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Deploy.

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel
```
When prompted, keep build settings equivalent to:
- Build command: `npm run build`
- Output directory: `dist`

## Install on iPad Air (Safari)
1. Open the deployed site in Safari.
2. Tap the Share button.
3. Tap `Add to Home Screen`.
4. Launch from the home screen for full-screen PWA mode.

## Offline Behavior
- First online visit caches the app shell and local assets.
- Subsequent launches can run offline.
- Service worker uses cache versioning and clears old caches during activation.
