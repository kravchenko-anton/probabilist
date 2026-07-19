import { chromium } from "playwright"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import fs from "node:fs"
import { spawnSync } from "node:child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.join(__dirname, "goal-cinematic-anim.html")
const framesDir = path.join(__dirname, "goal-cinematic-frames")
const finalMp4 = path.join(__dirname, "goal-sequence.mp4")
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
await page.goto(`${pathToFileURL(htmlPath).href}?render=1`)
await page.waitForFunction(() => window.__animReady === true)

const totalFrames = await page.evaluate(() => window.__TOTAL_FRAMES)
console.log(`Capturing ${totalFrames} cinematic frames @ ${FPS}fps…`)

for (let frame = 0; frame < totalFrames; frame++) {
  await page.evaluate((index) => window.__renderFrame(index), frame)
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  await page.screenshot({
    path: path.join(framesDir, `frame-${String(frame).padStart(4, "0")}.png`),
    type: "png",
  })
  if (frame % 60 === 0 || frame === totalFrames - 1) {
    console.log(`  frame ${frame + 1}/${totalFrames}`)
  }
}

await context.close()
await browser.close()

const result = spawnSync(
  ffmpeg,
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    path.join(framesDir, "frame-%04d.png"),
    "-vf",
    "format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "14",
    "-r",
    String(FPS),
    "-movflags",
    "+faststart",
    "-an",
    finalMp4,
  ],
  { stdio: "inherit" }
)

if (result.status !== 0) {
  console.error("ffmpeg failed")
  process.exit(result.status ?? 1)
}

fs.rmSync(framesDir, { recursive: true, force: true })
console.log(`Wrote ${finalMp4} (${totalFrames} frames @ ${FPS}fps)`)
