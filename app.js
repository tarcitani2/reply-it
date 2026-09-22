// ═══════════════════════════════════════
// Referências de UI
// ═══════════════════════════════════════
const botaoExtrair = document.getElementById('botao-extrair');
const botaoMigrar = document.getElementById('botao-migrar');
const botaoConfirmar = document.getElementById('botao-confirmar');
const statusExtrair = document.getElementById('status-extrair');
const statusMigrar = document.getElementById('status-migrar');
const statusConfirmar = document.getElementById('status-confirmar');
const previewLista = document.getElementById('preview-lista');
const previewContagem = document.getElementById('preview-contagem');
const previewLegenda = document.getElementById('preview-legenda');
const previewPaginacao = document.getElementById('preview-paginacao');
const botaoPaginaAnterior = document.getElementById('pagina-anterior');
const botaoPaginaProxima = document.getElementById('pagina-proxima');
const paginaInfo = document.getElementById('pagina-info');
const buscaCanal = document.getElementById('busca-canal');
const buscaResultado = document.getElementById('busca-resultado');

let estadoProcessando = false;

// Sessão verificada — vincula token + canal + hash da lista
let sessaoVerificada = null;
// { token, canalDestinoId, hashLista, timestamp }

function gerarHashLista(inscricoes) {
    // Hash composto: ID + Status garante que qualquer evolução de progresso altere o hash
    return inscricoes.map(i => `${i.idCanal}:${i.status}`).sort().join('|');
}

function invalidarSessao() {
    sessaoVerificada = null;
    botaoConfirmar.disabled = true;
}

// ═══════════════════════════════════════
// Paginação
// ═══════════════════════════════════════
const CANAIS_POR_PAGINA = 25;
let paginaAtual = 0;
let inscricoesCache = [];
let canaisFiltrados = [];

