# Comprueba si el proceso isla.exe en ejecución tiene identidad de paquete.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\check-identity.ps1
$ErrorActionPreference = 'Stop'

Add-Type -Namespace Isla -Name Kernel -MemberDefinition @'
[DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
public static extern int GetPackageFullName(IntPtr hProcess, ref uint length, System.Text.StringBuilder name);
'@

$proceso = Get-Process -Name 'isla' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proceso) {
    Write-Host 'isla.exe no está en ejecución.'
    exit 1
}

$largo = [uint32]256
$nombre = New-Object System.Text.StringBuilder 256
$resultado = [Isla.Kernel]::GetPackageFullName($proceso.Handle, [ref]$largo, $nombre)
if ($resultado -eq 0) {
    Write-Host "isla.exe (PID $($proceso.Id)) tiene identidad: $nombre"
} else {
    # 15700 = APPMODEL_ERROR_NO_PACKAGE
    Write-Host "isla.exe (PID $($proceso.Id)) NO tiene identidad de paquete (código $resultado)."
    exit 1
}
