#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "probeinterface",
# ]
# ///
"""
Build the probe-viewer app for h-mayorquin.github.io

Usage:
    uv run scripts/build_probe_viewer.py

Or make executable and run directly:
    ./scripts/build_probe_viewer.py

This script:
1. Clones/updates probeinterface_library to get probe JSON files
2. Generates the manifest and copies probe JSON files to apps/probe-viewer/public/
3. Builds the frontend with Vite
4. Output is in apps/probe-viewer/dist/
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from probeinterface import ProbeGroup, read_probeinterface


# ============================================================================
# Manifest generation
# ============================================================================


@dataclass
class ManifestEntry:
    """Serializable manifest entry for a single probe model."""

    id: str
    manufacturer: str
    model: str
    display_name: str
    json_url: str
    contact_count: int
    shank_count: int
    has_3d_geometry: bool
    annotations: dict

    def to_json(self) -> dict:
        return asdict(self)


def iter_manufacturer_dirs(base_path: Path) -> Iterable[Path]:
    for path in sorted(base_path.iterdir()):
        if path.is_dir() and not path.name.startswith("."):
            yield path


def load_probe_metadata(json_path: Path) -> ManifestEntry:
    probegroup: ProbeGroup = read_probeinterface(json_path)
    probes = probegroup.probes
    if not probes:
        raise ValueError(f"No probes found in {json_path}")

    manufacturer = json_path.parents[1].name
    model = json_path.parent.name
    probe_id = f"{manufacturer}:{model}"

    total_contacts = sum(probe.get_contact_count() for probe in probes)
    shank_count = max(probe.get_shank_count() for probe in probes)
    has_3d = any(probe.ndim == 3 for probe in probes)
    annotations = probes[0].annotations if hasattr(probes[0], "annotations") else {}
    display_name = annotations.get("model_name") or model

    return ManifestEntry(
        id=probe_id,
        manufacturer=manufacturer,
        model=model,
        display_name=display_name,
        json_url=json_path.name,
        contact_count=total_contacts,
        shank_count=shank_count,
        has_3d_geometry=has_3d,
        annotations=annotations,
    )


def copy_model_assets(model_dir: Path, destination_dir: Path) -> None:
    destination_dir.mkdir(parents=True, exist_ok=True)
    for asset_path in model_dir.iterdir():
        if asset_path.suffix.lower() != ".json":
            continue
        dest_path = destination_dir / asset_path.name
        shutil.copy2(asset_path, dest_path)


def generate_manifest(
    repository_root: Path,
    output_dir: Path,
) -> list[ManifestEntry]:
    entries: list[ManifestEntry] = []

    data_dir = output_dir / "data"
    if data_dir.exists():
        shutil.rmtree(data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    for manufacturer_dir in iter_manufacturer_dirs(repository_root):
        manufacturer = manufacturer_dir.name

        # Skip non-probe directories
        if manufacturer in {"frontend", "scripts", "docs", ".git", ".github", ".venv"}:
            continue

        model_dirs = [
            model_dir
            for model_dir in iter_manufacturer_dirs(manufacturer_dir)
            if (model_dir / f"{model_dir.name}.json").exists()
        ]

        if not model_dirs:
            continue

        for model_dir in model_dirs:
            model = model_dir.name
            json_path = model_dir / f"{model}.json"

            try:
                entry = load_probe_metadata(json_path)
            except Exception as exc:
                print(f"Warning: Failed to parse {json_path}: {exc}", file=sys.stderr)
                continue

            copy_model_assets(model_dir, data_dir / manufacturer / model)
            entry.json_url = f"data/{manufacturer}/{model}/{entry.json_url}"
            entries.append(entry)

    entries.sort(key=lambda item: (item.manufacturer.lower(), item.model.lower()))
    return entries


def write_manifest(entries: Iterable[ManifestEntry], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    payload = [entry.to_json() for entry in entries]
    destination.write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8",
    )


# ============================================================================
# Build logic
# ============================================================================


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and print it."""
    print(f"  > {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, check=check)


def find_or_clone_probeinterface_library(cache_dir: Path) -> Path:
    """Find local probeinterface_library or clone it."""

    # Check common local paths
    candidates = [
        Path.home() / "development" / "work_repos" / "probeinterface_library",
        cache_dir.parent.parent / "probeinterface_library",  # sibling dir
    ]

    for candidate in candidates:
        if candidate.exists() and (candidate / "imec").is_dir():
            print(f"Using local probeinterface_library: {candidate}")
            return candidate

    # Clone to cache
    clone_dir = cache_dir / "probeinterface_library"
    if clone_dir.exists():
        print("Updating cached probeinterface_library...")
        run(["git", "pull", "--ff-only"], cwd=clone_dir, check=False)
    else:
        print("Cloning probeinterface_library...")
        clone_dir.parent.mkdir(parents=True, exist_ok=True)
        run([
            "git", "clone", "--depth", "1",
            "https://github.com/SpikeInterface/probeinterface_library.git",
            str(clone_dir)
        ])

    return clone_dir


def build_frontend(frontend_dir: Path, base_path: str) -> Path:
    """Build the frontend and return the dist directory."""

    # Install dependencies if needed
    if not (frontend_dir / "node_modules").exists():
        print("Installing npm dependencies...")
        run(["npm", "install"], cwd=frontend_dir)

    # Build
    print("Building frontend...")
    run(["npx", "vite", "build", "--base", base_path], cwd=frontend_dir)

    return frontend_dir / "dist"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build probe-viewer for GitHub Pages")
    parser.add_argument(
        "--probeinterface-library",
        type=Path,
        default=None,
        help="Path to probeinterface_library repo (auto-detected or cloned if not specified)",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Start dev server instead of building",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    cache_dir = repo_root / ".cache"

    # Frontend source is in apps/probe-viewer/
    frontend_dir = repo_root / "apps" / "probe-viewer"
    public_dir = frontend_dir / "public"

    if not frontend_dir.exists():
        print(f"Error: Frontend source not found at {frontend_dir}", file=sys.stderr)
        sys.exit(1)

    # Find or clone probeinterface_library for probe data
    if args.probeinterface_library:
        probeinterface_lib = args.probeinterface_library.resolve()
    else:
        probeinterface_lib = find_or_clone_probeinterface_library(cache_dir)

    # Generate manifest and copy probe JSONs to public/
    print(f"Generating manifest from {probeinterface_lib}...")
    entries = generate_manifest(probeinterface_lib, public_dir)
    manifest_path = public_dir / "probes-manifest.json"
    write_manifest(entries, manifest_path)
    print(f"Wrote {len(entries)} entries to {manifest_path}")

    if args.dev:
        # Start dev server
        print("Starting dev server...")
        run(["npm", "run", "dev"], cwd=frontend_dir)
    else:
        # Build frontend
        dist_dir = build_frontend(frontend_dir, "/apps/probe-viewer/")

        # Add 404.html for client-side routing
        shutil.copy(dist_dir / "index.html", dist_dir / "404.html")

        print(f"Done! Build output at: {dist_dir}")


if __name__ == "__main__":
    main()