function normalizarBusca(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

buscaCanal.addEventListener('input', () => {
    paginaAtual = 0;
    renderizarPreview(inscricoesCache);
});

botaoPaginaAnterior.addEventListener('click', () => {
    if (paginaAtual > 0) { paginaAtual--; renderizarPagina(); }
});
botaoPaginaProxima.addEventListener('click', () => {
    const totalPaginas = Math.ceil(canaisFiltrados.length / CANAIS_POR_PAGINA);
    if (paginaAtual < totalPaginas - 1) { paginaAtual++; renderizarPagina(); }
});

// ═══════════════════════════════════════
// Sistema de Contas (UI de estado)
// ═══════════════════════════════════════
const contas = {
    origem: { elemento: document.getElementById('conta-origem'), rotulo: 'Conta A' },
    destino: { elemento: document.getElementById('conta-destino'), rotulo: 'Conta B' }
};

function mostrarConta(etapa, estado, canal = null, token = null) {
    const conta = contas[etapa];
    conta.canal = canal;
    conta.token = token;
    conta.elemento.dataset.estado = estado;
    const mensagens = {
        autenticando: 'Autenticando…',
        identificando: 'Identificando canal autenticado…',
        conectada: 'Canal conectado',
        desconectada: 'Desconectada',
        historico: 'Último canal identificado · conexão não verificada',
        erro: 'Não foi possível verificar a conexão',
        incerta: 'Desconexão não confirmada',
        expirada: 'Autenticação inválida ou expirada'
    };
    
    if (canal) {
        conta.elemento.innerHTML = `
            <div class="conta-rotulo">${conta.rotulo}</div>
            <div class="conta-nome">${escaparHtml(canal.titulo)}</div>
            <div class="conta-situacao">${mensagens[estado]}</div>
            <div class="conta-id">ID: ${escaparHtml(canal.id)}</div>
        `;
    } else {
        conta.elemento.innerHTML = `
            <div class="conta-rotulo">${conta.rotulo}</div>
            <div class="conta-situacao">${mensagens[estado]}</div>
        `;
    }
}

async function identificarConta(etapa, token) {
    mostrarConta(etapa, 'identificando');
    try {
        const canal = await buscarMeuCanal(token);
        mostrarConta(etapa, 'conectada', canal, token);
        await chrome.storage.local.set({ [etapa === 'origem' ? 'ultimaContaOrigem' : 'ultimaContaDestino']: canal });
        return canal;
    } catch (erro) {
        mostrarConta(etapa, 'erro');
        throw erro;
    }
}

// ═══════════════════════════════════════
// Controle de Botões
// ═══════════════════════════════════════
function atualizarBotoes(processando) {
    estadoProcessando = processando;
    botaoExtrair.disabled = processando;
    botaoMigrar.disabled = processando;
    if (processando) botaoConfirmar.disabled = true;
}

// ═══════════════════════════════════════
// Skeleton Loader
// ═══════════════════════════════════════
function mostrarSkeletonPreview(quantidade = 8) {
    buscaCanal.disabled = true;
    buscaResultado.textContent = '';
    previewLista.innerHTML = '';
    previewLegenda.style.display = 'none';
    previewPaginacao.style.display = 'none';
    previewContagem.textContent = 'Carregando...';
    for (let i = 0; i < quantidade; i++) {
        const sk = document.createElement('div');
        sk.className = 'skeleton skeleton-canal';
        previewLista.appendChild(sk);
    }
}

// ═══════════════════════════════════════
// Preview de Canais (painel lateral) com Paginação
// ═══════════════════════════════════════

function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function renderizarPreview(inscricoes) {
    inscricoesCache = inscricoes || [];
    buscaCanal.disabled = inscricoesCache.length === 0;
    const termo = normalizarBusca(buscaCanal.value.trim());
    canaisFiltrados = inscricoesCache.map((canal, indice) => ({ canal, indice }))
        .filter(({ canal }) => !termo || normalizarBusca(canal.titulo).includes(termo) || normalizarBusca(canal.idCanal).includes(termo));
    buscaResultado.textContent = termo ? `${canaisFiltrados.length} de ${inscricoesCache.length} canais` : '';

    if (inscricoesCache.length === 0) {
        previewLista.innerHTML = `
            <div class="preview-vazio">
                <div class="preview-vazio-icone">📋</div>
                Extraia as inscrições na Etapa 1<br>para ver o preview aqui.
            </div>`;
        previewContagem.textContent = 'Nenhum canal carregado';
        previewLegenda.style.display = 'none';
        previewPaginacao.style.display = 'none';
        return;
    }

    previewLegenda.style.display = 'flex';

    const totalPaginas = Math.ceil(canaisFiltrados.length / CANAIS_POR_PAGINA);
    if (paginaAtual >= totalPaginas) paginaAtual = totalPaginas - 1;
    if (paginaAtual < 0) paginaAtual = 0;

    renderizarPagina();
    atualizarContagem(inscricoesCache);
}

function renderizarPagina() {
    previewLista.innerHTML = '';
    previewLista.scrollTop = 0;
    const totalPaginas = Math.ceil(canaisFiltrados.length / CANAIS_POR_PAGINA);
    const inicio = paginaAtual * CANAIS_POR_PAGINA;
    const fim = Math.min(inicio + CANAIS_POR_PAGINA, canaisFiltrados.length);

    if (!canaisFiltrados.length) {
        const vazio = document.createElement('div');
        vazio.className = 'preview-vazio';
        vazio.textContent = 'Nenhum canal encontrado. Tente outro nome ou ID.';
        previewLista.appendChild(vazio);
    }

    for (let i = inicio; i < fim; i++) {
        const { canal, indice } = canaisFiltrados[i];
        const item = document.createElement('div');
        item.className = 'canal-item';
        item.dataset.status = canal.status;
        item.dataset.indice = indice;

        const indicador = document.createElement('span');
        indicador.className = 'canal-indicador';

        const nome = document.createElement('span');
        nome.className = 'canal-nome';
        nome.textContent = canal.titulo;
        nome.title = canal.titulo;

        item.appendChild(indicador);
        item.appendChild(nome);

        const badgeTexto = obterTextoBadge(canal.status);
        if (badgeTexto) {
            const badge = document.createElement('span');
            badge.className = 'canal-badge';
            badge.textContent = badgeTexto;
            item.appendChild(badge);
        }

        previewLista.appendChild(item);
    }

    if (totalPaginas > 1) {
        previewPaginacao.style.display = 'flex';
        paginaInfo.textContent = `${paginaAtual + 1} / ${totalPaginas}`;
        botaoPaginaAnterior.disabled = paginaAtual === 0;
        botaoPaginaProxima.disabled = paginaAtual >= totalPaginas - 1;
    } else {
        previewPaginacao.style.display = 'none';
    }
}

function obterTextoBadge(status) {
    switch (status) {
        case 'duplicado': return 'já inscrito';
        case 'novo': return 'novo';
        case 'concluido': return 'migrado';
        case 'erro': return 'erro';
        default: return null;
    }
}

function atualizarContagem(inscricoes) {
    const total = inscricoes.length;
    const novos = inscricoes.filter(i => i.status === 'novo').length;
    const duplicados = inscricoes.filter(i => i.status === 'duplicado').length;
    const concluidos = inscricoes.filter(i => i.status === 'concluido').length;
    const pendentes = inscricoes.filter(i => i.status === 'pendente').length;
    const erros = inscricoes.filter(i => i.status === 'erro').length;

    let partes = [`${total} canais`];
    if (novos > 0) partes.push(`${novos} novos`);
    if (duplicados > 0) partes.push(`${duplicados} já inscritos`);
    if (concluidos > 0) partes.push(`${concluidos} migrados`);
    if (erros > 0) partes.push(`${erros} erros`);
    if (pendentes > 0 && novos === 0 && duplicados === 0) partes.push('aguardando verificação');

    previewContagem.textContent = partes.join(' · ');
}

function atualizarItemPreview(indiceGlobal, status) {
    atualizarContagem(inscricoesCache);

    const item = previewLista.querySelector(`[data-indice="${indiceGlobal}"]`);
    if (!item) return;
    item.dataset.status = status;

    const badgeExistente = item.querySelector('.canal-badge');
    if (badgeExistente) badgeExistente.remove();

    const badgeTexto = obterTextoBadge(status);
    if (badgeTexto) {
        const badge = document.createElement('span');
        badge.className = 'canal-badge';
        badge.textContent = badgeTexto;
        item.appendChild(badge);
    }

    atualizarContagem(inscricoesCache);
}

// ═══════════════════════════════════════
// No carregamento, restaura estado salvo
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    const dados = await chrome.storage.local.get(['inscricoes', 'contaOrigem', 'ultimaContaOrigem', 'ultimaContaDestino']);

    if (!estadoProcessando) {
        if (dados.ultimaContaOrigem) mostrarConta('origem', 'historico', dados.ultimaContaOrigem);
        if (dados.ultimaContaDestino) mostrarConta('destino', 'historico', dados.ultimaContaDestino);
    }

    if (dados.inscricoes && dados.inscricoes.length > 0) {
        renderizarPreview(dados.inscricoes);

        const concluidos = dados.inscricoes.filter(i => i.status === 'concluido' || i.status === 'duplicado').length;
        statusExtrair.textContent = `Salvos: ${dados.inscricoes.length} canais na memória.`;
        statusExtrair.classList.add('texto-sucesso');
        botaoMigrar.disabled = false;

        const temNovos = dados.inscricoes.some(i => i.status === 'novo');

        if (concluidos === dados.inscricoes.length) {
            statusMigrar.textContent = 'Todos os canais foram processados.';
            statusMigrar.classList.add('texto-sucesso');
            statusConfirmar.textContent = 'Migração finalizada!';
            statusConfirmar.classList.add('texto-sucesso');
        } else if (temNovos) {
            statusMigrar.textContent = 'Verificação anterior encontrada.';
            statusMigrar.classList.add('texto-sucesso');
            statusConfirmar.textContent = 'Reconecte a Conta B na Etapa 2 para continuar.';
            botaoConfirmar.disabled = true;
        } else if (concluidos > 0) {
            statusMigrar.textContent = `Progresso: ${concluidos}/${dados.inscricoes.length} processados.`;
            statusConfirmar.textContent = 'Reconecte a Conta B na Etapa 2 para retomar.';
        } else {
            statusMigrar.textContent = 'Pronto para verificar!';
        }
    }
});

