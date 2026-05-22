import {
  consultaApi,
  medicoApi,
  pacienteApi,
  disponibilidadeApi,
  especialidadeApi
} from './api.js';

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'error' ? '✕' : '✓'}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Helpers ──────────────────────────────────────────────────
function statusBadge(s) {
  const map = {
    AGENDADA: 'badge-amber',
    CONCLUIDA: 'badge-green',
    CANCELADA: 'badge-red',
  };
  return `<span class="badge ${map[s] || 'badge-gray'}">${s}</span>`;
}

function ativoBadge(v) {
  return v
    ? `<span class="badge badge-green">Ativo</span>`
    : `<span class="badge badge-red">Inativo</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function $id(id) { return document.getElementById(id); }

// ── Consultas ────────────────────────────────────────────────
let allConsultas = [];

async function loadConsultas() {
  try {
    allConsultas = await consultaApi.listar();
    renderConsultas(allConsultas);
    updateConsultaStats(allConsultas);
  } catch (e) {
    toast('Erro ao carregar consultas: ' + e.message, 'error');
    $id('tbody-consultas').innerHTML = `<tr><td colspan="7" class="empty">Erro ao carregar</td></tr>`;
  }
}

function renderConsultas(list) {
  const filtro = $id('filtro-status').value;
  const filtered = filtro ? list.filter(c => c.status === filtro) : list;

  if (!filtered.length) {
    $id('tbody-consultas').innerHTML = `<tr><td colspan="7"><div class="empty"><div class="empty-icon">📋</div>Nenhuma consulta encontrada</div></td></tr>`;
    return;
  }

  $id('tbody-consultas').innerHTML = filtered.map(c => `
    <tr>
      <td style="color:var(--text3)">${c.id}</td>
      <td>${c.nomePaciente}</td>
      <td>${c.nomeMedico}</td>
      <td style="color:var(--text2)">${fmtDate(c.dataHora)}</td>
      <td>${statusBadge(c.status)}</td>
      <td style="color:var(--text3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.observacoes || '—'}</td>
      <td>
        ${c.status === 'AGENDADA' ? `
          <button class="btn btn-ghost" style="padding:.25rem .55rem;font-size:.7rem" onclick="concluir(${c.id})">Concluir</button>
          <button class="btn btn-danger" style="padding:.25rem .55rem;font-size:.7rem;margin-left:.3rem" onclick="cancelar(${c.id})">Cancelar</button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
}

function updateConsultaStats(list) {
  $id('s-consultas-total').textContent = list.length;
  $id('s-consultas-agendadas').textContent = list.filter(c => c.status === 'AGENDADA').length;
  $id('s-consultas-concluidas').textContent = list.filter(c => c.status === 'CONCLUIDA').length;
  $id('s-consultas-canceladas').textContent = list.filter(c => c.status === 'CANCELADA').length;
}

window.concluir = async (id) => {
  if (!confirm('Confirmar conclusão da consulta?')) return;
  try {
    await consultaApi.atualizarStatus(id, 'CONCLUIDA');
    toast('Consulta concluída!', 'success');
    loadConsultas();
  } catch (e) { toast(e.message, 'error'); }
};

window.cancelar = async (id) => {
  if (!confirm('Cancelar esta consulta?')) return;
  try {
    await consultaApi.cancelar(id);
    toast('Consulta cancelada.', 'success');
    loadConsultas();
  } catch (e) { toast(e.message, 'error'); }
};

// ── Médicos ──────────────────────────────────────────────────
async function loadMedicos() {
  try {
    const medicos = await medicoApi.listar();

    // NÃO MOSTRA INATIVOS
    const medicosAtivos = medicos.filter(m => m.ativo !== false);

    $id('s-medicos-total').textContent = medicosAtivos.length;

    // médicos que têm consulta agendada hoje
    const hoje = new Date().toDateString();
    const ocupados = new Set(
      allConsultas
        .filter(c => c.status === 'AGENDADA' && new Date(c.dataHora).toDateString() === hoje)
        .map(c => c.nomeMedico)
    );

    $id('s-medicos-ocupados').textContent = ocupados.size;

    // médicos com disponibilidade cadastrada
    let comDisp = 0;

    await Promise.allSettled(
      medicosAtivos.slice(0, 20).map(async m => {
        const d = await disponibilidadeApi.listar(m.id).catch(() => []);
        if (d.length > 0) comDisp++;
      })
    );

    $id('s-medicos-com-disp').textContent = comDisp;

    $id('tbody-medicos').innerHTML = medicosAtivos.length
      ? medicosAtivos.map(m => `
        <tr>
          <td style="color:var(--text3)">${m.id}</td>
          <td>${m.nome}</td>
          <td style="color:var(--text2)">${m.crm}</td>
          <td>${m.especialidade}</td>
          <td>${ocupados.has(m.nome)
          ? `<span class="badge badge-amber">Ocupado</span>`
          : `<span class="badge badge-green">Livre</span>`}</td>

          <td>
            <button
              class="btn btn-danger"
              style="padding:.35rem .7rem;font-size:.72rem"
              onclick="removerMedico(${m.id})"
            >
              Excluir
            </button>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="6" class="empty">Nenhum médico cadastrado</td></tr>`;

  } catch (e) {
    toast('Erro ao carregar médicos: ' + e.message, 'error');
  }
}

// ── Pacientes ────────────────────────────────────────────────
async function loadPacientes() {
  try {
    const pacientes = await pacienteApi.listar();

    const ativos = pacientes.filter(p => p.ativo !== false);
    const inativos = pacientes.filter(p => p.ativo === false);

    $id('s-pacientes-total').textContent = ativos.length;
    $id('s-pacientes-ativos').textContent = ativos.length;
    $id('s-pacientes-inativos').textContent = inativos.length;

    $id('tbody-pacientes').innerHTML = ativos.length
      ? ativos.map(p => `
        <tr>
          <td style="color:var(--text3)">${p.id}</td>
          <td>${p.nome}</td>
          <td style="color:var(--text2)">${p.cpf}</td>
          <td>${p.telefone}</td>
          <td>${ativoBadge(true)}</td>

          <td>
            <button
              class="btn btn-danger"
              style="padding:.35rem .7rem;font-size:.72rem"
              onclick="removerPaciente(${p.id})"
            >
              Excluir
            </button>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="6" class="empty">Nenhum paciente cadastrado</td></tr>`;

  } catch (e) {
    toast('Erro ao carregar pacientes: ' + e.message, 'error');
  }
}

// ── Especialidades ─────────────────────────────────────────────
async function loadEspecialidades() {

  try {

    const especialidades =
      await especialidadeApi.listar();

    $id('tbody-especialidades').innerHTML =
      especialidades.length
        ? especialidades.map(e => `
          <tr>

            <td style="color:var(--text3)">
              ${e.id}
            </td>

            <td>
              ${e.nome}
            </td>

            <td>
              <button
                class="btn btn-danger"
                style="padding:.35rem .7rem;font-size:.72rem"
                onclick="removerEspecialidade(${e.id})"
              >
                Excluir
              </button>
            </td>

          </tr>
        `).join('')
        : `
          <tr>
            <td colspan="3" class="empty">
              Nenhuma especialidade cadastrada
            </td>
          </tr>
        `;

  } catch (e) {

    toast(
      'Erro ao carregar especialidades',
      'error'
    );

  }
}

// ── Disponibilidades ─────────────────────────────────────────────
async function loadDisponibilidades() {

  try {

    const medicos = await medicoApi.listar();

    const ativos =
      medicos.filter(m => m.ativo !== false);

    let rows = [];

    for (const medico of ativos) {

      const disponibilidades =
        await disponibilidadeApi.listar(medico.id);

      disponibilidades.forEach(d => {

        rows.push(`
          <tr>

            <td style="color:var(--text3)">
              ${d.id}
            </td>

            <td>
              ${medico.nome}
            </td>

            <td>
              ${d.diaSemana}
            </td>

            <td>
              ${d.horaInicio} → ${d.horaFim}
            </td>

            <td>
              <button
                class="btn btn-danger"
                style="padding:.35rem .7rem;font-size:.72rem"
                onclick="removerDisponibilidade(${d.id})"
              >
                Excluir
              </button>
            </td>

          </tr>
        `);

      });
    }

    $id('tbody-disponibilidades').innerHTML =
      rows.length
        ? rows.join('')
        : `
          <tr>
            <td colspan="5" class="empty">
              Nenhuma disponibilidade cadastrada
            </td>
          </tr>
        `;

  } catch (e) {

    toast(
      'Erro ao carregar disponibilidades',
      'error'
    );

  }
}

// ── Soft Delete ─────────────────────────────────────────────

window.removerPaciente = async (id) => {
  if (!confirm('Deseja realmente excluir este paciente?')) return;

  try {
    await pacienteApi.remover(id);

    toast('Paciente removido com sucesso!', 'success');

    await loadPacientes();
  } catch (e) {
    toast(e.message, 'error');
  }
};

window.removerMedico = async (id) => {
  if (!confirm('Deseja realmente excluir este médico?')) return;

  try {
    await medicoApi.remover(id);

    toast('Médico removido com sucesso!', 'success');

    await loadMedicos();
  } catch (e) {
    toast(e.message, 'error');
  }
};

window.removerEspecialidade = async (id) => {

  if (!confirm('Deseja excluir esta especialidade?'))
    return;

  try {

    await especialidadeApi.remover(id);

    toast(
      'Especialidade removida!',
      'success'
    );

    await loadEspecialidades();

  } catch (e) {

    toast(e.message, 'error');

  }
};

window.removerDisponibilidade = async (id) => {

  if (!confirm('Deseja excluir esta disponibilidade?'))
    return;

  try {

    await disponibilidadeApi.remover(id);

    toast(
      'Disponibilidade removida!',
      'success'
    );

    await loadDisponibilidades();

  } catch (e) {

    toast(e.message, 'error');

  }
};

// ── Inicializar ──────────────────────────────────────────────
async function init() {
  await loadConsultas();
  await Promise.all([
    loadConsultas(),
    loadMedicos(),
    loadPacientes(),
    loadEspecialidades(),
    loadDisponibilidades()
  ]);
}

$id('filtro-status').addEventListener('change', () => renderConsultas(allConsultas));
$id('btn-refresh').addEventListener('click', () => {
  $id('btn-refresh').textContent = '↻ Atualizando...';
  init().finally(() => { $id('btn-refresh').textContent = '↺ Atualizar'; });
});

init();
