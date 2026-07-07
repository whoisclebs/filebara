# Construindo o Filebara: compartilhamento direto de arquivos pelo navegador

A maioria das ferramentas de compartilhamento de arquivos funciona da
mesma forma: você faz upload de um arquivo para um servidor, o servidor
armazena, e o destinatário baixa daquele servidor. Funciona, mas
significa que todo arquivo que você compartilha passa pela
infraestrutura de outra pessoa. **O Filebara faz diferente.**

O Filebara transfere arquivos diretamente de um navegador para o
outro. Nenhum arquivo nunca toca um servidor operado pelo Filebara. O
único servidor envolvido é um servidor de sinalização PeerJS que ajuda
os dois navegadores a se encontrarem — e ele nunca vê o conteúdo dos
arquivos, senhas ou chaves de criptografia.

Esta é a história de como construímos.

---

## A ideia

Queríamos uma ferramenta de compartilhamento de arquivos que parecesse
entregar algo para alguém pessoalmente. Sem contas. Sem barras de
progresso de upload para um bucket na nuvem. Sem "seu link expira em 7
dias." Apenas: você tem um arquivo, quer que outra pessoa tenha ele, e
ele deve ir direto.

As restrições estavam claras desde o início:

- **Sem upload de arquivos para nossos servidores.** Os arquivos
  ficam no navegador de quem envia até serem criptografados e enviados
  diretamente para quem recebe.
- **Protegido por senha.** Toda transferência exige uma senha para que
  apenas o destinatário pretendido possa acessar o arquivo.
- **Só navegador.** Sem app para instalar, sem plugin, sem extensão.
  Basta abrir um link.
- **Código aberto.** Qualquer pessoa pode ler o código, auditar e
  contribuir.

---

## Como funciona

O fluxo é simples do ponto de vista de quem usa, mas tem bastante
coisa acontecendo por baixo.

```
Remetente                            Receptor
  │                                    │
  ├─ Seleciona arquivo + define senha  │
  ├─ Recebe um link ──────────────────┤  (compartilhado por outro canal)
  │                                    ├─ Abre o link, digita a senha
  │◄──── Sinalização PeerJS ─────────►│  (apenas SDP/ICE)
  │◄──── Prova de senha ──────────────►│  (verificada, sem vazar metadados)
  │◄──── Pedido de aprovação ─────────►│  (remetente aprova ou nega)
  │◄──── Chunks criptografados ───────►│  (AES-256-GCM)
  │                                    │  Arquivo pronto para download
```

### 1. Setup da sessão

Quem envia seleciona um arquivo e digita uma senha. O Filebara deriva
uma chave de criptografia da senha usando **Argon2id** (executado num
Web Worker para a UI não travar). Também gera um ID de sessão de alta
entropia que serve como o Peer ID do PeerJS — isso vira o `file_id` no
link de compartilhamento.

O link contém tudo que o receptor precisa: o ID da sessão, o salt
para derivação de chave, os parâmetros do KDF e a fingerprint do
remetente. Tudo codificado no fragmento da URL, então nunca chega a
um servidor.

### 2. Prova de senha

Quando o receptor abre o link e digita a senha, o Filebara deriva a
mesma chave do lado do receptor (usando o salt do link) e calcula uma
**prova de senha**. Essa prova é enviada ao remetente, que verifica sem
nunca transmitir a senha em si.

Só depois que a prova é verificada o remetente libera qualquer
metadado do arquivo (nome, tamanho, tamanho do chunk). Até esse ponto,
o remetente não revela nada.

### 3. Código de verificação

Depois que a senha é verificada, tanto o remetente quanto o receptor
veem um **código de verificação** curto. Ele é derivado da chave
compartilhada e da fingerprint de identidade do receptor. As duas
partes comparam os códigos por outro canal (uma ligação, uma mensagem)
para confirmar que estão falando com a pessoa certa.

