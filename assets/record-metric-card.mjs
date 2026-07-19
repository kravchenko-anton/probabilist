import { chromium } from "playwright"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import fs from "node:fs"
import { spawnSync } from "node:child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.join(__dirname, "metric-card-anim.html")
const framesDir = path.join(__dirname, "record-frames")
const finalMov = path.join(__dirname, "metric-card-applications.mov")
const FPS = 60

const ffmpeg =
  process.env.FFMPEG ||
  "C:\\Users\\anton\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe"

fs.rmSync(framesDir, { recursive: true, force: true })
fs.mkdirSync(framesDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-font-subpixel-positioning", "--force-device-scale-factor=1"],
})

const context = await browser.newContext({
  viewport: { width: 1080, height: 1080 },
  deviceScaleFactor: 1,
})

const page = await context.newPage()
const url = `${pathToFileURL(htmlPath).href}?render=1`
await page.goto(url)
await page.waitForFunction(() => window.__animReady === true)

const totalFrames = await page.evaluate(() => window.__TOTAL_FRAMES)
console.log(`Capturing ${totalFrames} frames @ ${FPS}fps (transparent)…`)

for (let i = 0; i < totalFrames; i++) {
  await page.evaluate((frame) => window.__renderFrame(frame), i)
  // Let layout + paint settle before screenshot.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const file = path.join(framesDir, `frame-${String(i).padStart(4, "0")}.png`)
  await page.screenshot({ path: file, type: "png", omitBackground: true })
  if (i % 60 === 0 || i === totalFrames - 1) {
    console.log(`  frame ${i + 1}/${totalFrames}`)
  }
}

await context.close()
await browser.close()

// ProRes 4444 keeps alpha — use this in After Effects / Premiere.
const result = spawnSync(
  ffmpeg,
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    path.join(framesDir, "frame-%04d.png"),
    "-c:v",
    "prores_ks",
    "-profile:v",
    "4444",
    "-pix_fmt",
    "yuva444p10le",
    "-r",
    String(FPS),
    "-an",
    finalMov,
  ],
  { stdio: "inherit" }
)

if (result.status !== 0) {
  console.error("ffmpeg failed")
  process.exit(result.status ?? 1)
}

fs.rmSync(framesDir, { recursive: true, force: true })
console.log(`Wrote ${finalMov} (${totalFrames} frames @ ${FPS}fps, with alpha)`)
