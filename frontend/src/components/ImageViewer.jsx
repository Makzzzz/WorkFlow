import React from 'react';

const MIN_SCALE = 0.3;
const MAX_SCALE = 8;
const MIN_LOG = Math.log(MIN_SCALE);
const MAX_LOG = Math.log(MAX_SCALE);

const scaleToSlider = (s) =>
  Math.round(((Math.log(s) - MIN_LOG) / (MAX_LOG - MIN_LOG)) * 100);

const sliderToScale = (v) =>
  Math.exp(MIN_LOG + (v / 100) * (MAX_LOG - MIN_LOG));

const PEN_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
  '<path d="M2 22 L4 16 L16 4 L20 8 L8 19 Z" fill="white" stroke="#222" stroke-width="1.2" stroke-linejoin="round"/>' +
  '<path d="M2 22 L4 16 L6 17.5 Z" fill="#222"/>' +
  '<path d="M16 4 L18 2 L22 6 L20 8 Z" fill="#aaa" stroke="#555" stroke-width="0.8" stroke-linejoin="round"/>' +
  '</svg>'
)}") 2 22, crosshair`;

const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
  '<path d="M4 20 L8 20 L20 8 L16 4 L4 16 Z" fill="white" stroke="#333" stroke-width="1.3" stroke-linejoin="round"/>' +
  '<path d="M4 16 L8 20 L4 20 Z" fill="#f87171" stroke="#333" stroke-width="1.3" stroke-linejoin="round"/>' +
  '<line x1="2" y1="20" x2="22" y2="20" stroke="#333" stroke-width="1.3" stroke-linecap="round"/>' +
  '</svg>'
)}") 4 20, default`;

// Distance from point to line segment (world space)
const distToSegment = (pt, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2));
  return Math.hypot(pt.x - (a.x + t * dx), pt.y - (a.y + t * dy));
};

const hitTestStroke = (stroke, pt, radius) => {
  if (stroke.tool === 'highlight') {
    const [p1, p2] = stroke.points;
    if (!p1 || !p2) return false;
    return pt.x >= Math.min(p1.x, p2.x) - radius &&
           pt.x <= Math.max(p1.x, p2.x) + radius &&
           pt.y >= Math.min(p1.y, p2.y) - radius &&
           pt.y <= Math.max(p1.y, p2.y) + radius;
  }
  if (stroke.tool === 'pen') {
    return stroke.points.some((p, i) => {
      if (i === 0) return Math.hypot(p.x - pt.x, p.y - pt.y) <= radius;
      return distToSegment(pt, stroke.points[i - 1], p) <= radius;
    });
  }
  return false;
};