// ═══════════════════════════════════════
// Utilitários de API com Timeout
// ═══════════════════════════════════════
async function fetchComTimeout(url, opcoes = {}, tempoMs = 15000, tipoRetorno = 'json') {
    const controlador = new AbortController();
    const timer = setTimeout(() => controlador.abort(), tempoMs);
    try {
        const resposta = await fetch(url, { ...opcoes, signal: controlador.signal });
        if (tipoRetorno === 'json') {
            let dados = null;
            try { dados = await resposta.json(); } catch(e) {}
            return { ok: resposta.ok, status: resposta.status, dados };
        }
        return { ok: resposta.ok, status: resposta.status };
    } finally {
        clearTimeout(timer);
    }
}

// ═══════════════════════════════════════
// API YouTube
// ═══════════════════════════════════════
async function buscarMeuCanal(token) {
    const resposta = await fetchComTimeout('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (!resposta.ok) throw new Error('Falha ao buscar ID do canal atual');
    const dados = resposta.dados;
    const canal = dados?.items?.[0];
    if (!canal?.id) throw new Error('Nenhum canal do YouTube identificado nesta conta.');
    if (dados.items.length !== 1 || dados.nextPageToken) throw new Error('A autenticação retornou vários canais; não foi possível identificar um canal único.');
    return { id: canal.id, titulo: canal.snippet?.title || 'Canal sem nome' };
}

async function buscarTodasInscricoes(token, elementoStatus) {
    let todasInscricoes = [];
    let tokenProximaPagina = '';
    while (true) {
        let url = `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50`;
        if (tokenProximaPagina) url += `&pageToken=${tokenProximaPagina}`;

        const resposta = await fetchComTimeout(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });

        if (!resposta.ok) {
            const dadosErro = resposta.dados || {};
            throw new Error(dadosErro.error?.message ?? 'Erro desconhecido ao buscar inscrições');
        }

        const dados = resposta.dados || {};
        if (dados.items?.length > 0) {
            todasInscricoes = todasInscricoes.concat(dados.items);
            elementoStatus.textContent = `Buscando inscrições... (${todasInscricoes.length} encontradas)`;
        }

        if (dados.nextPageToken) tokenProximaPagina = dados.nextPageToken;
        else break;
    }
    return todasInscricoes;
}