Isso previne ataques man-in-the-middle: mesmo se alguém interceptasse
a sinalização, não consegue produzir um código de verificação que bate.

### 4. Aprovação

O remetente vê a fingerprint do receptor e o código de verificação, e
clica manualmente em **Aprovar** ou **Negar**. Só depois da aprovação a
transferência começa.

### 5. Transferência criptografada

O arquivo é dividido em chunks de 256 KiB. Cada chunk é criptografado
com **AES-256-GCM** usando um nonce único derivado de um nonce base +
índice do chunk. AES-GCM oferece confidencialidade e integridade — se
qualquer chunk for alterado, a descriptografia falha.

A chave do arquivo é enviada ao receptor pelo mesmo canal de dados
criptografado (depois da aprovação), então nunca passa pelo servidor de
sinalização.

### 6. Montagem e download

O receptor descriptografa cada chunk, valida e monta o arquivo
original na memória. Quando todos os chunks são recebidos, o arquivo é
oferecido como download. A integridade é garantida por chunk pela
autenticação do AES-GCM — não precisa de um hash separado do arquivo
inteiro.

---

## A tecnologia

| Camada             | Escolha                                    |
| ------------------ | ------------------------------------------ |
| Framework          | Svelte 5 + SvelteKit                       |
| Hosting            | Cloudflare (adapter-cloudflare)            |
| Transporte P2P     | PeerJS (WebRTC DataChannel)                |
| Criptografia       | AES-256-GCM (Web Crypto API)               |
| Derivação de chave | Argon2id (Web Worker, fora da main thread) |
| Identidade         | Keypairs efêmeros (ECDSA P-256)            |
| QR codes           | node-qrcode                                |
| i18n               | Store reativa custom (en, es, pt-BR)       |

### Por que SvelteKit?

Precisávamos de um framework que pudesse pré-renderizar páginas
estáticas (home, FAQ, termos) e ainda assim lidar com uma rota dinâmica
(`/f/[file_id]`) no servidor. O SvelteKit com o adapter do Cloudflare
faz os dois: páginas estáticas são pré-renderizadas para velocidade, e
a rota dinâmica do receptor é renderizada no servidor (SSR) para que a
página carregue com o conteúdo e estilos corretos em qualquer URL.

As runes do Svelte 5 (`$state`, `$derived`, `$props`) deixaram o
gerenciamento de estado reativo limpo — especialmente para o store de
i18n, que precisa atualizar toda string visível quando o idioma muda,
sem re-renderizar a página inteira.

### Por que WebRTC / PeerJS?

WebRTC é a única API do navegador que permite transferência direta
peer-to-peer de dados. O DataChannel pode carregar dados binários
arbitrários com baixa latência e sem servidor intermediário depois que
a conexão está aberta.

O PeerJS cuida da camada de sinalização — a troca de SDP offer/answer e
a negociação de ICE candidates que acontece antes de a conexão direta
estar aberta. Essa sinalização passa pelo PeerJS Cloud
(`0.peerjs.com`), que só vê pequenas mensagens de setup de conexão.
Nunca vê os dados do arquivo, senhas ou chaves de criptografia.

### Por que Argon2id num Web Worker?

Argon2id é uma função de derivação de chave memory-hard, projetada para
resistir a ataques de GPU e ASIC. É a escolha certa para derivar uma
chave de criptografia de uma senha. Mas é CPU-intensiva — rodar na main
thread travaria a UI por vários segundos.

Rodamos num **Web Worker dedicado** para a main thread ficar
responsiva. O worker recebe a senha e o salt, calcula a chave e devolve.
A UI mostra um spinner enquanto o worker processa.

### Por que AES-256-GCM?

AES-GCM é um modo de criptografia autenticada — oferece
confidencialidade (ninguém pode ler o arquivo) e integridade (qualquer
alteração é detectada). Cada chunk recebe um nonce único, então mesmo
que os mesmos dados apareçam em múltiplos chunks, o ciphertext é
diferente.

