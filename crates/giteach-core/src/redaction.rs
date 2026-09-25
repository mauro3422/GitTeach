const SENSITIVE_TERMS: &[&str] = &[
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "auth_token",
    "client_secret",
    "private_key",
    "password",
    "passwd",
    "secret",
];

pub fn bounded_redacted_excerpt(text: &str, max_chars: usize) -> (Option<String>, u64) {
    let trimmed = text.trim();
    if trimmed.is_empty() || max_chars == 0 {
        return (None, 0);
    }

    let mut out = String::new();
    let mut redactions = 0_u64;
    for line in trimmed.lines() {
        let (safe_line, was_redacted) = redact_line(line);
        if was_redacted {
            redactions += 1;
        }
        if !out.is_empty() {
            out.push('\n');
        }
        out.push_str(&safe_line);
    }
    let bounded: String = out.chars().take(max_chars).collect();
    (Some(bounded), redactions)
}

fn redact_line(line: &str) -> (String, bool) {
    let lower = line.to_ascii_lowercase();
    if let Some(index) = lower.find("bearer ") {
        let prefix_end = index + "bearer ".len();
        return (format!("{}<redacted>", &line[..prefix_end]), true);
    }

    let sensitive = SENSITIVE_TERMS.iter().any(|term| lower.contains(term));
    if !sensitive {
        return (line.to_string(), false);
    }

    let separator = line.find('=').or_else(|| line.find(':'));
    if let Some(index) = separator {
        let prefix = &line[..=index];
        return (format!("{prefix} <redacted>"), true);
    }

    (line.to_string(), false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_common_secret_assignments() {
        let (text, count) = bounded_redacted_excerpt("API_KEY = \"abc123\"\nname = \"demo\"", 200);
        let text = text.unwrap();
        assert!(text.contains("API_KEY = <redacted>"));
        assert!(!text.contains("abc123"));
        assert_eq!(count, 1);
    }
}
