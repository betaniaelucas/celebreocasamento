// ==================================================
// js/confirm.js — Busca por texto + seleção e confirmação
// - GET convidados (Xano)
// - Busca por nome (sem acento/caixa), com botão ou Enter
// - Seleção do convidado => mostra grupo
// - POST { info: [ {id, presenca}, ... ] }
// - Popup de sucesso + redireciona
// ==================================================

(() => {
  // 1) Endpoints do Xano
  const GET_CONVIDADOS_URL =
    'https://x8ki-letl-twmt.n7.xano.io/api:ILNGnLID/casamento/get/convidados';
  const POST_CONFIRMACAO_URL =
    'https://x8ki-letl-twmt.n7.xano.io/api:ILNGnLID/casamento/confirm';

  document.addEventListener('DOMContentLoaded', () => {
    // 2) Elementos
    const inputNome      = document.getElementById('buscaNome');
    const btnBuscar      = document.getElementById('btnBuscar');
    const listaResultados= document.getElementById('resultadoBusca');

    const grupoArea      = document.getElementById('grupoArea');
    const grupoLista     = document.getElementById('grupoLista');
    const form           = document.getElementById('formConfirmacao');
    const btnEnviar      = document.getElementById('btnEnviar');
    const statusMsg      = document.getElementById('statusMsg');
    const popup          = document.getElementById('popupSucesso');

    // 3) Estado
    let convidados = [];            // [{ id, nome, grupo, presenca }]
    const grupos = new Map();       // grupo -> [convidados]
    let convidadoSelecionado = null;
    let enviando = false;

    // 4) Utils
    const setStatus = (msg, ok = null) => {
      statusMsg.textContent = msg || '';
      statusMsg.style.color = ok === null ? '#333' : ok ? 'green' : '#b00020';
    };
    const byPt = (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    const norm = (s) =>
      (s || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    // 5) Carrega convidados (GET)
    async function carregarConvidados() {
      try {
        setStatus('Carregando convidados…');
        btnEnviar.disabled = true;

        const res = await fetch(GET_CONVIDADOS_URL, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (!res.ok) throw new Error(`GET ${res.status}`);

        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Formato inesperado do GET');

        convidados = data
          .map(c => ({ id: c.id, nome: c.nome, grupo: c.grupo || 'Sem grupo', presenca: !!c.presenca }))
          .filter(c => c.id != null && c.nome);

        if (!convidados.length) { setStatus('Nenhum convidado encontrado.', false); return; }

        convidados.sort((a, b) => byPt(a.nome, b.nome));

        grupos.clear();
        for (const c of convidados) {
          if (!grupos.has(c.grupo)) grupos.set(c.grupo, []);
          grupos.get(c.grupo).push(c);
        }

        setStatus('');
      } catch (e) {
        console.error('[confirm.js] Erro no GET:', e);
        setStatus('Não foi possível carregar a lista. Recarregue a página.', false);
        if (location.protocol === 'file:') setStatus('Abra via http:// (servidor local), não por file://', false);
      }
    }

    // 6) Busca por texto
    function buscar() {
      const q = norm(inputNome.value);
      listaResultados.innerHTML = '';
      grupoArea.hidden = true;
      grupoLista.innerHTML = '';
      convidadoSelecionado = null;
      btnEnviar.disabled = true;

      if (!q) {
        const li = document.createElement('li');
        li.className = 'resultado-vazio';
        li.textContent = 'Digite um nome e clique em Buscar.';
        listaResultados.appendChild(li);
        return;
      }

      // filtra por "contém", sem acento/caixa
      const resultados = convidados.filter(c => norm(c.nome).includes(q)).slice(0, 20);

      if (!resultados.length) {
        const li = document.createElement('li');
        li.className = 'resultado-vazio';
        li.textContent = 'Nenhum nome encontrado. Tente variar (ex.: parte do sobrenome).';
        listaResultados.appendChild(li);
        return;
      }

      const frag = document.createDocumentFragment();
      resultados.forEach(c => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'resultado-btn';
        btn.textContent = c.nome;
        btn.setAttribute('aria-label', `Selecionar ${c.nome}`);
        btn.addEventListener('click', () => selecionarConvidado(c));
        li.appendChild(btn);
        frag.appendChild(li);
      });
      listaResultados.appendChild(frag);
    }

    // 7) Seleção -> render grupo
    function selecionarConvidado(c) {
      convidadoSelecionado = c;
      inputNome.value = c.nome;

      // limpa lista após seleção
      listaResultados.innerHTML = '';

      const membros = (grupos.get(c.grupo) || [c])
        .slice()
        .sort((a, b) => byPt(a.nome, b.nome));

      renderizarCheckboxes(membros);
      grupoArea.hidden = false;
      btnEnviar.disabled = false;
      setStatus('');
    }

    // 8) Checkboxes do grupo
    function renderizarCheckboxes(membros) {
      grupoLista.innerHTML = '';
      const frag = document.createDocumentFragment();

      membros.forEach(m => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'presenca';
        input.value = String(m.id);
        input.dataset.id = String(m.id);
        input.checked = !!m.presenca;
        input.setAttribute('aria-label', `Presença de ${m.nome}`);

        const span = document.createElement('span');
        span.textContent = m.nome;

        label.appendChild(input);
        label.appendChild(span);
        frag.appendChild(label);
      });

      grupoLista.appendChild(frag);
    }

    // 9) Envio com popup
    form.addEventListener('submit', onSubmit);

    async function onSubmit(e) {
      e.preventDefault();
      if (enviando || !convidadoSelecionado) return;

      const checks = grupoLista.querySelectorAll('input[name="presenca"][type="checkbox"]');
      const payload = Array.from(checks).map(ch => ({
        id: isNaN(Number(ch.dataset.id)) ? ch.dataset.id : Number(ch.dataset.id),
        presenca: ch.checked === true
      }));

      if (!payload.length) { setStatus('Selecione pelo menos um convidado do grupo.', false); return; }

      try {
        enviando = true;
        btnEnviar.disabled = true;
        setStatus('Enviando sua confirmação…');

        const res = await fetch(POST_CONFIRMACAO_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ info: payload })
        });

        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`POST ${res.status} — ${t || 'falha ao enviar'}`);
        }

        setStatus('');
        mostrarPopupSucesso();
      } catch (err) {
        console.error('[confirm.js] Erro no POST:', err);
        setStatus('Não foi possível enviar agora. Tente novamente em instantes.', false);
        btnEnviar.disabled = false;
      } finally {
        enviando = false;
      }
    }

    // 10) Popup com acessibilidade básica
    function mostrarPopupSucesso() {
      if (!popup) { window.location.href = 'index.html'; return; }
      popup.hidden = false;

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const btnOk = document.getElementById('btnOkPopup');
      const onClose = () => {
        document.body.style.overflow = prevOverflow;
        window.location.href = 'index.html';
      };

      btnOk?.focus();
      btnOk?.addEventListener('click', onClose, { once: true });
      const onKey = (ev) => { if (ev.key === 'Escape') onClose(); };
      document.addEventListener('keydown', onKey, { once: true });
      popup.addEventListener('click', (ev) => { if (ev.target === popup) onClose(); }, { once: true });
    }

    // 11) Eventos da busca
    btnBuscar.addEventListener('click', buscar);
    inputNome.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscar();
      }
    });

    // 12) Start
    carregarConvidados();
  });
})();