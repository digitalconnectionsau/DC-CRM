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
  const [result] = await client.domainListAsync({
    ...getCredentials(),
  });
  return result?.domainList ?? [];
}

export async function getDomainInfo(domainName: string) {
  const client = await getClient();
  const [result] = await client.domainInfoAsync({
    ...getCredentials(),
    domainName,
  });
  return result;
}

export async function getDomainDnsZone(domainName: string): Promise<SwDnsRecord[]> {
  const client = await getClient();
  const [result] = await client.listDNSAsync({
    ...getCredentials(),
    domainName,
  });
  return result?.record ?? [];
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
  const [result] = await client.addDNSAsync({
    ...getCredentials(),
    domainName,
    type,
    name,
    content,
    ttl,
    ...(priority !== undefined ? { priority } : {}),
  });
  return result;
}

export async function deleteDnsRecord(domainName: string, recordId: string) {
  const client = await getClient();
  const [result] = await client.deleteDNSAsync({
    ...getCredentials(),
    domainName,
    recordId,
  });
  return result;
}

export async function renewDomain(domainName: string, years = 1) {
  const client = await getClient();
  const [result] = await client.domainRenewAsync({
    ...getCredentials(),
    domainName,
    years,
  });
  return result;
}

export async function checkDomainAvailability(domainName: string) {
  const client = await getClient();
  const [result] = await client.checkDomainAsync({
    ...getCredentials(),
    domainName,
  });
  return result;
}
