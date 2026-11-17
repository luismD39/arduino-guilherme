const cv = document.getElementById('cena');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const LIMITE = Number(cv.dataset.limite);
const $ = id => document.getElementById(id);

// Layout da cena (vista de cima)
const CALCADA = { y: 150, h: 80 };
const RUA = { y: 230, h: 170 };
const FAIXA_ONIBUS_Y = 272;          // faixa de cima, sentido direita -> esquerda
const ABRIGO = { x: 360, y: 158, w: 130, h: 48 };
const POSTE = { x: 590, y: 222 };
const PARADA_X = ABRIGO.x + ABRIGO.w / 2;

let dados = { ldr: 1023, pir: 0, pessoas: 0, atualizado: null };
let pirAnterior = 0, pedido = false, noite = 0;
const onibus = { fase: 'fora', x: W + 150, v: 0, t: 0 };

// ---------- dados ----------
function mostrarStatus(classe, texto) {
  $('status').className = 'status ' + classe;
  $('status').textContent = texto;
}

async function buscar() {
  if ($('sim').checked) return mostrarStatus('sim', 'Simulação');
  try {
    dados = await (await fetch('/api/estado')).json();
    mostrarStatus(dados.conectado ? 'on' : 'off', dados.conectado ? 'Conectado' : 'Desconectado');
    $('conexao').textContent = dados.atualizado
      ? 'Última leitura do Arduino: ' + new Date(dados.atualizado * 1000).toLocaleTimeString('pt-BR')
      : 'Nenhuma leitura recebida ainda';
  } catch {
    mostrarStatus('off', 'Sem servidor');
    $('conexao').textContent = 'Sem conexão com o servidor';
  }
}
setInterval(buscar, 500);
buscar();

function lerSimulacao() {
  const pir = $('sim-pir').checked ? 1 : 0;
  if (pir && !dados.pir) dados.pessoas++;
  dados = { ...dados, ldr: Number($('sim-ldr').value), pir };
  $('sim-ldr-valor').textContent = dados.ldr;
}
['sim', 'sim-ldr', 'sim-pir'].forEach(id => $(id).addEventListener('input', () => {
  if ($('sim').checked) { lerSimulacao(); mostrarStatus('sim', 'Simulação'); }
}));

