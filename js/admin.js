/* =====================================================
   admin.js — Painel administrativo
   Salva eventos e templates no localStorage
   para serem lidos pelo app.js (index.html)
===================================================== */

const STORAGE_KEY  = 'cert_eventos';
const STORAGE_PASS = 'cert_senha';

/* ── Inicialização ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Preview do template ao selecionar arquivo
  document.getElementById('ev-template').addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;
    const b64 = await fileParaBase64(file);
    document.getElementById('prev-template').src          = b64;
    document.getElementById('prev-template').style.display = 'block';
  });
});

/* ── Auth ────────────────────────────────────────── */
function getSenha() {
  return localStorage.getItem(STORAGE_PASS) || 'admin123';
}

function loginAdmin() {
  const senha = document.getElementById('inp-senha').value;
  const errEl = document.getElementById('err-login');
  if (senha === getSenha()) {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('painel').style.display     = '';
    document.getElementById('btn-logout').style.display = '';
    errEl.style.display = 'none';
    renderizarEventos();
    preencherLinkPublico();
  } else {
    errEl.textContent   = 'Senha incorreta.';
    errEl.style.display = 'block';
  }
}

function logout() {
  document.getElementById('painel').style.display     = 'none';
  document.getElementById('tela-login').style.display = '';
  document.getElementById('btn-logout').style.display = 'none';
  document.getElementById('inp-senha').value          = '';
}

function trocarSenha() {
  const nova = document.getElementById('nova-senha').value;
  const conf = document.getElementById('conf-senha').value;
  const el   = document.getElementById('msg-senha');
  if (!nova) {
    el.textContent = '⚠️ Digite a nova senha.';
    el.style.color = 'red'; el.style.display = 'block'; return;
  }
  if (nova !== conf) {
    el.textContent = '⚠️ As senhas não coincidem.';
    el.style.color = 'red'; el.style.display = 'block'; return;
  }
  localStorage.setItem(STORAGE_PASS, nova);
  el.textContent = '✅ Senha alterada com sucesso!';
  el.style.color = 'green'; el.style.display = 'block';
  document.getElementById('nova-senha').value = '';
  document.getElementById('conf-senha').value = '';
}

/* ── Link público ────────────────────────────────── */
function preencherLinkPublico() {
  const link = window.location.href.replace('admin.html', 'index.html');
  document.getElementById('link-publico').value = link;
}

function copiarLink() {
  const el = document.getElementById('link-publico');
  el.select();
  document.execCommand('copy');
  const msg = document.getElementById('msg-link');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2000);
}

/* ── CRUD Eventos ────────────────────────────────── */
function getEventos() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e) { return []; }
}

function salvarEventos(evs) {
  // Salva eventos sem o templateBase64 (fica em chave separada)
  const evsSem = evs.map(({ templateBase64, ...resto }) => resto);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(evsSem));
}

function renderizarEventos() {
  const evs = getEventos();
  const el  = document.getElementById('lista-eventos');
  if (!evs.length) {
    el.innerHTML = '<p class="text-muted small">Nenhum evento cadastrado. Clique em "Novo Evento".</p>';
    return;
  }
  el.innerHTML = evs.map((ev, i) => `
    <div class="evento-item">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-bold">${ev.nome}</div>
          <div class="text-muted small">${ev.cidade} · ${ev.periodo} · ${ev.carga || ''}</div>
          <div class="small text-muted mt-1" style="max-height:32px;overflow:hidden">
            ${ev.texto
              ? ev.texto.substring(0, 100) + '...'
              : '<span class="text-danger">⚠️ Sem texto</span>'}
          </div>
          <div class="mt-2 d-flex gap-3">
            <span class="${ev.participantes?.length ? 'status-ok' : 'status-pen'}">
              ${ev.participantes?.length
                ? `✅ ${ev.participantes.length} participantes`
                : '⚠️ Sem participantes'}
            </span>
            <span class="${localStorage.getItem('cert_template_' + i) ? 'status-ok' : 'status-pen'}">
              ${localStorage.getItem('cert_template_' + i) ? '✅ Template ok' : '⚠️ Sem template'}
            </span>
          </div>
        </div>
        <div class="d-flex flex-column gap-1 ms-3">
          <button class="btn btn-sm btn-outline-primary" onclick="editarEvento(${i})">✏️ Editar</button>
          <button class="btn btn-sm btn-outline-danger"  onclick="removerEvento(${i})">🗑️ Remover</button>
        </div>
      </div>
    </div>`
  ).join('');
}

/* ── Formulário de evento ────────────────────────── */
function abrirNovoEvento() {
  limparForm();
  document.getElementById('form-titulo').textContent = 'Novo Evento';
  document.getElementById('ev-idx').value            = '';
  document.getElementById('form-evento').style.display = '';
  document.getElementById('form-evento').scrollIntoView({ behavior: 'smooth' });
}

