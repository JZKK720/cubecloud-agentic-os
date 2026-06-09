# SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
#
# scripts/sync-docs.ps1 â€?Option A: move governance docs to the outer
# cubecloud-agentic-os/ root, replace the inner agent-desktop/ copies
# with hardlinks (files) and junctions (directories). This script is
# idempotent: re-running it re-creates any missing link.

[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path "$PSScriptRoot\..").Path
$inner = Join-Path $root 'agent-desktop'
$outerDocs = Join-Path $root 'docs'

# File map: source (relative to $inner) -> destination (relative to $root)
# This is the V2.10.8 set: 14 hardlink files + 1 outer-only file + 1 inner-only i18n set.
# README.md and README.i18n.md are intentionally NOT hardlinks (different audiences
# for README.md, outer-only policy for README.i18n.md). The 4 i18n files (README.<lang>.md
# and CONTRIBUTING.<lang>.md) are not in this map either: they live only at the inner
# location and were never promoted to a hardlink layer.
$fileMap = @{
    'README.md'                    = 'README.md'
    'LICENSE'                      = 'LICENSE'
    'NOTICE'                       = 'NOTICE'
    'BRANDING_AND_LICENSE.md'      = 'BRANDING_AND_LICENSE.md'
    'ACKNOWLEDGMENTS.md'           = 'ACKNOWLEDGMENTS.md'
    'CONTRIBUTING.md'              = 'CONTRIBUTING.md'
    'THREAT_MODEL.md'               = 'THREAT_MODEL.md'
    'SECURITY.md'                   = 'SECURITY.md'
    'docs/HANDBOOK.md'             = 'docs/HANDBOOK.md'
    'docs/handbook/ARCHITECTURE.md'    = 'docs/handbook/ARCHITECTURE.md'
    'docs/handbook/DEVELOPMENT.md'     = 'docs/handbook/DEVELOPMENT.md'
    'docs/handbook/OPERATIONS.md'      = 'docs/handbook/OPERATIONS.md'
    'docs/handbook/README.md'          = 'docs/handbook/README.md'
}

# Outer-only files: live at the outer root, NOT mirrored to the inner
# (they are policy/manifest files that have no Electron-build equivalent).
$outerOnly = @{
    'README.i18n.md' = 'README.i18n.md'
}

# Legal docs move as a whole directory
$legalDirMap = @{
    'docs/legal' = 'docs/legal'
}

