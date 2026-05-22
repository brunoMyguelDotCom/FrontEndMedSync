import {
  pacienteApi, medicoApi, especialidadeApi,
  disponibilidadeApi, consultaApi
} from './api.js';

// ════════════════════════════════════════════════════════════
//  Tabs
// ════════════════════════════════════════════════════════════
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    resetFlow();
  });
});

// ════════════════════════════════════════════════════════════
//  Toast
// ════════════════════════════════════════════════════════════
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ════════════════════════════════════════════════════════════
//  Preencher selects
// ════════════════════════════════════════════════════════════
async function populateSelects() {
  const [pacientes, medicos, especialidades] = await Promise.allSettled([
    pacienteApi.listar(),
    medicoApi.listar(),
    especialidadeApi.listar(),
  ]);

  // Pacientes ativos apenas
  const pacs = pacientes.status === 'fulfilled'
    ? pacientes.value.filter(p => p.ativo !== false)
    : [];

  ['sel-paciente'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;

    sel.innerHTML = pacs.length
      ? pacs.map(p => `
          <option value="${p.id}">
            ${p.nome} — ${p.cpf}
          </option>
        `).join('')
      : `<option value="">Nenhum paciente disponível</option>`;
  });

  // Médicos ativos apenas
  const meds = medicos.status === 'fulfilled'
    ? medicos.value.filter(m => m.ativo !== false)
    : [];

  ['sel-medico', 'sel-medico-disp'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;

    sel.innerHTML = meds.length
      ? meds.map(m => `
          <option value="${m.id}">
            ${m.nome} — ${m.especialidade}
          </option>
        `).join('')
      : `<option value="">Nenhum médico disponível</option>`;
  });

  // Especialidades
  const esps = especialidades.status === 'fulfilled'
    ? especialidades.value
    : [];

  ['sel-especialidade-medico'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;

    sel.innerHTML = esps.length
      ? esps.map(e => `
          <option value="${e.id}">
            ${e.nome}
          </option>
        `).join('')
      : `<option value="">Nenhuma especialidade cadastrada</option>`;
  });
}

populateSelects();

// ════════════════════════════════════════════════════════════
//  Flow Engine
// ════════════════════════════════════════════════════════════

const NODES = ['n-request', 'n-controller', 'n-service', 'n-validate', 'n-repository', 'n-database', 'n-response'];
const EDGES = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'];

function getNode(id) { return document.getElementById(id); }
function getEdge(id) { return document.getElementById(id); }

function setNodeState(id, state) {   // idle | active | done | error
  const n = getNode(id);
  n.setAttribute('class', `flow-node ${state}`);
}

function setEdgeState(id, state) {   // '' | active | done | error
  const e = getEdge(id);
  e.setAttribute('class', `flow-edge ${state}`);
}

function resetFlow() {
  NODES.forEach(n => setNodeState(n, 'idle'));
  EDGES.forEach(e => setEdgeState(e, ''));
  document.getElementById('flow-log').innerHTML = '';
  const rb = document.getElementById('response-box');
  rb.className = 'response-box';
  rb.textContent = '';
  document.getElementById('pulse-dot').classList.remove('on');
  document.getElementById('flow-status-label').textContent = 'aguardando';
  document.getElementById('flow-status-label').className = 'flow-status';
  // reset subtexts
  setNodeSub('n-request-sub', '');
  setNodeSub('n-controller-sub', '@RestController');
  setNodeSub('n-service-sub', '@Service — lógica de negócio');
  setNodeSub('n-validate-sub', 'regras de negócio');
  setNodeSub('n-repository-sub', 'JpaRepository');
  setNodeSub('n-database-sub', 'SQL / Hibernate');
  document.getElementById('n-response-text').textContent = 'HTTP RESPONSE';
}

