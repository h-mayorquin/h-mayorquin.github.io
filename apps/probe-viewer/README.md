# Probe Viewer

An interactive web-based visualization tool for browsing microelectrode probe designs used in neuroscience research. The probe data comes from the [probeinterface_library](https://github.com/SpikeInterface/probeinterface_library).

## Local Development

### Prerequisites

- Node.js (v18 or later recommended)
- Python 3.13+ with [uv](https://docs.astral.sh/uv/) package manager
- Git

### Quick Start

1. **Generate the probe manifest and data files:**

   From the repository root, run:

   ```bash
   uv run scripts/build_probe_viewer.py --dev
   ```

   This will:
   - Clone or find a local copy of probeinterface_library
   - Generate `public/probes-manifest.json` with metadata for all probes
   - Copy probe JSON files to `public/data/`
   - Start the Vite dev server

2. **Access the app:**

   Open http://localhost:5173 in your browser.

### Alternative: Manual Setup

If you prefer to run steps separately:

1. **Generate the manifest only:**

   ```bash
   uv run scripts/build_probe_viewer.py
   ```

   This generates the manifest without starting the dev server.

2. **Install npm dependencies:**

   ```bash
   cd apps/probe-viewer
   npm install
   ```

3. **Start the dev server:**

   ```bash
   npm run dev
   ```

### Using a Local probeinterface_library

If you have a local clone of probeinterface_library, you can specify it directly:

```bash
uv run scripts/build_probe_viewer.py --probeinterface-library /path/to/probeinterface_library --dev
```

The script automatically checks common locations:
- `~/development/work_repos/probeinterface_library`
- Sibling directory to this repository

### Available Scripts

From the `apps/probe-viewer` directory:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (requires manifest to exist) |
| `npm run build` | Build for production (runs manifest generation first) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

### Project Structure

```
apps/probe-viewer/
├── src/
│   ├── components/      # React components
│   ├── services/        # Data fetching
│   ├── state/           # Zustand store
│   ├── types/           # TypeScript types
│   └── hooks/           # Custom React hooks
├── public/
│   ├── probes-manifest.json  # Generated probe catalog
│   └── data/                 # Generated probe JSON files
└── index.html
```

## Technology Stack

- React 19 + TypeScript
- Vite for bundling
- Zustand for state management
- React Router for navigation
- HTML5 Canvas for probe visualization