Escolhemos autenticação por chunk em vez de um hash SHA-256 do arquivo
inteiro porque já está embutido no AES-GCM e não precisa de computação
adicional. Versões iniciais calculavam um SHA-256 do arquivo inteiro
do lado do remetente, mas isso travava a main thread em arquivos
grandes. Como AES-GCM já garante integridade, o hash do arquivo inteiro
era redundante e foi removido.

---

## Os desafios

### A tela branca

O bug mais difícil de encontrar foi a **tela branca ao aprovar**.
Quando o remetente clicava em "Aprovar", a aba inteira congelava e ia
branca. O arquivo era pequeno (menos de 10 MB), então não era um
problema de performance.

A causa raiz acabou sendo um **bug de concorrência no loop de ACKs**. O
remetente enviava chunks num loop apertado e esperava por ACKs, mas a
lógica de espera de ACK só disparava quando a quantidade de chunks
pendentes chegava ao limite da janela (4 chunks). Para um arquivo
menor que 4 chunks (menos de ~1 MB), o remetente nunca chegava ao
limite da janela, então nunca esperava por ACKs — e o `while` girava
para sempre sem ceder para o event loop. O navegador não conseguia
pintar a tela, e a aba congelava.

A correção foi uma mudança de uma linha na condição: esperar por ACKs
não só quando a janela está cheia, mas também quando todos os chunks
já foram enviados e ainda há chunks não confirmados.

### O problema de roteamento SPA

O segundo problema mais difícil foi o deploy no Cloudflare. A rota do
receptor (`/f/[file_id]`) é dinâmica — não pode ser pré-renderizada
porque o `file_id` é gerado em runtime.

Com `adapter-static`, precisávamos de um fallback SPA (`404.html`) e
de uma forma de dizer ao Cloudflare para servi-lo em qualquer caminho
não encontrado. A abordagem do `_redirects` causou loops de redirect
infinitos. A abordagem `not_found_handling:
"single-page-application"` servia o `index.html` (a home page
pré-renderizada) em vez do shell do SPA, o que significava que a
página do receptor carregava com o CSS da home e sem os estilos do
receptor.

A solução foi trocar para o **`adapter-cloudflare`**, que lida com
páginas pré-renderizadas e rotas SSR nativamente. Sem fallbacks, sem
redirects, sem gambiarra. O Worker do Cloudflare renderiza a página do
receptor no servidor com o conteúdo e estilos corretos para qualquer
`file_id`.

### O flash de i18n

Quando adicionamos internacionalização (inglês, espanhol, português),
o app piscava em inglês por uma fração de segundo antes de trocar para
o idioma salvo ao recarregar a página. Isso acontecia porque o
dicionário em inglês era importado estaticamente (o default), enquanto
o idioma salvo era carregado de forma assíncrona via import dinâmico.

A correção foi **importar os três dicionários estaticamente** e detectar
o idioma inicial de forma síncrona a partir do `localStorage` antes da
primeira renderização. Sem async, sem flash.

---

## O que vem a seguir

O Filebara é um MVP. Tem bastante que gostaríamos de adicionar:

- **Múltiplos arquivos** numa única transferência
- **TURN relay** para peers atrás de NATs simétricos
- **Retomar transferências interrompidas** em vez de começar de novo
- **Avisos de tamanho de arquivo** do lado do receptor antes de
  aceitar arquivos grandes
- **Mais idiomas** — a infraestrutura de i18n já suporta, só precisamos
  das traduções

---

## Experimente

O Filebara está no ar em **[filebara.whoisclebs.com](https://filebara.whoisclebs.com)**.

O código está no **[GitHub](https://github.com/whoisclebs/filebara)**.

Se você encontrar um bug, tiver uma sugestão ou quiser contribuir com
uma tradução, abra uma issue ou um PR. Adoraríamos ouvir de você.

---

_O Filebara é open-source sob a licença MIT. Feito para transferências pequenas e diretas no navegador._