async function revogarTokenDeAutenticacao(token) {
    return new Promise((resolver) => {
        chrome.identity.removeCachedAuthToken({ token: token }, async () => {
            const erroCache = chrome.runtime.lastError?.message;
            let revogado = false;
            try {
                const res = await fetchComTimeout(`https://oauth2.googleapis.com/revoke`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `token=${token}`
                }, 10000, 'text');
                if (!res.ok) console.warn("Falha na revogação remota:", res.status);
                revogado = res.ok && !erroCache;
            } catch (e) {
                console.warn("Erro de rede ao revogar online", e);
            }
            for (const etapa of Object.keys(contas)) {
                if (contas[etapa].token === token) {
                    mostrarConta(etapa, revogado ? 'desconectada' : 'incerta', contas[etapa].canal);
                }
            }
            resolver();
        });
    });
}

const esperar = (ms) => new Promise(resolver => setTimeout(resolver, ms));

async function inscreverNoCanal(token, idCanal) {
    const resposta = await fetchComTimeout('https://www.googleapis.com/youtube/v3/subscriptions?part=snippet', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ snippet: { resourceId: { kind: 'youtube#channel', channelId: idCanal } } })
    }, 20000);

    if (!resposta.ok) {
        const dadosErro = resposta.dados || {};
        const motivo = dadosErro.error?.errors?.[0]?.reason || 'desconhecido';
        return { ok: false, motivo, mensagem: dadosErro.error?.message ?? 'Erro desconhecido', status: resposta.status };
    }
    return { ok: true, status: resposta.status };
}