function editarEvento(idx) {
  const evs = getEventos();
  const ev  = evs[idx];
  if (!ev) return;

  document.getElementById('form-titulo').textContent  = 'Editar Evento';
  document.getElementById('ev-idx').value     = idx;
  document.getElementById('ev-nome').value    = ev.nome    || '';
  document.getElementById('ev-cidade').value  = ev.cidade  || '';
  document.getElementById('ev-periodo').value = ev.periodo || '';
  document.getElementById('ev-carga').value   = ev.carga   || '';
  document.getElementById('ev-texto').value   = ev.texto   || '';

  // Mostra template existente
  const tmpl = localStorage.getItem('cert_template_' + idx);
  if (tmpl) {
    document.getElementById('prev-template').src          = tmpl;
    document.getElementById('prev-template').style.display = 'block';
  } else {
    document.getElementById('prev-template').style.display = 'none';
  }

  // Mostra contagem de participantes
  if (ev.participantes?.length) {
    const pl         = document.getElementById('prev-planilha');
    pl.textContent   = `✅ ${ev.participantes.length} participantes carregados`;
    pl.style.color   = 'green';
    pl.style.display = 'block';
  }

  document.getElementById('form-evento').style.display = '';
  document.getElementById('form-evento').scrollIntoView({ behavior: 'smooth' });
}

function removerEvento(idx) {
  if (!confirm('Remover este evento e todos os participantes?')) return;
  const evs = getEventos();
  evs.splice(idx, 1);
  salvarEventos(evs);
  localStorage.removeItem('cert_template_' + idx);
  // Reindexar templates
  evs.forEach((_, i) => {
    if (i >= idx) {
      const next = localStorage.getItem('cert_template_' + (i + 1));
      if (next) localStorage.setItem('cert_template_' + i, next);
      else localStorage.removeItem('cert_template_' + i);
    }
  });
  renderizarEventos();
}

function fecharForm() {
  document.getElementById('form-evento').style.display = 'none';
  limparForm();
}

function limparForm() {
  ['ev-nome','ev-cidade','ev-periodo','ev-carga','ev-texto'].forEach(id =>
    document.getElementById(id).value = ''
  );
  document.getElementById('ev-planilha').value          = '';
  document.getElementById('ev-template').value          = '';
  document.getElementById('prev-template').style.display = 'none';
  document.getElementById('prev-planilha').style.display = 'none';
  document.getElementById('msg-evento').style.display   = 'none';
}

async function salvarEvento() {
  const nome  = document.getElementById('ev-nome').value.trim();
  const texto = document.getElementById('ev-texto').value.trim();

  if (!nome || !texto) {
    alertEvento('⚠️ Nome e Texto do Certificado são obrigatórios.', 'warning');
    return;
  }

  const idxStr = document.getElementById('ev-idx').value;
  const evs    = getEventos();
  const idx    = idxStr !== '' ? parseInt(idxStr) : evs.length;
  const ev     = idxStr !== '' ? evs[idx] : {};

  ev.nome    = nome;
  ev.cidade  = document.getElementById('ev-cidade').value.trim();
  ev.periodo = document.getElementById('ev-periodo').value.trim();
  ev.carga   = document.getElementById('ev-carga').value.trim();
  ev.texto   = texto;
  if (!ev.participantes) ev.participantes = [];

  // Template
  const tFile = document.getElementById('ev-template').files[0];
  if (tFile) {
    try {
      const b64 = await fileParaBase64(tFile);
      localStorage.setItem('cert_template_' + idx, b64);
    } catch(e) {
      alertEvento('❌ Erro ao carregar template: ' + e.message, 'danger');
      return;
    }
  }

  // Planilha
  const pFile = document.getElementById('ev-planilha').files[0];
  if (pFile) {
    try {
      const nomes = await lerPlanilha(pFile);
      if (!nomes.length) {
        alertEvento('❌ Nenhum nome encontrado. Verifique a coluna "Nome".', 'danger');
        return;
      }
      ev.participantes = nomes;
      const pl         = document.getElementById('prev-planilha');
      pl.textContent   = `✅ ${nomes.length} participantes carregados`;
      pl.style.color   = 'green';
      pl.style.display = 'block';
    } catch(e) {
      alertEvento('❌ Erro ao ler planilha: ' + e.message, 'danger');
      return;
    }
  }

  if (idxStr === '') evs.push(ev); else evs[idx] = ev;
  salvarEventos(evs);

  alertEvento('✅ Evento salvo com sucesso!', 'success');
  renderizarEventos();
  setTimeout(fecharForm, 1200);
}

/* ── Lê planilha XLSX/CSV ────────────────────────── */
function lerPlanilha(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 2) { res([]); return; }

        const header = rows[0].map(c => String(c).trim().toLowerCase());
        const iNome  = header.findIndex(c => c === 'nome' || c === 'name');
        const iMun   = header.findIndex(c => c.includes('munic'));
        const col    = iNome >= 0 ? iNome : 0;

        const participantes = rows.slice(1)
          .map(r => ({
            nome:      String(r[col]  || '').trim(),
            municipio: iMun >= 0 ? String(r[iMun] || '').trim() : ''
          }))
          .filter(r => r.nome && !/^\d+$/.test(r.nome));

        res(participantes);
      } catch(e) { rej(e); }
    };
    reader.onerror = rej;
    reader.readAsArrayBuffer(file);
  });
}

/* ── Utilitários ─────────────────────────────────── */
function fileParaBase64(file) {
  return new Promise((res, rej) => {
    const r   = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function alertEvento(txt, tipo) {
  const el     = document.getElementById('msg-evento');
  el.className = 'alert alert-' + tipo + ' small py-2';
  el.textContent   = txt;
  el.style.display = 'block';
}