/**
 * Gerador Oficial de Código PIX Padrão Banco Central do Brasil (EMVCo / BR Code)
 * Formato Copia e Cola com cálculo de checksum CRC16-CCITT.
 */

function crc16Ccitt(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export interface PixPayloadOptions {
  pixKey?: string;
  merchantName?: string;
  merchantCity?: string;
  amount: number;
  txid?: string;
  description?: string;
}

export const OFFICIAL_CHAPTER_PIX_KEY = "capitulo500teresina@demolaypi.org.br";
export const OFFICIAL_MERCHANT_NAME = "CAPITULO CARVALHO NEVES 500";
export const OFFICIAL_MERCHANT_CITY = "TERESINA";

export function generatePixCopiaECola({
  pixKey = OFFICIAL_CHAPTER_PIX_KEY,
  merchantName = OFFICIAL_MERCHANT_NAME,
  merchantCity = OFFICIAL_MERCHANT_CITY,
  amount,
  txid = "***",
}: PixPayloadOptions): string {
  const cleanKey = pixKey.trim();
  const merchantAccount =
    formatEmvField("00", "br.gov.bcb.pix") + formatEmvField("01", cleanKey);

  const amtStr = Number(amount || 0).toFixed(2);
  const cleanTxid = (txid || "***").replace(/[^a-zA-Z0-9]/g, "").substring(0, 25) || "***";
  const additionalData = formatEmvField("05", cleanTxid);

  let payload =
    formatEmvField("00", "01") +
    formatEmvField("26", merchantAccount) +
    formatEmvField("52", "0000") +
    formatEmvField("53", "986") +
    formatEmvField("54", amtStr) +
    formatEmvField("58", "BR") +
    formatEmvField("59", merchantName.substring(0, 25)) +
    formatEmvField("60", merchantCity.substring(0, 15)) +
    formatEmvField("62", additionalData) +
    "6304";

  payload += crc16Ccitt(payload);
  return payload;
}

export function getPixQrCodeImageUrl(payload: string, size = 260): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(payload)}`;
}

export function getInfinitePayCheckoutUrl({
  amount,
  chargeId,
  description,
}: {
  amount: number;
  chargeId?: string;
  description?: string;
}): string {
  const handle = process.env.NEXT_PUBLIC_INFINITEPAY_HANDLE || "capitulo-carvalho-neves-500";
  const amountFormatted = Math.round(Number(amount || 0) * 100);
  const orderNsu = chargeId ? encodeURIComponent(chargeId) : "";
  const desc = description ? encodeURIComponent(description) : "";

  return `https://pay.infinitepay.io/${handle}/${(amountFormatted / 100).toFixed(2).replace(".", "")}?order_nsu=${orderNsu}&desc=${desc}`;
}
