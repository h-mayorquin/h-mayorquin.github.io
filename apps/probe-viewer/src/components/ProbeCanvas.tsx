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
import type { ManifestEntry, ProbeInterfaceFile } from "../types/probe";

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
    const baseScale = Math.min(
      availableWidth / geometry.width,
      availableHeight / geometry.height,
    );
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
      ctx.fillStyle = "rgba(14, 116, 144, 0.15)";
      ctx.strokeStyle = "rgba(13, 148, 136, 0.8)";
      ctx.lineWidth = Math.max(1.2, 2.5 * (scale / 100));
      ctx.fill();
      ctx.stroke();
    }

    const contactPositions = probe.contact_positions ?? [];
    const shankIds = probe.shank_ids ?? [];
    const isMultiShank = new Set(shankIds).size > 1;

    contactPositions.forEach((position, index) => {
      const [x, y] = projectPoint(position);
      const radius = Math.max(2.5, Math.min(8, 6 * (scale / 100)));
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isMultiShank
        ? shankIds[index] % 2 === 0
          ? "rgba(59, 130, 246, 0.85)"
          : "rgba(37, 99, 235, 0.85)"
        : "rgba(37, 99, 235, 0.9)";
      ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
      ctx.lineWidth = Math.max(0.8, 1.6 * (scale / 150));
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
