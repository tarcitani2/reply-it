# reply-It ☕🇧🇷

Extensão para Google Chrome que copia inscrições do YouTube de uma conta de origem para outra conta de destino. As inscrições da origem são preservadas.

**Projeto em desenvolvimento.** A instalação atual é manual e o acesso OAuth pode estar limitado aos usuários de teste cadastrados no projeto Google Cloud. A extensão exige internet.

## Como funciona

1. **Extração:** autentique a Conta A e carregue suas inscrições.
2. **Verificação:** conecte a Conta B, confira o nome e o ID do canal mostrado e compare as inscrições existentes.
3. **Migração:** confira o destino e clique em **Confirmar e Migrar** para adicionar as inscrições pendentes.

A lista permite pesquisar por nome ou ID, sem diferenciar maiúsculas e acentos, e navegar pelos resultados com paginação. A busca altera apenas a visualização: não seleciona quais canais serão migrados.

## Requisitos

- Google Chrome atualizado.
- Duas contas Google com canais do YouTube identificáveis pela API.
- Um projeto Google Cloud com a **YouTube Data API v3** ativada.
- Cliente OAuth do tipo **Extensão do Chrome**, associado ao ID da extensão instalada.
- Em modo de teste, as duas contas cadastradas como usuários de teste no Google Cloud.

Não é necessário instalar Node.js nem executar um processo de build.

## Instalar localmente

1. Baixe o código em [tarcitani2/reply-it](https://github.com/tarcitani2/reply-it) usando **Code → Download ZIP** e extraia a pasta.
2. Abra `chrome://extensions/` no Chrome.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta que contém `manifest.json`.
5. Copie o ID mostrado no cartão da extensão para configurar o OAuth.

### Configurar o Google Cloud

1. Crie ou selecione um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a **YouTube Data API v3**.
3. Configure o Google Auth Platform: nome do aplicativo, contato e público-alvo. Para desenvolvimento, use o modo de teste e inclua os e-mails das contas A e B.
4. Configure o escopo utilizado pelo aplicativo: `https://www.googleapis.com/auth/youtube`.
5. Crie um cliente OAuth para **Extensão do Chrome**, informando o ID copiado da extensão instalada.
6. Substitua `oauth2.client_id` em `manifest.json` pelo ID desse cliente.
7. Recarregue a extensão em `chrome://extensions/`.

O cliente OAuth incluído no código pertence à configuração do projeto original: ele não funciona automaticamente com qualquer ID de instalação. Não adicione senhas nem segredos de cliente ao código.

Referências: [OAuth em extensões do Chrome](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth) e [configuração do público OAuth](https://support.google.com/cloud/answer/15549945?hl=pt-BR).

## Usar a extensão

1. Clique no ícone do reply-It para abrir sua aba.
2. Clique em **Extrair Inscrições** e autorize a conta de origem.
3. Aguarde a extração. O painel da Conta A mostra o canal identificado; após a desconexão, essa identificação permanece como referência.
4. Clique em **Conectar Conta B** e confira cuidadosamente o canal de destino apresentado.
5. Aguarde a comparação: canais existentes serão marcados como já inscritos.
6. Clique em **Confirmar e Migrar**.
7. Mantenha a aba aberta durante o processamento. Você pode usar outras abas, mas fechar ou recarregar a aba da extensão interrompe a execução.

O progresso é salvo localmente. Para retomar, abra a extensão e reconecte o destino na etapa 2 antes de confirmar novamente. Evite executar a extensão em várias abas ao mesmo tempo.

## Problemas comuns

### Só aparece uma conta Google

A extensão usa `chrome.identity.getAuthToken`. A limpeza do estado de autenticação não garante que o Chrome apresente todas as contas. Confira o canal identificado e não confirme a migração se o destino estiver errado. Contas em perfis separados do Chrome não compartilham necessariamente o mesmo contexto de autenticação. A seleção entre contas ainda requer validação adicional antes da distribuição pública.

### “Google hasn’t verified this app”

É um aviso de aplicativo não verificado. Confirme que está usando o projeto esperado e que ambas as contas estão cadastradas como usuários de teste. Colocar o OAuth em produção e obter sua verificação são etapas distintas da publicação na loja.

### Cota excedida

A cota é compartilhada por todos os usuários do mesmo projeto Google Cloud. `subscriptions.insert` custa 50 unidades por chamada; consultas e outras tentativas também consomem cota. Não há garantia de concluir centenas de inscrições em uma única execução. Aguarde a renovação da cota indicada pelo Google Cloud e reconecte o destino para retomar.

Referência: [custo das operações](https://developers.google.com/youtube/v3/determine_quota_cost).

### Autenticação expirada ou erro de rede

Reconecte a conta na etapa 2 para verificar o destino e reconciliar as inscrições antes de tentar novamente. Não recarregue a extensão durante uma migração ativa.

## Dados e permissões

- **identity:** autenticação Google por meio do Chrome.
- **storage:** armazenamento local dos canais, identificação das contas e progresso.
- **Acesso às APIs Google:** consultas ao YouTube, criação de inscrições e revogação de acesso.

Os tokens não são gravados pelo aplicativo em `chrome.storage.local`; o Chrome também gerencia seu próprio cache de autenticação. O código atual não possui servidor próprio para receber as inscrições. Ele se comunica com o Google, e a interface carrega a fonte Inter pelo Google Fonts.

O armazenamento local persiste entre sessões. Para removê-lo, desinstale a extensão; isso apaga o progresso local, mas não desfaz inscrições já criadas no YouTube. Para gerenciar a autorização concedida, acesse [Conexões da Conta Google](https://myaccount.google.com/connections).

Esta descrição técnica não substitui uma política de privacidade. Política pública, prazo de retenção e controles de exclusão na interface estão entre as entregas planejadas para a distribuição pública.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `manifest.json` | Configuração, permissões e cliente OAuth |
| `background.js` | Abre ou traz a aba da extensão para frente |
| `index.html` | Interface e estilos |
| `app.js` | Autenticação, consultas, comparação e migração |
| `icon.png` | Ícone da extensão |

Stack: JavaScript, HTML, CSS e Manifest V3, sem frameworks.

## Preparação para distribuição pública

- Validar seleção de contas, renovação de tokens e isolamento de operações.
- Publicar site, suporte, termos e política de privacidade.
- Vincular o OAuth ao ID definitivo da extensão na Chrome Web Store.
- Solicitar verificação OAuth e preparar o cadastro na loja.
- Avaliar aumento de cota da API conforme o volume esperado.

## Responsável e suporte

Criado por **Tarcitani**

Problemas ou sugestões? [Abra uma Issue no GitHub](https://github.com/tarcitani2/reply-it/issues)

Repositório: [tarcitani2/reply-it](https://github.com/tarcitani2/reply-it)

O reply-It é um projeto independente, sem afiliação oficial com Google ou YouTube.
