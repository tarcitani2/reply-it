# Política de Privacidade - reply-It

A extensão **reply-It** ("nós", "nosso", "nossa") está comprometida com a sua privacidade. Esta política descreve como os seus dados são tratados.

## 1. Dados coletados e armazenados localmente
- A extensão armazena o cache das suas inscrições do YouTube (`chrome.storage.local`) **exclusivamente no seu próprio dispositivo**, a fim de permitir o progresso contínuo (paginação e reconciliação em caso de erro de rede).
- Os IDs das contas vinculadas são salvos localmente para que a extensão reconheça as sessões ativas.

## 2. Acesso à API do YouTube (Google OAuth)
- A extensão utiliza o serviço OAuth oficial do Google para acessar a sua conta.
- O escopo autorizado (`https://www.googleapis.com/auth/youtube`) é usado estritamente para ler inscrições e adicionar novas inscrições no canal de destino.
- Nós **não armazenamos seus tokens de acesso**; o gerenciamento é feito de forma segura e nativa pelo Google Chrome, e revogado imediatamente quando a sessão é desfeita.

## 3. Compartilhamento e Transmissão de Dados
- **Nenhum dado é enviado para servidores de terceiros.** Toda a comunicação ocorre diretamente entre o seu navegador (Chrome) e as APIs do Google (YouTube).
- Não rastreamos, não registramos métricas de uso e não utilizamos serviços externos de analytics ou de fontes/CSS.

## 4. Retenção e Exclusão de Dados
- Você pode excluir todo o armazenamento persistido através do botão **"Apagar dados locais"**, localizado no rodapé da extensão.
- Você pode revogar o acesso do reply-It a qualquer momento através do painel de [Conexões da Conta Google](https://myaccount.google.com/connections).
- Desinstalar a extensão do Chrome limpa automaticamente o armazenamento local associado.

## Contato
Para dúvidas relacionadas à privacidade ou ao código aberto, abra uma [Issue no GitHub](https://github.com/tarcitani2/reply-it/issues).
