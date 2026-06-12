#!/usr/bin/env node
/**
 * predev guard for running this repo off an exFAT volume (e.g. the T7 Shield).
 *
 * exFAT cannot store macOS resource forks, so macOS scatters AppleDouble
 * sidecar files (._*) throughout the project. Turbopack's persistent cache
 * enumerates the .next directory and tries to parse those ._* files as cache
 * entries, failing with:
 *
 *   Failed to open database
 *     Caused by:
 *       0: Loading persistence directory failed
 *       1: invalid digit found in string
 *
 * This script runs before `next dev`:
 *   1. Strips ._* / .DS_Store noise from .next so Turbopack can read its cache.
 *   2. Only clears .next/cache when it is actually unreadable, so normal runs
 *      keep their warm cache (fast cold starts).
 *
 * It is intentionally a no-op on non-macOS / non-exFAT setups.
 */
const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const projectRoot = path.resolve(__dirname, "..")
const nextDir = path.join(projectRoot, ".next")

function log(msg) {
  console.log(`[predev-exfat-guard] ${msg}`)
}

// 1. Purge AppleDouble sidecar files from .next. dot_clean is the macOS-native
//    tool; fall back to a manual sweep if it isn't available.
//
//    Scope this to .next only. Running dot_clean against the whole project root
//    makes it walk node_modules and .git too, which on a slow exFAT volume can
//    take minutes and stalls `next dev` before it even starts.
function purgeAppleDouble() {
  if (!fs.existsSync(nextDir)) return
  try {
    execFileSync("dot_clean", ["-m", nextDir], { stdio: "ignore" })
  } catch {
    // dot_clean missing or failed (non-macOS); sweep .next manually instead.
    removeSidecars(nextDir)
  }
}

function removeSidecars(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.name.startsWith("._") || entry.name === ".DS_Store") {
      try {
        fs.rmSync(full, { recursive: true, force: true })
      } catch {
        /* best effort */
      }
      continue
    }
    if (entry.isDirectory()) removeSidecars(full)
  }
}

// 2. Detect a corrupted Turbopack persistence dir and clear only the cache.
function clearCacheIfCorrupt() {
  const cacheDir = path.join(nextDir, "cache")
  if (!fs.existsSync(cacheDir)) return

  // A surviving ._* file directly inside any cache subdir is the trigger for
  // the "invalid digit" failure. If purging left none, the cache is fine.
  if (!hasSidecar(cacheDir)) return

  log("cache still contains AppleDouble files after purge; clearing .next/cache")
  fs.rmSync(cacheDir, { recursive: true, force: true })
}

function hasSidecar(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return false
  }
  for (const entry of entries) {
    if (entry.name.startsWith("._")) return true
    if (entry.isDirectory() && hasSidecar(path.join(dir, entry.name))) return true
  }
  return false
}

if (process.platform !== "darwin") {
  process.exit(0)
}

purgeAppleDouble()
clearCacheIfCorrupt()