export function ImageViewer({ src, previewLarge, onToggleLarge, onSrcError }) {
  const containerRef = React.useRef(null);
  const imgRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const scaleRef = React.useRef(1);
  const offsetRef = React.useRef({ x: 0, y: 0 });
  const dragRef = React.useRef(null);
  const touchRef = React.useRef(null);
  const strokesRef = React.useRef([]);
  const currentStrokeRef = React.useRef(null);
  const redoStackRef = React.useRef([]);
  const penColorRef = React.useRef('#1a1a1a');
  const penSizeRef = React.useRef(2);
  const highlightColorRef = React.useRef('#eab308');
  const highlightOpacityRef = React.useRef(0.5);
  const eraserSizeRef = React.useRef(10);
  const eraserModeRef = React.useRef('object');
  const eraserActiveRef = React.useRef(false);
  const eraserPosRef = React.useRef(null);
  const activeToolRef = React.useRef('pointer');
  const isCustomColorRef = React.useRef(false);

  const [sliderVal, setSliderVal] = React.useState(scaleToSlider(1));
  const [isDragging, setIsDragging] = React.useState(false);
  const [activeTool, setActiveTool] = React.useState('pointer');
  const [toolbarOpen, setToolbarOpen] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [showPenOptions, setShowPenOptions] = React.useState(false);
  const [showHighlightOptions, setShowHighlightOptions] = React.useState(false);
  const [showEraserOptions, setShowEraserOptions] = React.useState(false);
  const [penColor, setPenColor] = React.useState('#1a1a1a');
  const [penSize, setPenSize] = React.useState(2);
  const [colorList, setColorList] = React.useState(['#1a1a1a', '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e', '#1ca38b', '#3b82f6', '#8b5cf6']);
  const [highlightColor, setHighlightColor] = React.useState('#eab308');
  const [highlightOpacity, setHighlightOpacity] = React.useState(0.5);
  const [eraserSize, setEraserSize] = React.useState(10);
  const [eraserMode, setEraserMode] = React.useState('object');

  const DRAWING_TOOLS = ['pen', 'highlight', 'eraser'];
  const HIGHLIGHT_COLORS = ['#eab308', '#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#1ca38b', '#1a1a1a'];

  // ─── Tool handlers ───────────────────────────────────────────────────────────

  const handleSetActiveTool = (tool) => {
    if (tool === 'pen' && activeTool === 'pen') {
      setShowPenOptions(v => !v);
      setShowHighlightOptions(false);
      setShowEraserOptions(false);
      return;
    }
    if (tool === 'highlight' && activeTool === 'highlight') {
      setShowHighlightOptions(v => !v);
      setShowPenOptions(false);
      setShowEraserOptions(false);
      return;
    }
    if (tool === 'eraser' && activeTool === 'eraser') {
      setShowEraserOptions(v => !v);
      setShowPenOptions(false);
      setShowHighlightOptions(false);
      return;
    }
    activeToolRef.current = tool;
    setActiveTool(tool);
    setShowPenOptions(false);
    setShowHighlightOptions(false);
    setShowEraserOptions(false);
  };

  const handlePenColor = (c, isCustom = false) => { penColorRef.current = c; setPenColor(c); isCustomColorRef.current = isCustom; };
  const handlePenSize = (s) => { penSizeRef.current = s; setPenSize(s); };
  const handleHighlightColor = (c) => { highlightColorRef.current = c; setHighlightColor(c); };
  const handleHighlightOpacity = (v) => { highlightOpacityRef.current = v; setHighlightOpacity(v); };
  const handleEraserSize = (s) => { eraserSizeRef.current = s; setEraserSize(s); renderCanvas(); };
  const handleEraserMode = (m) => { eraserModeRef.current = m; setEraserMode(m); };

  // ─── Finalize stroke ──────────────────────────────────────────────────────────

  const finalizeStroke = () => {
    if (!currentStrokeRef.current) return;
    const s = currentStrokeRef.current;
    let valid;
    if (s.tool === 'highlight') {
      const [p1, p2] = s.points;
      valid = p1 && p2 && (Math.abs(p1.x - p2.x) > 0.5 || Math.abs(p1.y - p2.y) > 0.5);
    } else {
      valid = s.points.length >= 1;
    }
    if (valid) {
      strokesRef.current.push(s);
      if (isCustomColorRef.current && s.tool === 'pen') {
        const usedColor = s.color;
        setColorList(prev => {
          const filtered = prev.filter(c => c !== usedColor);
          return [usedColor, ...filtered].slice(0, 9);
        });
        isCustomColorRef.current = false;
      }
    }
    currentStrokeRef.current = null;
    renderCanvas();
  };

  // ─── Cursor ───────────────────────────────────────────────────────────────────

  const cursorMap = {
    pointer: 'default',
    hand: isDragging ? 'grabbing' : 'grab',
    pen: PEN_CURSOR,
    highlight: 'crosshair',
    eraser: eraserMode === 'pixel' ? 'none' : ERASER_CURSOR,
  };
  const cursor = cursorMap[activeTool] ?? 'default';

  // ─── Canvas rendering ────────────────────────────────────────────────────────

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(cW * dpr);
    const targetH = Math.round(cH * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = cW + 'px';
      canvas.style.height = cH + 'px';
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const jsScale = scaleRef.current;
    const scale = jsScale * getCssScale(); // positions use total visual scale
    const { x: ox, y: oy } = offsetRef.current;
    const cx = cW / 2 + ox;
    const cy = cH / 2 + oy;

    const allStrokes = [...strokesRef.current];
    if (currentStrokeRef.current) allStrokes.push(currentStrokeRef.current);

    // ── Pass 1: highlights on main canvas ──
    ctx.save();
    ctx.scale(dpr, dpr);
    for (const stroke of allStrokes) {
      if (stroke.tool !== 'highlight') continue;
      const [p1, p2] = stroke.points;
      if (!p1 || !p2) continue;
      ctx.globalAlpha = stroke.opacity ?? 0.5;
      ctx.fillStyle = stroke.color;
      ctx.fillRect(
        Math.min(p1.x, p2.x) * scale + cx,
        Math.min(p1.y, p2.y) * scale + cy,
        Math.abs(p2.x - p1.x) * scale,
        Math.abs(p2.y - p1.y) * scale,
      );
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // ── Pass 2: pen + pixel-eraser on off-screen canvas ──
    const penCanvas = document.createElement('canvas');
    penCanvas.width = targetW;
    penCanvas.height = targetH;
    const pCtx = penCanvas.getContext('2d');
    pCtx.scale(dpr, dpr);

    for (const stroke of allStrokes) {
      if (stroke.tool === 'eraser-pixel') {
        pCtx.globalCompositeOperation = 'destination-out';
        pCtx.fillStyle = 'rgba(0,0,0,1)';
        pCtx.strokeStyle = 'rgba(0,0,0,1)';
        const pts = stroke.points;
        const r = (stroke.width * jsScale) / 2;
        if (pts.length === 1) {
          pCtx.beginPath();
          pCtx.arc(pts[0].x * scale + cx, pts[0].y * scale + cy, r, 0, Math.PI * 2);
          pCtx.fill();
        } else {
          pCtx.beginPath();
          pCtx.lineWidth = stroke.width * jsScale;
          pCtx.lineCap = 'round';
          pCtx.lineJoin = 'round';
          pCtx.moveTo(pts[0].x * scale + cx, pts[0].y * scale + cy);
          for (let i = 1; i < pts.length; i++) pCtx.lineTo(pts[i].x * scale + cx, pts[i].y * scale + cy);
          pCtx.stroke();
        }
        pCtx.globalCompositeOperation = 'source-over';
        continue;
      }
      if (stroke.tool !== 'pen') continue;
      const pts = stroke.points;
      if (pts.length < 1) continue;
      pCtx.beginPath();
      pCtx.strokeStyle = stroke.color;
      pCtx.lineWidth = stroke.width * jsScale;
      pCtx.lineCap = 'round';
      pCtx.lineJoin = 'round';
      pCtx.moveTo(pts[0].x * scale + cx, pts[0].y * scale + cy);
      if (pts.length === 1) {
        pCtx.lineTo(pts[0].x * scale + cx + 0.1, pts[0].y * scale + cy);
      } else {
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          const my = (pts[i].y + pts[i + 1].y) / 2;
          pCtx.quadraticCurveTo(pts[i].x * scale + cx, pts[i].y * scale + cy, mx * scale + cx, my * scale + cy);
        }
        const last = pts[pts.length - 1];
        pCtx.lineTo(last.x * scale + cx, last.y * scale + cy);
      }
      pCtx.stroke();
    }

    // Composite pen layer on top of highlights
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(penCanvas, 0, 0);
    ctx.restore();

    // ── Eraser cursor circle (pixel mode only) ──
    if (activeToolRef.current === 'eraser' && eraserModeRef.current === 'pixel' && eraserPosRef.current) {
      const { x: ex, y: ey } = eraserPosRef.current;
      const r = Math.max(2, (eraserSizeRef.current * jsScale) / 2);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
  };

  // ─── Transform ───────────────────────────────────────────────────────────────

  const clampOffset = () => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;
    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const imgW = img.offsetWidth * scaleRef.current;
    const imgH = img.offsetHeight * scaleRef.current;
    const maxX = Math.max(0, (imgW + cW) / 2 - 60);
    const maxY = Math.max(0, (imgH + cH) / 2 - 60);
    offsetRef.current = {
      x: Math.min(Math.max(offsetRef.current.x, -maxX), maxX),
      y: Math.min(Math.max(offsetRef.current.y, -maxY), maxY),
    };
  };

  const applyTransform = () => {
    if (!imgRef.current) return;
    clampOffset();
    const { x, y } = offsetRef.current;
    imgRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scaleRef.current})`;
    setSliderVal(scaleToSlider(scaleRef.current));
    renderCanvas();
  };

  const zoomAt = (mx, my, factor) => {
    const prev = scaleRef.current;
    const next = Math.min(Math.max(prev * factor, MIN_SCALE), MAX_SCALE);
    const d = next / prev;
    scaleRef.current = next;
    offsetRef.current = {
      x: mx - (mx - offsetRef.current.x) * d,
      y: my - (my - offsetRef.current.y) * d,
    };
  };

  // ─── Coordinate helpers ───────────────────────────────────────────────────────

  // CSS scale: how much the browser shrinks the image to fit the container
  // (img.offsetWidth is layout size before JS transform; naturalWidth is original)
  const getCssScale = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return 1;
    return img.offsetWidth / img.naturalWidth;
  };

  const screenToWorld = (clientX, clientY) => {
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const totalScale = scaleRef.current * getCssScale();
    return {
      x: (clientX - rect.left - cW / 2 - offsetRef.current.x) / totalScale,
      y: (clientY - rect.top - cH / 2 - offsetRef.current.y) / totalScale,
    };
  };

  const clientToCanvas = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // ─── Touch ────────────────────────────────────────────────────────────────────

  const getTouchDist = (t) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const getTouchCenter = (t, rect) => ({
    x: (t[0].clientX + t[1].clientX) / 2 - rect.left - rect.width / 2,
    y: (t[0].clientY + t[1].clientY) / 2 - rect.top - rect.height / 2,
  });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      const isZoomed = scaleRef.current > 1.001;
      if (e.ctrlKey) {
        e.preventDefault();
        zoomAt(mx, my, Math.exp(-e.deltaY * 0.01));
        applyTransform();
      } else if (isZoomed) {
        e.preventDefault();
        if (e.deltaMode === 1 || Math.abs(e.deltaY) > 50) {
          zoomAt(mx, my, e.deltaY > 0 ? 0.97 : 1.03);
        } else {
          offsetRef.current = { x: offsetRef.current.x - e.deltaX, y: offsetRef.current.y - e.deltaY };
        }
        applyTransform();
      }
    };

    const onTouchStart = (e) => {
      e.preventDefault();
      const touches = e.touches;
      if (touches.length === 1) {
        const tool = activeToolRef.current;
        if (tool === 'pen') {
          const pt = screenToWorld(touches[0].clientX, touches[0].clientY);
          currentStrokeRef.current = { tool: 'pen', color: penColorRef.current, width: penSizeRef.current, points: [pt] };
          redoStackRef.current = [];
          return;
        }
        if (tool === 'highlight') {
          const pt = screenToWorld(touches[0].clientX, touches[0].clientY);
          currentStrokeRef.current = { tool: 'highlight', color: highlightColorRef.current, opacity: highlightOpacityRef.current, points: [pt, { ...pt }] };
          redoStackRef.current = [];
          return;
        }
        if (tool === 'eraser') {
          eraserActiveRef.current = true;
          if (eraserModeRef.current === 'pixel') {
            const pt = screenToWorld(touches[0].clientX, touches[0].clientY);
            currentStrokeRef.current = { tool: 'eraser-pixel', width: eraserSizeRef.current, points: [pt] };
            redoStackRef.current = [];
          }
          return;
        }
        if (DRAWING_TOOLS.includes(tool)) return;
        touchRef.current = {
          type: 'pan',
          startX: touches[0].clientX - offsetRef.current.x,
          startY: touches[0].clientY - offsetRef.current.y,
        };
      } else if (touches.length === 2) {
        if (currentStrokeRef.current) { strokesRef.current.push(currentStrokeRef.current); currentStrokeRef.current = null; }
        eraserActiveRef.current = false;
        const rect = container.getBoundingClientRect();
        touchRef.current = { type: 'pinch', dist: getTouchDist(touches), center: getTouchCenter(touches, rect) };
      }
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      const touches = e.touches;
      const tool = activeToolRef.current;

      if (tool === 'pen' && currentStrokeRef.current && touches.length === 1) {
        currentStrokeRef.current.points.push(screenToWorld(touches[0].clientX, touches[0].clientY));
        renderCanvas(); return;
      }
      if (tool === 'highlight' && currentStrokeRef.current && touches.length === 1) {
        currentStrokeRef.current.points[1] = screenToWorld(touches[0].clientX, touches[0].clientY);
        renderCanvas(); return;
      }
      if (tool === 'eraser' && eraserActiveRef.current && touches.length === 1) {
        const worldPt = screenToWorld(touches[0].clientX, touches[0].clientY);
        if (eraserModeRef.current === 'object') {
          const before = strokesRef.current.length;
          strokesRef.current = strokesRef.current.filter(s => !hitTestStroke(s, worldPt, eraserSizeRef.current / getCssScale()));
          if (strokesRef.current.length !== before) redoStackRef.current = [];
        } else if (currentStrokeRef.current) {
          currentStrokeRef.current.points.push(worldPt);
        }
        renderCanvas(); return;
      }

      const t = touchRef.current;
      if (!t) return;
      if (t.type === 'pan' && touches.length === 1) {
        offsetRef.current = { x: touches[0].clientX - t.startX, y: touches[0].clientY - t.startY };
        applyTransform();
      } else if (t.type === 'pinch' && touches.length === 2) {
        const rect = container.getBoundingClientRect();
        const newDist = getTouchDist(touches);
        const center = getTouchCenter(touches, rect);
        zoomAt(center.x, center.y, newDist / t.dist);
        t.dist = newDist; t.center = center;
        applyTransform();
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        finalizeStroke();
        eraserActiveRef.current = false;
        touchRef.current = null;
      } else if (e.touches.length === 1 && touchRef.current?.type === 'pinch') {
        touchRef.current = {
          type: 'pan',
          startX: e.touches[0].clientX - offsetRef.current.x,
          startY: e.touches[0].clientY - offsetRef.current.y,
        };
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => renderCanvas());
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (redoStackRef.current.length > 0) { strokesRef.current.push(redoStackRef.current.pop()); renderCanvas(); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (strokesRef.current.length > 0) { redoStackRef.current.push(strokesRef.current.pop()); renderCanvas(); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        if (redoStackRef.current.length > 0) { strokesRef.current.push(redoStackRef.current.pop()); renderCanvas(); }
        return;
      }

      const switchTool = (tool) => {
        activeToolRef.current = tool;
        setActiveTool(tool);
        setShowPenOptions(false);
        setShowHighlightOptions(false);
        setShowEraserOptions(false);
      };

      switch (e.key.toLowerCase()) {
        case 'escape': case 'v': switchTool('pointer'); break;
        case 'h': switchTool('hand'); break;
        case 'p': case 'b': switchTool('pen'); break;
        case 'm': switchTool('highlight'); break;
        case 'e': switchTool('eraser'); break;
        default: break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ─── Mouse handlers ───────────────────────────────────────────────────────────

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    if (activeTool === 'pen') {
      e.preventDefault();
      currentStrokeRef.current = { tool: 'pen', color: penColorRef.current, width: penSizeRef.current, points: [screenToWorld(e.clientX, e.clientY)] };
      redoStackRef.current = [];
      return;
    }
    if (activeTool === 'highlight') {
      e.preventDefault();
      const pt = screenToWorld(e.clientX, e.clientY);
      currentStrokeRef.current = { tool: 'highlight', color: highlightColorRef.current, opacity: highlightOpacityRef.current, points: [pt, { ...pt }] };
      redoStackRef.current = [];
      return;
    }
    if (activeTool === 'eraser') {
      e.preventDefault();
      eraserActiveRef.current = true;
      const worldPt = screenToWorld(e.clientX, e.clientY);
      if (eraserModeRef.current === 'object') {
        const before = strokesRef.current.length;
        strokesRef.current = strokesRef.current.filter(s => !hitTestStroke(s, worldPt, eraserSizeRef.current / getCssScale()));
        if (strokesRef.current.length !== before) redoStackRef.current = [];
        renderCanvas();
      } else {
        currentStrokeRef.current = { tool: 'eraser-pixel', width: eraserSizeRef.current, points: [worldPt] };
        redoStackRef.current = [];
        renderCanvas();
      }
      return;
    }
    if (DRAWING_TOOLS.includes(activeTool)) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX - offsetRef.current.x, startY: e.clientY - offsetRef.current.y };
    setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (activeTool === 'eraser') {
      eraserPosRef.current = clientToCanvas(e.clientX, e.clientY);
      if (eraserActiveRef.current) {
        const worldPt = screenToWorld(e.clientX, e.clientY);
        if (eraserModeRef.current === 'object') {
          const before = strokesRef.current.length;
          strokesRef.current = strokesRef.current.filter(s => !hitTestStroke(s, worldPt, eraserSizeRef.current / getCssScale()));
          if (strokesRef.current.length !== before) redoStackRef.current = [];
        } else if (currentStrokeRef.current) {
          currentStrokeRef.current.points.push(worldPt);
        }
      }
      renderCanvas();
      return;
    }
    if (currentStrokeRef.current && activeTool === 'pen') {
      currentStrokeRef.current.points.push(screenToWorld(e.clientX, e.clientY));
      renderCanvas(); return;
    }
    if (currentStrokeRef.current && activeTool === 'highlight') {
      currentStrokeRef.current.points[1] = screenToWorld(e.clientX, e.clientY);
      renderCanvas(); return;
    }
    if (!dragRef.current) return;
    offsetRef.current = { x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY };
    applyTransform();
  };

  const onMouseUp = () => {
    finalizeStroke();
    eraserActiveRef.current = false;
    dragRef.current = null;
    setIsDragging(false);
  };

  const onMouseLeave = () => {
    eraserPosRef.current = null;
    onMouseUp();
    renderCanvas();
  };

  // ─── History ──────────────────────────────────────────────────────────────────

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    redoStackRef.current.push(strokesRef.current.pop());
    renderCanvas();
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    strokesRef.current.push(redoStackRef.current.pop());
    renderCanvas();
  };

  // ─── Zoom ─────────────────────────────────────────────────────────────────────

  const zoomCenter = (factor) => { zoomAt(0, 0, factor); applyTransform(); };

  const onSliderChange = (e) => {
    const v = Number(e.target.value);
    scaleRef.current = sliderToScale(v);
    setSliderVal(v);
    if (imgRef.current) {
      clampOffset();
      const { x, y } = offsetRef.current;
      imgRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scaleRef.current})`;
      renderCanvas();
    }
  };

  const stopProp = (e) => e.stopPropagation();

  // ─── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="img-viewer"
      style={{ cursor }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <img ref={imgRef} src={src} alt="" className="img-viewer__img" draggable={false} onLoad={renderCanvas} onError={onSrcError} />
      <canvas ref={canvasRef} className="img-viewer__canvas" />

      {/* Left toolbar */}
      <div className="img-viewer__toolbar" onMouseDown={stopProp}>
        <button
          className={`img-viewer__toolbar-toggle${toolbarOpen ? ' is-open' : ''}`}
          type="button"
          onClick={() => setToolbarOpen(v => !v)}
          title={toolbarOpen ? 'Скрыть панель' : 'Инструменты'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d={toolbarOpen ? 'M2 9l5-5 5 5' : 'M2 5l5 5 5-5'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className={`img-viewer__toolbar-panel${toolbarOpen ? ' is-open' : ''}`}>
          {/* Pointer */}
          <button className={`img-viewer__tool${activeTool === 'pointer' ? ' is-active' : ''}`} type="button" onClick={() => handleSetActiveTool('pointer')} title="Курсор (V)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M11 21L4 4L21 11L14.735 13.685C14.2632 13.8873 13.8873 14.2632 13.685 14.735L11 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Hand */}
          <button className={`img-viewer__tool${activeTool === 'hand' ? ' is-active' : ''}`} type="button" onClick={() => handleSetActiveTool('hand')} title="Перетаскивание (H)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20.5001 9.5V14.167C20.5001 16.34 20.5001 17.427 20.1691 18.292C19.919 18.9453 19.5346 19.5388 19.0407 20.0342C18.5469 20.5296 17.9546 20.9158 17.3021 21.168C16.4391 21.5 15.3561 21.5 13.1901 21.5C12.0531 21.5 11.4851 21.5 10.9571 21.383C10.1502 21.2043 9.40018 20.8285 8.77411 20.289C8.36411 19.934 8.02411 19.479 7.34111 18.567L4.33711 14.549C4.11257 14.2485 3.994 13.882 3.99997 13.5069C4.00594 13.1318 4.13611 12.7692 4.37011 12.476C4.51788 12.2902 4.7033 12.1377 4.91418 12.0286C5.12507 11.9195 5.35665 11.8563 5.59371 11.8431C5.83077 11.8298 6.06795 11.8669 6.28966 11.9519C6.51137 12.0368 6.71259 12.1677 6.88011 12.336L8.50011 13.964V6C8.50011 5.60218 8.65815 5.22064 8.93945 4.93934C9.22075 4.65804 9.60229 4.5 10.0001 4.5C10.3979 4.5 10.7795 4.65804 11.0608 4.93934C11.3421 5.22064 11.5001 5.60218 11.5001 6M11.5001 6V4C11.5001 3.60218 11.6581 3.22064 11.9394 2.93934C12.2208 2.65804 12.6023 2.5 13.0001 2.5C13.3979 2.5 13.7795 2.65804 14.0608 2.93934C14.3421 3.22064 14.5001 3.60218 14.5001 4V6M11.5001 6V10.5M14.5001 6C14.5001 5.60218 14.6581 5.22064 14.9395 4.93934C15.2208 4.65804 15.6023 4.5 16.0001 4.5C16.3979 4.5 16.7795 4.65804 17.0608 4.93934C17.3421 5.22064 17.5001 5.60218 17.5001 6V8M14.5001 6V10.5M17.5001 8C17.5001 7.60218 17.6581 7.22064 17.9395 6.93934C18.2208 6.65804 18.6023 6.5 19.0001 6.5C19.3979 6.5 19.7795 6.65804 20.0608 6.93934C20.3421 7.22064 20.5001 7.60218 20.5001 8V10.5M17.5001 8V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="img-viewer__toolbar-sep" />
          {/* Pen */}
          <button className={`img-viewer__tool${activeTool === 'pen' ? ' is-active' : ''}`} type="button" onClick={() => handleSetActiveTool('pen')} title="Ручка (P)">
            <div className="img-viewer__tool-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M14.7569 2.62097C15.635 1.74284 16.826 1.24951 18.0679 1.24951C19.3098 1.24951 20.5008 1.74284 21.3789 2.62097C22.257 3.4991 22.7504 4.69011 22.7504 5.93197C22.7504 7.17384 22.257 8.36484 21.3789 9.24297L11.8929 18.729C11.3509 19.271 11.0329 19.589 10.6769 19.866C10.2582 20.194 9.80823 20.4723 9.32689 20.701C8.92089 20.894 8.4929 21.037 7.7669 21.279L4.4349 22.389L3.63289 22.657C3.31392 22.7635 2.97159 22.779 2.6443 22.7018C2.317 22.6246 2.01768 22.4578 1.77989 22.22C1.54211 21.9822 1.37527 21.6829 1.29808 21.3556C1.2209 21.0283 1.23641 20.6859 1.3429 20.367L2.72089 16.234C2.96289 15.507 3.1059 15.079 3.2989 14.672C3.52823 14.192 3.80656 13.742 4.13389 13.322C4.40989 12.968 4.7289 12.649 5.2709 12.107L14.7569 2.62097ZM4.3999 20.821L7.2409 19.873C8.0319 19.609 8.36789 19.496 8.68089 19.347C9.06223 19.1643 9.41989 18.9433 9.75389 18.684C10.0269 18.47 10.2789 18.221 10.8689 17.631L18.4389 10.061C17.401 9.69319 16.4589 9.09722 15.6819 8.31697C14.9024 7.5398 14.3071 6.59768 13.9399 5.55997L6.36989 13.13C5.7799 13.719 5.5299 13.97 5.3169 14.244C5.0569 14.5773 4.83589 14.935 4.65389 15.317C4.50489 15.63 4.39189 15.966 4.12789 16.757L3.1799 19.6L4.3999 20.821ZM15.1549 4.34297C15.1899 4.51797 15.2469 4.75597 15.3439 5.03297C15.6364 5.87002 16.1151 6.62976 16.7439 7.25497C17.3688 7.88361 18.1282 8.36229 18.9649 8.65497C19.2429 8.75197 19.4809 8.80897 19.6559 8.84397L20.3179 8.18197C20.9112 7.58452 21.2435 6.77627 21.242 5.93428C21.2405 5.09229 20.9054 4.28521 20.31 3.68983C19.7147 3.09446 18.9076 2.75932 18.0656 2.75785C17.2236 2.75638 16.4154 3.08868 15.8179 3.68197L15.1549 4.34297Z" fill="currentColor"/>
              </svg>
              <span className="img-viewer__tool-badge">
                <svg width="7" height="3" viewBox="0 0 7 3" fill="none">
                  <circle cx="1" cy="1.5" r="1" fill="currentColor"/>
                  <circle cx="3.5" cy="1.5" r="1" fill="currentColor"/>
                  <circle cx="6" cy="1.5" r="1" fill="currentColor"/>
                </svg>
              </span>
            </div>
          </button>
          {/* Highlight */}
          <button className={`img-viewer__tool${activeTool === 'highlight' ? ' is-active' : ''}`} type="button" onClick={() => handleSetActiveTool('highlight')} title="Выделение (M)">
            <div className="img-viewer__tool-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 15H15V19M15.884 15.884L20 20M8.5 3H9.5M13.5 3H14.5M8.5 20H9.5M20 8.5V9.5M3 8.5V9.5M3 13.5V14.5M4.5 3H3V4.5M4.5 20H3V18.5M18.5 3H20V4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
              </svg>
              <span className="img-viewer__tool-badge">
                <svg width="7" height="3" viewBox="0 0 7 3" fill="none">
                  <circle cx="1" cy="1.5" r="1" fill="currentColor"/>
                  <circle cx="3.5" cy="1.5" r="1" fill="currentColor"/>
                  <circle cx="6" cy="1.5" r="1" fill="currentColor"/>
                </svg>
              </span>
            </div>
          </button>
          {/* Eraser */}
          <button className={`img-viewer__tool${activeTool === 'eraser' ? ' is-active' : ''}`} type="button" onClick={() => handleSetActiveTool('eraser')} title="Ластик (E)">
            <div className="img-viewer__tool-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M13.083 19.063C12.639 19.507 12.24 19.906 11.873 20.25H21C21.1989 20.25 21.3897 20.329 21.5303 20.4697C21.671 20.6103 21.75 20.8011 21.75 21C21.75 21.1989 21.671 21.3897 21.5303 21.5303C21.3897 21.671 21.1989 21.75 21 21.75H9C8.98133 21.75 8.963 21.7493 8.945 21.748C8.242 21.721 7.645 21.417 7.059 20.97C6.471 20.522 5.815 19.866 5.013 19.063L4.937 18.987C4.134 18.185 3.478 17.529 3.03 16.941C2.562 16.327 2.25 15.701 2.25 14.952C2.25 14.204 2.562 13.577 3.03 12.963C3.478 12.376 4.134 11.72 4.937 10.917L10.917 4.937C11.72 4.134 12.376 3.478 12.963 3.03C13.577 2.562 14.203 2.25 14.953 2.25C15.701 2.25 16.327 2.562 16.941 3.03C17.529 3.478 18.185 4.134 18.987 4.937L19.063 5.013C19.866 5.815 20.522 6.471 20.97 7.059C21.438 7.673 21.75 8.299 21.75 9.048C21.75 9.796 21.438 10.423 20.97 11.037C20.522 11.624 19.866 12.28 19.063 13.083L13.083 19.063ZM11.94 6.035C12.79 5.185 13.375 4.602 13.873 4.223C14.353 3.856 14.663 3.75 14.953 3.75C15.241 3.75 15.551 3.856 16.032 4.223C16.529 4.603 17.115 5.185 17.965 6.035C18.815 6.885 19.398 7.471 19.778 7.968C20.144 8.449 20.25 8.758 20.25 9.048C20.25 9.337 20.144 9.647 19.777 10.127C19.397 10.625 18.815 11.21 17.965 12.06L13.771 16.253L7.747 10.229L11.94 6.035ZM9.048 20.25C9.337 20.25 9.647 20.144 10.127 19.777C10.625 19.397 11.21 18.815 12.06 17.965L12.71 17.314L6.686 11.289L6.036 11.939C5.186 12.789 4.602 13.375 4.223 13.873C3.856 14.353 3.75 14.663 3.75 14.953C3.75 15.241 3.856 15.551 4.223 16.032C4.603 16.529 5.185 17.115 6.035 17.965C6.885 18.815 7.471 19.398 7.968 19.778C8.449 20.144 8.758 20.25 9.048 20.25Z" fill="currentColor"/>
              </svg>
              <span className="img-viewer__tool-badge">
                <svg width="7" height="3" viewBox="0 0 7 3" fill="none">
                  <circle cx="1" cy="1.5" r="1" fill="currentColor"/>
                  <circle cx="3.5" cy="1.5" r="1" fill="currentColor"/>
                  <circle cx="6" cy="1.5" r="1" fill="currentColor"/>
                </svg>
              </span>
            </div>
          </button>
        </div>

        {/* Pen options */}
        {showPenOptions && activeTool === 'pen' && (
          <div className="img-viewer__pen-options">
            <div className="img-viewer__pen-options__label">Цвет</div>
            <div className="img-viewer__pen-colors">
              {colorList.map(c => (
                <button key={c} className={`img-viewer__pen-color${penColor === c ? ' is-active' : ''}`} style={{ background: c, border: c === '#ffffff' ? '1px solid var(--stroke)' : 'none' }} type="button" onClick={() => handlePenColor(c, false)} />
              ))}
              <label className="img-viewer__pen-color img-viewer__pen-color--custom" title="Свой цвет">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M6 3v6M3 6h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <input type="color" value={penColor} onChange={e => handlePenColor(e.target.value, true)} />
              </label>
            </div>
            <div className="img-viewer__pen-options__label">Размер</div>
            <div className="img-viewer__pen-size-wrap">
              <input className="img-viewer__pen-size-slider" type="range" min="1" max="20" value={penSize} onChange={e => handlePenSize(Number(e.target.value))} />
              <div className="img-viewer__pen-size-preview-wrap">
                <div className="img-viewer__pen-size-preview" style={{ width: Math.max(penSize, 3), height: Math.max(penSize, 3), background: penColor, outline: penColor === '#ffffff' ? '1px solid var(--stroke)' : 'none' }} />
              </div>
            </div>
          </div>
        )}

        {/* Highlight options */}
        {showHighlightOptions && activeTool === 'highlight' && (
          <div className="img-viewer__pen-options">
            <div className="img-viewer__pen-options__label">Цвет</div>
            <div className="img-viewer__pen-colors">
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c} className={`img-viewer__pen-color${highlightColor === c ? ' is-active' : ''}`} style={{ background: c }} type="button" onClick={() => handleHighlightColor(c)} />
              ))}
              <label className="img-viewer__pen-color img-viewer__pen-color--custom" title="Свой цвет">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M6 3v6M3 6h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <input type="color" value={highlightColor} onChange={e => handleHighlightColor(e.target.value)} />
              </label>
            </div>
            <div className="img-viewer__pen-options__label">Прозрачность</div>
            <div className="img-viewer__pen-size-wrap">
              <input className="img-viewer__pen-size-slider" type="range" min="0" max="100" value={Math.round(highlightOpacity * 100)} onChange={e => handleHighlightOpacity(Number(e.target.value) / 100)} />
              <div className="img-viewer__pen-size-preview-wrap">
                <div className="img-viewer__pen-size-preview img-viewer__pen-size-preview--rect" style={{ width: 14, height: 14, background: highlightColor, opacity: highlightOpacity, outline: highlightColor === '#ffffff' ? '1px solid var(--stroke)' : 'none' }} />
              </div>
            </div>
          </div>
        )}

        {/* Eraser options */}
        {showEraserOptions && activeTool === 'eraser' && (
          <div className="img-viewer__pen-options img-viewer__pen-options--wide">
            <div className="img-viewer__pen-options__label">Режим</div>
            <div className="img-viewer__eraser-modes">
              <button
                className={`img-viewer__eraser-mode${eraserMode === 'object' ? ' is-active' : ''}`}
                type="button"
                onClick={() => handleEraserMode('object')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                Объект
              </button>
              <button
                className={`img-viewer__eraser-mode${eraserMode === 'pixel' ? ' is-active' : ''}`}
                type="button"
                onClick={() => handleEraserMode('pixel')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                </svg>
                Пиксель
              </button>
            </div>
            <div className="img-viewer__pen-options__label">Размер</div>
            <div className="img-viewer__pen-size-wrap">
              <input className="img-viewer__pen-size-slider" type="range" min="2" max="30" value={eraserSize} onChange={e => handleEraserSize(Number(e.target.value))} />
              <div className="img-viewer__pen-size-preview-wrap">
                <div className="img-viewer__pen-size-preview img-viewer__pen-size-preview--eraser" style={{ width: Math.max(Math.min(eraserSize, 20), 3), height: Math.max(Math.min(eraserSize, 20), 3) }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom-left reset */}
      <div className="img-viewer__reset-wrap" onMouseDown={stopProp}>
        <button className={`img-viewer__btn${showResetConfirm ? ' is-active' : ''}`} type="button" title="Сбросить" onClick={() => setShowResetConfirm(v => !v)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4.08918 7.41366C5.20086 5.49505 6.97191 4.04582 9.07259 3.33583C11.1733 2.62584 13.4604 2.70347 15.5081 3.55427C17.5558 4.40507 19.2245 5.97105 20.2035 7.96063C21.1825 9.95021 21.4051 12.2278 20.8299 14.3693C20.2546 16.5108 18.9207 18.3702 17.0765 19.6014C15.2323 20.8326 13.0035 21.3516 10.8051 21.0618C8.60668 20.772 6.58854 19.6931 5.1264 18.026C3.66427 16.359 2.85781 14.2174 2.85718 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.57143 7.42836H4V2.85693" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {showResetConfirm && (
          <div className="img-viewer__reset-popup">
            <span className="img-viewer__reset-popup__text">Сбросить все<br/>изменения?</span>
            <div className="img-viewer__reset-popup__actions">
              <button className="img-viewer__reset-popup__btn img-viewer__reset-popup__btn--confirm" type="button"
                onClick={() => {
                  scaleRef.current = 1; offsetRef.current = { x: 0, y: 0 };
                  strokesRef.current = []; redoStackRef.current = []; currentStrokeRef.current = null;
                  applyTransform(); setShowResetConfirm(false);
                }}>Да</button>
              <button className="img-viewer__reset-popup__btn" type="button" onClick={() => setShowResetConfirm(false)}>Отмена</button>
            </div>
          </div>
        )}
      </div>

      {/* Top-right history */}
      <div className="img-viewer__history" onMouseDown={stopProp}>
        <button className="img-viewer__btn" type="button" title="Отменить" onClick={handleUndo}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3.99994 9.99997L3.29294 10.707L2.58594 9.99997L3.29294 9.29297L3.99994 9.99997ZM20.9999 18C20.9999 18.2652 20.8946 18.5195 20.707 18.7071C20.5195 18.8946 20.2652 19 19.9999 19C19.7347 19 19.4804 18.8946 19.2928 18.7071C19.1053 18.5195 18.9999 18.2652 18.9999 18H20.9999ZM8.29294 15.707L3.29294 10.707L4.70694 9.29297L9.70694 14.293L8.29294 15.707ZM3.29294 9.29297L8.29294 4.29297L9.70694 5.70697L4.70694 10.707L3.29294 9.29297ZM3.99994 8.99997H13.9999V11H3.99994V8.99997ZM20.9999 16V18H18.9999V16H20.9999ZM13.9999 8.99997C15.8565 8.99997 17.6369 9.73747 18.9497 11.0502C20.2624 12.363 20.9999 14.1435 20.9999 16H18.9999C18.9999 14.6739 18.4732 13.4021 17.5355 12.4644C16.5978 11.5268 15.326 11 13.9999 11V8.99997Z" fill="currentColor"/>
          </svg>
        </button>
        <button className="img-viewer__btn" type="button" title="Вернуть" onClick={handleRedo}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 9.99997L20.707 10.707L21.414 9.99997L20.707 9.29297L20 9.99997ZM3 18C3 18.2652 3.10536 18.5195 3.29289 18.7071C3.48043 18.8946 3.73478 19 4 19C4.26522 19 4.51957 18.8946 4.70711 18.7071C4.89464 18.5195 5 18.2652 5 18H3ZM15.707 15.707L20.707 10.707L19.293 9.29297L14.293 14.293L15.707 15.707ZM20.707 9.29297L15.707 4.29297L14.293 5.70697L19.293 10.707L20.707 9.29297ZM20 8.99997H10V11H20V8.99997ZM3 16V18H5V16H3ZM10 8.99997C8.14348 8.99997 6.36301 9.73747 5.05025 11.0502C3.7375 12.363 3 14.1435 3 16H5C5 14.6739 5.52678 13.4021 6.46447 12.4644C7.40215 11.5268 8.67392 11 10 11V8.99997Z" fill="currentColor"/>
          </svg>
        </button>
      </div>

      {/* Bottom-right zoom controls */}
      <div className="img-viewer__controls" onMouseDown={stopProp}>
        {onToggleLarge && (
          <>
            <button className={`img-viewer__btn${previewLarge ? ' is-active' : ''}`} type="button" title={previewLarge ? 'Уменьшить' : 'Формат А4'} onClick={onToggleLarge}>
              {previewLarge ? (
                <svg fill="none" height="14" viewBox="0 0 16 16" width="14"><path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
              ) : (
                <svg fill="none" height="14" viewBox="0 0 16 16" width="14"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
              )}
            </button>
            <div className="img-viewer__controls-sep" />
          </>
        )}
        <button className="img-viewer__btn" type="button" onClick={() => zoomCenter(1.2)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
        <input className="img-viewer__slider" type="range" min="0" max="100" value={sliderVal} onChange={onSliderChange} />
        <button className="img-viewer__btn" type="button" onClick={() => zoomCenter(1 / 1.2)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
}