// ═══════════════════════════════════════
// ETAPA 1: Extrair Inscrições
// ═══════════════════════════════════════
botaoExtrair.addEventListener('click', () => {
    if (estadoProcessando) return;
    atualizarBotoes(true);
    statusExtrair.textContent = 'Autenticando Conta A...';
    statusExtrair.classList.remove('texto-sucesso');
    mostrarConta('origem', 'autenticando');
    mostrarSkeletonPreview(8);

    chrome.identity.getAuthToken({ interactive: true }, async function(token) {
        if (chrome.runtime.lastError || !token) {
            const msgErro = chrome.runtime.lastError?.message ?? 'Token não recebido';
            console.error('Erro OAuth Etapa 1:', msgErro);
            mostrarConta('origem', 'erro');
            statusExtrair.textContent = 'Erro: ' + msgErro;
            renderizarPreview(inscricoesCache);
            atualizarBotoes(false);
            return;
        }

        try {
            statusExtrair.textContent = 'Identificando seu canal...';
            const meuCanal = await identificarConta('origem', token);

            statusExtrair.textContent = 'Buscando inscrições (pode demorar)...';
            mostrarSkeletonPreview(10);
            const inscricoes = await buscarTodasInscricoes(token, statusExtrair);

            const inscricoesSimplificadas = inscricoes.map(item => ({
                titulo: item.snippet.title,
                idCanal: item.snippet.resourceId.channelId,
                status: 'pendente'
            }));

            await chrome.storage.local.set({ inscricoes: inscricoesSimplificadas, contaOrigem: meuCanal.id });

            paginaAtual = 0;
            renderizarPreview(inscricoesSimplificadas);

            statusExtrair.textContent = `Concluído: ${inscricoesSimplificadas.length} inscrições extraídas.`;
            statusExtrair.classList.add('texto-sucesso');

            statusExtrair.textContent += '\nDesconectando origem...';
            await revogarTokenDeAutenticacao(token);
            statusExtrair.textContent = `Concluído: ${inscricoesSimplificadas.length} inscrições extraídas.`;
            statusExtrair.classList.add('texto-sucesso');

            statusMigrar.textContent = 'Pronto para verificar!';

        } catch (erro) {
            console.error(erro);
            statusExtrair.textContent = 'Erro na extração: ' + erro.message;
            renderizarPreview(inscricoesCache);
        } finally {
            atualizarBotoes(false);
            chrome.storage.local.get(['inscricoes'], (d) => {
                if (d.inscricoes?.length > 0 && !estadoProcessando) botaoMigrar.disabled = false;
            });
        }
    });
});

// ═══════════════════════════════════════
// Exclusão de Dados Locais
// ═══════════════════════════════════════
document.getElementById('botao-apagar-dados')?.addEventListener('click', async () => {
    if (confirm("Isso apagará o progresso salvo. Deseja continuar?")) {
        await chrome.storage.local.clear();
        location.reload();
    }
});

