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

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  // Vehicle
  Available: "#22c55e", "In Use": "#f59e0b", Maintenance: "#ef4444", Retired: "#6b7280",
  // Request
  submitted: "#f59e0b",
  pending: "#f59e0b",
  approved_department: "#3b82f6",
  approved_hrd_ga: "#0ea5e9",
  fully_approved: "#22c55e",
  waiting_driver: "#f59e0b",
  driver_assigned: "#8b5cf6",
  on_going: "#f97316",
  rejected: "#ef4444",
  cancelled: "#6b7280",
  completed: "#10b981",
  // Assignment
  pending_driver: "#f59e0b",
  accepted: "#22c55e",
  rejected_driver: "#ef4444",
  // Priority
  normal: "#6b7280",
  urgent: "#f59e0b",
  critical: "#ef4444",
};

const STATUS_LABELS = {
  submitted: "Menunggu Dept Head",
  pending: "Menunggu Dept Head",
  approved_department: "Menunggu HRD",
  approved_hrd_ga: "Disetujui HRD",
  fully_approved: "Fully Approved",
  waiting_driver: "Menunggu Driver",
  driver_assigned: "Driver Ditugaskan",
  on_going: "Sedang Berjalan",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  completed: "Selesai",
  pending_driver: "Menunggu Driver",
  accepted: "Driver Menerima",
  // Priority labels
  normal: "Normal",
  urgent: "Urgent",
  critical: "Critical",
};
function Badge({ label }) {
  const color = STATUS_COLORS[label] || "#6b7280";
  const display = STATUS_LABELS[label] || label;
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
      letterSpacing: "0.03em", whiteSpace: "nowrap",
    }}>{display}</span>
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
          pendingRequests: requests.filter((r) => ["pending", "approved_department"].includes(r.status)).length,
          myRequests: requests.length,
        });
      } catch (e) {
        console.error(e);
      }
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
    } catch { toast("Gagal memuat kendaraan", "error"); }
  }, [token, search, statusFilter, toast]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load(page);
    });
    return () => { active = false; };
  }, [load, page]);

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
    let active = true;
    Promise.resolve().then(() => {
      if (active) load(page);
    });
    return () => { active = false; };
  }, [load, page]);

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

  // Determine which approval role the current user should act as
  function getApprovalRole(request) {
    const status = typeof request.status === 'object' ? request.status?.value || request.status : request.status;
    if ((status === "submitted" || status === "pending") && (isAdmin(user) || isApprover(user))) return "dept_head";
    if (status === "approved_department" && (isAdmin(user) || isGA(user))) return "hrd_head";
    return null;
  }

  async function approve(req) {
    const role = getApprovalRole(req);
    if (!role) return;
    try {
      await api("POST", `/requests/${req.id}/approve`, { role, notes: "" }, token);
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

  async function startTrip(reqId) {
    try {
      await api("POST", `/requests/${reqId}/start`, null, token);
      toast("Perjalanan telah dimulai!");
      load(page);
      setModal(null);
    } catch (e) {
      toast(e.data?.message || "Gagal memulai perjalanan", "error");
    }
  }

  async function completeTrip(reqId) {
    try {
      await api("POST", `/requests/${reqId}/complete`, null, token);
      toast("Perjalanan telah selesai!");
      load(page);
      setModal(null);
    } catch (e) {
      toast(e.data?.message || "Gagal menyelesaikan perjalanan", "error");
    }
  }

  const cols = [
    { key: "purpose", label: "Keperluan", render: (r) => <span style={{ fontWeight: 500 }}>{r.purpose}</span> },
    { key: "requested_by", label: "Pemohon", render: (r) => r.requested_by?.name || "—" },
    { key: "destination_city", label: "Kota Tujuan", render: (r) => r.destination_city || "—" },
    { key: "start_time", label: "Berangkat", render: (r) => r.start_time ? new Date(r.start_time).toLocaleDateString("id-ID") : "—" },
    { key: "status", label: "Status", render: (r) => <Badge label={r.status} /> },
    {
      key: "actions", label: "Aksi",
      render: (r) => {
        const approvalRole = getApprovalRole(r);
        return (
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" style={{ padding: "5px 12px", fontSize: 12 }}
              onClick={(e) => { e.stopPropagation(); setModal({ mode: "view", data: r }); }}>Detail</Btn>
            {approvalRole && (
              <>
                <Btn variant="success" style={{ padding: "5px 12px", fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); approve(r); }}>Setuju</Btn>
                <Btn variant="danger" style={{ padding: "5px 12px", fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); setRejectNotes(""); setModal({ mode: "reject", data: r }); }}>Tolak</Btn>
              </>
            )}
          </div>
        );
      },
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
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 200 }}>
            <option value="">Semua Status</option>
            <option value="submitted">Menunggu Dept Head</option>
            <option value="approved_department">Menunggu HRD</option>
            <option value="approved_hrd_ga">Disetujui HRD Head</option>
            <option value="waiting_driver">Menunggu Driver</option>
            <option value="driver_assigned">Driver Ditugaskan</option>
            <option value="on_going">Sedang Berjalan</option>
            <option value="rejected">Ditolak</option>
            <option value="completed">Selesai</option>
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
          <Field label="Departemen">
            <Select value={form.department_id || ""} onChange={set("department_id")}>
              <option value="">-- Pilih Departemen --</option>
              <option value="IT">IT</option>
              <option value="FA">FA</option>
              <option value="HR&GA">HRD &amp; GA</option>
              <option value="PRODUCTION">Produksi</option>
              <option value="QC">QC</option>
              <option value="QA">QA</option>
            </Select>
          </Field>
          <Field label="Kota Tujuan">
            <Input value={form.destination_city || ""} onChange={set("destination_city")} placeholder="Contoh: Jakarta" />
          </Field>
          <Field label="Tempat Tujuan">
            <Input value={form.destination_place || ""} onChange={set("destination_place")} placeholder="Contoh: Kantor Pusat Sudirman" />
          </Field>
          <Field label="Keperluan / Agenda">
            <Textarea value={form.purpose || ""} onChange={set("purpose")} placeholder="Meting dengan klien..." />
          </Field>
          
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Jml Penumpang">
                <Input type="number" value={form.passenger_count || ""} onChange={set("passenger_count")} placeholder="1" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Prioritas">
                <Select value={form.priority || "normal"} onChange={set("priority")}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </Select>
              </Field>
            </div>
          </div>

          <Field label="Waktu Mulai">
            <Input type="datetime-local" value={form.start_time || ""} onChange={set("start_time")} />
          </Field>
          <Field label="Waktu Selesai (Opsional)">
            <Input type="datetime-local" value={form.end_time || ""} onChange={set("end_time")} />
          </Field>
          <Field label="Catatan Tambahan">
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
              ["Departemen", modal.data.department_id || "—"],
              ["Kota Tujuan", modal.data.destination_city || "—"],
              ["Tempat Tujuan", modal.data.destination_place || "—"],
              ["Keperluan", modal.data.purpose],
              ["Jumlah Penumpang", modal.data.passenger_count ? `${modal.data.passenger_count} orang` : "—"],
              ["Prioritas", modal.data.priority],
              ["Waktu Berangkat", modal.data.start_time ? new Date(modal.data.start_time).toLocaleString("id-ID") : "—"],
              ["Waktu Selesai", modal.data.end_time ? new Date(modal.data.end_time).toLocaleString("id-ID") : "—"],
              ["Status", modal.data.status],
              ["Catatan", modal.data.notes || "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 8, gap: 12 }}>
                <span style={{ color: "var(--muted)", fontSize: 13, flexShrink: 0 }}>{k}</span>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, textAlign: "right" }}>
                  {(k === "Status" || k === "Prioritas") ? <Badge label={v} /> : v || "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Approval History */}
          {modal.data.approvals?.length > 0 && (
            <>
              <div style={{ marginTop: 20, marginBottom: 8, fontWeight: 700, fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Riwayat Approval</div>
              {modal.data.approvals.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.approver?.name || "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.role === "dept_head" ? "Kepala Dept" : "HRD Head"}</div>
                    {a.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Catatan: {a.notes}</div>}
                  </div>
                  <Badge label={a.status} />
                </div>
              ))}
            </>
          )}

          {/* Operational Trip & Driver Assignment Info */}
          {modal.data.operational_trip && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--hover)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>🚗 Informasi Kendaraan & Driver</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Nama Driver", modal.data.operational_trip.driver?.name || "—"],
                  ["Nama Kendaraan", modal.data.operational_trip.vehicle?.name || "—"],
                  ["Plat Nomor", modal.data.operational_trip.vehicle?.plate_number || "—"],
                  ["Tipe Kendaraan", modal.data.operational_trip.vehicle?.type || "—"],
                  ["Status Perjalanan", modal.data.operational_trip.status === "scheduled" ? "Terjadwal" : modal.data.operational_trip.status === "on_going" ? "Sedang Berjalan" : modal.data.operational_trip.status === "completed" ? "Selesai" : modal.data.operational_trip.status],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>{k}</span>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approve/Reject buttons inside detail modal */}
          {(() => { const role = getApprovalRole(modal.data); return role && (
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Btn variant="success" style={{ flex: 1 }} onClick={() => { approve(modal.data); setModal(null); }}>✓ Setujui</Btn>
              <Btn variant="danger" style={{ flex: 1 }} onClick={() => { setRejectNotes(""); setModal({ mode: "reject", data: modal.data }); }}>✗ Tolak</Btn>
            </div>
          ); })()}

          {/* Driver trip start/complete buttons inside detail modal */}
          {(() => {
            const statusVal = typeof modal.data.status === 'object' ? modal.data.status?.value || modal.data.status : modal.data.status;
            const isAssignedDriver = user.id === modal.data.operational_trip?.driver?.id || user.roles?.includes("Admin") || user.roles?.includes("GA");
            if (isAssignedDriver) {
              if (statusVal === "driver_assigned") {
                return (
                  <div style={{ marginTop: 20 }}>
                    <Btn variant="primary" style={{ width: "100%", padding: "11px" }} onClick={() => startTrip(modal.data.id)}>
                      🚗 Mulai Perjalanan
                    </Btn>
                  </div>
                );
              }
              if (statusVal === "on_going") {
                return (
                  <div style={{ marginTop: 20 }}>
                    <Btn variant="success" style={{ width: "100%", padding: "11px" }} onClick={() => completeTrip(modal.data.id)}>
                      ✅ Selesai Perjalanan
                    </Btn>
                  </div>
                );
              }
            }
            return null;
          })()}
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

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load(page);
    });
    return () => { active = false; };
  }, [load, page]);

  async function openCreate() {
    try {
      const [rRes, uRes] = await Promise.all([
        api("GET", "/requests?status=approved_hrd_ga&per_page=100", null, token),
        api("GET", "/users?per_page=100", null, token),
      ]);
      setApprovedRequests(rRes.data || []);
      const allUsers = uRes.data || [];
      setDrivers(allUsers.filter((u) => u.roles?.includes("Driver")));
    } catch (e) {
      console.error(e);
    }
    setForm({});
    setModal({ mode: "create" });
  }

  async function openRespond(r) {
    try {
      const vRes = await api("GET", "/vehicles?status=Available&per_page=100", null, token);
      setAvailableVehicles(vRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setForm({});
    setModal({ mode: "respond", data: r });
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create() {
    setLoading(true);
    try {
      await api("POST", "/assignments", form, token);
      toast("Kendaraan berhasil di-assign ke driver");
      setModal(null); load(page);
    } catch (e) {
      toast(e.data?.message || JSON.stringify(e.data?.errors || "Error"), "error");
    } finally { setLoading(false); }
  }

  async function respondToAssignment(resType) {
    setLoading(true);
    try {
      const payload = { response: resType };
      if (resType === 'accepted') {
        if (!form.vehicle_id) throw { data: { message: "Pilih kendaraan jika menerima!" } };
        payload.vehicle_id = form.vehicle_id;
      } else {
        if (!form.reject_reason) throw { data: { message: "Isi alasan penolakan!" } };
        payload.reject_reason = form.reject_reason;
      }
      await api("PUT", `/assignments/${modal.data.id}`, payload, token);
      toast("Respon berhasil disimpan");
      setModal(null); load(page);
    } catch (e) {
      toast(e.data?.message || JSON.stringify(e.data?.errors || "Error"), "error");
    } finally { setLoading(false); }
  }

  async function cancel(a) {
    if (!confirm("Hapus assignment ini?")) return;
    try {
      await api("DELETE", `/assignments/${a.id}`, null, token);
      toast("Assignment dihapus");
      load(page);
    } catch (e) { toast(e.data?.message || "Gagal", "error"); }
  }

  const cols = [
    { key: "request", label: "Tujuan", render: (r) => r.request?.purpose || "—" },
    { key: "driver", label: "Driver", render: (r) => r.driver?.name || "—" },
    { key: "assigned_by", label: "Di-assign Oleh", render: (r) => r.assigned_by?.name || "—" },
    { key: "status", label: "Status", render: (r) => <Badge label={r.status} /> },
    {
      key: "actions", label: "Aksi",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); setModal({ mode: "view", data: r }); }}>Detail</Btn>
          {(user.id === r.driver?.id && r.status === "pending_driver") && (
            <Btn variant="primary" style={{ padding: "5px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); openRespond(r); }}>Respon</Btn>
          )}
          {isAdmin(user) && r.status === "pending_driver" && (
            <Btn variant="danger" style={{ padding: "5px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); cancel(r); }}>Hapus</Btn>
          )}
        </div>
      ),
    },
  ];

  return (
    <Section
      title="Penugasan Kendaraan"
      actions={isAdminOrGA(user) && [<Btn key="add" onClick={openCreate}>+ Tugaskan Driver</Btn>]}
    >
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
            <option value="">Semua Status</option>
            {["pending_driver", "accepted", "rejected"].map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Btn variant="ghost" onClick={() => load(1)}>Filter</Btn>
        </div>
      </Card>

      <Card>
        <Table cols={cols} rows={assignments} />
        <Pagination pagination={pagination} onChange={(p) => { setPage(p); load(p); }} />
      </Card>

      {modal?.mode === "create" && (
        <Modal title="Tugaskan Driver" onClose={() => setModal(null)}>
          <Field label="Request yang Disetujui">
            <Select value={form.request_id || ""} onChange={set("request_id")}>
              <option value="">-- Pilih Request --</option>
              {approvedRequests.map((r) => <option key={r.id} value={r.id}>{r.purpose}</option>)}
            </Select>
          </Field>
          <Field label="Pilih Driver">
            <Select value={form.driver_id || ""} onChange={set("driver_id")}>
              <option value="">-- Pilih Driver --</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Catatan Penugasan">
            <Textarea value={form.notes || ""} onChange={set("notes")} placeholder="Instruksi untuk driver..." />
          </Field>
          <Btn onClick={create} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Menyimpan..." : "Buat Assignment"}
          </Btn>
        </Modal>
      )}

      {modal?.mode === "respond" && (
        <Modal title="Respon Penugasan" onClose={() => setModal(null)}>
          <p style={{ marginBottom: 16, fontSize: 14, color: "var(--muted)" }}>Tujuan: {modal.data.request?.purpose}</p>
          <Field label="Pilihan Kendaraan (Jika Terima)">
            <Select value={form.vehicle_id || ""} onChange={set("vehicle_id")}>
              <option value="">-- Pilih Kendaraan --</option>
              {availableVehicles.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.plate_number}</option>)}
            </Select>
          </Field>
          <Field label="Alasan Penolakan (Jika Tolak)">
            <Textarea value={form.reject_reason || ""} onChange={set("reject_reason")} placeholder="Tidak enak badan..." />
          </Field>
          
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <Btn variant="success" onClick={() => respondToAssignment("accepted")} disabled={loading} style={{ flex: 1 }}>
              Terima Tugas
            </Btn>
            <Btn variant="danger" onClick={() => respondToAssignment("rejected")} disabled={loading} style={{ flex: 1 }}>
              Tolak Tugas
            </Btn>
          </div>
        </Modal>
      )}

      {modal?.mode === "view" && (
        <Modal title="Detail Penugasan" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Tujuan / Keperluan", modal.data.request?.purpose || "—"],
              ["Driver", modal.data.driver?.name || "—"],
              ["Email Driver", modal.data.driver?.email || "—"],
              ["Di-assign Oleh", modal.data.assigned_by?.name || "—"],
              ["Waktu Assign", modal.data.assigned_at ? new Date(modal.data.assigned_at).toLocaleString("id-ID") : "—"],
              ["Status Penugasan", modal.data.status],
              ["Catatan Penugasan", modal.data.notes || "—"],
              ["Alasan Ditolak", modal.data.reject_reason || "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 8, gap: 12 }}>
                <span style={{ color: "var(--muted)", fontSize: 13, flexShrink: 0 }}>{k}</span>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, textAlign: "right" }}>
                  {k === "Status Penugasan" ? <Badge label={v} /> : v || "—"}
                </span>
              </div>
            ))}
          </div>

          {modal.data.vehicle && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--hover)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "var(--text)" }}>🚗 Informasi Kendaraan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["Nama Kendaraan", modal.data.vehicle.name],
                  ["Plat Nomor", modal.data.vehicle.plate_number],
                  ["Tipe Kendaraan", modal.data.vehicle.type],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--muted)" }}>{k}</span>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{v || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.id === modal.data.driver?.id && modal.data.status === "pending_driver" && (
            <Btn variant="primary" style={{ width: "100%", marginTop: 20 }} onClick={() => openRespond(modal.data)}>Respon Penugasan</Btn>
          )}
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

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load(page);
    });
    return () => { active = false; };
  }, [load, page]);

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
            onClick={(e) => { e.stopPropagation(); setForm({ ...r, role: r.roles?.[0], is_department_head: r.is_department_head ?? false, department_id: r.department_id ?? "" }); setModal({ mode: "edit", data: r }); }}>Edit</Btn>
          <Btn variant="danger" style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); destroy(r); }}>Hapus</Btn>
        </div>
      ),
    },
  ];

  return (
    <Section
      title="Manajemen User"
      actions={[<Btn key="add" onClick={() => { setForm({ role: "Employee", is_department_head: false, department_id: "" }); setModal({ mode: "create" }); }}>+ Tambah User</Btn>]}
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
            <Select value={form.role || "Employee"} onChange={(e) => setForm(f => ({ ...f, role: e.target.value, rank: "", department_id: "", is_department_head: false }))}>
              {["Admin", "GA", "Approver", "Employee", "Driver"].map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          {/* Rank — wajib untuk Approver */}
          {form.role === "Approver" && (
            <Field label="Jabatan / Rank *">
              <Input
                value={form.rank || ""}
                onChange={set("rank")}
                placeholder="Contoh: Manager, Supervisor, Kepala Bagian"
              />
            </Field>
          )}

          {/* Departemen — tampil untuk Approver dan GA */}
          {(form.role === "Approver" || form.role === "GA") && (
            <Field label="Departemen">
              <Select
                value={form.department_id || ""}
                onChange={set("department_id")}
                style={{
                  ...inputStyle,
                  borderColor: form.is_department_head && !form.department_id ? "#f59e0b" : undefined,
                  transition: "border-color 0.2s",
                }}
              >
                <option value="">-- Pilih Departemen --</option>
                {[
                  { value: "IT",         label: "IT" },
                  { value: "FA",         label: "FA" },
                  { value: "HR&GA",      label: "HRD & GA" },
                  { value: "PRODUCTION", label: "Produksi" },
                  { value: "QC",         label: "QC" },
                  { value: "QA",         label: "QA" },
                ].map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </Select>
            </Field>
          )}

          {/* Kepala Departemen — tampil untuk Approver dan GA */}
          {(form.role === "Approver" || form.role === "GA") && (
            <Field label="Kepala Departemen">
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                padding: "10px 14px", borderRadius: 10,
                background: form.is_department_head ? "#2563eb11" : "var(--input-bg)",
                border: `1px solid ${form.is_department_head ? "var(--accent)" : "var(--border)"}`,
                transition: "all 0.2s",
              }}>
                <input
                  type="checkbox"
                  checked={!!form.is_department_head}
                  onChange={(e) => setForm(f => ({ ...f, is_department_head: e.target.checked }))}
                  style={{ width: 16, height: 16, marginTop: 2, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Jadikan Kepala Departemen</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>User ini akan memiliki wewenang untuk menyetujui request dari departemennya</div>
                </div>
              </label>

              {/* Warning: centang tapi belum pilih departemen */}
              {form.is_department_head && !form.department_id && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8,
                  background: "#f59e0b22", border: "1px solid #f59e0b55",
                  color: "#d97706", fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>⚠️</span> Harap pilih departemen di atas sebelum menyimpan
                </div>
              )}

              {/* Konfirmasi: sudah pilih departemen */}
              {form.is_department_head && form.department_id && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8,
                  background: "#22c55e22", border: "1px solid #22c55e55",
                  color: "#16a34a", fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>✓</span> Akan dijadikan Kepala — {[
                    { value: "IT", label: "IT" }, { value: "FA", label: "FA" },
                    { value: "HR&GA", label: "HRD & GA" }, { value: "PRODUCTION", label: "Produksi" },
                    { value: "QC", label: "QC" }, { value: "QA", label: "QA" },
                  ].find(d => d.value === form.department_id)?.label || form.department_id}
                </div>
              )}
            </Field>
          )}

          <Btn
            onClick={save}
            disabled={loading || (form.is_department_head && !form.department_id)}
            style={{ width: "100%", marginTop: 8 }}
          >
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

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load(page);
    });
    return () => { active = false; };
  }, [load, page]);

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
  { id: "vehicles", label: "Kendaraan", icon: "🚗", roles: ["Admin", "GA"] },
  { id: "requests", label: "Permintaan", icon: "📋" },
  { id: "assignments", label: "Penugasan", icon: "🔑", roles: ["Admin", "GA", "Driver"] },
  { id: "users", label: "Users", icon: "👥", roles: ["Admin"] },
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
        {NAV_ITEMS.filter((n) => !n.roles || n.roles.some(r => user?.roles?.includes(r))).map((n) => (
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
    try { return JSON.parse(sessionStorage.getItem("ovms_user") || "null"); } catch { return null; }
  });
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem("ovms_token") || "");
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
    sessionStorage.setItem("ovms_user", JSON.stringify(user));
    sessionStorage.setItem("ovms_token", token);
    setPage("dashboard");
  }

  async function handleLogout() {
    try { await api("POST", "/logout", null, authToken); } catch (e) { console.error(e); }
    setAuthUser(null); setAuthToken("");
    sessionStorage.removeItem("ovms_user");
    sessionStorage.removeItem("ovms_token");
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
