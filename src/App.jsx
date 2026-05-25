import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/api"; // ganti sesuai URL backend kamu

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function api(method, path, body = null, token = null) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data };
  return data;
}

// ─── ROLE HELPERS ─────────────────────────────────────────────────────────────
const hasRole = (user, role) => user?.roles?.includes(role);
const isAdmin = (u) => hasRole(u, "Admin");
const isGA = (u) => hasRole(u, "GA");
const isApprover = (u) => hasRole(u, "Approver");
const isAdminOrGA = (u) => isAdmin(u) || isGA(u);
const isAdminOrApprover = (u) => isAdmin(u) || isApprover(u);

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Available: "#22c55e", "In Use": "#f59e0b", Maintenance: "#ef4444", Retired: "#6b7280",
  Pending: "#f59e0b", Approved: "#22c55e", Rejected: "#ef4444",
  Completed: "#3b82f6", Cancelled: "#6b7280", Active: "#22c55e",
};
function Badge({ label }) {
  const color = STATUS_COLORS[label] || "#6b7280";
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
      letterSpacing: "0.03em", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--card)", borderRadius: 16, padding: "28px 32px",
        minWidth: 340, maxWidth: 520, width: "100%", maxHeight: "90vh",
        overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-display)", color: "var(--text)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── FORM COMPONENTS ─────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--input-bg)",
  color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};

function Input({ ...props }) {
  return <input style={inputStyle} {...props} />;
}

function Select({ children, ...props }) {
  return <select style={{ ...inputStyle, cursor: "pointer" }} {...props}>{children}</select>;
}

