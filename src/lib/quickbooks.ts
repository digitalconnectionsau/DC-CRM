import axios from "axios";

const QB_BASE_URL =
  process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

export interface QbCustomer {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  CompanyName?: string;
  Active: boolean;
}

export interface QbInvoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate?: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: { value: string; name: string };
  EmailStatus: string;
}

export async function getCustomers(
  accessToken: string,
  realmId: string
): Promise<QbCustomer[]> {
  const res = await axios.get(
    `${QB_BASE_URL}/v3/company/${realmId}/query?query=SELECT * FROM Customer MAXRESULTS 1000`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
  );
  return res.data?.QueryResponse?.Customer ?? [];
}

export async function getInvoicesForCustomer(
  accessToken: string,
  realmId: string,
  customerId: string
): Promise<QbInvoice[]> {
  const res = await axios.get(
    `${QB_BASE_URL}/v3/company/${realmId}/query?query=SELECT * FROM Invoice WHERE CustomerRef = '${customerId}'`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
  );
  return res.data?.QueryResponse?.Invoice ?? [];
}
