use std::env;
use std::path::Path;

use giteach_core::{TechnologyEvolutionOptions, collect_technology_evolution};

fn main() {
    let mut args = env::args().skip(1);
    let root = args.next().unwrap_or_else(|| ".".to_string());
    let max_snapshots = args
        .next()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(12);
    let evolution = collect_technology_evolution(
        Path::new(&root),
        TechnologyEvolutionOptions { max_snapshots },
    )
    .expect("technology evolution collection failed");
    println!("{}", serde_json::to_string_pretty(&evolution).unwrap());
}
