import type { DeepStrings, Dictionary } from "./types";

/** Spanish dictionary — translated naturally, not literally. */
const es = {
  common: {
    tagline: "Transferencia de archivos peer-to-peer en tu navegador.",
    password: "Contraseña",
    cancel: "Cancelar",
    start: "Iniciar",
    backToHome: "Volver al inicio",
    file: "Archivo",
    size: "Tamaño",
    removeFile: "Quitar archivo",
    tryAgain: "Intentar de nuevo",
    newTransfer: "Nueva transferencia",
    startNewTransfer: "Iniciar nueva transferencia",
    sendAnotherFile: "Enviar otro archivo",
    termsNote:
      "Al compartir un archivo, aceptas los t\u00e9rminos simples de Filebara. Mant\u00e9n la pesta\u00f1a abierta mientras la transferencia est\u00e9 activa.",
  },

  sender: {
    aboutToUpload: "Est\u00e1s a punto de empezar a subir 1 archivo.",
    addMoreFiles: "A\u00f1adir m\u00e1s archivos",
    errorBootstrap: "Error al crear la sesi\u00f3n de transferencia.",
    errorListening: "Error al iniciar la escucha.",
    errorTransfer: "Transferencia fallida.",
    errorApprove: "Error al aprobar al receptor.",
    errorDeny: "Error al denegar al receptor.",
    start: "Iniciar",
    waiting: "Esperando a que el receptor se conecte…",
    approved: "Receptor aprobado",
    approving: "El receptor ha sido aprobado. Iniciando transferencia…",
    completed: "Transferencia completa",
    completedDesc: "El archivo se ha enviado correctamente al receptor.",
    failed: "Transferencia fallida",
    bootstrap: "Configurando sesión segura…",
    listening:
      "Esperando a que el receptor se conecte y verifique la contraseña…",
    verifying: "Finalizando transferencia…",
  },

  receiver: {
    join: "Unirse a la transferencia",
    heading: "Has sido invitado a recibir un archivo",
    enterPassword:
      "Introduce la contraseña establecida por el remitente para continuar.",
    preparing: "Preparando sesión segura…",
    proof: "Calculando prueba de contraseña…",
    identity: "Preparando identidad del receptor…",
    awaiting: "Esperando aprobación",
    connecting: "Conectando y autenticando con el remitente…",
    approved: "¡Has sido aprobado!",
    receiving: "Recibiendo archivo…",
    completed: "¡Archivo recibido!",
    download: "Descargar archivo",
    verifying: "Verificando integridad del archivo…",
    denied: "El remitente negó la solicitud de transferencia.",
    unableToReceive: "No se pudo recibir el archivo",
    session: "Sesión",
    errorSetup: "Error al completar la configuración.",
    errorDenied: "El remitente negó la solicitud de transferencia.",
    errorFailed: "Error en la recepción del archivo.",
    errorNoBlob:
      "Transferencia completada pero faltan los datos del archivo. Esto puede indicar un error de protocolo.",
    receivingChunks: "Recibiendo fragmentos cifrados…",
  },

  shareScreen: {
    copy: "Copiar",
    copied: "¡Copiado!",
    showQr: "Mostrar QR",
    hideQr: "Ocultar QR",
    shareLink: "Comparte este enlace con quien va a recibir",
    waiting: "Esperando a que el receptor se conecte…",
    keepOpen: "Mantén esta pestaña abierta.",
    keepOpenDetail:
      "La transferencia solo puede continuar mientras esta página esté abierta. Cerrar esta pestaña cancelará la sesión.",
    copyError:
      "No se pudo copiar automáticamente. Selecciona y copia el enlace manualmente.",
  },

  approval: {
    title: "El receptor quiere conectarse",
    code: "Código de verificación",
    hint: "Pide al receptor que confirme este código. Si coincide, puedes aprobar la transferencia.",
    fingerprint: "Identificación del receptor",
    approve: "Aprobar",
    deny: "Negar",
    verified: "Confirmado — este código coincide con el del remitente.",
  },

  fileSelector: {
    dropFile: "Suelta un archivo para empezar",
  },

  footer: {
    credit: "Hecho para transferencias rápidas y directas en el navegador",
    terms: "Términos",
    faq: "Preguntas frecuentes",
    github: "GitHub",
    fork: "Fork",
    support: "Soporte",
  },

  faq: {
    title: "Preguntas frecuentes",
    q0: "¿Cómo funciona Filebara?",
    a0: "Los archivos se transfieren directamente del navegador del remitente al navegador del receptor usando WebRTC. Ningún archivo se sube a ningún servidor de Filebara. Un servidor de señalización PeerJS se usa solo para ayudar a los dos navegadores a encontrarse.",
    q1: "¿Necesito instalar algo?",
    a1: "No. Filebara funciona completamente en tu navegador. Solo abre el enlace, introduce la contraseña y recibe el archivo.",
    q2: "¿Filebara almacena mis archivos?",
    a2: "No. Los archivos nunca tocan ningún servidor operado por Filebara. El único servidor involucrado es un servidor de señalización PeerJS que ayuda a establecer la conexión directa, y nunca ve el contenido de los archivos ni la contraseña.",
    q3: "¿Por qué necesito mantener la pestaña del remitente abierta?",
    a3: "Porque el archivo se envía directamente desde el navegador del remitente. Si el remitente cierra la pestaña, la conexión se cae y la transferencia se detiene. El receptor verá un mensaje de desconexión.",
    q4: "¿Qué es el código de verificación?",
    a4: "Después de que el receptor introduce la contraseña, tanto el remitente como el receptor ven un código corto de verificación. Deben comparar los códigos (por ejemplo, por llamada o chat) para confirmar que están hablando con la persona correcta. Si los códigos coinciden, el remitente aprueba la transferencia.",
    q5: "¿Qué pasa si el remitente cierra su pestaña?",
    a5: "El receptor verá un mensaje indicando que la transferencia fue interrumpida. El remitente necesita crear una nueva transferencia y compartir un nuevo enlace.",
    q6: "¿Hay un límite de tamaño de archivo?",
    a6: "No hay un límite fijo, pero archivos muy grandes pueden ser lentos o inestables porque la transferencia ocurre completamente en el navegador. Para mejores resultados, usa Filebara para archivos de hasta unos pocos cientos de megabytes.",
    q7: "¿Qué navegadores son compatibles?",
    a7: "Filebara funciona en navegadores modernos con soporte WebRTC: Chrome, Edge, Firefox y Safari. La Web Crypto API requiere un contexto seguro (HTTPS o localhost).",
    q8: "¿Para qué sirve la contraseña?",
    a8: "La contraseña se usa para derivar una clave de cifrado (mediante Argon2id) que protege la transferencia. El remitente establece la contraseña y la comparte con el receptor por un canal separado (por ejemplo, un mensaje). Filebara nunca ve la contraseña.",
    q9: "¿Filebara es gratuito?",
    a9: "Sí. Filebara es gratuito y de código abierto. Puedes ver el código fuente y contribuir en GitHub.",
    back: "Volver al inicio",
  },

  terms: {
    title: "Términos",
    intro:
      "Filebara es una herramienta gratuita y de código abierto para enviar archivos directamente entre navegadores. Al usar Filebara, aceptas estos términos simples.",
    section0: {
      heading: "Sin almacenamiento de archivos",
      body: "Los archivos se transfieren directamente del remitente al receptor. Filebara no almacena, copia ni tiene acceso a tus archivos. Un servidor de señalización PeerJS se usa para ayudar a los navegadores a encontrarse, pero nunca ve el contenido de los archivos.",
    },
    section1: {
      heading: "Tu responsabilidad",
      body: "Eres responsable de los archivos que envías y recibes. Eres responsable de compartir el enlace de transferencia y la contraseña de forma segura con el destinatario previsto.",
    },
    section2: {
      heading: "Sin garantía",
      body: 'Filebara se proporciona "tal cual" sin ninguna garantía. Las transferencias pueden fallar debido a condiciones de red, limitaciones del navegador u otros factores. No nos hacemos responsables de ninguna pérdida de datos o daños derivados del uso de Filebara.',
    },
    section3: {
      heading: "Código abierto",
      body: "Filebara es software de código abierto licenciado bajo la MIT License. El código fuente está disponible en GitHub.",
    },
    section4: {
      heading: "Cambios",
      body: "Estos términos pueden cambiar a medida que el proyecto evoluciona. Actualizaremos esta página cuando eso ocurra.",
    },
    back: "Volver al inicio",
  },

  errors: {
    passwordLength: "La contraseña debe tener al menos {n} caracteres.",
    transferLinkInvalid:
      "Este enlace de transferencia es inválido o está mal formado.",
    receiverDenied: "El remitente negó la solicitud de transferencia.",
    labels: {
      senderOffline: "Remitente desconectado",
      wrongPassword: "Contraseña incorrecta",
      denied: "Transferencia denegada",
      connectionFailed: "Conexión fallida",
      transferInterrupted: "Transferencia interrumpida",
      integrityFailed: "Verificación de integridad fallida",
      unknown: "Algo salió mal",
    },
    descriptions: {
      senderOffline:
        "La pestaña del navegador del remitente se cerró o perdió la conexión antes de que la transferencia pudiera completarse.",
      wrongPassword:
        "La contraseña introducida no coincide con la establecida por el remitente. No se ha revelado información de la sesión.",
      denied:
        "El remitente optó por no aprobar esta solicitud de transferencia.",
      connectionFailed:
        "No se pudo establecer una conexión directa entre los navegadores. Esto puede ocurrir en ciertas redes o VPNs.",
      transferInterrupted:
        "Se perdió la conexión mientras se transfería el archivo. Los datos recibidos pueden estar incompletos.",
      integrityFailed:
        "No se pudo verificar el archivo recibido. Los datos pueden haberse corrompido durante la transferencia y no deben ser confiables.",
      unknown:
        "Ocurrió un error inesperado. Inténtalo de nuevo o crea una nueva transferencia.",
    },
    guidance: {
      senderOffline:
        "La pestaña del remitente ya no está disponible. El remitente necesita crear una nueva transferencia y compartir un nuevo enlace.",
      wrongPassword:
        "Verifica la contraseña e inténtalo de nuevo. La contraseña fue establecida por el remitente al crear la transferencia.",
      denied:
        "El remitente ha negado esta solicitud. Se requiere un nuevo enlace de transferencia.",
      connectionFailed:
        "Puedes intentarlo de nuevo. Si el problema persiste, ambas partes pueden necesitar cambiar de red o el remitente puede crear una nueva transferencia.",
      transferInterrupted:
        "La transferencia fue interrumpida y no puede continuar. El remitente necesita crear una nueva transferencia.",
      integrityFailed:
        "No se pudo verificar la integridad del archivo. No confíes en el archivo recibido. El remitente debería crear una nueva transferencia.",
      unknown:
        "Ocurrió un error inesperado. Inténtalo de nuevo o pide al remitente que cree una nueva transferencia.",
    },
  },

  states: {
    preparing: "Preparando sesión",
    connecting: "Conectando",
    validating: "Verificando contraseña",
    awaitingApproval: "Esperando aprobación",
    transferring: "Transfiriendo archivo",
    verifying: "Verificando integridad del archivo",
    completed: "Transferencia completa",
    failed: "Transferencia fallida",
  },
} as const satisfies DeepStrings<Dictionary>;

export default es;
