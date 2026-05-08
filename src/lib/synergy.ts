import soap from "soap";

const WSDL_URL = "https://api.synergywholesale.com/?wsdl";

function getCredentials() {
  return {
    resellerID: process.env.SW_RESELLER_ID!,
    apiKey: process.env.SW_API_KEY!,
  };
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

export async function listDomains(): Promise<SwDomain[]> {
  const client = await getClient();
  const result = await invokeAnyOperation(
    client as unknown as Record<string, unknown>,
    ["listDomains", "domainList"],
    {
    ...getCredentials(),
    }
  );
  return (result as { domainList?: SwDomain[] })?.domainList ?? [];
}

export async function getDomainInfo(domainName: string) {
  const client = await getClient();
  const result = await invokeOperation(client as unknown as Record<string, unknown>, "domainInfo", {
    ...getCredentials(),
    domainName,
  });
  return result;
}

export async function getDomainDnsZone(domainName: string): Promise<SwDnsRecord[]> {
  const client = await getClient();
  const result = await invokeAnyOperation(
    client as unknown as Record<string, unknown>,
    ["listDNSZone", "listDNS"],
    {
      ...getCredentials(),
      domainName,
    }
  );
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
  const client = await getClient();
  const result = await invokeAnyOperation(
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
  );
  return result;
}

export async function deleteDnsRecord(domainName: string, recordId: string) {
  const client = await getClient();
  const result = await invokeAnyOperation(
    client as unknown as Record<string, unknown>,
    ["deleteDNSRecord", "deleteDNS"],
    {
      ...getCredentials(),
      domainName,
      recordId,
    }
  );
  return result;
}

export async function renewDomain(domainName: string, years = 1) {
  const client = await getClient();
  const result = await invokeAnyOperation(
    client as unknown as Record<string, unknown>,
    ["renewDomain", "domainRenew"],
    {
      ...getCredentials(),
      domainName,
      years,
    }
  );
  return result;
}

export async function checkDomainAvailability(domainName: string) {
  const client = await getClient();
  const result = await invokeOperation(client as unknown as Record<string, unknown>, "checkDomain", {
    ...getCredentials(),
    domainName,
  });
  return result;
}