function Textarea({ ...props }) {
  return <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} {...props} />;
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
function Btn({ variant = "primary", children, style = {}, ...props }) {
  const base = {
    padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none", fontFamily: "inherit", transition: "opacity 0.15s",
    ...style,
  };
  const variants = {
    primary: { background: "var(--accent)", color: "#fff" },
    danger: { background: "#ef4444", color: "#fff" },
    success: { background: "#22c55e", color: "#fff" },
    ghost: { background: "var(--border)", color: "var(--text)" },
  };
  return <button style={{ ...base, ...variants[variant] }} {...props}>{children}</button>;
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
function Table({ cols, rows, onRow }) {
  if (!rows || rows.length === 0) {
    return <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>Tidak ada data.</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} style={{
                padding: "10px 14px", textAlign: "left", fontWeight: 700,
                borderBottom: "2px solid var(--border)", color: "var(--muted)",
                fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} onClick={() => onRow && onRow(row)} style={{
              borderBottom: "1px solid var(--border)",
              cursor: onRow ? "pointer" : "default",
              transition: "background 0.1s",
            }}
              onMouseEnter={(e) => onRow && (e.currentTarget.style.background = "var(--hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {cols.map((c) => (
                <td key={c.key} style={{ padding: "11px 14px", color: "var(--text)", verticalAlign: "middle" }}>
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────
function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.last_page <= 1) return null;
  const { current_page, last_page } = pagination;
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
      <Btn variant="ghost" onClick={() => onChange(current_page - 1)} disabled={current_page === 1} style={{ padding: "6px 14px", fontSize: 12 }}>← Prev</Btn>
      {Array.from({ length: last_page }, (_, i) => i + 1).filter(p => Math.abs(p - current_page) < 3).map(p => (
        <Btn key={p} variant={p === current_page ? "primary" : "ghost"} onClick={() => onChange(p)} style={{ padding: "6px 12px", fontSize: 12 }}>{p}</Btn>
      ))}
      <Btn variant="ghost" onClick={() => onChange(current_page + 1)} disabled={current_page === last_page} style={{ padding: "6px 14px", fontSize: 12 }}>Next →</Btn>
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 2000 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#ef4444" : "#22c55e",
          color: "#fff", padding: "12px 20px", borderRadius: 12,
          fontSize: 14, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          animation: "slideIn 0.2s ease",
          maxWidth: 320,
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

// ─── SECTION WRAPPER ─────────────────────────────────────────────────────────
function Section({ title, actions, children }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: "var(--font-display)", color: "var(--text)" }}>{title}</h2>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "var(--card)", borderRadius: 16, padding: 24,
      border: "1px solid var(--border)", ...style,
    }}>{children}</div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PAGES ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", password_confirmation: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      if (tab === "login") {
        const res = await api("POST", "/login", { email: form.email, password: form.password });
        onLogin(res.data.user, res.data.token);
      } else {
        const res = await api("POST", "/register", form);
        onLogin(res.data.user, res.data.token);
      }
    } catch (e) {
      setErr(e.data?.message || JSON.stringify(e.data?.errors || "Error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, background: "var(--accent)", borderRadius: 16,
            marginBottom: 16, fontSize: 24,
          }}>🚗</div>
          <h1 style={{ margin: 0, fontSize: 28, fontFamily: "var(--font-display)", color: "var(--text)" }}>OVMS</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>Online Vehicle Management System</p>
        </div>

        <Card>
          {/* Tabs */}
          <div style={{ display: "flex", marginBottom: 24, background: "var(--input-bg)", borderRadius: 10, padding: 4 }}>
            {["login", "register"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "8px", border: "none", cursor: "pointer", borderRadius: 8,
                background: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "#fff" : "var(--muted)",
                fontWeight: 600, fontSize: 14, fontFamily: "inherit", transition: "all 0.2s",
              }}>{t === "login" ? "Masuk" : "Daftar"}</button>
            ))}
          </div>

          {tab === "register" && (
            <Field label="Nama Lengkap">
              <Input value={form.name} onChange={set("name")} placeholder="John Doe" />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set("email")} placeholder="email@perusahaan.com" />
          </Field>
          <Field label="Password">
            <Input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
          </Field>
          {tab === "register" && (
            <Field label="Konfirmasi Password">
              <Input type="password" value={form.password_confirmation} onChange={set("password_confirmation")} placeholder="••••••••" />
            </Field>
          )}
          {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <Btn onClick={submit} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: 15 }}>
            {loading ? "Memproses..." : tab === "login" ? "Masuk" : "Daftar Sekarang"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [vRes, rRes] = await Promise.all([
          api("GET", "/vehicles?per_page=100", null, token),
          api("GET", "/requests?per_page=100", null, token),
        ]);
        const vehicles = vRes.data || [];
        const requests = rRes.data || [];
        setStats({
          totalVehicles: vehicles.length,
          availableVehicles: vehicles.filter((v) => v.status === "Available").length,
          inUseVehicles: vehicles.filter((v) => v.status === "In Use").length,
          pendingRequests: requests.filter((r) => r.status === "Pending").length,
          myRequests: requests.length,
        });
      } catch {}
    }
    load();
  }, [token]);

  const statCards = [
    { label: "Total Kendaraan", value: stats?.totalVehicles ?? "—", icon: "🚗", color: "#3b82f6" },
    { label: "Tersedia", value: stats?.availableVehicles ?? "—", icon: "✅", color: "#22c55e" },
    { label: "Sedang Dipakai", value: stats?.inUseVehicles ?? "—", icon: "🔑", color: "#f59e0b" },
    { label: "Request Pending", value: stats?.pendingRequests ?? "—", icon: "⏳", color: "#8b5cf6" },
  ];

  return (
    <Section title={`Selamat datang, ${user.name} 👋`}>
      <p style={{ color: "var(--muted)", marginTop: -8, marginBottom: 24, fontSize: 14 }}>
        Role kamu: {user.roles?.join(", ") || "—"}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {statCards.map((s) => (
          <Card key={s.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: s.color + "22", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 22, flexShrink: 0,
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

// ── VEHICLES PAGE ─────────────────────────────────────────────────────────────
function VehiclesPage() {
  const { user, token, toast } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | {mode:'create'|'edit'|'view', data?}
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    try {
      const params = new URLSearchParams({ page: p, per_page: 10 });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api("GET", `/vehicles?${params}`, null, token);
      setVehicles(res.data || []);
      setPagination(res.pagination);
    } catch (e) { toast("Gagal memuat kendaraan", "error"); }
  }, [token, search, statusFilter, toast]);

  useEffect(() => { load(page); }, [load, page]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setLoading(true);
    try {
      if (modal.mode === "create") {
        await api("POST", "/vehicles", form, token);
        toast("Kendaraan berhasil ditambahkan");
      } else {
        await api("PUT", `/vehicles/${modal.data.id}`, form, token);
        toast("Kendaraan berhasil diperbarui");
      }
      setModal(null); load(page);
    } catch (e) {
      toast(e.data?.message || JSON.stringify(e.data?.errors || "Error"), "error");
    } finally { setLoading(false); }
  }

  async function destroy(v) {
    if (!confirm(`Hapus kendaraan ${v.name}?`)) return;
    try {
      await api("DELETE", `/vehicles/${v.id}`, null, token);
      toast("Kendaraan berhasil dihapus");
      load(page);
    } catch (e) { toast(e.data?.message || "Gagal menghapus", "error"); }
  }

  const canManage = isAdminOrGA(user);

  const cols = [
    { key: "name", label: "Nama" },
    { key: "plate_number", label: "Plat" },
    { key: "type", label: "Tipe" },
    { key: "capacity", label: "Kapasitas", render: (r) => r.capacity ? `${r.capacity} org` : "—" },
    { key: "status", label: "Status", render: (r) => <Badge label={r.status} /> },
    {
      key: "actions", label: "Aksi",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="ghost" style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); setModal({ mode: "view", data: r }); }}>Detail</Btn>
          {canManage && <>
            <Btn variant="ghost" style={{ padding: "5px 12px", fontSize: 12 }}
              onClick={(e) => { e.stopPropagation(); setForm(r); setModal({ mode: "edit", data: r }); }}>Edit</Btn>
            {isAdmin(user) && <Btn variant="danger" style={{ padding: "5px 12px", fontSize: 12 }}
              onClick={(e) => { e.stopPropagation(); destroy(r); }}>Hapus</Btn>}
          </>}
        </div>
      ),
    },
  ];

  return (
    <Section
      title="Manajemen Kendaraan"
      actions={canManage && [
        <Btn key="add" onClick={() => { setForm({ status: "Available" }); setModal({ mode: "create" }); }}>+ Tambah Kendaraan</Btn>
      ]}
    >
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Input style={{ ...inputStyle, flex: 1, minWidth: 180 }} placeholder="Cari nama / plat / tipe..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
            <option value="">Semua Status</option>
            {["Available", "In Use", "Maintenance", "Retired"].map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Btn variant="ghost" onClick={() => load(1)}>Cari</Btn>
        </div>
      </Card>

      <Card>
        <Table cols={cols} rows={vehicles} />
        <Pagination pagination={pagination} onChange={(p) => { setPage(p); load(p); }} />
      </Card>

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Tambah Kendaraan" : modal.mode === "edit" ? "Edit Kendaraan" : "Detail Kendaraan"}
          onClose={() => setModal(null)}
        >
          {modal.mode === "view" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Nama", modal.data.name], ["Plat Nomor", modal.data.plate_number], ["Tipe", modal.data.type],
                ["Kapasitas", modal.data.capacity], ["Status", modal.data.status], ["Terakhir Servis", modal.data.last_maintained]
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{k}</span>
                  <span style={{ fontWeight: 600, color: "var(--text)", fontSize: 13 }}>
                    {k === "Status" ? <Badge label={v} /> : v || "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Field label="Nama Kendaraan"><Input value={form.name || ""} onChange={set("name")} placeholder="Toyota Avanza" /></Field>
              <Field label="Plat Nomor"><Input value={form.plate_number || ""} onChange={set("plate_number")} placeholder="B 1234 XYZ" /></Field>
              <Field label="Tipe"><Input value={form.type || ""} onChange={set("type")} placeholder="MPV" /></Field>
              <Field label="Kapasitas"><Input type="number" value={form.capacity || ""} onChange={set("capacity")} placeholder="7" /></Field>
              <Field label="Status">
                <Select value={form.status || "Available"} onChange={set("status")}>
                  {["Available", "In Use", "Maintenance", "Retired"].map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Terakhir Servis"><Input type="date" value={form.last_maintained || ""} onChange={set("last_maintained")} /></Field>
              <Btn onClick={save} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Btn>
            </>
          )}
        </Modal>
      )}
    </Section>
  );
}

