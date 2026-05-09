import soap from "soap";

const WSDL_URL = "https://api.synergywholesale.com/?wsdl";
const SYNERGY_BRIDGE_URL = cleanEnv(process.env.SYNERGY_BRIDGE_URL);
const SYNERGY_BRIDGE_TOKEN = cleanEnv(process.env.SYNERGY_BRIDGE_TOKEN);

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getCredentials() {
  return {
    resellerID: cleanEnv(process.env.SW_RESELLER_ID)!,
    apiKey: cleanEnv(process.env.SW_API_KEY)!,
  };
}

function hasBridgeConfig() {
  return Boolean(SYNERGY_BRIDGE_URL && SYNERGY_BRIDGE_TOKEN);
}

async function getClient() {
  return soap.createClientAsync(WSDL_URL);
}

async function callSoapOperation(
  target: Record<string, unknown>,
  operation: string,
  args: Record<string, unknown>
) {
  const asyncName = `${operation}Async`;
  const asyncFn = target[asyncName];
  if (typeof asyncFn === "function") {
    const [result] = await (asyncFn as (payload: Record<string, unknown>) => Promise<unknown[]>)(args);
    return result;
  }

  const callbackFn = target[operation];
  if (typeof callbackFn === "function") {
    return await new Promise<unknown>((resolve, reject) => {
      (callbackFn as (payload: Record<string, unknown>, cb: (err: unknown, result: unknown) => void) => void)(
        args,
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
  }

  return undefined;
}

async function invokeOperation(
  client: Record<string, unknown>,
  operation: string,
  args: Record<string, unknown>
) {
  const direct = await callSoapOperation(client, operation, args);
  if (direct !== undefined) return direct;

  for (const service of Object.values(client)) {
    if (!service || typeof service !== "object") continue;
    for (const port of Object.values(service as Record<string, unknown>)) {
      if (!port || typeof port !== "object") continue;
      const result = await callSoapOperation(port as Record<string, unknown>, operation, args);
      if (result !== undefined) return result;
    }
  }

  throw new Error(`SOAP operation '${operation}' not found in Synergy client`);
}

async function invokeAnyOperation(
  client: Record<string, unknown>,
  operations: string[],
  args: Record<string, unknown>
) {
  for (const operation of operations) {
    try {
      return await invokeOperation(client, operation, args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("not found in Synergy client")) {
        throw err;
      }
    }
  }

  throw new Error(`SOAP operations not found in Synergy client: ${operations.join(", ")}`);
}

export interface SwDomain {
  domainName: string;
  expiryDate: string;
  status: string;
  autoRenew: string;
}

export interface SwDnsRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
}

interface SynergyResponse {
  status?: string;
  errorMessage?: string;
  domainList?: SwDomain[];
  record?: SwDnsRecord[];
}

interface BridgeResponse<T> {
  ok: boolean;
  status?: string;
  errorMessage?: string;
  detail?: string;
  data?: T;
}

type DomainLike = {
  domainName?: string;
  domain_status?: string;
  domainStatus?: string;
  status?: string;
  domain_expiry?: string;
  expiryDate?: string;
  autoRenew?: string;
};

type SoapWrappedValue = {
  $value?: unknown;
  return?: unknown;
  [key: string]: unknown;
};

function normalizeSoapValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeSoapValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const candidate = value as SoapWrappedValue;
  if ("$value" in candidate && Object.keys(candidate).every((key) => key === "$value" || key === "attributes")) {
    return normalizeSoapValue(candidate.$value);
  }

  if ("return" in candidate && Object.keys(candidate).length <= 2) {
    return normalizeSoapValue(candidate.return);
  }

  const normalizedEntries = Object.entries(candidate)
    .filter(([key]) => key !== "attributes")
    .map(([key, entryValue]) => [key, normalizeSoapValue(entryValue)]);

  return Object.fromEntries(normalizedEntries);
}

function ensureSuccessfulResponse<T>(response: T): T {
  const normalized = normalizeSoapValue(response) as T;
  if (!normalized || typeof normalized !== "object") return normalized;

  const candidate = normalized as SynergyResponse;
  if (candidate.status && candidate.status.toUpperCase().startsWith("ERR")) {
    throw new Error(candidate.errorMessage ?? `Synergy API returned status ${candidate.status}`);
  }

  return normalized;
}

async function callBridge<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!SYNERGY_BRIDGE_URL || !SYNERGY_BRIDGE_TOKEN) {
    throw new Error("Synergy bridge is not configured");
  }

  const response = await fetch(SYNERGY_BRIDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SYNERGY_BRIDGE_TOKEN}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  const body = (await response.json().catch(() => ({}))) as Partial<BridgeResponse<T>>;

  if (!response.ok) {
    throw new Error(body.detail ?? body.errorMessage ?? `Bridge request failed (${response.status})`);
  }

  if (!body.ok) {
    throw new Error(body.errorMessage ?? body.detail ?? "Bridge operation failed");
  }

  return (body.data ?? ({} as T)) as T;
}