function Write-Step($msg) { Write-Host "[sync-docs] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  PASS  $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "  SKIP  $msg" -ForegroundColor DarkGray }
function Write-Move($msg) { Write-Host "  MOVE  $msg" -ForegroundColor Yellow }
function Write-Link($msg) { Write-Host "  LINK  $msg" -ForegroundColor Magenta }

if ($DryRun) { Write-Step "DRY RUN: no moves or links will be created" }

# --- Phase 1: create outer dirs
Write-Step "Phase 1: ensure outer directories exist"
$dirsToEnsure = @(
    $root  # for the top-level docs
    $outerDocs
    (Join-Path $outerDocs 'handbook')
)
foreach ($d in $dirsToEnsure) {
    if (-not (Test-Path $d)) {
        if (-not $DryRun) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
        Write-Ok "ensured dir: $d"
    } else {
        Write-Skip "dir exists: $d"
    }
}

# --- Phase 2: move top-level files (file-by-file)
Write-Step "Phase 2: move top-level files"
foreach ($k in $fileMap.Keys) {
    $rel = $k
    if ($rel -match '^docs/') {
        # Some files live in inner docs/ â€?handle subfolder structure separately
        continue
    }
    $src = Join-Path $inner $rel
    $dst = Join-Path $root $fileMap[$rel]
    if (-not (Test-Path $src)) {
        Write-Skip "source missing: $src"
        continue
    }
    if (Test-Path $dst) {
        # Check if $dst is already a hardlink of $src (idempotent case)
        $h1 = (Get-FileHash $src -Algorithm SHA256).Hash
        $h2 = (Get-FileHash $dst -Algorithm SHA256).Hash
        if ($h1 -eq $h2 -and (Get-Item $dst).LinkType -eq 'HardLink') {
            Write-Skip "already a hardlink: $dst -> $src"
        } else {
            Write-Skip "destination exists (different content): $dst"
        }
        continue
    }
    Write-Move "$src -> $dst"
    if (-not $DryRun) {
        Move-Item -Path $src -Destination $dst
    }
}

# --- Phase 3: move docs/HANDBOOK.md, docs/handbook/* (file-by-file)
Write-Step "Phase 3: move docs/HANDBOOK.md and docs/handbook/*"
foreach ($k in $fileMap.Keys) {
    $rel = $k
    if ($rel -notmatch '^docs/') { continue }
    $src = Join-Path $inner $rel
    $dst = Join-Path $root $fileMap[$rel]
    if (-not (Test-Path $src)) {
        Write-Skip "source missing: $src"
        continue
    }
    if (Test-Path $dst) {
        $h1 = (Get-FileHash $src -Algorithm SHA256).Hash
        $h2 = (Get-FileHash $dst -Algorithm SHA256).Hash
        if ($h1 -eq $h2 -and (Get-Item $dst).LinkType -eq 'HardLink') {
            Write-Skip "already a hardlink: $dst -> $src"
        } else {
            Write-Skip "destination exists (different content): $dst"
        }
        continue
    }
    Write-Move "$src -> $dst"
    if (-not $DryRun) {
        Move-Item -Path $src -Destination $dst
    }
}

# --- Phase 4: move docs/legal/ as a directory (then junction back)
Write-Step "Phase 4: move docs/legal/ directory"
foreach ($k in $legalDirMap.Keys) {
    $rel = $k
    $src = Join-Path $inner $rel
    $dst = Join-Path $root $legalDirMap[$rel]
    if (-not (Test-Path $src)) {
        Write-Skip "source missing: $src"
        continue
    }
    if (Test-Path $dst) {
        Write-Skip "destination exists: $dst"
        continue
    }
    Write-Move "$src -> $dst"
    if (-not $DryRun) {
        Move-Item -Path $src -Destination $dst
    }
}

# --- Phase 5: re-create the inner "shadows" as hardlinks (files) and junctions (dirs)
Write-Step "Phase 5: re-create inner shadows"
foreach ($k in $fileMap.Keys) {
    $rel = $k
    $src = Join-Path $root $fileMap[$rel]
    $dst = Join-Path $inner $rel
    if (-not (Test-Path $src)) {
        Write-Skip "outer source missing: $src"
        continue
    }
    if (Test-Path $dst) {
        # Idempotent: if it's already a hardlink, skip
        if ((Get-Item $dst).LinkType -eq 'HardLink') {
            Write-Skip "already a hardlink: $dst"
        } else {
            Write-Skip "destination exists (not a link): $dst"
        }
        continue
    }
    Write-Link "$src -> $dst"
    if (-not $DryRun) {
        New-Item -ItemType HardLink -Path $dst -Target $src | Out-Null
    }
}

# Inner legal dir as a junction
$legalInner = Join-Path $inner 'docs/legal'
$legalOuter = Join-Path $root 'docs/legal'
if (Test-Path $legalOuter) {
    if (Test-Path $legalInner) {
        if ((Get-Item $legalInner).LinkType -eq 'Junction') {
            Write-Skip "legal/ already a junction"
        } else {
            Write-Skip "inner legal/ exists (not a junction): $legalInner"
        }
    } else {
        Write-Link "$legalOuter -> $legalInner"
        if (-not $DryRun) {
            New-Item -ItemType Junction -Path $legalInner -Target $legalOuter | Out-Null
        }
    }
}

# --- Phase 6: outer-only files (V2.10.7+)
Write-Step "Phase 6: outer-only files (verify existence)"
foreach ($k in $outerOnly.Keys) {
    $p = Join-Path $root $outerOnly[$k]
    if (Test-Path $p) {
        Write-Skip "outer-only file exists: $p"
    } else {
        Write-Ok "outer-only file missing (need to create): $p"
    }
}

# --- Phase 7: inner i18n files (V2.10.7+)
Write-Step "Phase 7: inner i18n files (verify existence)"
$i18nFiles = @(
    'README.ja-JP.md',
    'README.zh-CN.md',
    'CONTRIBUTING.ja-JP.md',
    'CONTRIBUTING.zh-CN.md'
)
foreach ($f in $i18nFiles) {
    $p = Join-Path $inner $f
    if (Test-Path $p) {
        Write-Skip "inner i18n file exists: $p"
    } else {
        Write-Ok "inner i18n file missing: $p"
    }
}

# --- Phase 8: report
Write-Step "Phase 8: report"
$topLevelMd = Get-ChildItem $root -Filter '*.md' -File -ErrorAction SilentlyContinue | ForEach-Object { $_.Name }
$outerDocsCount = (Get-ChildItem $outerDocs -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$innerShadows = @('README.md','LICENSE','NOTICE','BRANDING_AND_LICENSE.md','ACKNOWLEDGMENTS.md','CONTRIBUTING.md','THREAT_MODEL.md','SECURITY.md') | ForEach-Object {
    $p = Join-Path $inner $_
    if (Test-Path $p) {
        $it = Get-Item $p
        "{0,-30} LinkType={1}" -f $_, $it.LinkType
    }
}
Write-Host "  Outer top-level .md files: $($topLevelMd -join ', ')"
Write-Host "  Outer docs/ file count:    $outerDocsCount"
$innerShadows | ForEach-Object { Write-Host "  $_" }

Write-Step "DONE."
