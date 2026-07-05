/** English dictionary — source of truth for all UI strings. */
const en = {
  common: {
    tagline: "Peer-to-peer file transfers in your browser.",
    password: "Password",
    cancel: "Cancel",
    start: "Start",
    backToHome: "Back to home",
    file: "File",
    size: "Size",
    removeFile: "Remove file",
    tryAgain: "Try again",
    newTransfer: "New transfer",
    startNewTransfer: "Start new transfer",
    sendAnotherFile: "Send another file",
    termsNote:
      "By sharing a file, you agree to the simple Filebara terms. Keep the tab open while the transfer is active.",
  },

  sender: {
    aboutToUpload: "You are about to start uploading 1 file.",
    addMoreFiles: "Add more files",
    errorBootstrap: "Failed to create transfer session.",
    errorListening: "Failed to start listening.",
    errorTransfer: "Transfer failed.",
    errorApprove: "Failed to approve receiver.",
    errorDeny: "Failed to deny receiver.",
    start: "Start",
    waiting: "Waiting for receiver to connect\u2026",
    approved: "Receiver approved",
    approving: "Receiver has been approved. Transfer starting\u2026",
    completed: "Transfer complete",
    completedDesc: "The file has been successfully sent to the receiver.",
    failed: "Transfer failed",
    bootstrap: "Setting up secure transfer session\u2026",
    listening: "Waiting for receiver to connect and verify password\u2026",
    verifying: "Completing transfer\u2026",
  },

  receiver: {
    join: "Join transfer",
    heading: "You have been invited to receive a file",
    enterPassword: "Enter the password set by the sender to continue.",
    preparing: "Preparing secure session\u2026",
    proof: "Computing password proof\u2026",
    identity: "Preparing receiver identity\u2026",
    awaiting: "Awaiting approval",
    connecting: "Connecting and authenticating with sender\u2026",
    approved: "You\u2019ve been approved!",
    receiving: "Receiving file\u2026",
    completed: "File received!",
    download: "Download file",
    verifying: "Verifying file integrity\u2026",
    denied: "The sender denied the transfer request.",
    unableToReceive: "Unable to receive file",
    session: "Session",
    errorSetup: "Failed to complete setup.",
    errorDenied: "The sender denied the transfer request.",
    errorFailed: "File receipt failed.",
    errorNoBlob:
      "Transfer completed but the file data is missing. This may indicate a protocol error.",
    receivingChunks: "Receiving encrypted chunks\u2026",
  },

  shareScreen: {
    copy: "Copy",
    copied: "Copied!",
    showQr: "Show QR",
    hideQr: "Hide QR",
    shareLink: "Share this link with the receiver",
    waiting: "Waiting for receiver to connect\u2026",
    keepOpen: "Keep this tab open.",
    keepOpenDetail:
      "The transfer can only proceed while this page is open. Closing this tab will cancel the session.",
    copyError:
      "Unable to copy automatically. Please select and copy the link manually.",
  },

  approval: {
    title: "Receiver wants to connect",
    code: "Verification Code",
    hint: "Ask the receiver to confirm this code. If it matches, you can approve the transfer.",
    fingerprint: "Receiver Fingerprint",
    approve: "Approve",
    deny: "Deny",
    verified: "Confirmed \u2014 this code matched the sender\u2019s.",
  },

  fileSelector: {
    dropFile: "Drop a file to get started",
  },

  footer: {
    credit: "Made for tiny, direct browser transfers",
    terms: "Terms",
    faq: "FAQ",
    github: "GitHub",
    fork: "Fork",
    support: "Support",
  },

  faq: {
    title: "Frequently Asked Questions",
    q0: "How does Filebara work?",
    a0: "Files transfer directly from the sender\u2019s browser to the receiver\u2019s browser using WebRTC. No file is uploaded to any Filebara server. A PeerJS signaling server is used only to help the two browsers find each other.",
    q1: "Do I need to install anything?",
    a1: "No. Filebara runs entirely in your browser. Just open the link, enter the password, and receive the file.",
    q2: "Does Filebara store my files?",
    a2: "No. Files never touch any Filebara-operated server. The only server involved is a PeerJS signaling server that helps establish the direct connection, and it never sees file contents or the password.",
    q3: "Why do I need to keep the sender tab open?",
    a3: "Because the file is sent directly from the sender\u2019s browser. If the sender closes the tab, the connection drops and the transfer stops. The receiver will see a disconnect message.",
    q4: "What is the verification code?",
    a4: "After the receiver enters the password, both sender and receiver see a short verification code. They should compare codes (e.g. over a phone call or chat) to confirm they\u2019re talking to the right person. If the codes match, the sender approves the transfer.",
    q5: "What happens if the sender closes their tab?",
    a5: "The receiver will see a message that the transfer was interrupted. The sender needs to create a new transfer and share a new link.",
    q6: "Is there a file size limit?",
    a6: "There is no hard limit, but very large files may be slow or unstable because the transfer happens entirely in the browser. For best results, use Filebara for files under a few hundred megabytes.",
    q7: "Which browsers are supported?",
    a7: "Filebara works in modern browsers with WebRTC support: Chrome, Edge, Firefox, and Safari. Web Crypto API requires a secure context (HTTPS or localhost).",
    q8: "What does the password do?",
    a8: "The password is used to derive an encryption key (via Argon2id) that protects the transfer. The sender sets the password and shares it with the receiver through a separate channel (e.g. a message). Filebara never sees the password.",
    q9: "Is Filebara free?",
    a9: "Yes. Filebara is free and open-source. You can view the source and contribute on GitHub.",
    back: "Back to home",
  },

  terms: {
    title: "Terms",
    intro:
      "Filebara is a free, open-source tool for sending files directly between browsers. By using Filebara, you agree to these simple terms.",
    section0: {
      heading: "No file storage",
      body: "Files are transferred directly from sender to receiver. Filebara does not store, copy, or have access to your files. A PeerJS signaling server is used to help browsers find each other, but it never sees file contents.",
    },
    section1: {
      heading: "Your responsibility",
      body: "You are responsible for the files you send and receive. You are responsible for sharing the transfer link and password securely with the intended recipient.",
    },
    section2: {
      heading: "No warranty",
      body: 'Filebara is provided "as is" without any warranty. File transfers may fail due to network conditions, browser limitations, or other factors. We are not liable for any data loss or damages arising from the use of Filebara.',
    },
    section3: {
      heading: "Open source",
      body: "Filebara is open-source software licensed under the MIT License. The source code is available on GitHub.",
    },
    section4: {
      heading: "Changes",
      body: "These terms may change as the project evolves. We will update this page when they do.",
    },
    back: "Back to home",
  },

  errors: {
    passwordLength: "Password must be at least {n} characters.",
    transferLinkInvalid: "This transfer link is invalid or malformed.",
    receiverDenied: "The sender denied the transfer request.",
    labels: {
      senderOffline: "Sender went offline",
      wrongPassword: "Incorrect password",
      denied: "Transfer denied",
      connectionFailed: "Connection failed",
      transferInterrupted: "Transfer interrupted",
      integrityFailed: "Integrity check failed",
      unknown: "Something went wrong",
    },
    descriptions: {
      senderOffline:
        "The sender\u2019s browser tab was closed or lost connectivity before the transfer could complete.",
      wrongPassword:
        "The password entered does not match the one set by the sender. No session information has been revealed.",
      denied: "The sender chose not to approve this transfer request.",
      connectionFailed:
        "A direct browser-to-browser connection could not be established. This can happen on certain networks or VPNs.",
      transferInterrupted:
        "The connection was lost while the file was being transferred. The received data may be incomplete.",
      integrityFailed:
        "The received file could not be verified. The data may have been corrupted during transfer and should not be trusted.",
      unknown:
        "An unexpected error occurred. Please try again or create a new transfer.",
    },
    guidance: {
      senderOffline:
        "The sender tab is no longer available. The sender needs to create a new transfer and share a new link.",
      wrongPassword:
        "Check the password and try again. The password was set by the sender when creating the transfer.",
      denied:
        "The sender has denied this request. A new transfer link is required.",
      connectionFailed:
        "You can try again. If the problem persists, both parties may need to switch networks or the sender can create a new transfer.",
      transferInterrupted:
        "The transfer was interrupted and cannot continue. The sender needs to create a new transfer.",
      integrityFailed:
        "The file integrity could not be verified. Do not trust the received file. The sender should create a new transfer.",
      unknown:
        "An unexpected error occurred. Try again or ask the sender to create a new transfer.",
    },
  },

  states: {
    preparing: "Preparing session",
    connecting: "Connecting",
    validating: "Verifying password",
    awaitingApproval: "Awaiting approval",
    transferring: "Transferring file",
    verifying: "Verifying file integrity",
    completed: "Transfer complete",
    failed: "Transfer failed",
  },
} as const;

export default en;
