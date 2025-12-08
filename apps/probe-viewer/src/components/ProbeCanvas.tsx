import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";

import { useResizeObserver } from "../hooks/useResizeObserver";
import { VIEW_ZOOM_MAX, VIEW_ZOOM_MIN } from "../state/useAppStore";
import type { ContactShapeParams, ManifestEntry, ProbeInterfaceFile } from "../types/probe";

interface ProbeCanvasProps {
  entry: ManifestEntry;
  probeData: ProbeInterfaceFile;
  zoom: number;
  panX: number;
  panY: number;
  showContactIds: boolean;
  onPan: (x: number, y: number) => void;
  onZoom: (zoom: number) => void;
}

interface GeometrySummary {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

function computeGeometrySummary(probeData: ProbeInterfaceFile): GeometrySummary | null {
  const probe = probeData.probes?.[0];
  if (!probe) {
    return null;
  }

  const positions = probe.contact_positions ?? [];
  if (positions.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const updateBounds = (point: number[]) => {
    const [x, y] = point;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  positions.forEach(updateBounds);
  (probe.probe_planar_contour ?? []).forEach(updateBounds);

  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return { minX, maxX, minY, maxY, width, height, centerX, centerY };
}

export function ProbeCanvas({
  entry,
  probeData,
  zoom,
  panX,
  panY,
  showContactIds,
  onPan,
  onZoom,
}: ProbeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: containerRef, size } = useResizeObserver<HTMLDivElement>();
  const [isDragging, setIsDragging] = useState(false);
  const dragOriginRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const geometry = useMemo(() => computeGeometrySummary(probeData), [probeData]);
  const probe = useMemo(() => probeData.probes?.[0], [probeData]);

  useEffect(() => {
    if (!canvasRef.current || !size.width || !size.height || !geometry || !probe) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const widthPx = size.width;
    const heightPx = size.height;
    canvas.width = widthPx * devicePixelRatio;
    canvas.height = heightPx * devicePixelRatio;
    canvas.style.width = `${widthPx}px`;
    canvas.style.height = `${heightPx}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    ctx.clearRect(0, 0, widthPx, heightPx);

    const padding = 40;
    const availableWidth = Math.max(10, widthPx - padding * 2);
    const availableHeight = Math.max(10, heightPx - padding * 2);
    // For tall probes (height > width), fit width so contacts are visible
    // For wide/square probes, fit all to show the complete probe
    const aspectRatio = geometry.height / geometry.width;
    const baseScale = aspectRatio > 1
      ? availableWidth / geometry.width
      : Math.min(availableWidth / geometry.width, availableHeight / geometry.height);
    const scale = baseScale * zoom;

    const offsetX = widthPx / 2 + panX;
    const offsetY = heightPx / 2 + panY;

    const projectPoint = (point: number[]) => {
      const [x, y] = point;
      const normX = (x - geometry.centerX) * scale + offsetX;
      const normY = -(y - geometry.centerY) * scale + offsetY;
      return [normX, normY];
    };

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (probe.probe_planar_contour && probe.probe_planar_contour.length > 1) {
      ctx.beginPath();
      probe.probe_planar_contour.forEach((point, index) => {
        const [x, y] = projectPoint(point);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(180, 185, 195, 0.7)";  // Metallic silver
      ctx.strokeStyle = "rgba(100, 105, 115, 0.95)";
      ctx.lineWidth = Math.max(1.2, 2.5 * (scale / 100));
      ctx.fill();
      ctx.stroke();
    }

    const contactPositions = probe.contact_positions ?? [];
    const contactShapes = probe.contact_shapes ?? [];
    const contactShapeParams = probe.contact_shape_params ?? [];

    // Helper to draw a contact shape
    const drawContactShape = (
      x: number,
      y: number,
      shape: string,
      params: ContactShapeParams,
    ) => {
      ctx.beginPath();
      switch (shape) {
        case "circle": {
          const radius = (params.radius ?? 5) * scale;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          break;
        }
        case "square": {
          const side = (params.width ?? 10) * scale;
          ctx.rect(x - side / 2, y - side / 2, side, side);
          break;
        }
        case "rect": {
          const w = (params.width ?? 10) * scale;
          const h = (params.height ?? 15) * scale;
          ctx.rect(x - w / 2, y - h / 2, w, h);
          break;
        }
        default: {
          // Unknown/missing shape: draw a dot with X to indicate missing data
          const markerSize = Math.max(3, Math.min(10, 7 * (scale / 100)));
          // Draw small circle
          ctx.arc(x, y, markerSize * 0.4, 0, Math.PI * 2);
          ctx.closePath();
          // Draw X through the center
          ctx.moveTo(x - markerSize, y - markerSize);
          ctx.lineTo(x + markerSize, y + markerSize);
          ctx.moveTo(x + markerSize, y - markerSize);
          ctx.lineTo(x - markerSize, y + markerSize);
        }
      }
    };

    // Shadow offset for depth effect
    const shadowOffset = Math.max(3, 4 * (scale / 100));

    // First pass: draw shadows (offset dark shapes)
    contactPositions.forEach((position, index) => {
      const [x, y] = projectPoint(position);
      const shape = contactShapes[index] ?? "";
      const params = contactShapeParams[index] ?? {};

      drawContactShape(x + shadowOffset, y + shadowOffset, shape, params);
      ctx.fillStyle = "rgba(30, 20, 5, 0.7)";  // Even darker and more opaque
      ctx.fill();
    });

    // Second pass: draw gold contacts on top
    contactPositions.forEach((position, index) => {
      const [x, y] = projectPoint(position);
      const shape = contactShapes[index] ?? "";
      const params = contactShapeParams[index] ?? {};

      drawContactShape(x, y, shape, params);

      ctx.fillStyle = "rgba(212, 175, 55, 0.9)";  // Gold contacts
      ctx.strokeStyle = "rgba(80, 60, 15, 0.9)";  // Dark bronze outline
      ctx.lineWidth = Math.max(1.2, 2.5 * (scale / 150));
      ctx.fill();
      ctx.stroke();
    });

    if (showContactIds) {
      ctx.font = `${Math.max(10, Math.min(14, 10 * (scale / 100)))}px "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      contactPositions.forEach((position, index) => {
        const [x, y] = projectPoint(position);
        ctx.fillText(String(index), x, y + 4);
      });
    }

    // === L-Shaped Scale Bar ===
    // Renders a scale bar in the bottom-left corner showing reference lengths
    // for both X and Y dimensions. The length adapts to zoom level using "nice" numbers.
    const renderScaleBar = () => {
      // Calculate adaptive scale bar length using "nice" numbers
      const niceNumbers = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
      const targetPixels = 80; // Target bar length in pixels
      const targetUm = targetPixels / scale;
      const scaleBarUm = niceNumbers.reduce((prev, curr) =>
        Math.abs(curr - targetUm) < Math.abs(prev - targetUm) ? curr : prev
      );
      const scaleBarPixels = scaleBarUm * scale;

      // Position: bottom-left corner
      const margin = 20;
      const cornerX = margin;
      const cornerY = heightPx - margin;
      const tickSize = 4;

      // Style for L shape
      ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
      ctx.lineWidth = 2;
      ctx.lineCap = "square";

      // Draw L shape
      ctx.beginPath();
      // Vertical arm (Y) - goes up from corner
      ctx.moveTo(cornerX, cornerY);
      ctx.lineTo(cornerX, cornerY - scaleBarPixels);
      // Horizontal arm (X) - goes right from corner
      ctx.moveTo(cornerX, cornerY);
      ctx.lineTo(cornerX + scaleBarPixels, cornerY);
      ctx.stroke();

      // End ticks
      ctx.beginPath();
      // Top of vertical arm
      ctx.moveTo(cornerX - tickSize, cornerY - scaleBarPixels);
      ctx.lineTo(cornerX + tickSize, cornerY - scaleBarPixels);
      // Right of horizontal arm
      ctx.moveTo(cornerX + scaleBarPixels, cornerY - tickSize);
      ctx.lineTo(cornerX + scaleBarPixels, cornerY + tickSize);
      ctx.stroke();

      // Labels
      const label = scaleBarUm >= 1000 ? `${scaleBarUm / 1000} mm` : `${scaleBarUm} μm`;
      ctx.font = '11px "Inter", sans-serif';
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";

      // X label (below horizontal arm)
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, cornerX + scaleBarPixels / 2, cornerY + 5);

      // Y label (beside vertical arm)
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cornerX + 6, cornerY - scaleBarPixels / 2);
    };

    renderScaleBar();
  }, [entry.id, geometry, panX, panY, probe, probeData, showContactIds, size.height, size.width, zoom]);

  const clampZoom = useCallback(
    (value: number) => Math.min(VIEW_ZOOM_MAX, Math.max(VIEW_ZOOM_MIN, value)),
    [],
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const zoomFactor = Math.exp(-event.deltaY * 0.002);
      const nextZoom = clampZoom(zoom * zoomFactor);
      onZoom(nextZoom);
    },
    [clampZoom, onZoom, zoom],
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsDragging(true);
    dragOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX,
      panY,
    };
    (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId);
  }, [panX, panY]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragOriginRef.current) {
      return;
    }
    event.preventDefault();
    const deltaX = event.clientX - dragOriginRef.current.x;
    const deltaY = event.clientY - dragOriginRef.current.y;
    onPan(dragOriginRef.current.panX + deltaX, dragOriginRef.current.panY + deltaY);
  }, [isDragging, onPan]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      event.preventDefault();
      setIsDragging(false);
      dragOriginRef.current = null;
      (event.target as HTMLCanvasElement).releasePointerCapture(event.pointerId);
    }
  }, [isDragging]);

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const zoomFactor = event.shiftKey ? 1 / 1.5 : 1.5;
      const nextZoom = clampZoom(zoom * zoomFactor);
      onZoom(nextZoom);
    },
    [clampZoom, onZoom, zoom],
  );

  return (
    <div ref={containerRef} className="viewer-canvas-surface">
      {geometry && probe ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${entry.displayName} planar layout`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        />
      ) : (
        <div className="viewer-placeholder">
          <p>No planar geometry available for this probe.</p>
        </div>
      )}
    </div>
  );
}