// ── REQUESTS PAGE ─────────────────────────────────────────────────────────────
function RequestsPage() {
  const { user, token, toast } = useAuth();
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({});
  const [rejectNotes, setRejectNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    try {
      const params = new URLSearchParams({ page: p, per_page: 10 });
      if (statusFilter) params.set("status", statusFilter);
      const res = await api("GET", `/requests?${params}`, null, token);
      setRequests(res.data || []);
      setPagination(res.pagination);
    } catch { toast("Gagal memuat request", "error"); }
  }, [token, statusFilter, toast]);

  useEffect(() => {
    load(page);
    api("GET", "/vehicles?per_page=100&status=Available", null, token)
      .then((r) => setVehicles(r.data || []))
      .catch(() => {});
  }, [load, page, token]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create() {
    setLoading(true);
    try {
      await api("POST", "/requests", form, token);
      toast("Permintaan berhasil diajukan");
      setModal(null); load(page);
    } catch (e) {
      toast(e.data?.message || JSON.stringify(e.data?.errors || "Error"), "error");
    } finally { setLoading(false); }
  }

  async function approve(id) {
    try {
      await api("POST", `/requests/${id}/approve`, null, token);
      toast("Permintaan disetujui");
      load(page);
    } catch (e) { toast(e.data?.message || "Gagal", "error"); }
  }

  async function reject(id) {
    if (!rejectNotes.trim()) { toast("Isi alasan penolakan!", "error"); return; }
    try {
      await api("POST", `/requests/${id}/reject`, { notes: rejectNotes }, token);
      toast("Permintaan ditolak");
      setModal(null); load(page);
    } catch (e) { toast(e.data?.message || "Gagal", "error"); }
  }

  const cols = [
    { key: "purpose", label: "Tujuan", render: (r) => <span style={{ fontWeight: 500 }}>{r.purpose}</span> },
    { key: "requested_by", label: "Pemohon", render: (r) => r.requested_by?.name || "—" },
    { key: "vehicle", label: "Kendaraan", render: (r) => r.vehicle ? `${r.vehicle.name} (${r.vehicle.plate_number})` : "—" },
    { key: "start_time", label: "Mulai", render: (r) => r.start_time ? new Date(r.start_time).toLocaleDateString("id-ID") : "—" },
    { key: "status", label: "Status", render: (r) => <Badge label={r.status} /> },
    {
      key: "actions", label: "Aksi",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="ghost" style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); setModal({ mode: "view", data: r }); }}>Detail</Btn>
          {isAdminOrApprover(user) && r.status === "Pending" && (
            <>
              <Btn variant="success" style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={(e) => { e.stopPropagation(); approve(r.id); }}>Setuju</Btn>
              <Btn variant="danger" style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={(e) => { e.stopPropagation(); setRejectNotes(""); setModal({ mode: "reject", data: r }); }}>Tolak</Btn>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Section
      title="Permintaan Kendaraan"
      actions={[
        <Btn key="create" onClick={() => { setForm({}); setModal({ mode: "create" }); }}>+ Buat Request</Btn>
      ]}
    >
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
            <option value="">Semua Status</option>
            {["Pending", "Approved", "Rejected", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Btn variant="ghost" onClick={() => load(1)}>Filter</Btn>
        </div>
      </Card>

      <Card>
        <Table cols={cols} rows={requests} />
        <Pagination pagination={pagination} onChange={(p) => { setPage(p); load(p); }} />
      </Card>

      {modal?.mode === "create" && (
        <Modal title="Buat Permintaan Kendaraan" onClose={() => setModal(null)}>
          <Field label="Tujuan / Keperluan">
            <Textarea value={form.purpose || ""} onChange={set("purpose")} placeholder="Perjalanan dinas ke klien..." />
          </Field>
          <Field label="Kendaraan (opsional)">
            <Select value={form.vehicle_id || ""} onChange={set("vehicle_id")}>
              <option value="">-- Pilih Kendaraan --</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} - {v.plate_number}</option>)}
            </Select>
          </Field>
          <Field label="Waktu Mulai">
            <Input type="datetime-local" value={form.start_time || ""} onChange={set("start_time")} />
          </Field>
          <Field label="Waktu Selesai">
            <Input type="datetime-local" value={form.end_time || ""} onChange={set("end_time")} />
          </Field>
          <Field label="Catatan">
            <Textarea value={form.notes || ""} onChange={set("notes")} placeholder="Informasi tambahan..." />
          </Field>
          <Btn onClick={create} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Mengirim..." : "Kirim Permintaan"}
          </Btn>
        </Modal>
      )}

      {modal?.mode === "view" && (
        <Modal title="Detail Permintaan" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Pemohon", modal.data.requested_by?.name],
              ["Tujuan", modal.data.purpose],
              ["Kendaraan", modal.data.vehicle ? `${modal.data.vehicle.name} (${modal.data.vehicle.plate_number})` : "—"],
              ["Waktu Mulai", modal.data.start_time ? new Date(modal.data.start_time).toLocaleString("id-ID") : "—"],
              ["Waktu Selesai", modal.data.end_time ? new Date(modal.data.end_time).toLocaleString("id-ID") : "—"],
              ["Status", modal.data.status],
              ["Disetujui Oleh", modal.data.approved_by?.name || "—"],
              ["Catatan", modal.data.notes || "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 8, gap: 12 }}>
                <span style={{ color: "var(--muted)", fontSize: 13, flexShrink: 0 }}>{k}</span>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, textAlign: "right" }}>
                  {k === "Status" ? <Badge label={v} /> : v || "—"}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal?.mode === "reject" && (
        <Modal title="Tolak Permintaan" onClose={() => setModal(null)}>
          <p style={{ color: "var(--muted)", marginTop: 0, fontSize: 14 }}>
            Permintaan dari <strong>{modal.data.requested_by?.name}</strong>: "{modal.data.purpose}"
          </p>
          <Field label="Alasan Penolakan *">
            <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Tulis alasan penolakan..." />
          </Field>
          <Btn variant="danger" onClick={() => reject(modal.data.id)} style={{ width: "100%" }}>Konfirmasi Tolak</Btn>
        </Modal>
      )}
    </Section>
  );
}

