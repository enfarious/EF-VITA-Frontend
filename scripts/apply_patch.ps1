param(
	[Parameter(Mandatory = $true)]
	[string]$PatchFile
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $PatchFile)) {
	Write-Error "Patch file not found: $PatchFile"
}

git rev-parse --is-inside-work-tree | Out-Null

Write-Host "== Checking working tree is clean =="
$dirty = (git status --porcelain)
if ($dirty) {
	Write-Error "Working tree is not clean. Commit/stash your changes first."
}

Write-Host "== Applying patch (3-way merge enabled) =="
git apply --3way --whitespace=nowarn $PatchFile

Write-Host "== Patch applied. Status =="
git status --short

Write-Host ""
Write-Host "Next:"
Write-Host "  - run your tests/build"
Write-Host "  - git add -A"
Write-Host "  - git commit -m ""<message>"""
