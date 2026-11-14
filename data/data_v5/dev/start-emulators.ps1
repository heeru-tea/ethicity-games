$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$taskJava = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'java') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($taskJava) { $env:JAVA_HOME=$taskJava.FullName; $env:PATH="$($taskJava.FullName)\bin;$env:PATH" }
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Java 21 or newer is required for the local Firestore emulator.' }
node node_modules/firebase-tools/lib/bin/firebase.js emulators:start --project demo-ethicity-data-v5 --only auth,firestore --config firebase.json