// ═══════════════════════════════════════
// ETAPA 2: Conectar Conta B e Verificar
// ═══════════════════════════════════════
botaoMigrar.addEventListener('click', () => {
    if (estadoProcessando) return;
    
    // Invalida sessão anterior no início da verificação [P1-1]
    invalidarSessao();
    
    atualizarBotoes(true);
    botaoConfirmar.disabled = true;
    statusMigrar.textContent = 'Autenticando Conta B... (Escolha a conta de destino)';
    statusMigrar.classList.remove('texto-sucesso');
    mostrarConta('destino', 'autenticando');

    // Remover um único token preserva a preferência de conta da Identity API.
    // Reinicia o estado da extensão antes de solicitar outra autenticação.
    chrome.identity.clearAllCachedAuthTokens().then(() => {
        for (const etapa of Object.keys(contas)) {
            if (contas[etapa].token) {
                mostrarConta(etapa, 'historico', contas[etapa].canal);
            }
        }
        iniciarEtapa2();
    }).catch((erro) => {
        mostrarConta('destino', 'erro');
        statusMigrar.textContent = 'Não foi possível reiniciar a autenticação: ' + erro.message;
        atualizarBotoes(false);
    });

    function iniciarEtapa2() {
        chrome.identity.getAuthToken({ interactive: true }, async function(token) {
            if (chrome.runtime.lastError || !token) {
                const msgErro = chrome.runtime.lastError?.message ?? 'Token não recebido';
                console.error('Erro OAuth Etapa 2:', msgErro);
                mostrarConta('destino', 'erro');
                statusMigrar.textContent = 'Erro: ' + msgErro;
                atualizarBotoes(false);
                botaoMigrar.disabled = false;
                return;
            }

            try {
                const canalDestino = await identificarConta('destino', token);
                const dados = await chrome.storage.local.get(['inscricoes', 'contaOrigem']);
                const inscricoes = dados.inscricoes || [];

                if (inscricoes.length === 0) {
                    statusMigrar.textContent = 'Nenhuma inscrição encontrada. Execute a Etapa 1 primeiro.';
                    atualizarBotoes(false);
                    return;
                }

                if (canalDestino.id && dados.contaOrigem && canalDestino.id === dados.contaOrigem) {
                    statusMigrar.textContent = 'ERRO: A conta de destino é a MESMA de origem!\nDesconecte e escolha a Conta B correta.';
                    await revogarTokenDeAutenticacao(token);
                    atualizarBotoes(false);
                    botaoMigrar.disabled = false;
                    return;
                }

                statusMigrar.textContent = 'Buscando inscrições existentes na Conta B...';
                const inscricoesDestinoRaw = await buscarTodasInscricoes(token, statusMigrar);

                const idsJaInscritos = new Set(
                    inscricoesDestinoRaw.map(item => item.snippet.resourceId.channelId)
                );

                let contNovos = 0;
                let contDuplicados = 0;
                
                // Progresso por Destino - Reconcilia todos os canais [P1-3]
                for (const canal of inscricoes) {
                    if (idsJaInscritos.has(canal.idCanal)) {
                        canal.status = 'duplicado';
                        contDuplicados++;
                    } else {
                        canal.status = 'novo';
                        contNovos++;
                    }
                }

                await chrome.storage.local.set({ inscricoes, contaDestino: canalDestino.id });
                paginaAtual = 0;
                renderizarPreview(inscricoes);

                // Vincula token + canal + hash da lista [P1-1, P1-2]
                sessaoVerificada = {
                    token,
                    canalDestinoId: canalDestino.id,
                    hashLista: gerarHashLista(inscricoes),
                    timestamp: Date.now()
                };

                statusMigrar.textContent = `Verificação concluída!\n${contNovos} novos · ${contDuplicados} já inscritos na Conta B.`;
                statusMigrar.classList.add('texto-sucesso');

                if (contNovos > 0) {
                    statusConfirmar.textContent = `${contNovos} canais serão migrados. Confirme abaixo.`;
                    botaoConfirmar.disabled = false;
                } else {
                    statusConfirmar.textContent = 'Nenhum canal novo para migrar!';
                    statusConfirmar.classList.add('texto-sucesso');
                }

            } catch (erro) {
                console.error(erro);
                statusMigrar.textContent = 'Erro na verificação: ' + erro.message;
            } finally {
                atualizarBotoes(false);
                chrome.storage.local.get(['inscricoes'], (d) => {
                    if (d.inscricoes?.length > 0 && !estadoProcessando) {
                        botaoMigrar.disabled = false;
                        const temNovos = d.inscricoes.some(i => i.status === 'novo');
                        if (temNovos && sessaoVerificada) botaoConfirmar.disabled = false;
                    }
                });
            }
        });
    }
});

