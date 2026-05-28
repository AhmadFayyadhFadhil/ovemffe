const API_BASE = "http://localhost:8000/api";

async function api(method, path, body = null, token = null) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw { status: res.status, data };
    }
    return { status: res.status, data };
  } catch (err) {
      if (err.status) throw err;
      throw { status: 0, error: err.message };
  }
}

async function run() {
  console.log("Starting API integration tests...\n");

  let adminToken;
  let employeeToken;

  // 1. Auth - Login
  try {
    console.log("Testing Login as Admin...");
    const res = await api("POST", "/login", { email: "admin@ovms.test", password: "password" });
    adminToken = res.data.data.token;
    console.log("✅ Admin Login OK");
  } catch (e) {
    console.log("❌ Admin Login Failed", e);
    return;
  }

  try {
    console.log("Testing Login as Employee...");
    const res = await api("POST", "/login", { email: "employee@ovms.test", password: "password" });
    employeeToken = res.data.data.token;
    console.log("✅ Employee Login OK");
  } catch (e) {
    console.log("❌ Employee Login Failed", e);
    // Continue anyway
  }

  // 2. Vehicles - List (Pagination check)
  try {
    console.log("Testing GET /vehicles...");
    const res = await api("GET", "/vehicles?page=1&per_page=10", null, adminToken);
    if (res.data.data && Array.isArray(res.data.data)) {
        console.log("✅ GET /vehicles OK", res.data.data.length, "items");
    } else {
        console.log("❌ GET /vehicles invalid format", res.data);
    }
  } catch (e) {
    console.log("❌ GET /vehicles Failed", e);
  }

  let vehicleId = null;
  // 3. Vehicles - Create
  try {
    console.log("Testing POST /vehicles...");
    const res = await api("POST", "/vehicles", {
        name: "Test Car " + Date.now(),
        plate_number: "B " + Math.floor(Math.random() * 10000) + " XX",
        type: "Sedan",
        capacity: 4,
        status: "Available"
    }, adminToken);
    vehicleId = res.data.data ? res.data.data.id : res.data.id;
    console.log("✅ POST /vehicles OK, id:", vehicleId);
  } catch (e) {
    console.log("❌ POST /vehicles Failed", e);
  }

  // 4. Vehicles - Update
  if (vehicleId) {
      try {
        console.log("Testing PUT /vehicles/" + vehicleId + "...");
        await api("PUT", "/vehicles/" + vehicleId, {
            name: "Test Car Updated",
            status: "In Use"
        }, adminToken);
        console.log("✅ PUT /vehicles OK");
      } catch (e) {
        console.log("❌ PUT /vehicles Failed", e);
      }
  }

  let requestId = null;
  // 5. Requests - Create
  try {
    console.log("Testing POST /requests (as Employee)...");
    const res = await api("POST", "/requests", {
        purpose: "Testing purpose",
        department_id: "IT",
        destination_city: "Jakarta",
        destination_place: "Kantor Pusat Sudirman",
        passenger_count: 2,
        priority: "normal",
        start_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    }, employeeToken || adminToken);
    requestId = res.data.data ? res.data.data.id : res.data.id;
    console.log("✅ POST /requests OK, id:", requestId);
  } catch (e) {
    console.log("❌ POST /requests Failed", e);
  }

  // 6. Requests - Approve
  if (requestId) {
      try {
        console.log("Testing POST /requests/" + requestId + "/approve...");
        await api("POST", "/requests/" + requestId + "/approve", null, adminToken);
        console.log("✅ POST /requests/approve OK");
      } catch (e) {
        console.log("❌ POST /requests/approve Failed", e);
      }
  }

  // 7. Users - List
  try {
    console.log("Testing GET /users...");
    const res = await api("GET", "/users", null, adminToken);
    if (res.data.data && Array.isArray(res.data.data)) {
        console.log("✅ GET /users OK", res.data.data.length, "items");
    } else {
        console.log("❌ GET /users invalid format", res.data);
    }
  } catch (e) {
    console.log("❌ GET /users Failed", e);
  }
  
  // 8. Audit Logs
  try {
    console.log("Testing GET /audit-logs...");
    const res = await api("GET", "/audit-logs", null, adminToken);
    if (res.data.data && Array.isArray(res.data.data)) {
        console.log("✅ GET /audit-logs OK", res.data.data.length, "items");
    } else {
        console.log("❌ GET /audit-logs invalid format", res.data);
    }
  } catch (e) {
    console.log("❌ GET /audit-logs Failed", e);
  }

  console.log("\nTests complete.");
}

run();
