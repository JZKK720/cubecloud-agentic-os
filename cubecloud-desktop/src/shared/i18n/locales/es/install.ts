export default {
  preparing: "Preparando...",
  startingInstall: "Iniciando la instalación",
  installationComplete: "Instalación completada",
  installationFailed: "La instalación falló",
  installingHermes: "Instalando el runtime local",
  installationFailedHint:
    "La instalación falló. Inténtalo de nuevo o instala desde la terminal.",
  retryInstallation: "Reintentar la instalación",
  copied: "¡Copiado!",
  copyLogs: "Copiar registros",
  stepLabel: "Paso {{step}}/{{total}}: {{title}}",
  waitingToStart: "Esperando para iniciar...",
  continueToSetup: "Continuar con la configuración",
  confirmTitle: "Antes de instalar",
  confirmLocationLabel: "El runtime local se instalará en:",
  confirmFresh:
    "No se encontró ninguna instalación existente aquí — se configurará una copia nueva.",
  confirmUpdate:
    "Aquí hay una instalación existente del runtime local — se actualizará a la última versión.",
  confirmReplace:
    "Existe una carpeta aquí, pero no es una instalación válida del runtime local — instalarla la eliminará y la reemplazará.",
  confirmNotInherited:
    "Si instalaste el runtime en otro lugar, o mediante la línea de comandos, no se conservará.",
  confirmInstallBtn: "Instalar runtime local",
  useExistingBtn: "Usar una instalación existente",
  useExistingHint:
    "Selecciona la carpeta que contiene tu instalación existente del runtime local (la que contiene la carpeta hermes-agent).",
  useExistingInvalid:
    "No se encontró una instalación utilizable del runtime local en esa carpeta.",
  useExistingDone:
    "Instalación existente configurada — cierra y vuelve a abrir Cubecloud Desktop para aplicarla.",
  useExistingQuitBtn: "Salir de Cubecloud Desktop",
} as const;
