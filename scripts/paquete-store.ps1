# Genera el paquete MSIX completo de isbar para Microsoft Store.
#
#   1. Compila la versión final (sin el manifiesto del paquete de desarrollo: ISLA_STORE=1).
#   2. Prepara la carpeta del paquete (ejecutable, logos y AppxManifest con la versión de tauri.conf.json).
#   3. Crea src-tauri\target\store\isbar_<versión>_x64.msix  <- este es el que se sube a Partner Center
#      (sin firmar: la Store lo firma al publicarlo).
#
# Con -Probar crea además una copia firmada con un certificado de prueba con el mismo editor que la
# Store, para instalarla en este PC antes de subirla. La primera vez pide PowerShell como administrador
# (para confiar en ese certificado).
#
# Requisitos: Windows SDK (makeappx.exe y signtool.exe).
# Uso: powershell -ExecutionPolicy Bypass -File scripts\paquete-store.ps1 [-Probar] [-SinCompilar]
param(
    [switch]$Probar,
    [switch]$SinCompilar
)
$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$srcTauri = Join-Path $raiz 'src-tauri'
$plantilla = Join-Path $srcTauri 'paquete-store'
$salida = Join-Path $srcTauri 'target\store'
$carpeta = Join-Path $salida 'paquete'
$exe = Join-Path $srcTauri 'target\release\isla.exe'
$editor = 'CN=24BD4EB3-E2AF-4BE1-A891-986DC84899EB' # Debe coincidir con Publisher del AppxManifest

function Buscar-Herramienta([string]$nombre) {
    $encontrada = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter $nombre -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\x64\\' } |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    if (-not $encontrada) { throw "No se encontró $nombre. Instala el Windows SDK." }
    $encontrada.FullName
}
$makeappx = Buscar-Herramienta 'makeappx.exe'

# --- Versión: la de tauri.conf.json con un cuarto número a 0 (la Store reserva ese número) ---
$conf = Get-Content (Join-Path $srcTauri 'tauri.conf.json') -Raw | ConvertFrom-Json
$version = "$($conf.version).0"
Write-Host "Versión del paquete: $version"

# --- 1. Compilar ---
if (-not $SinCompilar) {
    Write-Host 'Compilando la versión final (puede tardar varios minutos)...'
    $env:ISLA_STORE = '1'
    try {
        Push-Location $raiz
        & npm.cmd run tauri build -- --no-bundle
        if ($LASTEXITCODE -ne 0) { throw 'La compilación falló.' }
    } finally {
        Pop-Location
        Remove-Item Env:\ISLA_STORE -ErrorAction SilentlyContinue
    }
}
if (-not (Test-Path $exe)) { throw "No existe $exe. Compila primero (quita -SinCompilar)." }

# --- 2. Carpeta del paquete ---
if (Test-Path $carpeta) { Remove-Item $carpeta -Recurse -Force }
New-Item -ItemType Directory -Force $carpeta | Out-Null
Copy-Item $exe $carpeta
Copy-Item (Join-Path $plantilla 'Assets') $carpeta -Recurse
$manifiesto = (Get-Content (Join-Path $plantilla 'AppxManifest.xml') -Raw -Encoding UTF8).Replace('__VERSION__', $version)
[IO.File]::WriteAllText((Join-Path $carpeta 'AppxManifest.xml'), $manifiesto, (New-Object Text.UTF8Encoding $false))

# --- 3. Empaquetar ---
$msix = Join-Path $salida "isbar_${version}_x64.msix"
& $makeappx pack /o /d $carpeta /p $msix | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'makeappx no pudo crear el paquete (revisa el AppxManifest).' }
Write-Host "Paquete para la Store: $msix"

# --- Copia firmada para probar en este PC ---
if ($Probar) {
    $signtool = Buscar-Herramienta 'signtool.exe'
    $cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $editor -and $_.FriendlyName -eq 'isbar (pruebas locales)' } | Select-Object -First 1
    if (-not $cert) {
        Write-Host "Creando certificado de prueba $editor"
        $cert = New-SelfSignedCertificate -Type Custom -Subject $editor `
            -KeyUsage DigitalSignature -FriendlyName 'isbar (pruebas locales)' `
            -CertStoreLocation Cert:\CurrentUser\My `
            -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3', '2.5.29.19={text}')
    }
    if (-not (Test-Path "Cert:\LocalMachine\TrustedPeople\$($cert.Thumbprint)")) {
        $esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
            [Security.Principal.WindowsBuiltInRole]::Administrator)
        if (-not $esAdmin) {
            throw 'La primera vez hay que confiar en el certificado de prueba: abre PowerShell como administrador y ejecuta: powershell -ExecutionPolicy Bypass -File scripts\paquete-store.ps1 -Probar -SinCompilar'
        }
        $cer = Join-Path $env:TEMP 'isbar-pruebas.cer'
        Export-Certificate -Cert $cert -FilePath $cer | Out-Null
        Import-Certificate -FilePath $cer -CertStoreLocation Cert:\LocalMachine\TrustedPeople | Out-Null
        Remove-Item $cer
    }
    $prueba = Join-Path $salida "isbar_${version}_x64_pruebas.msix"
    Copy-Item $msix $prueba -Force
    & $signtool sign /q /fd SHA256 /sha1 $cert.Thumbprint /s My $prueba
    if ($LASTEXITCODE -ne 0) { throw 'signtool no pudo firmar la copia de prueba.' }
    Write-Host "Copia firmada para probar: $prueba (doble clic para instalarla)"
}