// ═══════════════════════════════════════
// ETAPA 3: Confirmar e Migrar
// ═══════════════════════════════════════
botaoConfirmar.addEventListener('click', async () => {
    if (estadoProcessando) return;
    
    // Validação de Sessão Verificada [P1-1, P1-2]
    if (!sessaoVerificada) {
        statusConfirmar.textContent = 'Reconecte a Conta B na Etapa 2 primeiro.';
        return;
    }

    atualizarBotoes(true);
    botaoConfirmar.disabled = true;
    statusConfirmar.textContent = 'Iniciando migração...';
    statusConfirmar.classList.remove('texto-sucesso');

    try {
        const dados = await chrome.storage.local.get(['inscricoes']);
        const inscricoes = dados.inscricoes || [];
        
        // Verifica se a lista foi adulterada (P1-2)
        const hashAtual = gerarHashLista(inscricoes);
        if (hashAtual !== sessaoVerificada.hashLista) {
            invalidarSessao();
            throw new Error("A lista foi alterada em outra aba. Refaça a verificação.");
        }

        // Verifica se a conta ainda é a mesma (P1-1)
        try {
            const canalAtual = await buscarMeuCanal(sessaoVerificada.token);
            if (canalAtual.id !== sessaoVerificada.canalDestinoId) {
                invalidarSessao();
                throw new Error("A conta autenticada mudou. Refaça a verificação.");
            }
        } catch (e) {
            invalidarSessao();
            throw new Error("Falha ao validar conta destino. Refaça a verificação.");
        }

        const token = sessaoVerificada.token;
        let interrompido = false;
        let errosConsecutivos = 0;
        let contadorProcessados = 0;
        const totalPendentes = inscricoes.filter(i => i.status === 'novo' || i.status === 'erro').length;

        for (let i = 0; i < inscricoes.length; i++) {
            if (inscricoes[i].status === 'concluido' || inscricoes[i].status === 'duplicado') {
                continue;
            }

            contadorProcessados++;
            statusConfirmar.textContent = `Inscrevendo (${contadorProcessados}/${totalPendentes}):\n${inscricoes[i].titulo}`;

            let erroTransitorio = false;

            try {
                const resultado = await inscreverNoCanal(token, inscricoes[i].idCanal);

                if (!resultado.ok && resultado.status === 401) {
                    // Token 401 — Cache Cleanup [P2-1]
                    await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
                    mostrarConta('destino', 'expirada', contas.destino.canal);
                    statusConfirmar.textContent = 'Token expirado. Reconecte na Etapa 2 e tente novamente.';
                    invalidarSessao();
                    interrompido = true;
                    break;
                }

                if (resultado.ok) {
                    inscricoes[i].status = 'concluido';
                    errosConsecutivos = 0;
                } else {
                    if (resultado.motivo === 'subscriptionDuplicate') {
                        inscricoes[i].status = 'duplicado';
                        errosConsecutivos = 0;
                    } else if (resultado.motivo === 'quotaExceeded') {
                        const restantes = totalPendentes - contadorProcessados;
                        statusConfirmar.textContent = `Cota excedida.\n${contadorProcessados - 1} processados · ${restantes + 1} pendentes.\nProgresso salvo. Retome amanhã!`;
                        interrompido = true;
                        break;
                    } else if (resultado.motivo === 'subscriptionForbidden') {
                        // subscriptionForbidden Granular [P2-3]
                        if (inscricoes[i].idCanal === sessaoVerificada.canalDestinoId) {
                            console.warn("Tentativa de inscrição no próprio canal ignorada.");
                            inscricoes[i].status = 'erro';
                            errosConsecutivos = 0;
                        } else {
                            console.warn("Bloqueio de anti-spam do YouTube ativo.");
                            const restantes = totalPendentes - contadorProcessados;
                            statusConfirmar.textContent = `Bloqueio anti-spam.\n${contadorProcessados - 1} processados · ${restantes + 1} pendentes.\nTente mais tarde.`;
                            interrompido = true;
                            break;
                        }
                    } else {
                        console.error(`Erro ao inscrever ${inscricoes[i].titulo}:`, resultado.mensagem);
                        inscricoes[i].status = 'erro';
                        errosConsecutivos++;
                    }
                }
            } catch (erro) {
                console.error(`Erro de rede em ${inscricoes[i].titulo}:`, erro);
                erroTransitorio = true;
                errosConsecutivos++;
            }

            if (errosConsecutivos >= 3) {
                const restantes = totalPendentes - contadorProcessados;
                statusConfirmar.textContent = `Múltiplos erros de rede consecutivos.\n${contadorProcessados} processados · ${restantes} pendentes.\nVerifique sua conexão e tente novamente.`;
                interrompido = true;
                await chrome.storage.local.set({ inscricoes });
                renderizarPreview(inscricoes);
                break;
            }

            await chrome.storage.local.set({ inscricoes });
            inscricoesCache = inscricoes;
            atualizarItemPreview(i, inscricoes[i].status);

            if (i < inscricoes.length - 1) {
                await esperar(erroTransitorio ? 500 : 1000);
            }
        }

        renderizarPreview(inscricoes);

        if (!interrompido) {
            const sucesso = inscricoes.filter(i => i.status === 'concluido').length;
            const duplo = inscricoes.filter(i => i.status === 'duplicado').length;
            const falha = inscricoes.filter(i => i.status === 'erro' || i.status === 'pendente' || i.status === 'novo').length;

            let msgFinal = `Concluído!\n${sucesso} novos migrados · ${duplo} já inscritos.`;
            if (falha > 0) msgFinal += `\n${falha} pendentes/erros.`;

            statusConfirmar.textContent = msgFinal;
            statusConfirmar.classList.add('texto-sucesso');
            await revogarTokenDeAutenticacao(sessaoVerificada.token);
            invalidarSessao();
        }

    } catch (erro) {
        console.error(erro);
        statusConfirmar.textContent = 'Erro na migração: ' + erro.message;
    } finally {
        atualizarBotoes(false);
    }
});
