; Custom NSIS installer script for RocketRAM
; This file customizes the installer behavior

!macro customInstall
  ; Add custom installation steps here if needed
  ; For example: Create registry entries, install additional files, etc.
!macroend

!macro customUnInstall
  ; Add custom uninstallation steps here if needed
  ; For example: Remove registry entries, clean up additional files, etc.
!macroend

; Custom installer page text
!define MUI_WELCOMEPAGE_TEXT "Welcome to RocketRAM Setup$\r$\n$\r$\nThis wizard will guide you through the installation of RocketRAM, a powerful PC performance monitoring and optimization widget.$\r$\n$\r$\nClick Next to continue."

; Custom finish page text
!define MUI_FINISHPAGE_RUN "$INSTDIR\RocketRAM.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch RocketRAM"


