import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT || "https://c385ac8a9d85d694c9340e498f29e171.r2.cloudflarestorage.com";
const bucket = process.env.R2_BUCKET || "nhrx-prescriptions";
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const reportsEndpoint = process.env.R2_REPORTS_ENDPOINT;
const reportsBucket = process.env.R2_REPORTS_BUCKET;
const reportsAccessKeyId = process.env.R2_REPORTS_ACCESS_KEY_ID;
const reportsSecretAccessKey = process.env.R2_REPORTS_SECRET_ACCESS_KEY;
const labReportsPrefix = normalizePrefix(process.env.R2_LAB_REPORTS_PREFIX || "lab-reports/");
const radiologyReportsPrefix = normalizePrefix(process.env.R2_RADIOLOGY_REPORTS_PREFIX || "radiology-reports/");

function normalizePrefix(value) { return `${String(value).replace(/^\/+|\/+$/g, "")}/`; }

export const r2Configured = Boolean(accessKeyId && secretAccessKey);
export const r2LabConfigured = Boolean(reportsEndpoint && reportsBucket && reportsAccessKeyId && reportsSecretAccessKey);
const client = r2Configured ? new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
}) : null;
const reportsClient = r2LabConfigured ? new S3Client({
  region: process.env.R2_REPORTS_REGION || "auto",
  endpoint: reportsEndpoint,
  credentials: { accessKeyId: reportsAccessKeyId, secretAccessKey: reportsSecretAccessKey },
}) : null;

export async function uploadPrescriptionPdf(key, body) {
  if (!client) throw new Error("R2_NOT_CONFIGURED");
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/pdf" }));
}

export async function downloadPrescriptionPdf(key) {
  if (!client) throw new Error("R2_NOT_CONFIGURED");
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function deleteR2Object(key) {
  if (client) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function uploadLabReportPdf(key, body) {
  if (!reportsClient) throw new Error("R2_REPORTS_NOT_CONFIGURED");
  const objectKey = `${labReportsPrefix}${key.replace(/^\/+/, "")}`;
  await reportsClient.send(new PutObjectCommand({ Bucket: reportsBucket, Key: objectKey, Body: body, ContentType: "application/pdf" }));
  return objectKey;
}

export async function downloadLabReportPdf(key) {
  if (!reportsClient) throw new Error("R2_REPORTS_NOT_CONFIGURED");
  const result = await reportsClient.send(new GetObjectCommand({ Bucket: reportsBucket, Key: key }));
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function deleteLabReportPdf(key) {
  if (reportsClient) await reportsClient.send(new DeleteObjectCommand({ Bucket: reportsBucket, Key: key }));
}

export async function uploadRadiologyReportPdf(key, body) {
  if (!reportsClient) throw new Error("R2_REPORTS_NOT_CONFIGURED");
  const objectKey = `${radiologyReportsPrefix}${key.replace(/^\/+/, "")}`;
  await reportsClient.send(new PutObjectCommand({ Bucket: reportsBucket, Key: objectKey, Body: body, ContentType: "application/pdf" }));
  return objectKey;
}

export async function downloadRadiologyReportPdf(key) {
  if (!reportsClient) throw new Error("R2_REPORTS_NOT_CONFIGURED");
  const result = await reportsClient.send(new GetObjectCommand({ Bucket: reportsBucket, Key: key }));
  return Buffer.from(await result.Body.transformToByteArray());
}
