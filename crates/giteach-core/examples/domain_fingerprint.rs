use std::{env, process::ExitCode};

use giteach_core::{
    CollectorOptions, RepoEvidenceCollector, analyze_repository_domain_fingerprint,
};

fn main() -> ExitCode {
    let Some(root) = env::args().nth(1) else {
        eprintln!(
            "usage: cargo run -p giteach-core --example domain_fingerprint -- <repo-root> [topic,topic,...]"
        );
        return ExitCode::from(2);
    };
    let topics = env::args()
        .nth(2)
        .map(|value| {
            value
                .split(',')
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let collector = RepoEvidenceCollector::new(CollectorOptions::default());
    let bundle = match collector.collect(&root) {
        Ok(bundle) => bundle,
        Err(error) => {
            eprintln!("collect failed: {error}");
            return ExitCode::FAILURE;
        }
    };

    let fingerprint = match analyze_repository_domain_fingerprint(&bundle, &topics, None) {
        Ok(value) => value,
        Err(error) => {
            eprintln!("fingerprint failed: {error}");
            return ExitCode::FAILURE;
        }
    };

    match serde_json::to_string_pretty(&fingerprint) {
        Ok(json) => {
            println!("{json}");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("serialize failed: {error}");
            ExitCode::FAILURE
        }
    }
}
