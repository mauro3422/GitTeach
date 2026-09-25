use std::{env, process::ExitCode};

use giteach_core::{CollectorOptions, RepoEvidenceCollector};

fn main() -> ExitCode {
    let Some(root) = env::args().nth(1) else {
        eprintln!("usage: cargo run -p giteach-core --example scan_repo -- <repo-path>");
        return ExitCode::from(2);
    };

    let collector = RepoEvidenceCollector::new(CollectorOptions::default());
    let bundle = match collector.collect(&root) {
        Ok(bundle) => bundle,
        Err(error) => {
            eprintln!("GitTeach scan failed: {error}");
            return ExitCode::from(1);
        }
    };

    match serde_json::to_string_pretty(&bundle) {
        Ok(json) => println!("{json}"),
        Err(error) => {
            eprintln!("GitTeach serialization failed: {error}");
            return ExitCode::from(1);
        }
    }
    ExitCode::SUCCESS
}
