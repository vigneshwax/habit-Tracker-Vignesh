import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Sliders,
  Eye,
  EyeOff,
  Link2,
  ExternalLink,
  X,
  Copy,
  Pin,
  PinOff,
  Download,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  Plus,
  Compass,
  ArrowLeft,
  MoreHorizontal,
  Sparkles,
  Layers,
  FileText,
  Calendar,
  Tag,
  Paperclip,
  Check,
} from 'lucide-react';
import { KnowledgeNote, DailyJournal, KnowledgeGraphNode, KnowledgeGraphEdge } from '../../types';
import { buildGraphData } from '../../utils/markdownUtils';

interface KnowledgeGraphProps {
  notes: KnowledgeNote[];
  journals?: DailyJournal[];
  onSelectNote: (noteId: string) => void;
  className?: string;
}

interface SimulatedNode extends KnowledgeGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isPinned?: boolean;
}

export interface GraphGroupRule {
  id: string;
  rule: string;
  color: string;
}

const DEFAULT_GROUPS: GraphGroupRule[] = [
  { id: 'g1', rule: 'path:journal', color: '#A855F7' }, // Purple
  { id: 'g2', rule: 'path:habits', color: '#22C55E' },  // Green
  { id: 'g3', rule: 'path:goals', color: '#3B82F6' },   // Blue
  { id: 'g4', rule: 'path:ideas', color: '#06B6D4' },   // Cyan
  { id: 'g5', rule: 'path:learning', color: '#F97316' },// Orange
  { id: 'g6', rule: 'path:personal', color: '#EC4899' },// Pink
  { id: 'g7', rule: 'tag:important', color: '#EAB308' },// Yellow
];

