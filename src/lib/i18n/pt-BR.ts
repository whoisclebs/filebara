import type { DeepStrings, Dictionary } from "./types";

/** Brazilian Portuguese dictionary — translated naturally, not literally. */
const ptBR = {
  common: {
    tagline: "Transfer\u00eancia de arquivos peer-to-peer no seu navegador.",
    password: "Senha",
    cancel: "Cancelar",
    start: "Iniciar",
    backToHome: "Voltar ao in\u00edcio",
    file: "Arquivo",
    size: "Tamanho",
    removeFile: "Remover arquivo",
    tryAgain: "Tentar novamente",
    newTransfer: "Nova transfer\u00eancia",
    startNewTransfer: "Iniciar nova transfer\u00eancia",
    sendAnotherFile: "Enviar outro arquivo",
    termsNote:
      "Ao compartilhar um arquivo, voc\u00ea concorda com os termos simples do Filebara. Mantenha a aba aberta enquanto a transfer\u00eancia estiver ativa.",
  },

  sender: {
    aboutToUpload:
      "Voc\u00ea est\u00e1 prestes a come\u00e7ar o upload de 1 arquivo.",
    addMoreFiles: "Adicionar mais arquivos",
    errorBootstrap: "Falha ao criar sess\u00e3o de transfer\u00eancia.",
    errorListening: "Falha ao iniciar a escuta.",
    errorTransfer: "Transfer\u00eancia falhou.",
    errorApprove: "Falha ao aprovar o receptor.",
    errorDeny: "Falha ao negar o receptor.",
    start: "Iniciar",
    waiting: "Aguardando o receptor conectar\u2026",
    approved: "Receptor aprovado",
    approving: "O receptor foi aprovado. Transfer\u00eancia iniciando\u2026",
    completed: "Transfer\u00eancia conclu\u00edda",
    completedDesc: "O arquivo foi enviado com sucesso ao receptor.",
    failed: "Transfer\u00eancia falhou",
    bootstrap: "Configurando sess\u00e3o segura\u2026",
    listening: "Aguardando o receptor conectar e verificar a senha\u2026",
    verifying: "Finalizando transfer\u00eancia\u2026",
  },

  receiver: {
    join: "Entrar na transfer\u00eancia",
    heading: "Voc\u00ea foi convidado a receber um arquivo",
    enterPassword: "Digite a senha definida pelo remetente para continuar.",
    preparing: "Preparando sess\u00e3o segura\u2026",
    proof: "Calculando prova de senha\u2026",
    identity: "Preparando identidade do receptor\u2026",
    awaiting: "Aguardando aprova\u00e7\u00e3o",
    connecting: "Conectando e autenticando com o remetente\u2026",
    approved: "Voc\u00ea foi aprovado!",
    receiving: "Recebendo arquivo\u2026",
    completed: "Arquivo recebido!",
    download: "Baixar arquivo",
    verifying: "Verificando integridade do arquivo\u2026",
    denied: "O remetente negou a solicita\u00e7\u00e3o de transfer\u00eancia.",
    unableToReceive: "N\u00e3o foi poss\u00edvel receber o arquivo",
    session: "Sess\u00e3o",
    errorSetup: "Falha ao concluir a configura\u00e7\u00e3o.",
    errorDenied:
      "O remetente negou a solicita\u00e7\u00e3o de transfer\u00eancia.",
    errorFailed: "Falha no recebimento do arquivo.",
    errorNoBlob:
      "Transfer\u00eancia conclu\u00edda, mas os dados do arquivo est\u00e3o ausentes. Isso pode indicar um erro de protocolo.",
    receivingChunks: "Recebendo blocos criptografados\u2026",
  },

  shareScreen: {
    copy: "Copiar",
    copied: "Copiado!",
    showQr: "Mostrar QR",
    hideQr: "Esconder QR",
    shareLink: "Compartilhe este link com quem vai receber",
    waiting: "Aguardando o receptor conectar\u2026",
    keepOpen: "Mantenha esta aba aberta.",
    keepOpenDetail:
      "A transfer\u00eancia s\u00f3 pode prosseguir enquanto esta p\u00e1gina estiver aberta. Fechar esta aba cancelar\u00e1 a sess\u00e3o.",
    copyError:
      "N\u00e3o foi poss\u00edvel copiar automaticamente. Selecione e copie o link manualmente.",
  },

  approval: {
    title: "O receptor deseja conectar",
    code: "C\u00f3digo de verifica\u00e7\u00e3o",
    hint: "Pe\u00e7a ao receptor para confirmar este c\u00f3digo. Se coincidir, voc\u00ea pode aprovar a transfer\u00eancia.",
    fingerprint: "Identifica\u00e7\u00e3o do Receptor",
    approve: "Aprovar",
    deny: "Negar",
    verified: "Confirmado \u2014 este c\u00f3digo corresponde ao do remetente.",
  },

  fileSelector: {
    dropFile: "Solte um arquivo para come\u00e7ar",
  },

  footer: {
    credit:
      "Feito para transfer\u00eancias r\u00e1pidas e diretas no navegador",
    terms: "Termos",
    faq: "Perguntas Frequentes",
    github: "GitHub",
    fork: "Fork",
    support: "Suporte",
  },

  faq: {
    title: "Perguntas Frequentes",
    q0: "Como o Filebara funciona?",
    a0: "Os arquivos s\u00e3o transferidos diretamente do navegador do remetente para o navegador do receptor usando WebRTC. Nenhum arquivo \u00e9 enviado a qualquer servidor do Filebara. Um servidor de sinaliza\u00e7\u00e3o PeerJS \u00e9 usado apenas para ajudar os dois navegadores a se encontrarem.",
    q1: "Preciso instalar alguma coisa?",
    a1: "N\u00e3o. O Filebara funciona inteiramente no seu navegador. Basta abrir o link, digitar a senha e receber o arquivo.",
    q2: "O Filebara armazena meus arquivos?",
    a2: "N\u00e3o. Os arquivos nunca tocam em nenhum servidor operado pelo Filebara. O \u00fanico servidor envolvido \u00e9 um servidor de sinaliza\u00e7\u00e3o PeerJS que ajuda a estabelecer a conex\u00e3o direta, e ele nunca v\u00ea o conte\u00fado dos arquivos nem a senha.",
    q3: "Por que preciso manter a aba do remetente aberta?",
    a3: "Porque o arquivo \u00e9 enviado diretamente do navegador do remetente. Se o remetente fechar a aba, a conex\u00e3o cai e a transfer\u00eancia para. O receptor ver\u00e1 uma mensagem de desconex\u00e3o.",
    q4: "O que \u00e9 o c\u00f3digo de verifica\u00e7\u00e3o?",
    a4: "Ap\u00f3s o receptor digitar a senha, tanto o remetente quanto o receptor veem um c\u00f3digo curto de verifica\u00e7\u00e3o. Eles devem comparar os c\u00f3digos (por exemplo, por chamada ou chat) para confirmar que est\u00e3o falando com a pessoa certa. Se os c\u00f3digos coincidirem, o remetente aprova a transfer\u00eancia.",
    q5: "O que acontece se o remetente fechar a aba?",
    a5: "O receptor ver\u00e1 uma mensagem informando que a transfer\u00eancia foi interrompida. O remetente precisa criar uma nova transfer\u00eancia e compartilhar um novo link.",
    q6: "H\u00e1 limite de tamanho de arquivo?",
    a6: "N\u00e3o h\u00e1 um limite fixo, mas arquivos muito grandes podem ficar lentos ou inst\u00e1veis porque a transfer\u00eancia acontece inteiramente no navegador. Para melhores resultados, use o Filebara para arquivos de at\u00e9 algumas centenas de megabytes.",
    q7: "Quais navegadores s\u00e3o suportados?",
    a7: "O Filebara funciona em navegadores modernos com suporte a WebRTC: Chrome, Edge, Firefox e Safari. A Web Crypto API exige um contexto seguro (HTTPS ou localhost).",
    q8: "Para que serve a senha?",
    a8: "A senha \u00e9 usada para derivar uma chave de criptografia (via Argon2id) que protege a transfer\u00eancia. O remetente define a senha e a compartilha com o receptor por um canal separado (por exemplo, uma mensagem). O Filebara nunca v\u00ea a senha.",
    q9: "O Filebara \u00e9 gratuito?",
    a9: "Sim. O Filebara \u00e9 gratuito e de c\u00f3digo aberto. Voc\u00ea pode ver o c\u00f3digo-fonte e contribuir no GitHub.",
    back: "Voltar ao in\u00edcio",
  },

  terms: {
    title: "Termos",
    intro:
      "O Filebara \u00e9 uma ferramenta gratuita e de c\u00f3digo aberto para enviar arquivos diretamente entre navegadores. Ao usar o Filebara, voc\u00ea concorda com estes termos simples.",
    section0: {
      heading: "Sem armazenamento de arquivos",
      body: "Os arquivos s\u00e3o transferidos diretamente do remetente para o receptor. O Filebara n\u00e3o armazena, copia nem tem acesso aos seus arquivos. Um servidor de sinaliza\u00e7\u00e3o PeerJS \u00e9 usado para ajudar os navegadores a se encontrarem, mas ele nunca v\u00ea o conte\u00fado dos arquivos.",
    },
    section1: {
      heading: "Sua responsabilidade",
      body: "Voc\u00ea \u00e9 respons\u00e1vel pelos arquivos que envia e recebe. Voc\u00ea \u00e9 respons\u00e1vel por compartilhar o link de transfer\u00eancia e a senha de forma segura com o destinat\u00e1rio pretendido.",
    },
    section2: {
      heading: "Sem garantia",
      body: 'O Filebara \u00e9 fornecido "como est\u00e1", sem qualquer garantia. As transfer\u00eancias podem falhar devido a condi\u00e7\u00f5es de rede, limita\u00e7\u00f5es do navegador ou outros fatores. N\u00e3o nos responsabilizamos por perda de dados ou danos decorrentes do uso do Filebara.',
    },
    section3: {
      heading: "C\u00f3digo aberto",
      body: "O Filebara \u00e9 um software de c\u00f3digo aberto licenciado sob a MIT License. O c\u00f3digo-fonte est\u00e1 dispon\u00edvel no GitHub.",
    },
    section4: {
      heading: "Altera\u00e7\u00f5es",
      body: "Estes termos podem mudar conforme o projeto evolui. Atualizaremos esta p\u00e1gina quando isso acontecer.",
    },
    back: "Voltar ao in\u00edcio",
  },

  errors: {
    passwordLength: "A senha deve ter pelo menos {n} caracteres.",
    transferLinkInvalid:
      "Este link de transfer\u00eancia \u00e9 inv\u00e1lido ou malformado.",
    receiverDenied:
      "O remetente negou a solicita\u00e7\u00e3o de transfer\u00eancia.",
    labels: {
      senderOffline: "Remetente ficou offline",
      wrongPassword: "Senha incorreta",
      denied: "Transfer\u00eancia negada",
      connectionFailed: "Conex\u00e3o falhou",
      transferInterrupted: "Transfer\u00eancia interrompida",
      integrityFailed: "Falha na verifica\u00e7\u00e3o de integridade",
      unknown: "Algo deu errado",
    },
    descriptions: {
      senderOffline:
        "A aba do navegador do remetente foi fechada ou perdeu a conex\u00e3o antes da transfer\u00eancia ser conclu\u00edda.",
      wrongPassword:
        "A senha digitada n\u00e3o corresponde \u00e0 definida pelo remetente. Nenhuma informa\u00e7\u00e3o da sess\u00e3o foi revelada.",
      denied:
        "O remetente optou por n\u00e3o aprovar esta solicita\u00e7\u00e3o de transfer\u00eancia.",
      connectionFailed:
        "N\u00e3o foi poss\u00edvel estabelecer uma conex\u00e3o direta entre os navegadores. Isso pode acontecer em determinadas redes ou VPNs.",
      transferInterrupted:
        "A conex\u00e3o foi perdida durante a transfer\u00eancia do arquivo. Os dados recebidos podem estar incompletos.",
      integrityFailed:
        "O arquivo recebido n\u00e3o p\u00f4de ser verificado. Os dados podem ter sido corrompidos durante a transfer\u00eancia e n\u00e3o devem ser confi\u00e1veis.",
      unknown:
        "Ocorreu um erro inesperado. Tente novamente ou crie uma nova transfer\u00eancia.",
    },
    guidance: {
      senderOffline:
        "A aba do remetente n\u00e3o est\u00e1 mais dispon\u00edvel. O remetente precisa criar uma nova transfer\u00eancia e compartilhar um novo link.",
      wrongPassword:
        "Verifique a senha e tente novamente. A senha foi definida pelo remetente ao criar a transfer\u00eancia.",
      denied:
        "O remetente negou esta solicita\u00e7\u00e3o. Um novo link de transfer\u00eancia \u00e9 necess\u00e1rio.",
      connectionFailed:
        "Voc\u00ea pode tentar novamente. Se o problema persistir, ambas as partes podem precisar trocar de rede ou o remetente pode criar uma nova transfer\u00eancia.",
      transferInterrupted:
        "A transfer\u00eancia foi interrompida e n\u00e3o pode continuar. O remetente precisa criar uma nova transfer\u00eancia.",
      integrityFailed:
        "A integridade do arquivo n\u00e3o p\u00f4de ser verificada. N\u00e3o confie no arquivo recebido. O remetente deve criar uma nova transfer\u00eancia.",
      unknown:
        "Ocorreu um erro inesperado. Tente novamente ou pe\u00e7a ao remetente para criar uma nova transfer\u00eancia.",
    },
  },

  states: {
    preparing: "Preparando sess\u00e3o",
    connecting: "Conectando",
    validating: "Verificando senha",
    awaitingApproval: "Aguardando aprova\u00e7\u00e3o",
    transferring: "Transferindo arquivo",
    verifying: "Verificando integridade do arquivo",
    completed: "Transfer\u00eancia conclu\u00edda",
    failed: "Transfer\u00eancia falhou",
  },
} as const satisfies DeepStrings<Dictionary>;

export default ptBR;