function atualizarPainel() {
  const ehNoite = dados.ldr < LIMITE;
  $('ldr').textContent = dados.ldr + (ehNoite ? ' (noite)' : ' (dia)');
  $('pir').textContent = dados.pir;
  $('pessoas').textContent = dados.pessoas;
  $('led-verde').classList.toggle('on', ehNoite);
  $('led-vermelho').classList.toggle('on', dados.pir === 1);
  $('hora').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ---------- lógica ----------
function atualizar(dt) {
  if (dados.pir && !pirAnterior) pedido = true;   // borda de subida chama um ônibus
  pirAnterior = dados.pir;

  if (onibus.fase === 'fora' && pedido) {
    pedido = false;
    Object.assign(onibus, { fase: 'chegando', x: W + 150 });
  } else if (onibus.fase === 'chegando') {
    const d = onibus.x - PARADA_X;
    onibus.x -= Math.min(360, Math.max(60, d * 2.5)) * dt;  // freia ao se aproximar
    if (onibus.x <= PARADA_X + 0.5) Object.assign(onibus, { fase: 'parado', x: PARADA_X, t: 0 });
  } else if (onibus.fase === 'parado') {
    onibus.t += dt;
    if (onibus.t >= 2) Object.assign(onibus, { fase: 'saindo', v: 0 });
  } else if (onibus.fase === 'saindo') {
    onibus.v = Math.min(320, onibus.v + 160 * dt);
    onibus.x -= onibus.v * dt;
    if (onibus.x < -150) onibus.fase = 'fora';
  }

  const alvo = dados.ldr < LIMITE ? 1 : 0;
  noite += (alvo - noite) * Math.min(1, dt * 2);
}

// ---------- desenho ----------
function retangulo(x, y, w, h, cor, r = 0) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function arvore(x, y, r) {
  ctx.fillStyle = '#0003';
  ctx.beginPath(); ctx.arc(x + 6, y + 6, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2f7d32';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#43a047';
  ctx.beginPath(); ctx.arc(x - r * .25, y - r * .25, r * .6, 0, Math.PI * 2); ctx.fill();
}

function desenharFundo() {
  retangulo(0, 0, W, H, '#6aa84f');
  // casas (telhados)
  [[40, 30, 120, 80, '#b5523b'], [200, 20, 100, 90, '#8d6e63'], [660, 25, 140, 85, '#c0392b']].forEach(([x, y, w, h, c]) => {
    retangulo(x + 6, y + 6, w, h, '#0003', 4);
    retangulo(x, y, w, h, c, 4);
    ctx.fillStyle = '#0002';
    ctx.fillRect(x, y + h / 2, w, h / 2);   // água do telhado
  });
  // calçadas
  retangulo(0, CALCADA.y, W, CALCADA.h, '#cfc9bc');
  retangulo(0, RUA.y + RUA.h, W, 40, '#cfc9bc');
  ctx.strokeStyle = '#0001';
  for (let x = 0; x < W; x += 40) {
    ctx.strokeRect(x, CALCADA.y, 40, CALCADA.h);
    ctx.strokeRect(x, RUA.y + RUA.h, 40, 40);
  }
  // rua
  retangulo(0, RUA.y, W, RUA.h, '#4a4d52');
  retangulo(0, RUA.y, W, 4, '#999');
  retangulo(0, RUA.y + RUA.h - 4, W, 4, '#999');
  ctx.fillStyle = '#f5f5f5';
  for (let x = 10; x < W; x += 60) ctx.fillRect(x, RUA.y + RUA.h / 2 - 3, 34, 6);
  // marcação de "ônibus" na faixa da parada
  ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3;
  ctx.strokeRect(PARADA_X - 120, RUA.y + 8, 240, 70);
  ctx.lineWidth = 1;
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('ÔNIBUS', PARADA_X, RUA.y + 50);

  [[330, 80, 30], [480, 60, 26], [560, 110, 22], [70, 480, 28], [300, 490, 24], [760, 470, 30], [860, 120, 26]]
    .forEach(([x, y, r]) => arvore(x, y, r));
}

function desenharAbrigo() {
  const { x, y, w, h } = ABRIGO;
  retangulo(x + 8, y + 8, w, h, '#0004', 6);
  retangulo(x, y, w, h, '#1f5fbf', 6);
  retangulo(x + 6, y + 6, w - 12, h - 12, '#2e78e6', 4);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('PARADA', x + w / 2, y + h / 2 + 5);
  // placa
  retangulo(x + w + 14, y + 40, 6, 6, '#555', 3);
  ctx.fillStyle = '#1f5fbf'; ctx.beginPath(); ctx.arc(x + w + 17, y + 30, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.fillText('P', x + w + 17, y + 34);
}

function desenharPessoa() {
  if (!dados.pir) return;
  const x = ABRIGO.x - 22, y = ABRIGO.y + 48;
  ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(x + 3, y + 3, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.ellipse(x, y, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
}

function desenharPoste() {
  const { x, y } = POSTE;
  ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 30); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dados.ldr < LIMITE ? '#fff6a8' : '#888';
  ctx.beginPath(); ctx.ellipse(x, y + 32, 7, 11, 0, 0, Math.PI * 2); ctx.fill();
}

function desenharOnibus() {
  if (onibus.fase === 'fora') return;
  const C = 210, L = 62, x = onibus.x - C / 2, y = FAIXA_ONIBUS_Y - L / 2;
  retangulo(x + 8, y + 8, C, L, '#0005', 10);
  retangulo(x, y, C, L, '#f39c12', 10);
  retangulo(x + 4, y + 4, C - 8, L - 8, '#f7b23b', 8);
  retangulo(x + 4, y + 4, 24, L - 8, '#1c2833', 6);          // para-brisa (frente à esquerda)
  retangulo(x + C - 16, y + 8, 10, L - 16, '#1c2833', 3);    // vidro traseiro
  retangulo(x + 80, y + 16, 60, L - 32, '#d0d3d4', 4);       // ar-condicionado
  ctx.fillStyle = '#c0392b'; ctx.fillRect(x + 40, y + 4, C - 60, 5);
  // pisca de parada
  if (onibus.fase === 'parado' && Math.floor(onibus.t * 4) % 2 === 0) {
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(x + 4, y + 4, 5, 0, Math.PI * 2); ctx.arc(x + C - 4, y + 4, 5, 0, Math.PI * 2); ctx.fill();
  }
  return { x, y, L };
}

function luz(x, y, raio, cor, forca) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, raio);
  g.addColorStop(0, `rgba(${cor},${0.4 * forca})`);
  g.addColorStop(1, `rgba(${cor},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, raio, 0, Math.PI * 2); ctx.fill();
}

function desenhar() {
  desenharFundo();
  desenharAbrigo();
  desenharPessoa();
  const bus = desenharOnibus();
  desenharPoste();

  if (noite > 0.01) {
    ctx.fillStyle = `rgba(8, 14, 40, ${0.72 * noite})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    luz(POSTE.x, POSTE.y + 35, 190, '255,220,120', noite);
    if (bus) {   // faróis
      luz(bus.x - 30, bus.y + 12, 70, '255,250,200', noite * .8);
      luz(bus.x - 30, bus.y + bus.L - 12, 70, '255,250,200', noite * .8);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

let ultimo = performance.now();
function quadro(agora) {
  const dt = Math.min(0.1, (agora - ultimo) / 1000);
  ultimo = agora;
  atualizar(dt);
  atualizarPainel();
  desenhar();
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
