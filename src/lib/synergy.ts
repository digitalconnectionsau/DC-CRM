import axios from "axios";

const whmClient = axios.create({
  baseURL: process.env.WHM_HOST,
  headers: {
    Authorization: `whm ${process.env.WHM_USERNAME}:${process.env.WHM_API_TOKEN}`,
  },
});

export interface WhmDomain {
  domain: string;
  user: string;
  ip: string;
  startdate: string;
  diskused: string;
  disklimit: string;
}

export async function listAccounts(): Promise<WhmDomain[]> {
  const res = await whmClient.get("/json-api/listaccts?api.version=1");
  return res.data?.data?.acct ?? [];
}

export async function getDomainDnsZone(domain: string) {
  const res = await whmClient.get(
    `/json-api/dumpzone?api.version=1&domain=${domain}`
  );
  return res.data?.data?.zone?.[0]?.record ?? [];
}

export async function createDnsRecord(
  domain: string,
  type: string,
  name: string,
  address: string,
  ttl = 3600
) {
  const res = await whmClient.post("/json-api/addzonerecord?api.version=1", {
    domain,
    type,
    name,
    address,
    ttl,
  });
  return res.data;
}

export async function deleteDnsRecord(domain: string, line: number) {
  const res = await whmClient.post("/json-api/removezonerecord?api.version=1", {
    domain,
    line,
  });
  return res.data;
}
