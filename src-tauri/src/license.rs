// src-tauri/src/license.rs
// HMAC-SHA256 based license key validation
//
// Key format: POS-{TIER}-{YYYYMMDD}-{RANDOM8}-{HMAC16}
//   TIER: PRO or BIZ
//   YYYYMMDD: activation/issue date
//   RANDOM8: 8 alphanumeric characters
//   HMAC16: first 16 chars of HMAC-SHA256 signature (uppercase hex)
//
// Example: POS-PRO-20260321-A3F8K2M1-4B7C9D2E1F3A5B8C

use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

// Secret key for HMAC signing. In production, obfuscate this or derive from hardware ID.
// This MUST match the secret used in the generator tool.
const LICENSE_SECRET: &str = "POS_T4UR1_S3CRET_K3Y_2026_CHANGE_ME";

#[derive(Debug, Clone, serde::Serialize)]
pub struct LicenseValidationResult {
    pub valid: bool,
    pub tier: String,
    pub expires_at: Option<String>,
    pub message: String,
}

/// Validate a license key using HMAC-SHA256
pub fn validate_license_key(key: &str) -> LicenseValidationResult {
    let invalid = |msg: &str| LicenseValidationResult {
        valid: false,
        tier: "free".to_string(),
        expires_at: None,
        message: msg.to_string(),
    };

    if key.is_empty() {
        return invalid("Empty license key");
    }

    let key = key.trim().to_uppercase();

    // Free reset
    if key == "FREE" || key == "POS-FREE" {
        return LicenseValidationResult {
            valid: true,
            tier: "free".to_string(),
            expires_at: None,
            message: "Reset to free tier".to_string(),
        };
    }

    // Format: POS-{TIER}-{YYYYMMDD}-{RANDOM8}-{HMAC16}
    let parts: Vec<&str> = key.split('-').collect();
    if parts.len() != 5 {
        return invalid("Invalid format. Expected: POS-TIER-DATE-RANDOM-HMAC");
    }

    let prefix = parts[0];
    let tier_code = parts[1];
    let date_str = parts[2];
    let random_part = parts[3];
    let hmac_part = parts[4];

    // Validate prefix
    if prefix != "POS" {
        return invalid("Invalid prefix");
    }

    // Validate tier
    let tier = match tier_code {
        "PRO" => "pro",
        "BIZ" => "business",
        _ => return invalid("Invalid tier code. Use PRO or BIZ"),
    };

    // Validate date (YYYYMMDD)
    if date_str.len() != 8 || !date_str.chars().all(|c| c.is_ascii_digit()) {
        return invalid("Invalid date format. Expected YYYYMMDD");
    }

    let year: u32 = date_str[0..4].parse().unwrap_or(0);
    let month: u32 = date_str[4..6].parse().unwrap_or(0);
    let day: u32 = date_str[6..8].parse().unwrap_or(0);

    if year < 2024 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31 {
        return invalid("Invalid date values");
    }

    // Validate random part (8 alphanumeric)
    if random_part.len() != 8 || !random_part.chars().all(|c| c.is_ascii_alphanumeric()) {
        return invalid("Invalid random segment");
    }

    // Validate HMAC part (16 hex chars)
    if hmac_part.len() != 16 || !hmac_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return invalid("Invalid HMAC signature");
    }

    // Verify HMAC signature
    // The signed payload is: POS-{TIER}-{DATE}-{RANDOM}
    let payload = format!("{}-{}-{}-{}", prefix, tier_code, date_str, random_part);
    let expected_hmac = compute_hmac(&payload);

    if !hmac_part.eq_ignore_ascii_case(&expected_hmac) {
        return invalid("Invalid license key signature");
    }

    // Check expiry (1 year from issue date)
    let expiry_date = format!(
        "{:04}-{:02}-{:02}T23:59:59Z",
        year + 1,
        month,
        day.min(28) // avoid month overflow
    );

    // Check if already expired
    let issue_timestamp = chrono::NaiveDate::from_ymd_opt(year as i32, month, day.min(28))
        .unwrap_or_default()
        .and_hms_opt(0, 0, 0)
        .unwrap_or_default()
        .and_utc()
        .timestamp();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    if now > issue_timestamp + 365 * 24 * 3600 {
        return invalid("License key has expired");
    }

    LicenseValidationResult {
        valid: true,
        tier: tier.to_string(),
        expires_at: Some(expiry_date),
        message: format!(
            "{} license activated",
            if tier == "pro" { "Pro" } else { "Business" }
        ),
    }
}

/// Compute HMAC-SHA256 and return first 16 hex chars (uppercase)
pub fn compute_hmac(payload: &str) -> String {
    let mut mac =
        HmacSha256::new_from_slice(LICENSE_SECRET.as_bytes()).expect("HMAC initialization failed");
    mac.update(payload.as_bytes());
    let result = mac.finalize();
    let bytes = result.into_bytes();

    // Take first 8 bytes = 16 hex chars
    bytes[..8]
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<String>()
}

/// Generate a license key (for internal use / admin tool)
pub fn generate_license_key(tier: &str, year: u32, month: u32, day: u32) -> String {
    let tier_code = match tier {
        "pro" | "PRO" => "PRO",
        "business" | "BIZ" => "BIZ",
        _ => panic!("Invalid tier: {}", tier),
    };

    let date_str = format!("{:04}{:02}{:02}", year, month, day);

    // Generate 8 random alphanumeric chars
    let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut random_part = String::with_capacity(8);
    for _ in 0..8 {
        let idx = (rand::random::<u8>() as usize) % chars.len();
        random_part.push(chars[idx] as char);
    }

    // Compute HMAC
    let payload = format!("POS-{}-{}-{}", tier_code, date_str, random_part);
    let hmac_sig = compute_hmac(&payload);

    format!(
        "POS-{}-{}-{}-{}",
        tier_code, date_str, random_part, hmac_sig
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_validate() {
        let key = generate_license_key("pro", 2026, 3, 21);
        println!("Generated key: {}", key);

        let result = validate_license_key(&key);
        assert!(result.valid, "Generated key should be valid");
        assert_eq!(result.tier, "pro");
    }

    #[test]
    fn test_invalid_key() {
        let result = validate_license_key("INVALID-KEY");
        assert!(!result.valid);
    }

    #[test]
    fn test_tampered_key() {
        let key = generate_license_key("pro", 2026, 3, 21);
        let tampered = key.replace("PRO", "BIZ");
        let result = validate_license_key(&tampered);
        assert!(!result.valid, "Tampered key should be invalid");
    }

    #[test]
    fn test_free_reset() {
        let result = validate_license_key("FREE");
        assert!(result.valid);
        assert_eq!(result.tier, "free");
    }
}
