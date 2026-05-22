// ============================================================
//  MedSync API — Integração com backend Spring Boot
//  Railway: https://medsync-production-e933.up.railway.app
// ============================================================

const BASE_URL = "https://medsync-production-e933.up.railway.app/api";

// ── Utilitário interno ──────────────────────────────────────
async function request(method, path, body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, opts);

  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok || json?.success === false) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `HTTP ${res.status}`;

    throw new Error(msg);
  }

  return json?.data ?? json;
}

// ── Pacientes ───────────────────────────────────────────────
export const pacienteApi = {
  listar: () => request("GET", "/pacientes"),
  buscar: (id) => request("GET", `/pacientes/${id}`),
  criar: (body) => request("POST", "/pacientes", body),
  atualizar: (id, body) =>
    request("PUT", `/pacientes/${id}`, body),
  remover: (id) =>
    request("DELETE", `/pacientes/${id}`),
};

// ── Médicos ─────────────────────────────────────────────────
export const medicoApi = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null)
      )
    ).toString();

    return request(
      "GET",
      `/medicos${qs ? `?${qs}` : ""}`
    );
  },

  buscar: (id) => request("GET", `/medicos/${id}`),

  criar: (body) =>
    request("POST", "/medicos", body),

  atualizar: (id, body) =>
    request("PUT", `/medicos/${id}`, body),

  remover: (id) =>
    request("DELETE", `/medicos/${id}`),
};

// ── Especialidades ──────────────────────────────────────────
export const especialidadeApi = {
  listar: () => request("GET", "/especialidade"),

  buscar: (id) =>
    request("GET", `/especialidade/${id}`),

  criar: (body) =>
    request("POST", "/especialidade", body),

  atualizar: (id, body) =>
    request("PUT", `/especialidade/${id}`, body),

  remover: (id) =>
    request("DELETE", `/especialidade/${id}`),
};

// ── Disponibilidades ─────────────────────────────────────────
export const disponibilidadeApi = {
  listar: (medicoId) =>
    request(
      "GET",
      `/medicos/${medicoId}/disponibilidades`
    ),

  criar: (medicoId, body) =>
    request(
      "POST",
      `/medicos/${medicoId}/disponibilidades`,
      body
    ),

  remover: (medicoId, id) =>
    request(
      "DELETE",
      `/medicos/${medicoId}/disponibilidades/${id}`
    ),
};

// ── Consultas ───────────────────────────────────────────────
export const consultaApi = {
  listar: () => request("GET", "/consultas"),

  buscar: (id) =>
    request("GET", `/consultas/${id}`),

  criar: (body) =>
    request("POST", "/consultas", body),

  atualizarStatus: (id, status) =>
    request(
      "PATCH",
      `/consultas/${id}/status`,
      { status }
    ),

  cancelar: (id) =>
    request("DELETE", `/consultas/${id}`),
};