const PRESET_COLORS = [
  '#A855F7', // Purple
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EC4899', // Pink
  '#EAB308', // Yellow
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#8B5CF6', // Violet
  '#10B981', // Emerald
  '#9CA3AF', // Gray
];

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  notes,
  journals = [],
  onSelectNote,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layout Dimensions
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Floating Filter Panel state (Obsidian style)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [isFiltersSectionOpen, setIsFiltersSectionOpen] = useState(true);
  const [isGroupsSectionOpen, setIsGroupsSectionOpen] = useState(true);
  const [isDisplaySectionOpen, setIsDisplaySectionOpen] = useState(false);
  const [isForcesSectionOpen, setIsForcesSectionOpen] = useState(false);

  // 1. Search Files
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Toggle Filters
  const [showTags, setShowTags] = useState<boolean>(() => {
    return localStorage.getItem('obsidian_graph_filter_tags') === 'true';
  });
  const [showAttachments, setShowAttachments] = useState<boolean>(() => {
    return localStorage.getItem('obsidian_graph_filter_attachments') === 'true';
  });
  const [existingFilesOnly, setExistingFilesOnly] = useState<boolean>(() => {
    return localStorage.getItem('obsidian_graph_filter_existing_only') === 'true';
  });
  const [showOrphans, setShowOrphans] = useState<boolean>(() => {
    const val = localStorage.getItem('obsidian_graph_filter_orphans');
    return val !== null ? val === 'true' : true;
  });

  // 3. Groups & Color Rules
  const [groups, setGroups] = useState<GraphGroupRule[]>(() => {
    try {
      const saved = localStorage.getItem('obsidian_graph_groups');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_GROUPS;
  });
  const [activeColorPickerGroupId, setActiveColorPickerGroupId] = useState<string | null>(null);

  // 4. Display Settings
  const [nodeSizeMultiplier, setNodeSizeMultiplier] = useState(1.15);
  const [linkThickness, setLinkThickness] = useState(1.1);
  const [linkOpacity, setLinkOpacity] = useState(0.4);
  const [nodeOpacity, setNodeOpacity] = useState(0.95);
  const [textLabelMode, setTextLabelMode] = useState<'all' | 'hover' | 'connected' | 'none'>('hover');
  const [textSize, setTextSize] = useState(11);
  const [showArrows, setShowArrows] = useState(true);

  // 5. Force Settings
  const [repulsionForce, setRepulsionForce] = useState(2600);
  const [linkDistance, setLinkDistance] = useState(90);
  const [linkStrength, setLinkStrength] = useState(0.045);
  const [centerGravity, setCenterGravity] = useState(0.007);
  const [isPhysicsActive, setIsPhysicsActive] = useState(true);

  // 6. Navigation, Viewport, Interaction
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNode, setDraggedNode] = useState<SimulatedNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimulatedNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimulatedNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // 7. Context Menu
  const [contextMenu, setContextMenu] = useState<{
    node: SimulatedNode;
    x: number;
    y: number;
  } | null>(null);

  // 8. Local Graph Mode (Section 8)
  const [localGraphRootId, setLocalGraphRootId] = useState<string | null>(null);
  const [localGraphDepth, setLocalGraphDepth] = useState<1 | 2 | 3>(1);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2500);
  }, []);

  // Save persistent filter preferences
  useEffect(() => {
    localStorage.setItem('obsidian_graph_filter_tags', String(showTags));
    localStorage.setItem('obsidian_graph_filter_attachments', String(showAttachments));
    localStorage.setItem('obsidian_graph_filter_existing_only', String(existingFilesOnly));
    localStorage.setItem('obsidian_graph_filter_orphans', String(showOrphans));
  }, [showTags, showAttachments, existingFilesOnly, showOrphans]);

  useEffect(() => {
    try {
      localStorage.setItem('obsidian_graph_groups', JSON.stringify(groups));
    } catch {}
  }, [groups]);

  // Window Resize & Container measurement (proper fullscreen sizing)
  useEffect(() => {
    const updateSize = () => {
      if (isFullscreen) {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      } else if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: Math.max(380, clientWidth || window.innerWidth),
          height: Math.max(480, clientHeight || 650),
        });
      }
    };
    updateSize();
    const timer = setTimeout(updateSize, 80);
    window.addEventListener('resize', updateSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, [isFullscreen]);

  // Lock body overflow in Fullscreen mode to prevent background document scrolling
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  // Raw Graph Data from source notes & wikilinks
  const rawGraphData = useMemo(() => {
    return buildGraphData(notes, journals, {
      includeTags: true,
      includeAttachments: true,
      includeUnresolved: true,
    });
  }, [notes, journals]);

  // Adjacency graph for fast neighborhood lookups
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rawGraphData.nodes.forEach((n) => map.set(n.id, new Set()));
    rawGraphData.edges.forEach((e) => {
      map.get(e.source)?.add(e.target);
      map.get(e.target)?.add(e.source);
    });
    return map;
  }, [rawGraphData.nodes, rawGraphData.edges]);

  // Local Graph Subgraph Nodes Set
  const localGraphNodeIds = useMemo(() => {
    if (!localGraphRootId) return null;
    const ids = new Set<string>();
    ids.add(localGraphRootId);

    // Depth 1
    const d1 = adjacencyMap.get(localGraphRootId) || new Set();
    d1.forEach((id) => ids.add(id));

    // Depth 2
    if (localGraphDepth >= 2) {
      d1.forEach((neighborId) => {
        const d2 = adjacencyMap.get(neighborId) || new Set();
        d2.forEach((id) => ids.add(id));
      });
    }

    // Depth 3
    if (localGraphDepth >= 3) {
      const currentIds = Array.from(ids);
      currentIds.forEach((currId) => {
        const d3 = adjacencyMap.get(currId) || new Set();
        d3.forEach((id) => ids.add(id));
      });
    }

    return ids;
  }, [localGraphRootId, localGraphDepth, adjacencyMap]);

  // Group Matching Rule logic (Priority: Top-to-bottom)
  const getNodeColor = useCallback(
    (node: KnowledgeGraphNode): string => {
      if (node.isUnresolved) return '#64748B'; // Muted slate for unresolved
      if (node.type === 'tag') return '#38BDF8';
      if (node.type === 'attachment') return '#F472B6';

      for (const g of groups) {
        const rule = g.rule.trim().toLowerCase();
        if (!rule) continue;

        if (rule.startsWith('path:')) {
          const val = rule.replace('path:', '').trim();
          if (
            (node.type === 'journal' && val.includes('journal')) ||
            (node.category && node.category.toLowerCase().includes(val)) ||
            (node.id && node.id.toLowerCase().includes(val))
          ) {
            return g.color;
          }
        } else if (rule.startsWith('tag:')) {
          const val = rule.replace('tag:', '').trim().replace(/^#/, '');
          if ((node.tags || []).some((t) => t.toLowerCase().replace(/^#/, '').includes(val))) {
            return g.color;
          }
        } else if (rule.startsWith('file:') || rule.startsWith('name:')) {
          const val = rule.split(':')[1].trim();
          if (node.title.toLowerCase().includes(val)) {
            return g.color;
          }
        } else {
          // Plain string query matches title, category, or tags
          if (
            node.title.toLowerCase().includes(rule) ||
            node.category.toLowerCase().includes(rule) ||
            (node.tags || []).some((t) => t.toLowerCase().includes(rule))
          ) {
            return g.color;
          }
        }
      }

      // Default fallback
      return node.color || '#9CA3AF';
    },
    [groups]
  );

  // Filter nodes according to panel toggles & search
  const filteredNodes = useMemo(() => {
    return rawGraphData.nodes.filter((node) => {
      // Local Graph mode restriction
      if (localGraphNodeIds && !localGraphNodeIds.has(node.id)) {
        return false;
      }

      // Existing files only (hide unresolved placeholder nodes)
      if (existingFilesOnly && node.isUnresolved) {
        return false;
      }

      // Tags toggle
      if (!showTags && node.type === 'tag') {
        return false;
      }

      // Attachments toggle
      if (!showAttachments && node.type === 'attachment') {
        return false;
      }

      // Orphans toggle (0 connections)
      if (!showOrphans && (node.linkCount || 0) === 0) {
        return false;
      }

      return true;
    });
  }, [
    rawGraphData.nodes,
    localGraphNodeIds,
    existingFilesOnly,
    showTags,
    showAttachments,
    showOrphans,
  ]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return rawGraphData.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );
  }, [rawGraphData.edges, filteredNodeIds]);

  // Node degrees within the filtered view (unlinked notes have degree 0)
  const filteredDegreeMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredNodes.forEach((n) => map.set(n.id, 0));
    filteredEdges.forEach((e) => {
      map.set(e.source, (map.get(e.source) || 0) + 1);
      map.set(e.target, (map.get(e.target) || 0) + 1);
    });
    return map;
  }, [filteredNodes, filteredEdges]);

  // Simulation Nodes State
  const [simNodes, setSimNodes] = useState<SimulatedNode[]>([]);

  // Initialize simulation positions:
  // - Interconnected notes form organic network clusters around center
  // - Unlinked/orphan notes are placed in their own separate outer perimeter orbit
  useEffect(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const connectedNodes = filteredNodes.filter((n) => (filteredDegreeMap.get(n.id) || 0) > 0);
    const unlinkedNodes = filteredNodes.filter((n) => (filteredDegreeMap.get(n.id) || 0) === 0);

    setSimNodes((prevNodes) => {
      const prevMap = new Map<string, SimulatedNode>();
      prevNodes.forEach((n) => prevMap.set(n.id, n));

      const updatedNodes: SimulatedNode[] = [];

      // 1. Position Connected Nodes (inner core cluster)
      connectedNodes.forEach((n, idx) => {
        const existing = prevMap.get(n.id);
        const baseRadius = n.type === 'tag' ? 4.5 : n.isUnresolved ? 4.8 : 5.8;
        const radius = Math.min(
          22,
          Math.max(baseRadius, baseRadius + Math.sqrt(n.linkCount || 0) * 2.2)
        );

        if (existing) {
          updatedNodes.push({
            ...n,
            x: existing.x,
            y: existing.y,
            vx: existing.vx * 0.4,
            vy: existing.vy * 0.4,
            radius,
            color: getNodeColor(n),
            isPinned: existing.isPinned,
          });
        } else {
          const angle = idx * 2.39996;
          const dist =
            Math.min(dimensions.width, dimensions.height) *
            0.26 *
            Math.sqrt((idx + 1) / (Math.max(1, connectedNodes.length) + 1));
          updatedNodes.push({
            ...n,
            x: centerX + dist * Math.cos(angle),
            y: centerY + dist * Math.sin(angle),
            vx: 0,
            vy: 0,
            radius,
            color: getNodeColor(n),
            isPinned: false,
          });
        }
      });

      // 2. Position Unlinked / Orphan Notes in a dedicated separate outer orbit
      const orbitRadius = Math.min(dimensions.width, dimensions.height) * 0.42;
      unlinkedNodes.forEach((n, idx) => {
        const existing = prevMap.get(n.id);
        const baseRadius = n.type === 'tag' ? 4.5 : n.isUnresolved ? 4.8 : 5.8;
        const radius = Math.min(
          18,
          Math.max(baseRadius, baseRadius + Math.sqrt(n.linkCount || 0) * 2.0)
        );

        if (existing) {
          updatedNodes.push({
            ...n,
            x: existing.x,
            y: existing.y,
            vx: existing.vx * 0.4,
            vy: existing.vy * 0.4,
            radius,
            color: getNodeColor(n),
            isPinned: existing.isPinned,
          });
        } else {
          // Evenly distribute unlinked notes in an outer ring separate from connected nodes
          const angle = (idx / Math.max(1, unlinkedNodes.length)) * Math.PI * 2 + 0.35;
          updatedNodes.push({
            ...n,
            x: centerX + orbitRadius * Math.cos(angle),
            y: centerY + orbitRadius * Math.sin(angle),
            vx: 0,
            vy: 0,
            radius,
            color: getNodeColor(n),
            isPinned: false,
          });
        }
      });

      return updatedNodes;
    });
  }, [filteredNodes, filteredDegreeMap, dimensions.width, dimensions.height, getNodeColor]);

  // Map for fast node coordinate lookup
  const nodePosMap = useMemo(() => {
    const map = new Map<string, SimulatedNode>();
    simNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [simNodes]);

  // Connected nodes of active selection or hover
  const activeFocusNode = selectedNode || hoveredNode;
  const connectedNodeIds = useMemo(() => {
    if (!activeFocusNode) return null;
    const targetId = activeFocusNode.id;
    const set = new Set<string>();
    set.add(targetId);
    filteredEdges.forEach((e) => {
      if (e.source === targetId) set.add(e.target);
      if (e.target === targetId) set.add(e.source);
    });
    return set;
  }, [activeFocusNode, filteredEdges]);

  // Continuous Force Simulation Engine & Direct-to-Canvas High-Performance RAF Loop
  const simNodesRef = useRef<SimulatedNode[]>(simNodes);
  useEffect(() => {
    simNodesRef.current = simNodes;
  }, [simNodes]);

  const draggedNodeRef = useRef<SimulatedNode | null>(null);
  const dragTargetRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const ticksRef = useRef<number>(0);

  // Synchronize ref with zoom and pan for global window events
  const zoomLevelRef = useRef<number>(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const panOffsetRef = useRef<{ x: number; y: number }>(panOffset);
  panOffsetRef.current = panOffset;

  // Ultra-Fast Canvas Drawing Routine (Direct Render with High-DPI support)
  const renderCanvas = useCallback(
    (nodesToRender?: SimulatedNode[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const nodes = nodesToRender || simNodesRef.current;
      if (!nodes || nodes.length === 0) return;

      // Fast coordinate lookup map
      const nodeMap = new Map<string, SimulatedNode>();
      nodes.forEach((n) => nodeMap.set(n.id, n));

      // Handle High-DPI screens
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = dimensions.width * dpr;
      const targetHeight = dimensions.height * dpr;
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // 1. Clear with Obsidian Dark Charcoal Background
      ctx.fillStyle = '#202020';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // 2. Apply Pan & Zoom transformation
      ctx.translate(panOffsetRef.current.x, panOffsetRef.current.y);
      ctx.scale(zoomLevelRef.current, zoomLevelRef.current);

      // Search query matches for highlighting
      const searchTrimmed = searchQuery.trim().toLowerCase();

      // 3. Draw Connecting Edges
      filteredEdges.forEach((edge) => {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) return;

        const isConnectedToFocus =
          connectedNodeIds && connectedNodeIds.has(s.id) && connectedNodeIds.has(t.id);
        const isDimmed = connectedNodeIds && !isConnectedToFocus;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isConnectedToFocus) {
          ctx.strokeStyle = '#10B981'; // Vibrant emerald when focused
          ctx.lineWidth = (linkThickness * 2.2) / zoomLevelRef.current;
          ctx.globalAlpha = 0.95;
        } else {
          ctx.strokeStyle = '#555555';
          ctx.lineWidth = linkThickness / zoomLevelRef.current;
          ctx.globalAlpha = isDimmed ? 0.08 : linkOpacity;
        }
        ctx.stroke();

        // Directional arrowhead
        if (showArrows && !isDimmed) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 25) {
            const arrowLen = Math.max(4, 7 / zoomLevelRef.current);
            const stopDist = t.radius * nodeSizeMultiplier + 3 / zoomLevelRef.current;
            const arrowX = t.x - (dx / dist) * stopDist;
            const arrowY = t.y - (dy / dist) * stopDist;
            const angle = Math.atan2(dy, dx);

            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
              arrowX - arrowLen * Math.cos(angle - Math.PI / 6),
              arrowY - arrowLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              arrowX - arrowLen * Math.cos(angle + Math.PI / 6),
              arrowY - arrowLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.fillStyle = isConnectedToFocus ? '#10B981' : '#666666';
            ctx.fill();
          }
        }
      });

      // 4. Draw Nodes
      nodes.forEach((node) => {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isConnected = connectedNodeIds ? connectedNodeIds.has(node.id) : true;
        const isMatchingSearch =
          searchTrimmed.length > 0 && node.title.toLowerCase().includes(searchTrimmed);
        const isDimmed = connectedNodeIds && !isConnected && !isMatchingSearch;
        const isUnlinked = (filteredDegreeMap.get(node.id) || 0) === 0;

        const r = node.radius * nodeSizeMultiplier;
        const fill = node.color || '#9CA3AF';

        ctx.globalAlpha = isDimmed ? 0.15 : nodeOpacity;

        // Visual distinction for unlinked / orphan notes: delicate separated outer ring
        if (isUnlinked && !isDimmed) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 3 / zoomLevelRef.current, 0, Math.PI * 2);
          ctx.strokeStyle = fill;
          ctx.lineWidth = 0.9 / zoomLevelRef.current;
          ctx.globalAlpha = 0.35;
          ctx.setLineDash([2 / zoomLevelRef.current, 2.5 / zoomLevelRef.current]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = isDimmed ? 0.15 : nodeOpacity;
        }

        // Outer Selection Ring or Search Highlight Ring
        if (isSelected || isMatchingSearch) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 6 / zoomLevelRef.current, 0, Math.PI * 2);
          ctx.strokeStyle = fill;
          ctx.lineWidth = 2 / zoomLevelRef.current;
          ctx.stroke();
        }

        // Hover halo
        if (isHovered && !isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 4 / zoomLevelRef.current, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.globalAlpha = 0.25;
          ctx.fill();
          ctx.globalAlpha = isDimmed ? 0.15 : nodeOpacity;
        }

        // Main Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

        if (node.isUnresolved) {
          // Unresolved links rendered hollow / dashed
          ctx.strokeStyle = fill;
          ctx.lineWidth = 1.5 / zoomLevelRef.current;
          ctx.stroke();
          ctx.fillStyle = '#262626';
          ctx.fill();
        } else {
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = (isSelected || isHovered ? 2 : 1) / zoomLevelRef.current;
          ctx.stroke();
        }

        // Daily Journal Center Dot
        if (node.type === 'journal') {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 0.38, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }

        // Pin badge
        if (node.isPinned) {
          ctx.beginPath();
          ctx.arc(node.x + r * 0.7, node.y - r * 0.7, 3.5 / zoomLevelRef.current, 0, Math.PI * 2);
          ctx.fillStyle = '#F59E0B';
          ctx.fill();
        }

        // Text Labels
        const showLabel =
          textLabelMode === 'all' ||
          isHovered ||
          isSelected ||
          isMatchingSearch ||
          (textLabelMode === 'connected' && isConnected);

        if (showLabel && textLabelMode !== 'none') {
          ctx.globalAlpha = isDimmed ? 0.2 : 0.95;
          ctx.font = `${
            isSelected || isHovered ? 'bold ' : ''
          }${textSize / zoomLevelRef.current}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          const labelY = node.y + r + 4 / zoomLevelRef.current;
          const text =
            node.title.length > 24 ? `${node.title.slice(0, 22)}…` : node.title;

          // Shadow halo for text contrast
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillStyle = isSelected || isHovered ? '#ffffff' : '#d4d4d8';
          ctx.fillText(text, node.x, labelY);
          ctx.shadowBlur = 0;
        }
      });

      ctx.restore();
    },
    [
      dimensions.width,
      dimensions.height,
      filteredEdges,
      connectedNodeIds,
      selectedNode,
      hoveredNode,
      searchQuery,
      nodeSizeMultiplier,
      linkThickness,
      linkOpacity,
      nodeOpacity,
      textLabelMode,
      textSize,
      showArrows,
      filteredDegreeMap,
    ]
  );

  // Render on static state change (zoom, pan, search, hover, select, filters)
  useEffect(() => {
    renderCanvas(simNodesRef.current);
  }, [renderCanvas, panOffset, zoomLevel, simNodes]);

  // Simulation step execution
  const runSimulationStep = useCallback(() => {
    const current = simNodesRef.current;
    const count = current.length;
    if (count === 0) return false;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const nodeMap = new Map<string, SimulatedNode>();
    const updated = current.map((n) => {
      const copy = { ...n };
      nodeMap.set(n.id, copy);
      return copy;
    });

    const activeDrag = draggedNodeRef.current;
    const dragTarget = dragTargetRef.current;

    // Pin dragged node directly to mouse/touch world position
    if (activeDrag && dragTarget) {
      const liveDragged = nodeMap.get(activeDrag.id);
      if (liveDragged) {
        liveDragged.x = dragTarget.x;
        liveDragged.y = dragTarget.y;
        liveDragged.vx = 0;
        liveDragged.vy = 0;
      }
    }

    // 1. Dynamic Active Repulsion: When dragging any note, nearby notes actively REPEL away!
    // (Especially strong when pushing unlinked notes near linked notes or vice versa)
    if (activeDrag && dragTarget) {
      const draggedIsUnlinked = (filteredDegreeMap.get(activeDrag.id) || 0) === 0;

      for (let i = 0; i < count; i++) {
        const n = updated[i];
        if (n.id === activeDrag.id || n.isPinned) continue;

        const nIsUnlinked = (filteredDegreeMap.get(n.id) || 0) === 0;
        const isCrossCluster = draggedIsUnlinked !== nIsUnlinked;

        const dx = n.x - dragTarget.x;
        const dy = n.y - dragTarget.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        // Broad magnetic repulsion radius around the dragged node
        const baseRepel = isCrossCluster ? 180 : 145;
        const targetRepelDist = Math.max(
          baseRepel,
          (activeDrag.radius + n.radius) * 4.4 + 35
        );

        if (dist < targetRepelDist) {
          const proximity = (targetRepelDist - dist) / targetRepelDist;
          // Boosted dynamic repulsion multiplier when moving unlinked note near linked notes
          const multiplier = isCrossCluster ? 2.2 : 1.4;
          const push = Math.pow(proximity, 1.35) * 25.0 * multiplier;
          n.vx += (dx / dist) * push;
          n.vy += (dy / dist) * push;
          n.x += (dx / dist) * (push * 0.42);
          n.y += (dy / dist) * (push * 0.42);
        }

        // Hard elastic collision barrier: notes never overlap; they part cleanly!
        const minDistance = activeDrag.radius + n.radius + (isCrossCluster ? 20 : 15);
        if (dist < minDistance) {
          const overlap = minDistance - dist;
          n.x += (dx / dist) * overlap * 0.95;
          n.y += (dy / dist) * overlap * 0.95;
          n.vx += (dx / dist) * 7.5;
          n.vy += (dy / dist) * 7.5;
        }
      }
    }

    // 2. Pairwise Inter-Node Repulsion
    for (let i = 0; i < count; i++) {
      const n1 = updated[i];
      if (activeDrag && n1.id === activeDrag.id) continue;
      const n1Unlinked = (filteredDegreeMap.get(n1.id) || 0) === 0;

      for (let j = i + 1; j < count; j++) {
        const n2 = updated[j];
        if (activeDrag && n2.id === activeDrag.id) continue;
        const n2Unlinked = (filteredDegreeMap.get(n2.id) || 0) === 0;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        const isCrossCluster = n1Unlinked !== n2Unlinked;
        const baseRepelDist = isCrossCluster ? 160 : 125;
        const repelRadius = Math.max(baseRepelDist, (n1.radius + n2.radius) * 3.2 + 35);

        if (dist < repelRadius) {
          const proximity = (repelRadius - dist) / repelRadius;
          const crossMultiplier = isCrossCluster ? 1.85 : 1.0;
          const dynamicPush =
            (repulsionForce * 0.007 + 1.2) * Math.pow(proximity, 1.5) * 11.0 * crossMultiplier;
          const fx = (dx / dist) * dynamicPush;
          const fy = (dy / dist) * dynamicPush;

          if (!n1.isPinned) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (!n2.isPinned) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }

        // Hard collision repulsion
        const minCollisionDist = n1.radius + n2.radius + (isCrossCluster ? 22 : 14);
        if (dist < minCollisionDist) {
          const overlap = minCollisionDist - dist;
          const sepPush = overlap * 0.85;
          const cx = (dx / dist) * sepPush;
          const cy = (dy / dist) * sepPush;

          if (!n1.isPinned) {
            n1.vx -= cx;
            n1.vy -= cy;
            n1.x -= cx * 0.45;
            n1.y -= cy * 0.45;
          }
          if (!n2.isPinned) {
            n2.vx += cx;
            n2.vy += cy;
            n2.x += cx * 0.45;
            n2.y += cy * 0.45;
          }
        }
      }
    }

    // 3. Attraction along edges
    filteredEdges.forEach((edge) => {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (s && t) {
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - linkDistance) * linkStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!s.isPinned && (!activeDrag || s.id !== activeDrag.id)) {
          s.vx += fx;
          s.vy += fy;
        }
        if (!t.isPinned && (!activeDrag || t.id !== activeDrag.id)) {
          t.vx -= fx;
          t.vy -= fy;
        }
      }
    });

    // 4. Center Gravity for Connected Notes & Dedicated Outer Orbit Separation for Unlinked Notes
    const outerOrbitRadius = Math.min(dimensions.width, dimensions.height) * 0.42;

    updated.forEach((node) => {
      if (activeDrag && node.id === activeDrag.id) return;
      if (node.isPinned) {
        node.vx = 0;
        node.vy = 0;
        return;
      }

      const isUnlinked = (filteredDegreeMap.get(node.id) || 0) === 0;

      if (!isUnlinked) {
        // Connected notes gravitate towards core cluster
        node.vx += (centerX - node.x) * centerGravity;
        node.vy += (centerY - node.y) * centerGravity;
      } else {
        // Unlinked notes stay separate in outer orbital perimeter
        const distFromCenter = Math.hypot(node.x - centerX, node.y - centerY) || 1;
        const radialDiff = outerOrbitRadius - distFromCenter;
        const radialForce = radialDiff * (centerGravity * 0.75);
        node.vx += ((node.x - centerX) / distFromCenter) * radialForce;
        node.vy += ((node.y - centerY) / distFromCenter) * radialForce;

        // Strong push outward if unlinked note drifts into connected core
        const innerCoreRadius = Math.min(dimensions.width, dimensions.height) * 0.30;
        if (distFromCenter < innerCoreRadius) {
          const pushOut = (innerCoreRadius - distFromCenter) * 0.16;
          node.vx += ((node.x - centerX) / distFromCenter) * pushOut;
          node.vy += ((node.y - centerY) / distFromCenter) * pushOut;
        }
      }

      // Clamp max velocity to eliminate glitching jumps or erratic oscillations
      const currentSpeed = Math.hypot(node.vx, node.vy);
      const maxAllowedSpeed = 32;
      if (currentSpeed > maxAllowedSpeed) {
        node.vx = (node.vx / currentSpeed) * maxAllowedSpeed;
        node.vy = (node.vy / currentSpeed) * maxAllowedSpeed;
      }

      // Smooth physics damping
      node.vx *= 0.88;
      node.vy *= 0.88;

      node.x += node.vx;
      node.y += node.vy;

      // Safe viewport boundary padding
      const pad = node.radius + 20;
      node.x = Math.max(pad, Math.min(dimensions.width - pad, node.x));
      node.y = Math.max(pad, Math.min(dimensions.height - pad, node.y));
    });

    simNodesRef.current = updated;
    renderCanvas(updated);
    return true;
  }, [
    dimensions.width,
    dimensions.height,
    filteredDegreeMap,
    filteredEdges,
    repulsionForce,
    linkDistance,
    linkStrength,
    centerGravity,
    renderCanvas,
  ]);

  // Wake simulation loop (called when interacting or dragging)
  const wakeSimulation = useCallback(() => {
    ticksRef.current = 0;
    if (animFrameRef.current === null) {
      const loop = () => {
        ticksRef.current++;
        runSimulationStep();
        const maxTicks = isDraggingRef.current ? Infinity : 180;
        if (ticksRef.current < maxTicks || isDraggingRef.current) {
          animFrameRef.current = requestAnimationFrame(loop);
        } else {
          animFrameRef.current = null;
        }
      };
      animFrameRef.current = requestAnimationFrame(loop);
    }
  }, [runSimulationStep]);

  // Keep simulation running on physics parameters change
  useEffect(() => {
    if (!isPhysicsActive) return;
    wakeSimulation();
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPhysicsActive, wakeSimulation, simNodes]);

  // Find node under mouse cursor using live positions
  const getNodeAtCoords = useCallback(
    (clientX: number, clientY: number): SimulatedNode | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (clientX - rect.left - panOffsetRef.current.x) / zoomLevelRef.current;
      const mouseY = (clientY - rect.top - panOffsetRef.current.y) / zoomLevelRef.current;

      const nodes = simNodesRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const r = n.radius * nodeSizeMultiplier + 5;
        const dx = mouseX - n.x;
        const dy = mouseY - n.y;
        if (dx * dx + dy * dy <= r * r) {
          return n;
        }
      }
      return null;
    },
    [nodeSizeMultiplier]
  );

  // Mouse Down (Starts smooth drag or pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setContextMenu(null);
      const hit = getNodeAtCoords(e.clientX, e.clientY);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - panOffsetRef.current.x) / zoomLevelRef.current;
      const mouseY = (e.clientY - rect.top - panOffsetRef.current.y) / zoomLevelRef.current;

      pointerStartCoordsRef.current = { x: e.clientX, y: e.clientY };
      hasMovedRef.current = false;

      if (hit) {
        draggedNodeRef.current = hit;
        dragTargetRef.current = { x: mouseX, y: mouseY };
        isDraggingRef.current = true;
        setDraggedNode(hit);
        wakeSimulation();
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);
      }
    }
  };

  // Window-level Pointer Move & Up listeners for 100% smooth, glitch-free dragging
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const distFromStart = Math.hypot(
        e.clientX - pointerStartCoordsRef.current.x,
        e.clientY - pointerStartCoordsRef.current.y
      );
      if (distFromStart > 4) {
        hasMovedRef.current = true;
      }

      if (isDraggingRef.current && draggedNodeRef.current) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - panOffsetRef.current.x) / zoomLevelRef.current;
        const mouseY = (e.clientY - rect.top - panOffsetRef.current.y) / zoomLevelRef.current;

        dragTargetRef.current = { x: mouseX, y: mouseY };
        // Immediately wake and advance simulation without React state delay
        wakeSimulation();
      } else if (isPanningRef.current && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        panStartRef.current = { x: e.clientX, y: e.clientY };

        const nextPan = {
          x: panOffsetRef.current.x + dx,
          y: panOffsetRef.current.y + dy,
        };
        panOffsetRef.current = nextPan;
        // Directly render frame during panning without triggering high-frequency React re-renders
        renderCanvas(simNodesRef.current);
      }
    };

    const handleWindowPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        draggedNodeRef.current = null;
        dragTargetRef.current = null;
        setDraggedNode(null);

        // Synchronize positions into React state once motion settles
        setSimNodes([...simNodesRef.current]);
      }
      if (isPanningRef.current) {
        isPanningRef.current = false;
        panStartRef.current = null;
        setIsPanning(false);
        setPanOffset({ ...panOffsetRef.current });
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [wakeSimulation, renderCanvas]);

  // Mouse Move over canvas (Hover detection & tooltips)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current || isPanningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const hit = getNodeAtCoords(e.clientX, e.clientY);
    if (hoveredNode?.id !== hit?.id) {
      setHoveredNode(hit);
    }
    if (hit) {
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15,
      });
    } else {
      setTooltipPos(null);
    }
  };

  // Mouse Up on canvas
  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      dragTargetRef.current = null;
      setDraggedNode(null);
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      setIsPanning(false);
      setPanOffset({ ...panOffsetRef.current });
    }
  };

  // Click on Node or Canvas (Only triggers if pointer was not dragged)
  const handleClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    const hit = getNodeAtCoords(e.clientX, e.clientY);
    if (hit) {
      if (selectedNode?.id === hit.id) {
        setSelectedNode(null);
      } else {
        setSelectedNode(hit);
      }
    } else {
      setSelectedNode(null);
    }
  };

  // Double Click (Directly opens note in editor)
  const handleDoubleClick = (e: React.MouseEvent) => {
    const hit = getNodeAtCoords(e.clientX, e.clientY);
    if (hit) {
      onSelectNote(hit.id);
    }
  };

  // Right-Click Context Menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const hit = getNodeAtCoords(e.clientX, e.clientY);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (hit) {
      setSelectedNode(hit);
      setContextMenu({
        node: hit,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else {
      setContextMenu(null);
    }
  };

  // Touch gesture state for mobile & tablet graph interaction
  const touchStateRef = useRef<{
    lastX: number;
    lastY: number;
    initialDist?: number;
    initialZoom?: number;
    touchDraggedNode?: SimulatedNode | null;
  } | null>(null);

  // Wheel Zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const nextZoom = Math.min(3.5, Math.max(0.2, zoomLevelRef.current * zoomFactor));

    const newPanX = mouseX - (mouseX - panOffsetRef.current.x) * (nextZoom / zoomLevelRef.current);
    const newPanY = mouseY - (mouseY - panOffsetRef.current.y) * (nextZoom / zoomLevelRef.current);

    zoomLevelRef.current = nextZoom;
    panOffsetRef.current = { x: newPanX, y: newPanY };
    setZoomLevel(nextZoom);
    setPanOffset({ x: newPanX, y: newPanY });
    renderCanvas(simNodesRef.current);
  };

  // Touch Handlers for Pinch-to-Zoom and Touch Drag/Pan
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const hit = getNodeAtCoords(t.clientX, t.clientY);
      const mouseX = (t.clientX - rect.left - panOffsetRef.current.x) / zoomLevelRef.current;
      const mouseY = (t.clientY - rect.top - panOffsetRef.current.y) / zoomLevelRef.current;

      touchStateRef.current = {
        lastX: t.clientX,
        lastY: t.clientY,
        touchDraggedNode: hit,
      };

      if (hit) {
        draggedNodeRef.current = hit;
        dragTargetRef.current = { x: mouseX, y: mouseY };
        isDraggingRef.current = true;
        setDraggedNode(hit);
        wakeSimulation();
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: t.clientX, y: t.clientY };
        setIsPanning(true);
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStateRef.current = {
        lastX: (t1.clientX + t2.clientX) / 2,
        lastY: (t1.clientY + t2.clientY) / 2,
        initialDist: dist,
        initialZoom: zoomLevelRef.current,
        touchDraggedNode: null,
      };
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      dragTargetRef.current = null;
      setDraggedNode(null);
      setIsPanning(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !touchStateRef.current) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2 && touchStateRef.current.initialDist) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleRatio = currentDist / touchStateRef.current.initialDist;
      const nextZoom = Math.min(
        3.5,
        Math.max(0.2, (touchStateRef.current.initialZoom || 1) * scaleRatio)
      );

      const centerClientX = (t1.clientX + t2.clientX) / 2;
      const centerClientY = (t1.clientY + t2.clientY) / 2;
      const mouseX = centerClientX - rect.left;
      const mouseY = centerClientY - rect.top;

      const newPanX =
        mouseX - (mouseX - panOffsetRef.current.x) * (nextZoom / zoomLevelRef.current);
      const newPanY =
        mouseY - (mouseY - panOffsetRef.current.y) * (nextZoom / zoomLevelRef.current);

      zoomLevelRef.current = nextZoom;
      panOffsetRef.current = { x: newPanX, y: newPanY };
      setZoomLevel(nextZoom);
      setPanOffset({ x: newPanX, y: newPanY });
      renderCanvas(simNodesRef.current);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - touchStateRef.current.lastX;
      const dy = t.clientY - touchStateRef.current.lastY;
      touchStateRef.current.lastX = t.clientX;
      touchStateRef.current.lastY = t.clientY;

      if (isDraggingRef.current && draggedNodeRef.current) {
        const mouseX = (t.clientX - rect.left - panOffsetRef.current.x) / zoomLevelRef.current;
        const mouseY = (t.clientY - rect.top - panOffsetRef.current.y) / zoomLevelRef.current;
        dragTargetRef.current = { x: mouseX, y: mouseY };
        wakeSimulation();
      } else if (isPanningRef.current) {
        const nextPan = {
          x: panOffsetRef.current.x + dx,
          y: panOffsetRef.current.y + dy,
        };
        panOffsetRef.current = nextPan;
        renderCanvas(simNodesRef.current);
      }
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current = null;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      dragTargetRef.current = null;
      setDraggedNode(null);
      setSimNodes([...simNodesRef.current]);
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      setIsPanning(false);
      setPanOffset({ ...panOffsetRef.current });
    }
  };

  // Fit to screen (with optional custom dimension override for fullscreen transitions)
  const handleFitToScreen = useCallback(
    (customDims?: { width: number; height: number }) => {
      const nodes = simNodesRef.current.length > 0 ? simNodesRef.current : simNodes;
      if (nodes.length === 0) return;
      const dims = customDims || dimensions;
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      nodes.forEach((n) => {
        minX = Math.min(minX, n.x - n.radius);
        maxX = Math.max(maxX, n.x + n.radius);
        minY = Math.min(minY, n.y - n.radius);
        maxY = Math.max(maxY, n.y + n.radius);
      });

      const graphWidth = maxX - minX || 100;
      const graphHeight = maxY - minY || 100;

      const scaleX = (dims.width - 160) / graphWidth;
      const scaleY = (dims.height - 160) / graphHeight;
      const fitScale = Math.min(2.0, Math.max(0.3, Math.min(scaleX, scaleY)));

      const graphCenterX = (minX + maxX) / 2;
      const graphCenterY = (minY + maxY) / 2;

      const nextPanX = dims.width / 2 - graphCenterX * fitScale;
      const nextPanY = dims.height / 2 - graphCenterY * fitScale;

      zoomLevelRef.current = fitScale;
      panOffsetRef.current = { x: nextPanX, y: nextPanY };
      setZoomLevel(fitScale);
      setPanOffset({ x: nextPanX, y: nextPanY });
      renderCanvas(nodes);
      showToast('Fitted graph to view');
    },
    [simNodes, dimensions, showToast, renderCanvas]
  );

  // Proper Fullscreen Toggle (HTML5 Fullscreen API + CSS overlay fallback)
  const toggleFullscreen = useCallback(async () => {
    const willBeFullscreen = !isFullscreen;
    setIsFullscreen(willBeFullscreen);

    if (willBeFullscreen) {
      showToast('Entered Fullscreen — press Esc to exit');
      try {
        if (
          containerRef.current &&
          document.fullscreenEnabled &&
          !document.fullscreenElement &&
          containerRef.current.requestFullscreen
        ) {
          await containerRef.current.requestFullscreen();
        }
      } catch {
        // Handled seamlessly via CSS fixed overlay
      }
      setTimeout(() => {
        const newDims = { width: window.innerWidth, height: window.innerHeight };
        setDimensions(newDims);
        handleFitToScreen(newDims);
      }, 70);
    } else {
      showToast('Exited Fullscreen');
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // Handled
      }
      setTimeout(() => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          const newDims = {
            width: Math.max(380, clientWidth || window.innerWidth),
            height: Math.max(480, clientHeight || 650),
          };
          setDimensions(newDims);
          handleFitToScreen(newDims);
        }
      }, 70);
    }
  }, [isFullscreen, handleFitToScreen, showToast]);

  // Global Keyboard Shortcuts (Escape to exit Fullscreen or dismiss focus, 'F' for Fullscreen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNative = Boolean(document.fullscreenElement);
      if (!isNative && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in search input or other fields
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
        } else if (selectedNode) {
          setSelectedNode(null);
          setContextMenu(null);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen, selectedNode]);

  // Reset view
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedNode(null);
    setHoveredNode(null);
    setLocalGraphRootId(null);
    setSearchQuery('');
    showToast('Reset view');
  };

  // Copy [[WikiLink]]
  const handleCopyWikiLink = (title: string) => {
    const linkText = `[[${title}]]`;
    navigator.clipboard.writeText(linkText);
    showToast(`Copied ${linkText}`);
  };

  // Pin node position
  const handleTogglePinNode = (nodeId: string) => {
    setSimNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          const nextPinned = !n.isPinned;
          showToast(nextPinned ? `Pinned "${n.title}"` : `Unpinned "${n.title}"`);
          return { ...n, isPinned: nextPinned };
        }
        return n;
      })
    );
  };

  // Add new group
  const handleAddNewGroup = () => {
    const newGroup: GraphGroupRule = {
      id: `group-${Date.now()}`,
      rule: 'path:new',
      color: PRESET_COLORS[groups.length % PRESET_COLORS.length],
    };
    setGroups([...groups, newGroup]);
  };

  const handleUpdateGroupRule = (id: string, newRule: string) => {
    setGroups(groups.map((g) => (g.id === id ? { ...g, rule: newRule } : g)));
  };

  const handleUpdateGroupColor = (id: string, newColor: string) => {
    setGroups(groups.map((g) => (g.id === id ? { ...g, color: newColor } : g)));
    setActiveColorPickerGroupId(null);
  };

  const handleRemoveGroup = (id: string) => {
    setGroups(groups.filter((g) => g.id !== id));
  };

  // Export PNG image
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `obsidian-graph-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    showToast('Graph exported as PNG');
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none border-0 shadow-none m-0'
          : 'h-[650px] sm:h-[720px] rounded-3xl border border-stone-800 shadow-xl'
      } bg-[#202020] overflow-hidden select-none ${className}`}
      id="obsidian-knowledge-graph-view"
    >
      {/* Top Header: Title & Context Tools */}
      <div className="absolute top-0 inset-x-0 h-12 flex items-center justify-between px-4 sm:px-6 z-20 pointer-events-none bg-gradient-to-b from-[#202020]/95 via-[#202020]/60 to-transparent">
        {/* Left: Local Graph indicator or stats */}
        <div className="pointer-events-auto flex items-center gap-2">
          {localGraphRootId ? (
            <div className="flex items-center gap-2 bg-[#2a2a2a]/95 text-stone-200 border border-stone-700/80 rounded-xl px-2.5 py-1 text-xs shadow-md">
              <button
                type="button"
                onClick={() => setLocalGraphRootId(null)}
                className="hover:text-emerald-400 flex items-center gap-1 cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Global Graph</span>
              </button>
              <span className="text-stone-500">•</span>
              <span className="font-semibold text-emerald-400 truncate max-w-[150px]">
                {nodePosMap.get(localGraphRootId)?.title || 'Local Graph'}
              </span>
              <div className="flex items-center bg-stone-800 rounded-lg p-0.5 ml-1">
                {([1, 2, 3] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setLocalGraphDepth(d)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      localGraphDepth === d
                        ? 'bg-emerald-600 text-white'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-stone-400 bg-[#2a2a2a]/80 backdrop-blur-sm border border-stone-800 px-2.5 py-1 rounded-xl">
              <span>{filteredNodes.length} nodes</span>
              <span className="mx-1.5 text-stone-600">•</span>
              <span>{filteredEdges.length} links</span>
            </div>
          )}
        </div>

        {/* Center Title (Obsidian Graph View Title) */}
        <div className="text-stone-300 font-medium text-xs sm:text-sm tracking-wide flex items-center gap-2">
          <span>Graph view</span>
          {isFullscreen && (
            <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-700/50">
              Fullscreen
            </span>
          )}
        </div>

        {/* Right Tools (Toggle filter panel, Fullscreen, Options) */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {!isFilterPanelOpen && (
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(true)}
              className="p-1.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] border border-stone-700/80 text-stone-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-md"
              title="Open Filters Panel"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleFitToScreen()}
            className="p-1.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] border border-stone-700/80 text-stone-400 hover:text-white transition-colors cursor-pointer"
            title="Fit Graph to Screen"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportPNG}
            className="p-1.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] border border-stone-700/80 text-stone-400 hover:text-white transition-colors cursor-pointer"
            title="Export Graph as PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Proper Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
              isFullscreen
                ? 'px-2.5 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 hover:text-white text-xs font-semibold'
                : 'p-1.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] border border-stone-700/80 text-stone-400 hover:text-white'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
                <kbd className="hidden sm:inline-block px-1 py-0.2 bg-emerald-900/90 rounded text-[10px] text-emerald-200 border border-emerald-700/60">
                  Esc
                </kbd>
              </>
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Fullscreen Quick-Exit Top Notification Pill */}
      {isFullscreen && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all">
          <div className="pointer-events-auto flex items-center gap-2 bg-[#262626]/90 border border-stone-700/70 px-3.5 py-1 rounded-full text-[11px] text-stone-300 shadow-2xl backdrop-blur-md">
            <span>Viewing in Fullscreen</span>
            <span className="text-stone-500">•</span>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              Exit (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full block touch-none select-none ${
          isPanning || draggedNode ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ width: '100%', height: '100%' }}
      />

      {/* RIGHT-SIDE OBSIDIAN FILTER PANEL (Pixel-identical to uploaded reference) */}
      {isFilterPanelOpen && (
        <div className="absolute top-14 right-4 w-72 sm:w-80 max-h-[calc(100%-4.5rem)] overflow-y-auto bg-[#262626]/95 border border-[#383838] rounded-2xl shadow-2xl backdrop-blur-md p-4 text-xs select-none z-30 space-y-4 text-stone-200 scrollbar-thin">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#333]">
            <button
              type="button"
              onClick={() => setIsFiltersSectionOpen(!isFiltersSectionOpen)}
              className="flex items-center gap-1.5 font-semibold text-sm text-stone-200 hover:text-white cursor-pointer"
            >
              {isFiltersSectionOpen ? (
                <ChevronDown className="w-4 h-4 text-stone-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-stone-400" />
              )}
              <span>Filters</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetView}
                title="Reset Filters"
                className="p-1 rounded text-stone-400 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                title="Close Filters Panel"
                className="p-1 rounded text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section A: Search Files & Toggles */}
          {isFiltersSectionOpen && (
            <div className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#333] text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Toggles List (Obsidian-style pill toggles) */}
              <div className="space-y-2 pt-1 text-xs">
                {/* Tags Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Tags</span>
                  <button
                    type="button"
                    onClick={() => setShowTags(!showTags)}
                    className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                      showTags ? 'bg-[#5B8266]' : 'bg-[#404040]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        showTags ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Attachments Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Attachments</span>
                  <button
                    type="button"
                    onClick={() => setShowAttachments(!showAttachments)}
                    className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                      showAttachments ? 'bg-[#5B8266]' : 'bg-[#404040]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        showAttachments ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Existing Files Only Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Existing files only</span>
                  <button
                    type="button"
                    onClick={() => setExistingFilesOnly(!existingFilesOnly)}
                    className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                      existingFilesOnly ? 'bg-[#5B8266]' : 'bg-[#404040]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        existingFilesOnly ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Orphans Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Orphans</span>
                  <button
                    type="button"
                    onClick={() => setShowOrphans(!showOrphans)}
                    className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                      showOrphans ? 'bg-[#5B8266]' : 'bg-[#404040]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        showOrphans ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section B: Groups Accordion (Matching reference screenshot) */}
          <div className="pt-2 border-t border-[#333]">
            <button
              type="button"
              onClick={() => setIsGroupsSectionOpen(!isGroupsSectionOpen)}
              className="flex items-center gap-1.5 font-semibold text-xs text-stone-200 hover:text-white cursor-pointer w-full mb-2"
            >
              {isGroupsSectionOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              )}
              <span>Groups</span>
            </button>

            {isGroupsSectionOpen && (
              <div className="space-y-1.5">
                {groups.map((g) => (
                  <div key={g.id} className="relative flex items-center gap-2">
                    <input
                      type="text"
                      value={g.rule}
                      onChange={(e) => handleUpdateGroupRule(g.id, e.target.value)}
                      placeholder="e.g. path:journal or tag:work"
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-[#1e1e1e] border border-[#333] text-stone-200 focus:outline-none focus:border-stone-500 font-mono"
                    />

                    {/* Color Dot Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveColorPickerGroupId(
                          activeColorPickerGroupId === g.id ? null : g.id
                        )
                      }
                      style={{ backgroundColor: g.color }}
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0 cursor-pointer shadow-xs hover:scale-110 transition-transform"
                      title="Change color"
                    />

                    {/* Remove Group Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(g.id)}
                      className="text-stone-500 hover:text-stone-300 p-0.5 cursor-pointer"
                      title="Remove group"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Color Picker Palette Popover */}
                    {activeColorPickerGroupId === g.id && (
                      <div className="absolute right-0 top-7 p-2 rounded-xl bg-[#1e1e1e] border border-stone-700 shadow-xl z-40 grid grid-cols-4 gap-1.5 animate-in fade-in duration-100">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleUpdateGroupColor(g.id, c)}
                            style={{ backgroundColor: c }}
                            className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* New Group Button (Styled exactly like Obsidian reference) */}
                <button
                  type="button"
                  onClick={handleAddNewGroup}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#374955] hover:bg-[#435968] text-slate-100 font-medium text-xs transition-colors cursor-pointer text-center"
                >
                  New group
                </button>
              </div>
            )}
          </div>

          {/* Section C: Display Accordion */}
          <div className="pt-2 border-t border-[#333]">
            <button
              type="button"
              onClick={() => setIsDisplaySectionOpen(!isDisplaySectionOpen)}
              className="flex items-center gap-1.5 font-semibold text-xs text-stone-200 hover:text-white cursor-pointer w-full mb-2"
            >
              {isDisplaySectionOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              )}
              <span>Display</span>
            </button>

            {isDisplaySectionOpen && (
              <div className="space-y-2.5 text-xs text-stone-300">
                {/* Node Size */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Node size</span>
                    <span>{nodeSizeMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={nodeSizeMultiplier}
                    onChange={(e) => setNodeSizeMultiplier(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Link Thickness */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Link thickness</span>
                    <span>{linkThickness.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={linkThickness}
                    onChange={(e) => setLinkThickness(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Link Opacity */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Link opacity</span>
                    <span>{Math.round(linkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={linkOpacity}
                    onChange={(e) => setLinkOpacity(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Text Label Mode */}
                <div>
                  <span className="text-[11px] text-stone-400 block mb-1">Text labels</span>
                  <div className="grid grid-cols-4 gap-1 text-[10px]">
                    {(['hover', 'connected', 'all', 'none'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTextLabelMode(mode)}
                        className={`py-1 rounded capitalize cursor-pointer ${
                          textLabelMode === mode
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'bg-[#1e1e1e] text-stone-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show Arrows Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span>Show arrows</span>
                  <button
                    type="button"
                    onClick={() => setShowArrows(!showArrows)}
                    className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                      showArrows ? 'bg-[#5B8266]' : 'bg-[#404040]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        showArrows ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section D: Forces Accordion */}
          <div className="pt-2 border-t border-[#333]">
            <button
              type="button"
              onClick={() => setIsForcesSectionOpen(!isForcesSectionOpen)}
              className="flex items-center gap-1.5 font-semibold text-xs text-stone-200 hover:text-white cursor-pointer w-full mb-2"
            >
              {isForcesSectionOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              )}
              <span>Forces</span>
            </button>

            {isForcesSectionOpen && (
              <div className="space-y-2.5 text-xs text-stone-300">
                {/* Repulsion Force */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Repulsion</span>
                    <span>{repulsionForce}</span>
                  </div>
                  <input
                    type="range"
                    min="800"
                    max="5000"
                    step="200"
                    value={repulsionForce}
                    onChange={(e) => setRepulsionForce(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Link Distance */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Link distance</span>
                    <span>{linkDistance}px</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="200"
                    step="10"
                    value={linkDistance}
                    onChange={(e) => setLinkDistance(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Center Gravity */}
                <div>
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Center force</span>
                    <span>{(centerGravity * 1000).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.001"
                    max="0.02"
                    step="0.001"
                    value={centerGravity}
                    onChange={(e) => setCenterGravity(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Simulation Control Buttons */}
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPhysicsActive(!isPhysicsActive)}
                    className="flex-1 py-1.5 rounded-lg bg-[#333] hover:bg-[#444] text-white flex items-center justify-center gap-1.5 cursor-pointer font-medium"
                  >
                    {isPhysicsActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPhysicsActive ? 'Pause' : 'Resume'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPhysicsActive(false);
                      setTimeout(() => setIsPhysicsActive(true), 50);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#333] hover:bg-[#444] text-white flex items-center justify-center gap-1.5 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Node Hover Tooltip (Section 7) */}
      {hoveredNode && tooltipPos && (
        <div
          className="absolute z-40 pointer-events-none p-3 rounded-xl bg-[#1e1e1e]/95 border border-[#444] shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in duration-100"
          style={{
            left: `${Math.min(dimensions.width - 240, tooltipPos.x)}px`,
            top: `${Math.min(dimensions.height - 140, tooltipPos.y)}px`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: hoveredNode.color || '#9CA3AF' }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              {hoveredNode.category || hoveredNode.type}
            </span>
            <span className="text-[10px] text-stone-500 font-mono ml-auto">
              {hoveredNode.linkCount || 0} links
            </span>
          </div>
          <h4 className="text-xs font-bold text-white leading-snug">
            {hoveredNode.title}
          </h4>
          {hoveredNode.contentSnippet && (
            <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
              {hoveredNode.contentSnippet}
            </p>
          )}
          <div className="text-[9px] text-stone-500 mt-1.5 pt-1 border-t border-[#333]">
            Click to inspect • Double-click to open
          </div>
        </div>
      )}

      {/* Bottom Floating Action Bar for Selected Node (Section 7) */}
      {selectedNode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-2 rounded-2xl bg-[#1e1e1e]/95 border border-stone-700 shadow-2xl backdrop-blur-md text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 px-2 max-w-xs truncate">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedNode.color || '#9CA3AF' }}
            />
            <span className="font-bold text-white truncate">{selectedNode.title}</span>
          </div>

          <div className="h-4 w-px bg-stone-700" />

          {/* Open Note Button */}
          <button
            type="button"
            onClick={() => onSelectNote(selectedNode.id)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <span>Open note</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          {/* Local Graph Mode Button */}
          <button
            type="button"
            onClick={() => {
              setLocalGraphRootId(selectedNode.id);
              showToast(`Local graph: ${selectedNode.title}`);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Explore Local Graph around this note"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Local graph</span>
          </button>

          {/* Copy WikiLink */}
          <button
            type="button"
            onClick={() => handleCopyWikiLink(selectedNode.title)}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer transition-colors"
            title="Copy [[WikiLink]]"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Pin/Unpin position */}
          <button
            type="button"
            onClick={() => handleTogglePinNode(selectedNode.id)}
            className={`p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 cursor-pointer transition-colors ${
              selectedNode.isPinned ? 'text-amber-400' : 'text-stone-300'
            }`}
            title={selectedNode.isPinned ? 'Unpin position' : 'Pin position'}
          >
            {selectedNode.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>

          {/* Close selection */}
          <button
            type="button"
            onClick={() => setSelectedNode(null)}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-500 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Right-Click Context Menu (Section 7) */}
      {contextMenu && (
        <div
          className="absolute z-50 w-48 p-1.5 rounded-xl bg-[#1e1e1e] border border-[#383838] shadow-2xl text-xs text-stone-200 animate-in fade-in duration-100"
          style={{
            left: `${Math.min(dimensions.width - 200, contextMenu.x)}px`,
            top: `${Math.min(dimensions.height - 180, contextMenu.y)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 font-semibold text-stone-400 border-b border-[#333] text-[11px] truncate">
            {contextMenu.node.title}
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectNote(contextMenu.node.id);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-emerald-600/30 text-left flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open note</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleCopyWikiLink(contextMenu.node.title);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-stone-800 text-left flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-stone-400" />
            <span>Copy [[WikiLink]]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLocalGraphRootId(contextMenu.node.id);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-stone-800 text-left flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>View local graph</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleTogglePinNode(contextMenu.node.id);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-stone-800 text-left flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Pin className="w-3.5 h-3.5 text-amber-400" />
            <span>{contextMenu.node.isPinned ? 'Unpin node' : 'Pin node'}</span>
          </button>
        </div>
      )}

      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 bg-[#181818]/95 border border-[#333] text-stone-200 text-xs rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2 pointer-events-none font-medium">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
