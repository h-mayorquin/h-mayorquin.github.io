import { useEffect, useMemo, useRef } from "react";

import { useAppStore, VIEW_ZOOM_MAX, VIEW_ZOOM_MIN } from "../state/useAppStore";
import { JsonTree } from "./JsonTree";
import { ProbeCanvas } from "./ProbeCanvas";

export function ProbeViewer() {
  const manifest = useAppStore((state) => state.manifest);
  const manifestStatus = useAppStore((state) => state.manifestStatus);
  const manifestError = useAppStore((state) => state.manifestError);
  const selectedProbeId = useAppStore((state) => state.selectedProbeId);
  const ensureProbeLoaded = useAppStore((state) => state.ensureProbeLoaded);
  const probeCache = useAppStore((state) => state.probeCache);
  const probeStatus = useAppStore((state) => state.probeStatus);
  const view = useAppStore((state) => state.view);
  const setZoom = useAppStore((state) => state.setZoom);
  const setPan = useAppStore((state) => state.setPan);
  const resetView = useAppStore((state) => state.resetView);
  const toggleContactIds = useAppStore((state) => state.toggleContactIds);

  useEffect(() => {
    if (selectedProbeId) {
      void ensureProbeLoaded(selectedProbeId);
    }
  }, [selectedProbeId, ensureProbeLoaded]);

  const entry = useMemo(
    () => manifest.find((item) => item.id === selectedProbeId),
    [manifest, selectedProbeId],
  );

  const status = selectedProbeId
    ? probeStatus[selectedProbeId]?.status ?? "idle"
    : "idle";
  const statusMessage = selectedProbeId
    ? probeStatus[selectedProbeId]?.error
    : manifestError;

  const probeData = selectedProbeId ? probeCache[selectedProbeId] : undefined;

  const lastResetProbeId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (selectedProbeId && lastResetProbeId.current !== selectedProbeId) {
      resetView();
      lastResetProbeId.current = selectedProbeId;
    }
    if (!selectedProbeId) {
      lastResetProbeId.current = undefined;
    }
  }, [selectedProbeId, resetView]);

  // Smart initial zoom for very tall probes (like Neuropixels)
  // When probe geometry has extreme aspect ratio, zoom in so probe is ~1/3 of viewport width
  const lastSmartZoomProbeId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!probeData || !selectedProbeId) return;
    if (lastSmartZoomProbeId.current === selectedProbeId) return;

    const probe = probeData.probes?.[0];
    if (!probe) return;

    const positions = probe.contact_positions ?? [];
    const contour = probe.probe_planar_contour ?? [];
    if (positions.length === 0) return;

    // Calculate geometry bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const updateBounds = (point: number[]) => {
      const [x, y] = point;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    positions.forEach(updateBounds);
    contour.forEach(updateBounds);

    const width = Math.max(10, maxX - minX);
    const height = Math.max(10, maxY - minY);
    const aspectRatio = height / width;

    const TALL_THRESHOLD = 10;
    const TARGET_WIDTH_FRACTION = 1 / 3;

    if (aspectRatio > TALL_THRESHOLD) {
      // For very tall probes, start zoomed in
      // At zoom=1, the probe fits entirely (height-constrained)
      // We want the probe width to be ~1/3 of viewport width
      // initialZoom = (viewport_width * TARGET_WIDTH_FRACTION / probe_width) / (viewport_height / probe_height)
      // Simplified: initialZoom = aspectRatio * TARGET_WIDTH_FRACTION * (viewport_width / viewport_height)
      // Since we don't know viewport here, approximate with aspect ratio alone
      const initialZoom = aspectRatio * TARGET_WIDTH_FRACTION;
      setZoom(initialZoom);
    }

    lastSmartZoomProbeId.current = selectedProbeId;
  }, [probeData, selectedProbeId, setZoom]);

  if (manifestStatus === "loading") {
    return (
      <div className="viewer-placeholder">
        <p>Loading manifest…</p>
      </div>
    );
  }

  if (manifestStatus === "error") {
    return (
      <div className="viewer-placeholder viewer-placeholder--error">
        <p>{statusMessage ?? "Unable to load catalog."}</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="viewer-placeholder">
        <p>Select a probe to see its details.</p>
      </div>
    );
  }

  return (
    <div className="viewer-panel">
      <header className="viewer-header">
        <div>
          <h2 className="viewer-title">{entry.displayName}</h2>
          <p className="viewer-subtitle">
            {entry.manufacturer} · {entry.contactCount} contacts ·{" "}
            {entry.shankCount} shanks
          </p>
        </div>
        <a
          className="viewer-download"
          href={entry.jsonUrl}
          target="_blank"
          rel="noreferrer"
        >
          Download JSON
        </a>
      </header>

      <section className="viewer-controls">
        <div className="viewer-controls-group">
          <button
            type="button"
            onClick={() => setZoom(Math.min(view.zoom * 1.5, VIEW_ZOOM_MAX))}
          >
            Zoom in
          </button>
          <button
            type="button"
            onClick={() => setZoom(Math.max(view.zoom / 1.5, VIEW_ZOOM_MIN))}
          >
            Zoom out
          </button>
          <button type="button" onClick={() => resetView()}>
            Reset view
          </button>
        </div>
        <div className="viewer-controls-group">
          <label className="viewer-toggle">
            <input
              type="checkbox"
              checked={view.showContactIds}
              onChange={(event) => toggleContactIds(event.target.checked)}
            />
            Show contact IDs
          </label>
        </div>
      </section>

      <section className="viewer-canvas">
        {status === "error" && (
          <div className="viewer-placeholder viewer-placeholder--error">
            <p>{statusMessage ?? "Failed to load probe data."}</p>
          </div>
        )}
        {status !== "error" && probeData && (
          <ProbeCanvas
            entry={entry}
            probeData={probeData}
            zoom={view.zoom}
            panX={view.panX}
            panY={view.panY}
            showContactIds={view.showContactIds}
            onPan={(nextX, nextY) => setPan(nextX, nextY)}
            onZoom={(value) => setZoom(value)}
          />
        )}
        {status === "loading" && (
          <div className="viewer-placeholder">
            <p>Loading probe geometry…</p>
          </div>
        )}
      </section>

      <section className="viewer-json-panel">
        <div className="viewer-json-header">
          <h3>Probe JSON</h3>
          {status === "success" && probeData && (
            <span className="viewer-json-meta">
              {probeData.specification} · v{probeData.version}
            </span>
          )}
        </div>
        {status === "loading" && <p>Fetching probe data…</p>}
        {status === "error" && (
          <p className="viewer-placeholder--error">{statusMessage}</p>
        )}
        {status === "success" && probeData && (
          <div className="viewer-json">
            <JsonTree
              data={probeData}
              name={entry.displayName}
              defaultExpanded={false}
            />
          </div>
        )}
      </section>
    </div>
  );
}