// ── ASSIGNMENTS PAGE ──────────────────────────────────────────────────────────
function AssignmentsPage() {
  const { user, token, toast } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    try {
      const params = new URLSearchParams({ page: p, per_page: 10 });
      if (statusFilter) params.set("status", statusFilter);
      const res = await api("GET", `/assignments?${params}`, null, token);
      setAssignments(res.data || []);
      setPagination(res.pagination);
    } catch { toast("Gagal memuat assignment", "error"); }
  }, [token, statusFilter, toast]);

  useEffect(() => { load(page); }, [load, page]);

  async function openCreate() {
    try {
      const [rRes, vRes, uRes] = await Promise.all([
        api("GET", "/requests?status=Approved&per_page=100", null, token),
        api("GET", "/vehicles?status=Available&per_page=100", null, token),
        api("GET", "/users?per_page=100", null, token),
      ]);
      setApprovedRequests(rRes.data || []);
      setAvailableVehicles(vRes.data || []);
      const allUsers = uRes.data || [];
      setDrivers(allUsers.filter((u) => u.roles?.includes("Driver")));
    } catch {}
    setForm({ assigned_at: new Date().toISOString().slice(0, 16) });
    setModal({ mode: "create" });
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create() {
    setLoading(true);
    try {
      await api("POST", "/assignments", form, token);
      toast("Kendaraan berhasil di-assign");
      setModal(null); load(page);
    } catch (e) {
      toast(e.data?.message || JSON.stringify(e.data?.errors || "Error"), "error");
    } finally { setLoading(false); }
  }

  async function returnVehicle(a) {
    const returned_at = prompt("Masukkan waktu pengembalian (YYYY-MM-DDTHH:mm):", new Date().toISOString().slice(0, 16));
    if (!returned_at) return;
    try {
      await api("PUT", `/assignments/${a.id}`, { returned_at }, token);
      toast("Kendaraan berhasil dikembalikan");
      load(page);
    } catch (e) { toast(e.data?.message || "Gagal", "error"); }
  }

  async function cancel(a) {
    if (!confirm("Batalkan assignment ini?")) return;
    try {
      await api("POST", `/assignments/${a.id}/cancel`, null, token);
      toast("Assignment dibatalkan");
      load(page);
    } catch (e) { toast(e.data?.message || "Gagal", "error"); }
  }

  const cols = [
    { key: "vehicle", label: "Kendaraan", render: (r) => r.vehicle ? `${r.vehicle.name} (${r.vehicle.plate_number})` : "—" },
    { key: "driver", label: "Driver", render: (r) => r.driver?.name || "—" },
    { key: "request", label: "Tujuan", render: (r) => r.request?.purpose || "—" },
    { key: "assigned_at", label: "Tanggal Mulai", render: (r) => r.assigned_at ? new Date(r.assigned_at).toLocaleDateString("id-ID") : "—" },
    { key: "status", label: "Status", render: (r) => <Badge label={r.status} /> },
    {
      key: "actions", label: "Aksi",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }}>
          {isAdminOrGA(user) && r.status === "Active" && (
            <>
              <Btn variant="success" style={{ padding: "5px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); returnVehicle(r); }}>Kembalikan</Btn>
              <Btn variant="danger" style={{ padding: "5px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); cancel(r); }}>Batal</Btn>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Section
      title="Penugasan Kendaraan"
      actions={isAdminOrGA(user) && [<Btn key="add" onClick={openCreate}>+ Buat Assignment</Btn>]}
    >
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
            <option value="">Semua Status</option>
            {["Active", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Btn variant="ghost" onClick={() => load(1)}>Filter</Btn>
        </div>
      </Card>

      <Card>
        <Table cols={cols} rows={assignments} />
        <Pagination pagination={pagination} onChange={(p) => { setPage(p); load(p); }} />
      </Card>

      {modal?.mode === "create" && (
        <Modal title="Buat Assignment Kendaraan" onClose={() => setModal(null)}>
          <Field label="Request yang Disetujui">
            <Select value={form.request_id || ""} onChange={set("request_id")}>
              <option value="">-- Pilih Request --</option>
              {approvedRequests.map((r) => <option key={r.id} value={r.id}>{r.purpose} — {r.requested_by?.name}</option>)}
            </Select>
          </Field>
          <Field label="Kendaraan Tersedia">
            <Select value={form.vehicle_id || ""} onChange={set("vehicle_id")}>
              <option value="">-- Pilih Kendaraan --</option>
              {availableVehicles.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.plate_number}</option>)}
            </Select>
          </Field>
          <Field label="Driver">
            <Select value={form.driver_id || ""} onChange={set("driver_id")}>
              <option value="">-- Pilih Driver --</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Tanggal Mulai">
            <Input type="datetime-local" value={form.assigned_at || ""} onChange={set("assigned_at")} />
          </Field>
          <Field label="Catatan">
            <Textarea value={form.notes || ""} onChange={set("notes")} placeholder="Catatan tambahan..." />
          </Field>
          <Btn onClick={create} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Menyimpan..." : "Buat Assignment"}
          </Btn>
        </Modal>
      )}
    </Section>
  );
}

// ── USERS PAGE ────────────────────────────────────────────────────────────────
function UsersPage() {
  const { user, token, toast } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    try {
      const res = await api("GET", `/users?page=${p}&per_page=10`, null, token);
      setUsers(res.data || []);
      setPagination(res.pagination);
    } catch { toast("Gagal memuat users", "error"); }
  }, [token, toast]);

  useEffect(() => { load(page); }, [load, page]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setLoading(true);
    try {
      if (modal.mode === "create") {
        await api("POST", "/users", form, token);
        toast("User berhasil dibuat");
      } else {
        await api("PUT", `/users/${modal.data.id}`, form, token);
        toast("User berhasil diperbarui");
      }
      setModal(null); load(page);
    } catch (e) {
      toast(e.data?.message || JSON.stringify(e.data?.errors || "Error"), "error");
    } finally { setLoading(false); }
  }

  async function destroy(u) {
    if (!confirm(`Hapus user ${u.name}?`)) return;
    try {
      await api("DELETE", `/users/${u.id}`, null, token);
      toast("User berhasil dihapus");
      load(page);
    } catch (e) { toast(e.data?.message || "Gagal", "error"); }
  }

  if (!isAdmin(user)) return <p style={{ color: "var(--muted)" }}>Akses ditolak. Hanya Admin.</p>;

  const cols = [
    { key: "name", label: "Nama" },
    { key: "email", label: "Email" },
    { key: "roles", label: "Role", render: (r) => (r.roles || []).join(", ") || "—" },
    {
      key: "actions", label: "Aksi",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="ghost" style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); setForm({ ...r, role: r.roles?.[0] }); setModal({ mode: "edit", data: r }); }}>Edit</Btn>
          <Btn variant="danger" style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); destroy(r); }}>Hapus</Btn>
        </div>
      ),
    },
  ];

  return (
    <Section
      title="Manajemen User"
      actions={[<Btn key="add" onClick={() => { setForm({ role: "Employee" }); setModal({ mode: "create" }); }}>+ Tambah User</Btn>]}
    >
      <Card>
        <Table cols={cols} rows={users} />
        <Pagination pagination={pagination} onChange={(p) => { setPage(p); load(p); }} />
      </Card>

      {modal && (
        <Modal title={modal.mode === "create" ? "Tambah User" : "Edit User"} onClose={() => setModal(null)}>
          <Field label="Nama"><Input value={form.name || ""} onChange={set("name")} placeholder="John Doe" /></Field>
          <Field label="Email"><Input type="email" value={form.email || ""} onChange={set("email")} placeholder="john@example.com" /></Field>
          {modal.mode === "create" && (
            <>
              <Field label="Password"><Input type="password" value={form.password || ""} onChange={set("password")} /></Field>
              <Field label="Konfirmasi Password"><Input type="password" value={form.password_confirmation || ""} onChange={set("password_confirmation")} /></Field>
            </>
          )}
          <Field label="Role">
            <Select value={form.role || "Employee"} onChange={set("role")}>
              {["Admin", "GA", "Approver", "Employee", "Driver"].map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Btn onClick={save} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Btn>
        </Modal>
      )}
    </Section>
  );
}

