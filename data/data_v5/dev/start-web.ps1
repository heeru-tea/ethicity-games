$ErrorActionPreference='Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '../../..'))
python -u -m http.server 8777 --bind 127.0.0.1
