/* =====================================================
   app.js — Página pública de emissão de certificados
===================================================== */

const STORAGE_KEY = 'cert_eventos';
let certAtual = null;

document.addEventListener('DOMContentLoaded', () => {
  verificarConfig();
});

function getEventos() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e) { return []; }
}

function verificarConfig() {
  const evs = getEventos().filter(e => e.participantes?.length > 0);
  document.getElementById('aviso-config').style.display = evs.length ? 'none' : 'block';
  atualizarSelectEvento(evs);
}

function atualizarSelectEvento(evs) {
  const sel  = document.getElementById('sel-evento');
  const wrap = document.getElementById('wrap-evento');
  if (evs.length > 1) {
    // Guarda o índice REAL no localStorage junto com o nome
    sel.innerHTML = evs.map((e) =>
      `<option value="${e._idx}">${e.nome} — ${e.cidade}</option>`
    ).join('');
    wrap.style.display = '';
  } else {
    wrap.style.display = 'none';
  }
}

function normalizar(t) {
  if (!t) return '';
  return t.trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function similaridade(a, b) {
  a = normalizar(a); b = normalizar(b);
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const pa = new Set(a.split(' '));
  const pb = new Set(b.split(' '));
  const comuns = [...pa].filter(x => pb.has(x));
  return comuns.length / Math.max(pa.size, pb.size);
}

function buscar() {
  const nome = document.getElementById('inp-nome').value.trim();
  if (!nome) { msgBusca('⚠️ Digite seu nome completo.', 'warning'); return; }

  // Carrega todos os eventos com índice real preservado
  const todos = getEventos().map((e, i) => ({ ...e, _idx: i }));
  const evs   = todos.filter(e => e.participantes?.length > 0);

  if (!evs.length) {
    msgBusca('⚠️ Sistema não configurado. Contate o administrador.', 'warning');
    return;
  }

  // Seleciona evento pelo índice real
  let evento;
  if (evs.length === 1) {
    evento = evs[0];
  } else {
    const idxReal = parseInt(document.getElementById('sel-evento').value);
    evento = todos[idxReal];
  }

  // Busca exata
  const nb  = normalizar(nome);
  let enc   = evento.participantes.find(p => normalizar(p.nome) === nb);

  // Busca aproximada
  if (!enc) {
    let best = null, score = 0;
    evento.participantes.forEach(p => {
      const s = similaridade(nome, p.nome);
      if (s > score) { score = s; best = p; }
    });
    if (score >= 0.80) enc = best;
  }

  if (!enc) {
    msgBusca('❌ Nome não encontrado. Favor procurar os organizadores do evento.', 'danger');
    document.getElementById('area-preview').style.display = 'none';
    return;
  }

  msgBusca('✅ Participante encontrado! Gerando certificado...', 'success');
  certAtual = { participante: enc, evento };
  renderizarCertificado(enc, evento);
}

function preencherTexto(tmpl, dados) {
  let t = tmpl;
  Object.entries(dados).forEach(([k, v]) => {
    t = t.replaceAll(`{${k}}`, v || '');
  });
  return t;
}

function quebrarLinhas(ctx, texto, maxLarg) {
  const palavras = texto.split(' ');
  const linhas   = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? atual + ' ' + p : p;
    if (ctx.measureText(teste).width > maxLarg && atual) {
      linhas.push(atual); atual = p;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

async function renderizarCertificado(participante, evento) {
  const canvas = document.getElementById('canvas-cert');
  const ctx    = canvas.getContext('2d');

  // Usa o índice REAL do evento para buscar o template correto
  const idxReal = evento._idx !== undefined ? evento._idx
    : getEventos().findIndex(e => e.nome === evento.nome);

  const tmplB64 = localStorage.getItem('cert_template_' + idxReal);

  console.log('Índice evento:', idxReal);
  console.log('Template encontrado:', !!tmplB64);

  let tmpl;
  if (tmplB64) {
    tmpl = await loadImg(tmplB64);
  } else {
    console.warn('Template não encontrado, usando demo.');
    tmpl = await demoImg();
  }

  const W = tmpl.naturalWidth  || 2480;
  const H = tmpl.naturalHeight || 1754;
  canvas.width  = W;
  canvas.height = H;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(tmpl, 0, 0, W, H);

  // Texto com placeholders preenchidos
  const texto = preencherTexto(evento.texto, {
    Nome:          participante.nome,
    Municipio:     participante.municipio || '',
    Cidade:        evento.cidade,
    Data:          evento.periodo,
    Carga_Horaria: evento.carga,
  });

  const linhasRaw = texto.split('\n').filter(l => l.trim());
  const szTexto   = Math.round(W * 0.020);
  const lhTexto   = szTexto * 1.7;
  const maxLarg   = W * 0.72;

  ctx.save();
  ctx.font         = `bold ${szTexto}px Arial, sans-serif`;
  ctx.fillStyle    = '#1a1a1a';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(255,255,255,0.95)';
  ctx.shadowBlur   = 6;

  const todasLinhas = [];
  linhasRaw.forEach(l => todasLinhas.push(...quebrarLinhas(ctx, l, maxLarg)));
  const totalH = todasLinhas.length * lhTexto;
  const yStart = H * 0.42 - totalH / 2 + lhTexto / 2;
  todasLinhas.forEach((l, i) => ctx.fillText(l, W / 2, yStart + i * lhTexto));
  ctx.restore();

  // Código único
  const codigo = 'CERT-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
  certAtual.codigo = codigo;

  document.getElementById('area-preview').style.display = 'block';
  document.getElementById('area-preview').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('cert-codigo').innerHTML =
    'Código: <strong>' + codigo + '</strong>';

  // QR Code
  const qw = document.getElementById('qr-wrap');
  qw.style.display = 'block';
  document.getElementById('qr').innerHTML = '';
  new QRCode(document.getElementById('qr'), {
    text:   window.location.origin +
            window.location.pathname.replace('index.html', '') +
            'validar.html?cert=' + codigo,
    width:  100,
    height: 100
  });

  msgBusca('✅ Certificado gerado para: ' + participante.nome, 'success');
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const img   = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src     = src;
  });
}

async function demoImg() {
  const W = 2480, H = 1754;
  const c   = document.createElement('canvas');
  c.width   = W; c.height = H;
  const ctx = c.getContext('2d');
  const g   = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#eef2ff');
  g.addColorStop(1, '#dbeafe');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#003580'; ctx.lineWidth = 28;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = '#1a56db'; ctx.lineWidth = 8;
  ctx.strokeRect(66, 66, W - 132, H - 132);
  ctx.fillStyle = '#003580'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = 'bold 72px Arial';
  ctx.fillText('MINISTÉRIO DO DESENVOLVIMENTO E ASSISTÊNCIA SOCIAL', W / 2, 140);
  ctx.font = 'bold 150px Georgia, serif';
  ctx.fillText('CERTIFICADO', W / 2, 360);
  ctx.fillStyle = '#1a56db'; ctx.fillRect(280, 560, W - 560, 6);
  ctx.font = '44px Arial'; ctx.fillStyle = '#6b7280';
  ctx.fillText('Brasília — 2026', W / 2, H - 160);
  const img = new Image();
  img.src   = c.toDataURL('image/png');
  return new Promise(res => { img.onload = () => res(img); });
}

function baixarPDF() {
  if (!certAtual) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.addImage(
    document.getElementById('canvas-cert').toDataURL('image/png', 1.0),
    'PNG', 0, 0, 297, 210
  );
  doc.save('Certificado_' + certAtual.participante.nome.replace(/\s+/g, '_') + '.pdf');
}

function msgBusca(txt, tipo) {
  const el     = document.getElementById('msg-busca');
  el.className = 'alert alert-' + tipo + ' py-2 small';
  el.textContent   = txt;
  el.style.display = 'block';
}

function limpar() {
  document.getElementById('inp-nome').value             = '';
  document.getElementById('area-preview').style.display = 'none';
  document.getElementById('msg-busca').style.display    = 'none';
  certAtual = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}