// ── AUDIT LOGS PAGE ───────────────────────────────────────────────────────────
function AuditLogsPage() {
  const { user, token, toast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async (p = 1) => {
    try {
      const endpoint = isAdmin(user) ? `/audit-logs?page=${p}&per_page=15` : `/my-activities?page=${p}&per_page=15`;
      const res = await api("GET", endpoint, null, token);
      setLogs(res.data || []);
      setPagination(res.pagination);
    } catch { toast("Gagal memuat audit log", "error"); }
  }, [token, user, toast]);

  useEffect(() => { load(page); }, [load, page]);

  const cols = [
    { key: "action", label: "Aksi", render: (r) => <span style={{ fontWeight: 600 }}>{r.action}</span> },
    { key: "model_type", label: "Model" },
    { key: "description", label: "Deskripsi" },
    { key: "user", label: "Oleh", render: (r) => r.user?.name || "—" },
    { key: "created_at", label: "Waktu", render: (r) => r.created_at ? new Date(r.created_at).toLocaleString("id-ID") : "—" },
  ];

  return (
    <Section title={isAdmin(user) ? "Audit Log" : "Aktivitas Saya"}>
      <Card>
        <Table cols={cols} rows={logs} />
        <Pagination pagination={pagination} onChange={(p) => { setPage(p); load(p); }} />
      </Card>
    </Section>
  );
}

// ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "vehicles", label: "Kendaraan", icon: "🚗" },
  { id: "requests", label: "Permintaan", icon: "📋" },
  { id: "assignments", label: "Penugasan", icon: "🔑" },
  { id: "users", label: "Users", icon: "👥", adminOnly: true },
  { id: "audit", label: "Audit Log", icon: "📜" },
];

function Sidebar({ page, setPage, user, onLogout, collapsed, setCollapsed }) {
  return (
    <div style={{
      width: collapsed ? 64 : 230, flexShrink: 0,
      background: "var(--sidebar)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", transition: "width 0.2s",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 16px", display: "flex", alignItems: "center",
        gap: 12, borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          width: 36, height: 36, background: "var(--accent)", borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>🚗</div>
        {!collapsed && <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>OVMS</span>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin(user)).map((n) => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            display: "flex", alignItems: "center", gap: 12,
            width: "100%", padding: "10px 12px", border: "none", borderRadius: 10,
            background: page === n.id ? "var(--accent)" : "transparent",
            color: page === n.id ? "#fff" : "var(--muted)",
            cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 14,
            transition: "all 0.15s", marginBottom: 2, textAlign: "left",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
            {!collapsed && <span>{n.label}</span>}
          </button>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
        {!collapsed && (
          <div style={{ padding: "8px 12px", marginBottom: 8, background: "var(--input-bg)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{user.roles?.join(", ")}</div>
          </div>
        )}
        <button onClick={onLogout} style={{
          width: "100%", padding: "9px 12px", border: "none", borderRadius: 10,
          background: "#ef444422", color: "#ef4444", cursor: "pointer",
          fontWeight: 600, fontSize: 13, fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 8, justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <span>🚪</span>{!collapsed && "Keluar"}
        </button>
        <button onClick={() => setCollapsed((c) => !c)} style={{
          width: "100%", marginTop: 6, padding: "7px", border: "none", borderRadius: 10,
          background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 16,
        }}>{collapsed ? "→" : "←"}</button>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ovms_user") || "null"); } catch { return null; }
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("ovms_token") || "");
  const [page, setPage] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("ovms_dark") === "true");

  const toast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  function handleLogin(user, token) {
    setAuthUser(user);
    setAuthToken(token);
    localStorage.setItem("ovms_user", JSON.stringify(user));
    localStorage.setItem("ovms_token", token);
    setPage("dashboard");
  }

  async function handleLogout() {
    try { await api("POST", "/logout", null, authToken); } catch {}
    setAuthUser(null); setAuthToken("");
    localStorage.removeItem("ovms_user");
    localStorage.removeItem("ovms_token");
  }

  function toggleDark() {
    const nd = !dark;
    setDark(nd);
    localStorage.setItem("ovms_dark", String(nd));
  }

  const pageMap = {
    dashboard: <Dashboard />,
    vehicles: <VehiclesPage />,
    requests: <RequestsPage />,
    assignments: <AssignmentsPage />,
    users: <UsersPage />,
    audit: <AuditLogsPage />,
  };

  if (!authUser) {
    return (
      <>
        <Styles dark={dark} />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <AuthContext.Provider value={{ user: authUser, token: authToken, toast }}>
      <Styles dark={dark} />
      <div style={{ display: "flex", height: "100vh", background: "var(--bg)", fontFamily: "var(--font-body)", overflow: "hidden" }}>
        <Sidebar page={page} setPage={setPage} user={authUser} onLogout={handleLogout} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

        <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {/* Top bar */}
          <div style={{
            height: 56, borderBottom: "1px solid var(--border)", display: "flex",
            alignItems: "center", padding: "0 24px", gap: 12, background: "var(--card)",
            flexShrink: 0,
          }}>
            <span style={{ flex: 1, color: "var(--muted)", fontSize: 13 }}>
              {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
            <button onClick={toggleDark} style={{
              background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8,
              padding: "5px 10px", cursor: "pointer", fontSize: 16,
            }}>{dark ? "☀️" : "🌙"}</button>
          </div>

          <div style={{ padding: 28, flex: 1 }}>
            {pageMap[page] || <Dashboard />}
          </div>
        </main>

        <Toast toasts={toasts} />
      </div>
    </AuthContext.Provider>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
function Styles({ dark }) {
  const light = {
    "--bg": "#f4f6fb", "--card": "#ffffff", "--sidebar": "#ffffff",
    "--text": "#1a1d27", "--muted": "#6b7280", "--border": "#e5e7eb",
    "--accent": "#2563eb", "--input-bg": "#f9fafb", "--hover": "#f0f4ff",
    "--font-display": "'Georgia', serif", "--font-body": "'Segoe UI', system-ui, sans-serif",
  };
  const darkTheme = {
    "--bg": "#0f1117", "--card": "#1a1d27", "--sidebar": "#151821",
    "--text": "#e8eaf0", "--muted": "#8892a4", "--border": "#2a2f3e",
    "--accent": "#3b82f6", "--input-bg": "#20243a", "--hover": "#232840",
    "--font-display": "'Georgia', serif", "--font-body": "'Segoe UI', system-ui, sans-serif",
  };
  const theme = dark ? darkTheme : light;
  const vars = Object.entries(theme).map(([k, v]) => `${k}:${v}`).join(";");
  return (
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0}
      :root{${vars}}
      body{background:var(--bg);color:var(--text);font-family:var(--font-body)}
      input,select,textarea{font-family:inherit;transition:border-color .15s}
      input:focus,select:focus,textarea:focus{border-color:var(--accent)!important;outline:none}
      button:disabled{opacity:.5;cursor:not-allowed}
      ::-webkit-scrollbar{width:6px;height:6px}
      ::-webkit-scrollbar-track{background:var(--bg)}
      ::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}
      @keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
    `}</style>
  );
}