function setNodeSub(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function addLog(text, type = '') {
  const log = document.getElementById('flow-log');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const line = document.createElement('div');
  line.className = 'flow-log-line';
  line.innerHTML = `<span class="log-time">${now}</span><span class="log-text ${type}">${text}</span>`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// stepDelay: ms entre animações de cada nó
const STEP_MS = 420;

async function runFlow(config) {
  resetFlow();
  const statusLabel = document.getElementById('flow-status-label');
  const dot = document.getElementById('pulse-dot');

  dot.classList.add('on');
  statusLabel.textContent = 'executando';
  statusLabel.className = 'flow-status running';

  // ── Passo 0: HTTP Request ──
  setNodeState('n-request', 'active');
  setNodeSub('n-request-sub', `${config.method} ${config.path}`);
  addLog(`→ ${config.method} ${config.path}`, 'info');
  await delay(STEP_MS);
  setEdgeState('e0', 'active');

  // ── Passo 1: Controller ──
  await delay(STEP_MS);
  setNodeState('n-request', 'done');
  setEdgeState('e0', 'done');
  setNodeState('n-controller', 'active');
  setNodeSub('n-controller-sub', config.controller);
  addLog(`Controller recebeu requisição`, 'info');
  addLog(`Desserializando body → DTO`);
  await delay(STEP_MS);
  setEdgeState('e1', 'active');

  // ── Passo 2: Service ──
  await delay(STEP_MS);
  setNodeState('n-controller', 'done');
  setEdgeState('e1', 'done');
  setNodeState('n-service', 'active');
  setNodeSub('n-service-sub', config.service);
  addLog(`Service iniciado`);
  await delay(STEP_MS);
  setEdgeState('e2', 'active');

  // ── Passo 3: Validação ──
  await delay(STEP_MS);
  setNodeState('n-service', 'done');
  setEdgeState('e2', 'done');
  setNodeState('n-validate', 'active');
  addLog(`Executando validações...`);

  let result;
  let errorAt = null;

  try {
    // ── Chamada real à API ──
    result = await config.apiCall();

    // ── Sucesso: continua o fluxo ──
    setNodeSub('n-validate-sub', '✓ validações OK');
    addLog(`✓ Validações passaram`, 'ok');
    await delay(STEP_MS);
    setNodeState('n-validate', 'done');
    setEdgeState('e3', 'active');

    // ── Passo 4: Repository ──
    await delay(STEP_MS);
    setEdgeState('e3', 'done');
    setNodeState('n-repository', 'active');
    setNodeSub('n-repository-sub', config.repoMethod);
    addLog(`Repository: ${config.repoMethod}`);
    await delay(STEP_MS);
    setEdgeState('e4', 'active');

    // ── Passo 5: Database ──
    await delay(STEP_MS);
    setNodeState('n-repository', 'done');
    setEdgeState('e4', 'done');
    setNodeState('n-database', 'active');
    setNodeSub('n-database-sub', `${config.sqlOp} → OK`);
    addLog(`DB: ${config.sqlOp}`);
    await delay(STEP_MS);
    setEdgeState('e5', 'active');

    // ── Passo 6: Response ──
    await delay(STEP_MS);
    setNodeState('n-database', 'done');
    setEdgeState('e5', 'done');
    setNodeState('n-response', 'done');
    document.getElementById('n-response-text').textContent = `${config.successStatus} OK`;
    addLog(`← ${config.successStatus} ${config.successMsg}`, 'ok');

    dot.classList.remove('on');
    statusLabel.textContent = 'sucesso';
    statusLabel.className = 'flow-status success';

    // Mostra JSON de resposta
    const rb = document.getElementById('response-box');
    rb.textContent = JSON.stringify(result, null, 2);
    rb.className = 'response-box visible';

    toast(config.successMsg, 'success');
    populateSelects(); // atualiza selects pós-criação

  } catch (err) {
    // ── Erro: para no nó de validação (ou response) ──
    errorAt = 'n-validate';
    setNodeState('n-validate', 'error');
    setNodeSub('n-validate-sub', '✕ ' + err.message);
    setEdgeState('e2', 'error');

    // Linha vermelha volta ao response
    setEdgeState('e3', 'error');
    setEdgeState('e4', 'error');
    setEdgeState('e5', 'error');
    setNodeState('n-repository', 'error');
    setNodeState('n-database', 'error');
    setNodeState('n-response', 'error');
    document.getElementById('n-response-text').textContent = '4xx / 5xx ERROR';

    dot.classList.remove('on');
    statusLabel.textContent = 'erro';
    statusLabel.className = 'flow-status error';

    const rb = document.getElementById('response-box');
    rb.textContent = `Erro: ${err.message}`;
    rb.className = 'response-box visible err';

    toast('Erro: ' + err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  Configurações de fluxo por entidade
// ════════════════════════════════════════════════════════════
function flowConfig(entity, method, path, apiCall, opts = {}) {
  return {
    method,
    path,
    apiCall,
    controller: opts.controller || `${entity}Controller`,
    service: opts.service || `${entity}Service.criar${entity}()`,
    repoMethod: opts.repoMethod || `repository.save(entity)`,
    sqlOp: opts.sqlOp || `INSERT INTO ${entity.toLowerCase()}s`,
    successStatus: opts.successStatus || '201',
    successMsg: opts.successMsg || `${entity} criado(a) com sucesso!`,
  };
}

// ════════════════════════════════════════════════════════════
//  Form handlers
// ════════════════════════════════════════════════════════════
function formData(form) {
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((v, k) => { obj[k] = v; });
  return obj;
}

// ── Consulta ──
document.getElementById('form-consulta').addEventListener('submit', async e => {
  e.preventDefault();
  const d = formData(e.target);
  const body = {
    pacienteId: Number(d.pacienteId),
    medicoId: Number(d.medicoId),
    dataHora: d.dataHora,       // "2026-05-25T14:00"
    observacoes: d.observacoes || null,
  };
  await runFlow(flowConfig(
    'Consulta', 'POST', '/api/consultas',
    () => consultaApi.criar(body),
    {
      controller: 'ConsultaController.criarConsulta()',
      service: 'ConsultaService.criarConsulta()',
      repoMethod: 'consultaRepository.save(consulta)',
      sqlOp: 'INSERT INTO consultas',
      successStatus: '201',
      successMsg: 'Consulta agendada!',
    }
  ));
});

// ── Paciente ──
document.getElementById('form-paciente').addEventListener('submit', async e => {
  e.preventDefault();
  const body = formData(e.target);
  await runFlow(flowConfig(
    'Paciente', 'POST', '/api/pacientes',
    () => pacienteApi.criar(body),
    {
      controller: 'PacienteController.criarPaciente()',
      service: 'PacienteService.criarPaciente()',
      repoMethod: 'pacienteRepository.save(paciente)',
      sqlOp: 'INSERT INTO pacientes',
      successStatus: '201',
      successMsg: 'Paciente cadastrado!',
    }
  ));
});

// ── Médico ──
document.getElementById('form-medico').addEventListener('submit', async e => {
  e.preventDefault();
  const d = formData(e.target);
  const body = { nome: d.nome, crm: d.crm, especialidadeId: Number(d.especialidadeId) };
  await runFlow(flowConfig(
    'Medico', 'POST', '/api/medicos',
    () => medicoApi.criar(body),
    {
      controller: 'MedicoController.criarMedico()',
      service: 'MedicoService.criarMedico()',
      repoMethod: 'medicoRepository.save(medico)',
      sqlOp: 'INSERT INTO medicos',
      successStatus: '201',
      successMsg: 'Médico cadastrado!',
    }
  ));
});

// ── Especialidade ──
document.getElementById('form-especialidade').addEventListener('submit', async e => {
  e.preventDefault();
  const body = formData(e.target);
  await runFlow(flowConfig(
    'Especialidade', 'POST', '/api/especialidade',
    () => especialidadeApi.criar(body),
    {
      controller: 'EspecialidadeController.criarEspecialidade()',
      service: 'EspecialidadeService.criarEspecialidade()',
      repoMethod: 'especialidadeRepository.save(esp)',
      sqlOp: 'INSERT INTO especialidades',
      successStatus: '201',
      successMsg: 'Especialidade criada!',
    }
  ));
});

// ── Disponibilidade ──
document.getElementById('form-disponibilidade').addEventListener('submit', async e => {
  e.preventDefault();
  const d = formData(e.target);
  const medicoId = Number(d.medicoId);
  const body = {
    diaSemana: d.diaSemana,
    horarioInicio: d.horarioInicio,
    horarioFim: d.horarioFim,
  };
  await runFlow(flowConfig(
    'Disponibilidade', 'POST', `/api/medicos/${medicoId}/disponibilidades`,
    () => disponibilidadeApi.criar(medicoId, body),
    {
      controller: 'DisponibilidadeController.registrarDisponibilidade()',
      service: 'DisponibilidadeService.registrarDisponibilidade()',
      repoMethod: 'disponibilidadeRepository.save(disp)',
      sqlOp: 'INSERT INTO disponibilidades',
      successStatus: '201',
      successMsg: 'Disponibilidade registrada!',
    }
  ));
});
