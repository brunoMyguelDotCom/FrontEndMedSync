// ============================================================
//  MedSync API — Camada de integração com o backend Java
//  Altere apenas BASE_URL para apontar para o seu servidor
// ============================================================

const BASE_URL = "http://localhost:8080";   // ← mude aqui

// ── Utilitário interno ──────────────────────────────────────
async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json();

  if (!res.ok || json.success === false) {
    const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data ?? json;
}

// ── Pacientes ───────────────────────────────────────────────
export const pacienteApi = {
  listar:   ()       => request("GET",    "/api/pacientes"),
  buscar:   (id)     => request("GET",    `/api/pacientes/${id}`),
  criar:    (body)   => request("POST",   "/api/pacientes", body),
  atualizar:(id, b)  => request("PUT",    `/api/pacientes/${id}`, b),
  remover:  (id)     => request("DELETE", `/api/pacientes/${id}`),
};

// ── Médicos ─────────────────────────────────────────────────
export const medicoApi = {
  listar:   (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v != null))
    ).toString();
    return request("GET", `/api/medicos${qs ? "?" + qs : ""}`);
  },
  buscar:   (id)     => request("GET",    `/api/medicos/${id}`),
  criar:    (body)   => request("POST",   "/api/medicos", body),
  atualizar:(id, b)  => request("PUT",    `/api/medicos/${id}`, b),
  remover:  (id)     => request("DELETE", `/api/medicos/${id}`),
};

// ── Especialidades ───────────────────────────────────────────
export const especialidadeApi = {
  listar:   ()       => request("GET",    "/api/especialidade"),
  buscar:   (id)     => request("GET",    `/api/especialidade/${id}`),
  criar:    (body)   => request("POST",   "/api/especialidade", body),
  atualizar:(id, b)  => request("PUT",    `/api/especialidade/${id}`, b),
  remover:  (id)     => request("DELETE", `/api/especialidade/${id}`),
};

// ── Disponibilidades ─────────────────────────────────────────
export const disponibilidadeApi = {
  listar:   (medicoId)        => request("GET",    `/api/medicos/${medicoId}/disponibilidades`),
  criar:    (medicoId, body)  => request("POST",   `/api/medicos/${medicoId}/disponibilidades`, body),
  remover:  (medicoId, id)    => request("DELETE", `/api/medicos/${medicoId}/disponibilidades/${id}`),
};

// ── Consultas ────────────────────────────────────────────────
export const consultaApi = {
  listar:          ()          => request("GET",    "/api/consultas"),
  buscar:          (id)        => request("GET",    `/api/consultas/${id}`),
  criar:           (body)      => request("POST",   "/api/consultas", body),
  atualizarStatus: (id, status)=> request("PATCH",  `/api/consultas/${id}/status`, { status }),
  cancelar:        (id)        => request("DELETE", `/api/consultas/${id}`),
};
