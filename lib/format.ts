"use client";
export function formatCurrency(
  amount: number,
  currencySymbol: string = "$",
  locale: string = "en-US",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: getCurrencyCode(currencySymbol),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencySymbol}${amount.toFixed(2)}`;
  }
}

export function formatDate(
  date: string | Date,
  locale: string = "en-US",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatTime(
  date: string | Date,
  locale: string = "en-US",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleTimeString();
  }
}

export function formatDateTime(
  date: string | Date,
  locale: string = "en-US",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatNumber(
  num: number,
  locale: string = "en-US",
  decimals: number = 2,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return num.toFixed(decimals);
  }
}

function getCurrencyCode(symbol: string): string {
  const map: Record<string, string> = {
    $: "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "₹": "INR",
    "₩": "KRW",
    "₽": "RUB",
    "₱": "PHP",
    "₿": "BTC",
    "R$": "BRL",
    R: "ZAR",
    "₪": "ILS",
    "﷼": "SAR",
    "د.إ": "AED",
    "₫": "VND",
    "₺": "TRY",
    "₼": "AZN",
    "₸": "KZT",
    "₴": "UAH",
    "₦": "NGN",
    "₡": "CRC",
    "₲": "PYG",
    "₵": "GHS",
    "₾": "GEL",
    "₭": "LAK",
    "₮": "MNT",
    "₰": "ADF",
    "₳": "ARA",
    "₶": "VEB",
    "₷": "MXV",
    "₻": "UYW",
  };
  return map[symbol] || "USD";
}