function normalizeDomain(item: DomainLike): SwDomain {
  return {
    domainName: item.domainName ?? "",
    status: item.domainStatus ?? item.domain_status ?? item.status ?? "UNKNOWN",
    expiryDate: item.domain_expiry ?? item.expiryDate ?? "",
    autoRenew: item.autoRenew ?? "",
  };
}

export async function listDomains(): Promise<SwDomain[]> {
  if (hasBridgeConfig()) {
    const result = await callBridge<{ domainList?: DomainLike[] }>("listDomains", {
      page: 1,
      limit: 500,
    });
    return (result.domainList ?? []).map(normalizeDomain);
  }

  const client = await getClient();
  const result = ensureSuccessfulResponse(
    await invokeAnyOperation(
    client as unknown as Record<string, unknown>,
    ["listDomains", "domainList"],
    {
      ...getCredentials(),
      page: 1,
      limit: 500,
    }
    )
  ) as SynergyResponse;
  return (result as { domainList?: SwDomain[] })?.domainList ?? [];
}

export async function getDomainInfo(domainName: string) {
  if (hasBridgeConfig()) {
    return callBridge<Record<string, unknown>>("domainInfo", { domainName });
  }

  const client = await getClient();
  const result = ensureSuccessfulResponse(
    await invokeOperation(client as unknown as Record<string, unknown>, "domainInfo", {
      ...getCredentials(),
      domainName,
    })
  );
  return result;
}

export async function getDomainDnsZone(domainName: string): Promise<SwDnsRecord[]> {
  if (hasBridgeConfig()) {
    const result = await callBridge<{ record?: SwDnsRecord[] }>("listDNSZone", { domainName });
    return result.record ?? [];
  }

  const client = await getClient();
  const result = ensureSuccessfulResponse(
    await invokeAnyOperation(
      client as unknown as Record<string, unknown>,
      ["listDNSZone", "listDNS"],
      {
        ...getCredentials(),
        domainName,
      }
    )
  ) as SynergyResponse;
  return (result as { record?: SwDnsRecord[] })?.record ?? [];
}

export async function addDnsRecord(
  domainName: string,
  type: string,
  name: string,
  content: string,
  ttl = 3600,
  priority?: number
) {
  if (hasBridgeConfig()) {
    return callBridge<Record<string, unknown>>("addDNSRecord", {
      domainName,
      type,
      name,
      content,
      ttl,
      ...(priority !== undefined ? { priority } : {}),
    });
  }

  const client = await getClient();
  const result = ensureSuccessfulResponse(
    await invokeAnyOperation(
      client as unknown as Record<string, unknown>,
      ["addDNSRecord", "addDNS"],
      {
        ...getCredentials(),
        domainName,
        type,
        name,
        content,
        ttl,
        ...(priority !== undefined ? { priority } : {}),
      }
    )
  );
  return result;
}

export async function deleteDnsRecord(domainName: string, recordId: string) {
  if (hasBridgeConfig()) {
    return callBridge<Record<string, unknown>>("deleteDNSRecord", { domainName, recordId });
  }

  const client = await getClient();
  const result = ensureSuccessfulResponse(
    await invokeAnyOperation(
      client as unknown as Record<string, unknown>,
      ["deleteDNSRecord", "deleteDNS"],
      {
        ...getCredentials(),
        domainName,
        recordId,
      }
    )
  );
  return result;
}

export async function renewDomain(domainName: string, years = 1) {
  if (hasBridgeConfig()) {
    return callBridge<Record<string, unknown>>("renewDomain", { domainName, years });
  }

  const client = await getClient();
  const result = ensureSuccessfulResponse(
    await invokeAnyOperation(
      client as unknown as Record<string, unknown>,
      ["renewDomain", "domainRenew"],
      {
        ...getCredentials(),
        domainName,
        years,
      }
    )
  );
  return result;
}

export async function checkDomainAvailability(domainName: string) {
  if (hasBridgeConfig()) {
    return callBridge<Record<string, unknown>>("checkDomain", { domainName });
  }

  const client = await getClient();
  const result = ensureSuccessfulResponse(
    await invokeOperation(client as unknown as Record<string, unknown>, "checkDomain", {
      ...getCredentials(),
      domainName,
    })
  );
  return result;
}
