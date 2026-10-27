fn main() {
    // Embebe un manifiesto propio con la identidad msix del sparse package (Fase 4)
    let windows = tauri_build::WindowsAttributes::new().app_manifest(include_str!("isla.exe.manifest"));
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("error al ejecutar tauri-build");
}
