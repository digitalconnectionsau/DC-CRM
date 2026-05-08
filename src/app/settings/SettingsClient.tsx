"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Client {
  id: string;
  name: string;
}

interface Domain {
  id: string;
  name: string;
  status: string;
  clientId: string | null;
  client: Client | null;
  source: string;
  expiresAt: string | null;
}

interface HostingAccount {
  id: string;
  username: string;
  primaryDomain: string;
  plan: string | null;
  diskUsedMb: number | null;
  diskLimitMb: number | null;
  suspended: boolean;
  clientId: string | null;
  client: Client | null;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  createdAt: string;
  updatedAt: string;
}

interface SettingsClientProps {
  isAdmin: boolean;
}

interface ConnectionResultItem {
  ok: boolean;
  message: string;
}

interface ConnectionResults {
  ranAt: string;
  domains: ConnectionResultItem;
  hosting: ConnectionResultItem;
}

export function SettingsClient({ isAdmin }: SettingsClientProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [hosting, setHosting] = useState<HostingAccount[]>([]);
  const [pullingDomains, setPullingDomains] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [loadingHosting, setLoadingHosting] = useState(false);

  // IP tracking state
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [whitelistedIp, setWhitelistedIp] = useState<string | null>(null);
  const [loadingIp, setLoadingIp] = useState(false);
  const [savingIp, setSavingIp] = useState(false);
  const [qbConnected, setQbConnected] = useState<boolean>(false);

  // User management state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [testingConnections, setTestingConnections] = useState(false);
  const [connectionResults, setConnectionResults] = useState<ConnectionResults | null>(null);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    if (res.ok) setClients(await res.json());
  }, []);

  const loadDomains = useCallback(async () => {
    setLoadingDomains(true);
    const res = await fetch("/api/domains");
    if (res.ok) setDomains(await res.json());
    setLoadingDomains(false);
  }, []);

  const loadHosting = useCallback(async () => {
    setLoadingHosting(true);
    const res = await fetch("/api/hosting");
    if (res.ok) setHosting(await res.json());
    setLoadingHosting(false);
  }, []);

  const loadIpInfo = useCallback(async () => {
    setLoadingIp(true);
    const [ipRes, settingRes] = await Promise.all([
      fetch("/api/my-ip"),
      fetch("/api/settings?key=synergy_whitelisted_ip"),
    ]);
    if (ipRes.ok) {
      const data = await ipRes.json();
      setCurrentIp(data.outboundIp ?? null);
    }
    if (settingRes.ok) {
      const data = await settingRes.json();
      setWhitelistedIp(data.value ?? null);
    }

    const qbRes = await fetch("/api/settings?key=qb_realm_id");
    if (qbRes.ok) {
      const data = await qbRes.json();
      setQbConnected(Boolean(data?.value));
    }
    setLoadingIp(false);
  }, []);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    const res = await fetch("/api/users");
    if (res.ok) {
      setUsers(await res.json());
    } else {
      toast.error("Failed to load users");
    }
    setLoadingUsers(false);
  }, [isAdmin]);

  useEffect(() => {
    loadClients();
    loadDomains();
    loadHosting();
    loadIpInfo();
    loadUsers();
  }, [loadClients, loadDomains, loadHosting, loadIpInfo, loadUsers]);

  async function markIpWhitelisted() {
    if (!currentIp) return;
    setSavingIp(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "synergy_whitelisted_ip", value: currentIp }),
    });
    if (res.ok) {
      setWhitelistedIp(currentIp);
      toast.success("Whitelisted IP saved");
    } else {
      toast.error("Failed to save IP");
    }
    setSavingIp(false);
  }

  const ipChanged = whitelistedIp && currentIp && whitelistedIp !== currentIp;

  async function pullDomains() {
    setPullingDomains(true);
    try {
      const res = await fetch("/api/integrations/synergy/pull-domains", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Pulled ${data.total} domains — ${data.created} new, ${data.updated} updated`);
        loadDomains();
      } else {
        toast.error(data.detail ?? data.error ?? "Failed to pull domains");
      }
    } catch {
      toast.error("Network error");
    }
    setPullingDomains(false);
  }

  async function assignDomain(domainId: string, clientId: string) {
    const res = await fetch(`/api/domains/${domainId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId || null }),
    });
    if (res.ok) {
      toast.success("Domain assigned");
      loadDomains();
    } else {
      toast.error("Failed to assign domain");
    }
  }

  async function assignHosting(accountId: string, clientId: string) {
    const res = await fetch(`/api/hosting/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId || null }),
    });
    if (res.ok) {
      toast.success("Hosting account assigned");
      loadHosting();
    } else {
      toast.error("Failed to assign hosting account");
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok) {
      toast.success("User created");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("STAFF");
      loadUsers();
    } else {
      toast.error(data?.error ?? "Failed to create user");
    }

    setCreatingUser(false);
  }

  async function resetPassword(userId: string) {
    const newPassword = resetPasswords[userId] ?? "";
    if (!newPassword) {
      toast.error("Enter a new password first");
      return;
    }

    setResettingUserId(userId);
    const res = await fetch(`/api/users/${userId}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok) {
      toast.success("Password reset");
      setResetPasswords((prev) => ({ ...prev, [userId]: "" }));
      loadUsers();
    } else {
      toast.error(data?.error ?? "Failed to reset password");
    }
    setResettingUserId(null);
  }

  async function runIntegrationTests() {
    setTestingConnections(true);

    const [domainsResult, hostingResult] = await Promise.allSettled([
      fetch("/api/integrations/synergy/accounts"),
      fetch("/api/hosting"),
    ]);

    let domainsStatus: ConnectionResultItem = { ok: false, message: "Request failed" };
    let hostingStatus: ConnectionResultItem = { ok: false, message: "Request failed" };

    if (domainsResult.status === "fulfilled") {
      const res = domainsResult.value;
      const payload = await res.json().catch(() => null);
      if (res.ok) {
        const count = Array.isArray(payload) ? payload.length : 0;
        domainsStatus = { ok: true, message: `Connected (${count} domains returned)` };
      } else {
        domainsStatus = {
          ok: false,
          message: payload?.detail ?? payload?.error ?? `HTTP ${res.status}`,
        };
      }
    }

    if (hostingResult.status === "fulfilled") {
      const res = hostingResult.value;
      const payload = await res.json().catch(() => null);
      if (res.ok) {
        const count = Array.isArray(payload) ? payload.length : 0;
        hostingStatus = { ok: true, message: `Connected (${count} hosting accounts returned)` };
      } else {
        hostingStatus = {
          ok: false,
          message: payload?.detail ?? payload?.error ?? `HTTP ${res.status}`,
        };
      }
    }

    const results: ConnectionResults = {
      ranAt: new Date().toISOString(),
      domains: domainsStatus,
      hosting: hostingStatus,
    };

    setConnectionResults(results);

    if (results.domains.ok && results.hosting.ok) {
      toast.success("Integration tests passed");
    } else {
      toast.error("One or more integration tests failed");
    }

    setTestingConnections(false);
  }

  const unassignedDomains = domains.filter((d) => !d.clientId);

  return (
    <div className="p-6 space-y-6">

      {/* Railway Outbound IP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Railway Outbound IP</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                The IP address Railway uses to make outbound requests (e.g. to Synergy Wholesale).
              </p>
            </div>
            <Badge label="IP Whitelist" variant="blue" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingIp ? (
            <p className="text-sm text-gray-400">Detecting IP…</p>
          ) : (
            <div className="space-y-3">
              {ipChanged && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <span className="text-red-500 text-lg mt-0.5">⚠️</span>
                  <div className="text-sm">
                    <p className="font-semibold text-red-800">IP address has changed!</p>
                    <p className="text-red-700 mt-0.5">
                      You need to update your Synergy Wholesale whitelist from{" "}
                      <span className="font-mono font-bold">{whitelistedIp}</span> to{" "}
                      <span className="font-mono font-bold">{currentIp}</span>.
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Current IP</p>
                  <p className="font-mono font-semibold text-gray-900 text-base">{currentIp ?? "Unknown"}</p>
                </div>
                <div className={`rounded-lg px-4 py-3 ${ipChanged ? "bg-red-50" : "bg-gray-50"}`}>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Whitelisted IP</p>
                  <p className={`font-mono font-semibold text-base ${ipChanged ? "text-red-700 line-through" : "text-gray-900"}`}>
                    {whitelistedIp ?? <span className="text-gray-400 italic font-sans font-normal">Not set</span>}
                  </p>
                </div>
              </div>
              {(!whitelistedIp || ipChanged) && currentIp && (
                <button
                  onClick={markIpWhitelisted}
                  disabled={savingIp}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {savingIp ? "Saving…" : ipChanged ? "Mark new IP as whitelisted" : "Mark IP as whitelisted"}
                </button>
              )}
              {whitelistedIp && !ipChanged && (
                <p className="text-sm text-green-700 flex items-center gap-1.5">
                  <span>✓</span> IP matches whitelisted address — Synergy API should be reachable.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

        {/* Synergy Wholesale Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Synergy Wholesale</h2>
                <p className="text-sm text-gray-500 mt-0.5">Pull domains registered through Synergy Wholesale into this portal.</p>
              </div>
              <Badge label="SOAP API" variant="blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={pullDomains}
                disabled={pullingDomains}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {pullingDomains ? "Pulling Domains…" : "Pull Domains from Synergy"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Integration Diagnostics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Integration Diagnostics</h2>
                <p className="text-sm text-gray-500 mt-0.5">Test domain and hosting connectivity in one click.</p>
              </div>
              <Badge label="Health Check" variant="blue" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={runIntegrationTests}
              disabled={testingConnections}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {testingConnections ? "Running tests..." : "Run Integration Test"}
            </button>

            {connectionResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className={`rounded-lg border px-4 py-3 ${connectionResults.domains.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  <p className="font-semibold text-gray-900">Domains (Synergy)</p>
                  <p className={connectionResults.domains.ok ? "text-green-700" : "text-red-700"}>
                    {connectionResults.domains.message}
                  </p>
                </div>
                <div className={`rounded-lg border px-4 py-3 ${connectionResults.hosting.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  <p className="font-semibold text-gray-900">Hosting</p>
                  <p className={connectionResults.hosting.ok ? "text-green-700" : "text-red-700"}>
                    {connectionResults.hosting.message}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QuickBooks Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">QuickBooks Online</h2>
                <p className="text-sm text-gray-500 mt-0.5">Connect your QuickBooks company and store tokens server-side.</p>
              </div>
              <Badge label={qbConnected ? "Connected" : "Not Connected"} variant={qbConnected ? "green" : "yellow"} />
            </div>
          </CardHeader>
          <CardContent>
            <a
              href="/api/integrations/quickbooks/connect"
              className="inline-block bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              {qbConnected ? "Reconnect QuickBooks" : "Connect QuickBooks"}
            </a>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">User Management</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Add staff accounts and reset passwords.</p>
                </div>
                <Badge label="Admin Only" variant="red" />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full name"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Email"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Temporary password"
                  minLength={8}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as "ADMIN" | "STAFF")}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {creatingUser ? "Creating..." : "Add user"}
                </button>
              </form>

              {loadingUsers ? (
                <p className="text-sm text-gray-400">Loading users…</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Role</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Reset Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-800">{u.name}</td>
                        <td className="px-4 py-2 text-gray-600">{u.email}</td>
                        <td className="px-4 py-2">
                          <Badge label={u.role} variant={u.role === "ADMIN" ? "red" : "gray"} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={resetPasswords[u.id] ?? ""}
                              onChange={(e) => setResetPasswords((prev) => ({ ...prev, [u.id]: e.target.value }))}
                              placeholder="New password"
                              minLength={8}
                              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                            <button
                              onClick={() => resetPassword(u.id)}
                              disabled={resettingUserId === u.id}
                              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
                            >
                              {resettingUserId === u.id ? "Saving..." : "Reset"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Unassigned Domains */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Unassigned Domains
                {unassignedDomains.length > 0 && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    {unassignedDomains.length}
                  </span>
                )}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingDomains ? (
              <p className="px-6 py-4 text-sm text-gray-400">Loading…</p>
            ) : unassignedDomains.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">All domains are assigned to clients. ✓</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Domain</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Source</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Assign to Client</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedDomains.map((d) => (
                    <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono font-medium text-gray-800">{d.name}</td>
                      <td className="px-6 py-3">
                        <Badge label={d.source} variant={d.source === "SYNERGY" ? "blue" : "gray"} />
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          label={d.status}
                          variant={d.status === "ACTIVE" ? "green" : d.status === "EXPIRING_SOON" ? "yellow" : "red"}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <select
                          defaultValue=""
                          onChange={(e) => assignDomain(d.id, e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Select client…</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Unassigned Hosting Accounts */}
        {hosting.filter((h) => !h.clientId).length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900">
                Unassigned Hosting Accounts
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  {hosting.filter((h) => !h.clientId).length}
                </span>
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHosting ? (
                <p className="px-6 py-4 text-sm text-gray-400">Loading…</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Username</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Primary Domain</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Plan</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Assign to Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hosting.filter((h) => !h.clientId).map((h) => (
                      <tr key={h.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-3 font-mono text-gray-800">{h.username}</td>
                        <td className="px-6 py-3 font-mono text-gray-600">{h.primaryDomain}</td>
                        <td className="px-6 py-3 text-gray-500">{h.plan ?? "—"}</td>
                        <td className="px-6 py-3">
                          <select
                            defaultValue=""
                            onChange={(e) => assignHosting(h.id, e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="">Select client…</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* All Domains summary */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">All Domains ({domains.length})</h2>
          </CardHeader>
          <CardContent className="p-0">
            {loadingDomains ? (
              <p className="px-6 py-4 text-sm text-gray-400">Loading…</p>
            ) : domains.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">No domains yet. Pull from Synergy or add manually.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Domain</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Client</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Source</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Reassign</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((d) => (
                    <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono font-medium text-gray-800">{d.name}</td>
                      <td className="px-6 py-3 text-gray-600">{d.client?.name ?? <span className="text-gray-400 italic">Unassigned</span>}</td>
                      <td className="px-6 py-3">
                        <Badge label={d.source} variant={d.source === "SYNERGY" ? "blue" : "gray"} />
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          label={d.status}
                          variant={d.status === "ACTIVE" ? "green" : d.status === "EXPIRING_SOON" ? "yellow" : "red"}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <select
                          value={d.clientId ?? ""}
                          onChange={(e) => assignDomain(d.id, e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Unassigned</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

      </div>
  );
}


