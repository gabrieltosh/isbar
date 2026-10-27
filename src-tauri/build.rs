fn main() {
    // Manifiesto del ejecutable:
    // - normal: lleva la identidad msix del sparse package de desarrollo (Fase 4)
    // - ISLA_STORE=1: para el MSIX completo de Microsoft Store, sin esa identidad
    println!("cargo:rerun-if-env-changed=ISLA_STORE");
    let manifiesto = if std::env::var_os("ISLA_STORE").is_some() {
        include_str!("isla-store.exe.manifest")
    } else {
        include_str!("isla.exe.manifest")
    };
    let windows = tauri_build::WindowsAttributes::new().app_manifest(manifiesto);
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("error al ejecutar tauri-build");
}
