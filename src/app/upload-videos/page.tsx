'use client';

import type {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@yachtway/design-system/src/components/common/button';
import {
  SpriteIcon,
  type SpriteIconNames,
} from '@yachtway/design-system/src/components/common/sprite-icon';
import themeConstants from '@yachtway/design-system/src/theme/constants';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const assets = {
  subtract: `${basePath}/assets/subtract.svg`,
  snowflake: `${basePath}/assets/snowflake.png`,
};

type StepState = 'done' | 'active' | 'disabled';
type DropdownAction = 'set-cover' | 'delete';
type VideoSource = 'upload' | 'youtube';

type SidebarStep = {
  icon: SpriteIconNames;
  label: string;
  state: StepState;
};

type VideoCard = {
  id: string;
  name: string;
  previewSrc: string;
  source: VideoSource;
  src: string;
};

type SelectionBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type MarqueeSelectionMode = 'replace' | 'add' | 'toggle' | 'remove';

type DropdownItem = {
  action: DropdownAction;
  destructive?: boolean;
  icon: SpriteIconNames;
  label: string;
};

const sidebarSteps: SidebarStep[] = [
  { icon: 'ship_solid', label: 'General Info', state: 'done' },
  { icon: 'flash_solid', label: 'Power', state: 'done' },
  { icon: 'stars_solid', label: 'Vessel Features', state: 'done' },
  { icon: 'bed_solid', label: 'Accommodation', state: 'done' },
  { icon: 'camera', label: 'Upload Photos', state: 'done' },
  { icon: 'video', label: 'Upload Video', state: 'active' },
  { icon: 'd_tour_stroke', label: '3D Tour & Brochure', state: 'disabled' },
  { icon: 'list_solid', label: 'Listing Summary', state: 'disabled' },
];

const dropdownItems: DropdownItem[] = [
  { action: 'set-cover', icon: 'image_outline', label: 'Set as Cover' },
  {
    action: 'delete',
    destructive: true,
    icon: 'trash_outline',
    label: 'Delete Video',
  },
];

const pageStyle = {
  '--brand-700': themeConstants.colors.n.brand[700],
  '--brand-500': themeConstants.colors.n.brand[500],
  '--gray-900': themeConstants.colors.n.gray[900],
  '--gray-800': themeConstants.colors.n.gray[800],
  '--gray-700': themeConstants.colors.n.gray[700],
  '--gray-400': themeConstants.colors.n.gray[400],
  '--gray-100': themeConstants.colors.n.gray[100],
  '--gray-50': themeConstants.colors.n.gray[50],
  '--gray-25': themeConstants.colors.n.gray[25],
} as CSSProperties;

const MAX_VIDEOS = 5;
const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024;
const ACCEPT_FILE_TYPES = '.mp4,.mov,.webm,.mpeg,video/*';
let nextVideoId = 0;

const createVideoId = () => {
  nextVideoId += 1;
  return `video-${Date.now()}-${nextVideoId}`;
};

const reorderItems = <T,>(list: T[], fromIndex: number, toIndex: number): T[] => {
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const isAcceptedVideo = (file: File) => {
  if (file.type.startsWith('video/')) {
    return true;
  }

  return /\.(mp4|mov|webm|mpeg)$/i.test(file.name);
};

const getDropdownItemsForVideoIndex = (videoIndex: number): DropdownItem[] => {
  return dropdownItems.filter((item) => !(videoIndex === 0 && item.action === 'set-cover'));
};

const parseYoutubeVideoId = (link: string): string | null => {
  const trimmed = link.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const directId = url.pathname.replace('/', '').split('/')[0];
      return directId.length >= 10 ? directId : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const fromQuery = url.searchParams.get('v');
      if (fromQuery && fromQuery.length >= 10) {
        return fromQuery;
      }

      const segments = url.pathname.split('/').filter(Boolean);
      const markerIndex = segments.findIndex((segment) => ['embed', 'shorts', 'live'].includes(segment));
      if (markerIndex !== -1 && segments[markerIndex + 1]) {
        return segments[markerIndex + 1];
      }
    }
  } catch {
    const fallback = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{10,})/);
    return fallback?.[1] ?? null;
  }

  return null;
};

const getYoutubeThumbnail = (videoId: string) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
const getYoutubeEmbed = (videoId: string) =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;

export default function Page() {
  const [videos, setVideos] = useState<VideoCard[]>([]);
  const [isDropActive, setIsDropActive] = useState(false);
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [menuVideoId, setMenuVideoId] = useState<string | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [isBulkStickyPinned, setIsBulkStickyPinned] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const [isAddVideoMenuOpen, setIsAddVideoMenuOpen] = useState(false);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>(['']);
  const [youtubeLinkErrors, setYoutubeLinkErrors] = useState<string[]>(['']);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const mainSectionRef = useRef<HTMLElement>(null);
  const bulkStickyRef = useRef<HTMLDivElement>(null);
  const videoGridRef = useRef<HTMLDivElement>(null);
  const dragSourceVideoIdRef = useRef<string | null>(null);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const suppressCardClickRef = useRef(false);
  const isMarqueeSelectingRef = useRef(false);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeArmedRef = useRef(false);
  const marqueeStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeSelectionModeRef = useRef<MarqueeSelectionMode>('replace');
  const marqueeBaselineSelectionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    selectedIdsRef.current = selectedVideoIds;
  }, [selectedVideoIds]);

  const closeYoutubeModal = useCallback(() => {
    setIsYoutubeModalOpen(false);
    setYoutubeLinks(['']);
    setYoutubeLinkErrors(['']);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest('.addVideoMenuWrap')) {
        setIsAddVideoMenuOpen(false);
      }

      if (!target.closest('.photoMenu') && !target.closest('.photoMenuButton')) {
        setMenuVideoId(null);
      }

      if (marqueeArmedRef.current || isMarqueeSelectingRef.current) {
        return;
      }

      const clickedInsideVideoArea =
        Boolean(target.closest('.photoGridWrap')) ||
        Boolean(target.closest('.bulkActionsSticky')) ||
        Boolean(target.closest('.youtubeModal')) ||
        Boolean(target.closest('.previewDialog')) ||
        Boolean(target.closest('.dropZone'));

      if (clickedInsideVideoArea) {
        return;
      }

      setSelectedVideoIds((prev) => (prev.size ? new Set() : prev));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (menuVideoId) {
        setMenuVideoId(null);
        return;
      }

      if (isAddVideoMenuOpen) {
        setIsAddVideoMenuOpen(false);
        return;
      }

      if (isYoutubeModalOpen) {
        closeYoutubeModal();
        return;
      }

      setPreviewVideoId(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeYoutubeModal, isAddVideoMenuOpen, isYoutubeModalOpen, menuVideoId]);

  const uploadedCountText = useMemo(
    () => `${videos.length}/${MAX_VIDEOS} videos added`,
    [videos.length],
  );

  const selectedVideoIdsOrdered = useMemo(
    () => videos.filter((video) => selectedVideoIds.has(video.id)).map((video) => video.id),
    [selectedVideoIds, videos],
  );

  const previewVideoIndex = useMemo(
    () => (previewVideoId ? videos.findIndex((video) => video.id === previewVideoId) : -1),
    [previewVideoId, videos],
  );

  const previewVideo = previewVideoIndex >= 0 ? videos[previewVideoIndex] : null;
  const previewYoutubeId =
    previewVideo?.source === 'youtube' ? parseYoutubeVideoId(previewVideo.src) : null;

  const remainingSlots = MAX_VIDEOS - videos.length;
  const nonEmptyYoutubeLinks = youtubeLinks.filter((link) => Boolean(link.trim())).length;
  const addYoutubeButtonCount = Math.min(Math.max(nonEmptyYoutubeLinks, 1), Math.max(remainingSlots, 1));

  const clearVideoSelection = useCallback(() => {
    setSelectedVideoIds((prev) => (prev.size ? new Set() : prev));
  }, []);

  const resetMarqueeState = useCallback(() => {
    isMarqueeSelectingRef.current = false;
    marqueeStartRef.current = null;
    marqueeArmedRef.current = false;
    marqueeStartPointRef.current = null;
    marqueeSelectionModeRef.current = 'replace';
    marqueeBaselineSelectionRef.current = new Set();
    setSelectionBox(null);
  }, []);

  const updateMarqueeSelection = useCallback(
    (startX: number, startY: number, currentX: number, currentY: number) => {
      const grid = videoGridRef.current;
      if (!grid) {
        return;
      }

      const gridRect = grid.getBoundingClientRect();
      const selectionLeft = Math.min(startX, currentX);
      const selectionTop = Math.min(startY, currentY);
      const selectionRight = Math.max(startX, currentX);
      const selectionBottom = Math.max(startY, currentY);

      setSelectionBox({
        height: selectionBottom - selectionTop,
        left: selectionLeft - gridRect.left,
        top: selectionTop - gridRect.top,
        width: selectionRight - selectionLeft,
      });

      const intersectingSelection = new Set<string>();
      const cards = grid.querySelectorAll<HTMLElement>('[data-video-id]');

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const intersects =
          rect.left < selectionRight &&
          rect.right > selectionLeft &&
          rect.top < selectionBottom &&
          rect.bottom > selectionTop;

        if (!intersects) {
          return;
        }

        const videoId = card.dataset.videoId;
        if (videoId) {
          intersectingSelection.add(videoId);
        }
      });

      const baseline = marqueeBaselineSelectionRef.current;
      const selectionMode = marqueeSelectionModeRef.current;

      if (selectionMode === 'add') {
        const nextSelected = new Set(baseline);
        intersectingSelection.forEach((videoId) => {
          nextSelected.add(videoId);
        });
        setSelectedVideoIds(nextSelected);
        return;
      }

      if (selectionMode === 'toggle') {
        const nextSelected = new Set(baseline);
        intersectingSelection.forEach((videoId) => {
          if (nextSelected.has(videoId)) {
            nextSelected.delete(videoId);
            return;
          }

          nextSelected.add(videoId);
        });
        setSelectedVideoIds(nextSelected);
        return;
      }

      if (selectionMode === 'remove') {
        const nextSelected = new Set(baseline);
        intersectingSelection.forEach((videoId) => {
          nextSelected.delete(videoId);
        });
        setSelectedVideoIds(nextSelected);
        return;
      }

      setSelectedVideoIds(intersectingSelection);
    },
    [],
  );

  useEffect(() => {
    const root = mainSectionRef.current;
    if (!root) {
      return;
    }

    const syncPinnedState = () => {
      if (selectedVideoIds.size === 0) {
        setIsBulkStickyPinned(false);
        return;
      }

      const sticky = bulkStickyRef.current;
      if (!sticky) {
        setIsBulkStickyPinned(false);
        return;
      }

      const rootRect = root.getBoundingClientRect();
      const stickyRect = sticky.getBoundingClientRect();
      const rootStyles = window.getComputedStyle(root);
      const paddingTop = parseFloat(rootStyles.paddingTop || '0') || 0;

      const stickyTopWithinRoot = stickyRect.top - rootRect.top;
      const hasReachedTop = stickyTopWithinRoot <= paddingTop + 0.5;
      setIsBulkStickyPinned(hasReachedTop);
    };

    syncPinnedState();
    root.addEventListener('scroll', syncPinnedState, { passive: true });
    window.addEventListener('scroll', syncPinnedState, { passive: true });
    window.addEventListener('resize', syncPinnedState);

    return () => {
      root.removeEventListener('scroll', syncPinnedState);
      window.removeEventListener('scroll', syncPinnedState);
      window.removeEventListener('resize', syncPinnedState);
    };
  }, [selectedVideoIds.size, videos.length]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if ((isMarqueeSelectingRef.current || marqueeArmedRef.current) && event.buttons === 0) {
        resetMarqueeState();
        return;
      }

      if (!isMarqueeSelectingRef.current) {
        if (!marqueeArmedRef.current || !marqueeStartPointRef.current) return;

        const dx = event.clientX - marqueeStartPointRef.current.x;
        const dy = event.clientY - marqueeStartPointRef.current.y;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

        suppressCardClickRef.current = true;
        isMarqueeSelectingRef.current = true;

        marqueeStartRef.current = marqueeStartPointRef.current;
        marqueeBaselineSelectionRef.current =
          marqueeSelectionModeRef.current === 'replace'
            ? new Set()
            : new Set(selectedIdsRef.current);
      }

      if (!marqueeStartRef.current) return;

      updateMarqueeSelection(
        marqueeStartRef.current.x,
        marqueeStartRef.current.y,
        event.clientX,
        event.clientY,
      );
    };

    const handlePointerUp = () => {
      if (!isMarqueeSelectingRef.current) {
        resetMarqueeState();
        return;
      }

      resetMarqueeState();

      requestAnimationFrame(() => {
        suppressCardClickRef.current = false;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resetMarqueeState, updateMarqueeSelection]);

  const revokeVideoUrl = useCallback((video: VideoCard | undefined) => {
    if (!video || video.source !== 'upload' || !objectUrlsRef.current.has(video.src)) {
      return;
    }

    URL.revokeObjectURL(video.src);
    objectUrlsRef.current.delete(video.src);
  }, []);

  const appendFiles = useCallback((files: FileList | File[]) => {
    const acceptedFiles = Array.from(files).filter(
      (file) => isAcceptedVideo(file) && file.size <= MAX_VIDEO_SIZE_BYTES,
    );

    if (acceptedFiles.length === 0) {
      return;
    }

    setVideos((prev) => {
      const slots = MAX_VIDEOS - prev.length;
      if (slots <= 0) {
        return prev;
      }

      const nextItems = acceptedFiles.slice(0, slots).map((file) => {
        const src = URL.createObjectURL(file);
        objectUrlsRef.current.add(src);

        return {
          id: createVideoId(),
          name: file.name,
          previewSrc: src,
          source: 'upload' as const,
          src,
        };
      });

      return [...prev, ...nextItems];
    });
  }, []);

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      clearVideoSelection();
      appendFiles(event.target.files);
    }

    setIsAddVideoMenuOpen(false);
    event.currentTarget.value = '';
  };

  const handleDropZoneClick = () => {
    clearVideoSelection();
    inputRef.current?.click();
  };

  const handleMainSectionPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    if (videos.length === 0 || !videoGridRef.current) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest(
        "button, a, input, textarea, select, option, [role='button'], [data-no-marquee='true'], [draggable='true']",
      )
    ) {
      return;
    }

    marqueeArmedRef.current = true;
    marqueeStartPointRef.current = { x: event.clientX, y: event.clientY };

    marqueeSelectionModeRef.current = event.altKey
      ? 'remove'
      : event.metaKey || event.ctrlKey
        ? 'add'
        : selectedIdsRef.current.size > 0
          ? 'add'
          : 'replace';

    setSelectionBox(null);
  };

  const handleDropZoneDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    clearVideoSelection();
    dragDepthRef.current += 1;
    setIsDropActive(true);
  };

  const handleDropZoneDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDropZoneDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDropActive(false);
    }
  };

  const handleDropZoneDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    clearVideoSelection();
    dragDepthRef.current = 0;
    setIsDropActive(false);

    if (event.dataTransfer.files.length > 0) {
      appendFiles(event.dataTransfer.files);
    }
  };

  const handleCardDragStart = (event: DragEvent<HTMLElement>, videoId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('.photoInteractive') || target.closest('.photoMenu')) {
      event.preventDefault();
      return;
    }

    clearVideoSelection();
    resetMarqueeState();
    suppressCardClickRef.current = true;
    dragSourceVideoIdRef.current = videoId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', videoId);
    setDraggedVideoId(videoId);
    setMenuVideoId(null);
  };

  const handleCardDragOver = (event: DragEvent<HTMLElement>, videoId: string) => {
    const sourceVideoId = dragSourceVideoIdRef.current || event.dataTransfer.getData('text/plain');
    if (!sourceVideoId || sourceVideoId === videoId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleCardDrop = (event: DragEvent<HTMLElement>, targetVideoId: string) => {
    event.preventDefault();
    resetMarqueeState();

    const sourceVideoId =
      dragSourceVideoIdRef.current || draggedVideoId || event.dataTransfer.getData('text/plain');
    if (!sourceVideoId || sourceVideoId === targetVideoId) {
      return;
    }

    setVideos((prev) => {
      const sourceIndex = prev.findIndex((video) => video.id === sourceVideoId);
      const targetIndex = prev.findIndex((video) => video.id === targetVideoId);

      return reorderItems(prev, sourceIndex, targetIndex);
    });

    setDraggedVideoId(null);
    dragSourceVideoIdRef.current = null;
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);

      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }

      return next;
    });
  };

  const openPreview = (videoId: string) => {
    clearVideoSelection();
    setMenuVideoId(null);
    setPreviewVideoId(videoId);
  };

  const handleBulkDeleteSelected = () => {
    if (selectedVideoIds.size === 0) {
      return;
    }

    const selectedIds = new Set(selectedVideoIds);

    setVideos((prev) => {
      prev.forEach((video) => {
        if (selectedIds.has(video.id)) {
          revokeVideoUrl(video);
        }
      });

      return prev.filter((video) => !selectedIds.has(video.id));
    });

    setSelectedVideoIds(new Set());
    setMenuVideoId(null);
    setPreviewVideoId((prev) => (prev && selectedIds.has(prev) ? null : prev));
  };

  const handleDropdownAction = (action: DropdownAction, videoId: string) => {
    clearVideoSelection();
    setMenuVideoId(null);

    if (action === 'delete') {
      setVideos((prev) => {
        const target = prev.find((video) => video.id === videoId);
        revokeVideoUrl(target);
        return prev.filter((video) => video.id !== videoId);
      });

      setSelectedVideoIds((prev) => {
        if (!prev.has(videoId)) {
          return prev;
        }

        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });

      if (previewVideoId === videoId) {
        setPreviewVideoId(null);
      }

      return;
    }

    setVideos((prev) => {
      const index = prev.findIndex((video) => video.id === videoId);
      if (index === -1) {
        return prev;
      }

      return reorderItems(prev, index, 0);
    });
  };

  const openYoutubeModal = () => {
    if (remainingSlots <= 0) {
      return;
    }

    setIsAddVideoMenuOpen(false);
    setIsYoutubeModalOpen(true);
    setYoutubeLinks(['']);
    setYoutubeLinkErrors(['']);
  };

  const handleAddYoutubeField = () => {
    if (youtubeLinks.length >= remainingSlots) {
      return;
    }

    setYoutubeLinks((prev) => [...prev, '']);
    setYoutubeLinkErrors((prev) => [...prev, '']);
  };

  const handleYoutubeLinkChange = (index: number, value: string) => {
    setYoutubeLinks((prev) => prev.map((link, linkIndex) => (index === linkIndex ? value : link)));
    setYoutubeLinkErrors((prev) => prev.map((error, errorIndex) => (index === errorIndex ? '' : error)));
  };

  const handleAddYoutubeVideos = () => {
    if (remainingSlots <= 0) {
      closeYoutubeModal();
      return;
    }

    const nextErrors = youtubeLinks.map(() => '');
    const nextVideos: VideoCard[] = [];

    youtubeLinks.forEach((rawLink, index) => {
      const link = rawLink.trim();
      if (!link) {
        return;
      }

      const videoId = parseYoutubeVideoId(link);
      if (!videoId) {
        nextErrors[index] = 'Please enter a valid YouTube link';
        return;
      }

      if (nextVideos.length >= remainingSlots) {
        nextErrors[index] = `Limit reached. You can add only ${remainingSlots} more videos`;
        return;
      }

      nextVideos.push({
        id: createVideoId(),
        name: `YouTube video ${videoId}`,
        previewSrc: getYoutubeThumbnail(videoId),
        source: 'youtube',
        src: link,
      });
    });

    const hasAnyLink = youtubeLinks.some((link) => Boolean(link.trim()));
    if (!hasAnyLink) {
      nextErrors[0] = 'Paste at least one YouTube link';
      setYoutubeLinkErrors(nextErrors);
      return;
    }

    if (nextVideos.length === 0) {
      setYoutubeLinkErrors(nextErrors);
      return;
    }

    setYoutubeLinkErrors(nextErrors);
    setVideos((prev) => [...prev, ...nextVideos]);
    clearVideoSelection();
    closeYoutubeModal();
  };

  return (
    <main className="uploadPage" style={pageStyle} data-node-id="5027:53171">
      {selectedVideoIds.size > 0 && isBulkStickyPinned ? (
        <div className="bulkPinnedBackdrop" aria-hidden="true"></div>
      ) : null}

      <aside className="sidebar" data-node-id="5027:53172">
        <div className="sidebarLogo" data-node-id="I5027:53172;2897:75061">
          <span className="logoYacht">YACHT</span>
          <span className="logoWay">WAY</span>
          <img
            src={assets.subtract}
            alt=""
            width={77}
            height={26}
            className="logoSubtract"
            draggable={false}
          />
          <span className="logoSearch" aria-hidden="true">
            <SpriteIcon name="search" className="logoSearchIcon" />
          </span>
        </div>

        <ol className="sidebarSteps" data-node-id="I5027:53172;2897:75074">
          {sidebarSteps.map((step, index) => (
            <li key={step.label} className={`sidebarStep ${step.state}`}>
              <div className="stepRail">
                <div className="stepIconWrap">
                  <SpriteIcon name={step.icon} className="stepIcon" />
                </div>
                {index < sidebarSteps.length - 1 ? <span className="stepConnector" /> : null}
              </div>

              <div className="stepContent">
                <span className="stepLabel">{step.label}</span>
                {step.state === 'done' ? (
                  <span className="stepActions">
                    <SpriteIcon name="checkmark" className="stepStatusIcon" />
                    <SpriteIcon name="pen_outline" className="stepStatusIcon" />
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <p className="sidebarFooter">CREATE NEW LISTING</p>
      </aside>

      <section
        className="mainSection"
        data-node-id="5027:53173"
        ref={mainSectionRef}
        onPointerDown={handleMainSectionPointerDown}
      >
        <Button
          variant="outlined"
          disableRipple
          className="draftExitButton"
          data-node-id="5027:53192"
        >
          Save to Drafts &amp; Exit
        </Button>

        <div className="mainBlock" data-node-id="5027:53174">
          <section className="contentStack" data-node-id="5027:53175">
            <header className="uploadHeader" data-node-id="5027:53176">
              <h1 className="pageTitle" data-node-id="5027:53178">
                Upload Video
              </h1>

              <div className="listingHeat" data-node-id="5054:63367">
                <img src={assets.snowflake} alt="cold" width={32} height={32} draggable={false} />
                <span className="heatLabel">Listing Heat:</span>
                <strong className="heatValue">Freezing</strong>
                <span className="heatHint" aria-hidden="true">
                  <SpriteIcon name="question_outline" className="heatHintIcon" />
                </span>
              </div>
            </header>

            <div className="uploadMeta">
              <p className="uploadHint uploadDescriptionText">
                Add up to 5 videos (YouTube links or uploads). Max 200 MB per file. MP4, MOV, WEBM,
                MPEG.
              </p>
            </div>

            <div className="uploadMeta">
              <p className="uploadCount">{uploadedCountText}</p>
              <p className="uploadHint">Drag videos to reorder</p>
            </div>

            <div
              className={`dropZone ${isDropActive ? 'isDragActive' : ''}`}
              onClick={handleDropZoneClick}
              onDragEnter={handleDropZoneDragEnter}
              onDragLeave={handleDropZoneDragLeave}
              onDragOver={handleDropZoneDragOver}
              onDrop={handleDropZoneDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleDropZoneClick();
                }
              }}
              data-node-id="5124:33798"
            >
              <SpriteIcon name="plus_outline" className="dropIcon" />
              <p className="dropPrimary">Drag &amp; drop videos here</p>
              <p className="dropSecondary">
                File must be less than 200 MB
                <br />
                Files accepted: MP4, MOV, WEBM, and MPEG
              </p>

              <div
                className="addVideoMenuWrap"
                data-no-marquee="true"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="addVideoButton"
                  onClick={() => setIsAddVideoMenuOpen((prev) => !prev)}
                  disabled={remainingSlots <= 0}
                >
                  <SpriteIcon name="plus_outline" className="addVideoButtonIcon" />
                  <span>Add Video</span>
                  <SpriteIcon
                    name={isAddVideoMenuOpen ? 'chevron_up_outline' : 'chevron_down_outline'}
                    className="addVideoChevronIcon"
                  />
                </button>

                {isAddVideoMenuOpen ? (
                  <div className="addVideoMenu" role="menu" aria-label="Add video actions">
                    <button
                      type="button"
                      role="menuitem"
                      className="addVideoMenuItem"
                      onClick={() => {
                        clearVideoSelection();
                        inputRef.current?.click();
                        setIsAddVideoMenuOpen(false);
                      }}
                    >
                      <SpriteIcon name="folder_outline" className="addVideoMenuItemIcon" />
                      <span>Upload from your device</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="addVideoMenuItem"
                      onClick={openYoutubeModal}
                    >
                      <SpriteIcon name="link_outline" className="addVideoMenuItemIcon" />
                      <span>Link to Youtube</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              accept={ACCEPT_FILE_TYPES}
              onChange={handleFileInputChange}
            />

            {selectedVideoIds.size > 0 ? (
              <div ref={bulkStickyRef} className="bulkActionsSticky" data-node-id="5027:51114">
                <div className="bulkActionsBar">
                  <button
                    type="button"
                    className="bulkSelectedButton photoInteractive"
                    onClick={clearVideoSelection}
                  >
                    <SpriteIcon name="cross_outline" className="bulkSelectedCloseIcon" />
                    <span>{selectedVideoIds.size} Selected</span>
                  </button>

                  <div className="bulkActionGroup">
                    <button
                      type="button"
                      className="bulkActionButton photoInteractive"
                      onClick={handleBulkDeleteSelected}
                    >
                      <SpriteIcon name="trash_outline" className="bulkActionIcon" />
                      Delete videos
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {videos.length > 0 ? (
              <div
                ref={videoGridRef}
                className={`photoGridWrap ${selectionBox ? 'isSelecting' : ''}`}
              >
                <div className="photoGrid" data-node-id="5027:53392">
                  {videos.map((video, index) => {
                    const isSelected = selectedVideoIds.has(video.id);
                    const cardDropdownItems = getDropdownItemsForVideoIndex(index);

                    return (
                      <article
                        key={video.id}
                        data-video-id={video.id}
                        className={`photoCardFrame ${draggedVideoId === video.id ? 'isDragging' : ''} ${isSelected ? 'isSelected' : ''}`}
                        draggable
                        onDragStart={(event) => handleCardDragStart(event, video.id)}
                        onDragOver={(event) => handleCardDragOver(event, video.id)}
                        onDrop={(event) => handleCardDrop(event, video.id)}
                        onDragEnd={() => {
                          resetMarqueeState();
                          setDraggedVideoId(null);
                          dragSourceVideoIdRef.current = null;
                          requestAnimationFrame(() => {
                            suppressCardClickRef.current = false;
                          });
                        }}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (
                            suppressCardClickRef.current ||
                            isMarqueeSelectingRef.current ||
                            marqueeArmedRef.current
                          ) {
                            return;
                          }

                          if (target.closest('.photoInteractive') || target.closest('.photoMenu')) {
                            return;
                          }

                          toggleVideoSelection(video.id);
                        }}
                      >
                        <div className="photoCard">
                          <header className="photoCardHeader">
                            <p className="videoCardTitle" title={video.name}>
                              {video.name}
                            </p>

                            <button
                              type="button"
                              className="photoMenuButton photoInteractive"
                              aria-label="Open video actions"
                              onClick={(event) => {
                                event.stopPropagation();
                                clearVideoSelection();
                                setMenuVideoId((prev) => (prev === video.id ? null : video.id));
                              }}
                            >
                              <SpriteIcon name="dots_horizontal_outline" className="menuDotsIcon" />
                            </button>
                          </header>

                          <div className="photoImageWrap">
                            {video.source === 'upload' ? (
                              <video
                                src={video.previewSrc}
                                className="photoImage"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={video.previewSrc}
                                alt={video.name}
                                className="photoImage"
                                draggable={false}
                              />
                            )}

                            {index === 0 ? (
                              <div className="coverBadge">
                                <span>Cover</span>
                                <span className="coverBadgeHint" aria-hidden="true">
                                  <SpriteIcon name="question_outline" className="coverBadgeIcon" />
                                </span>
                              </div>
                            ) : null}

                            <div className="photoHoverOverlay">
                              <button
                                type="button"
                                className="videoPlayButton photoInteractive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openPreview(video.id);
                                }}
                                aria-label="Play video in full screen"
                              >
                                <SpriteIcon name="play_solid" className="videoPlayIcon" />
                              </button>

                              <button
                                type="button"
                                className={`photoHoverCheckButton photoInteractive ${isSelected ? 'isSelected' : ''}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleVideoSelection(video.id);
                                }}
                                aria-label={isSelected ? 'Deselect video' : 'Select video'}
                              >
                                <SpriteIcon name="checkmark" className="photoHoverCheckIcon" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {menuVideoId === video.id ? (
                          <div className="photoMenu" role="menu" aria-label="Video actions">
                            {cardDropdownItems.map((item) => (
                              <button
                                key={`${video.id}-${item.action}`}
                                type="button"
                                role="menuitem"
                                className={`photoMenuItem ${item.destructive ? 'isDestructive' : ''}`}
                                onClick={() => handleDropdownAction(item.action, video.id)}
                              >
                                <SpriteIcon name={item.icon} className="photoMenuItemIcon" />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                {selectionBox ? (
                  <span
                    className="selectionMarquee"
                    style={{
                      height: `${selectionBox.height}px`,
                      left: `${selectionBox.left}px`,
                      top: `${selectionBox.top}px`,
                      width: `${selectionBox.width}px`,
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </section>

          <footer className="navigationRow" data-node-id="5027:53189">
            <button type="button" className="backButton" data-node-id="5027:53190">
              <SpriteIcon name="arrow_left" className="navIcon" />
              Back
            </button>

            <Button
              variant="contained"
              disableElevation
              className="nextButton"
              endIcon={<SpriteIcon name="arrow_right" className="navIcon" />}
              data-node-id="5027:53191"
            >
              Save and continue
            </Button>
          </footer>
        </div>
      </section>

      {previewVideo ? (
        <div className="previewOverlay" onClick={() => setPreviewVideoId(null)} data-node-id="5237:33815">
          <div className="previewDialog videoPreviewDialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="previewCloseButton photoInteractive"
              onClick={() => setPreviewVideoId(null)}
              aria-label="Close video preview"
            >
              <SpriteIcon name="cross_outline" className="previewCloseIcon" />
            </button>

            {previewVideo.source === 'upload' ? (
              <video
                src={previewVideo.src}
                className="videoPreviewPlayer"
                autoPlay
                controls
                playsInline
              />
            ) : previewYoutubeId ? (
              <iframe
                className="videoPreviewEmbed"
                src={getYoutubeEmbed(previewYoutubeId)}
                title={previewVideo.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {isYoutubeModalOpen ? (
        <div className="youtubeModalOverlay" onClick={closeYoutubeModal} data-node-id="5033:53772">
          <div className="youtubeModal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="youtubeModalClose"
              onClick={closeYoutubeModal}
              aria-label="Close Add Youtube Video modal"
            >
              <SpriteIcon name="cross_outline" className="youtubeModalCloseIcon" />
            </button>

            <header className="youtubeModalHeader">
              <h2 className="youtubeModalTitle">Add Youtube Video</h2>
              <p className="youtubeModalSubtitle">Paste Youtube Link</p>
            </header>

            <div className="youtubeModalBody">
              {youtubeLinks.map((link, index) => (
                <label key={`youtube-link-${index}`} className="youtubeLinkField">
                  <span className="youtubeLinkLabel">Link {index + 1}</span>
                  <input
                    type="url"
                    className={`youtubeLinkInput ${youtubeLinkErrors[index] ? 'hasError' : ''}`}
                    value={link}
                    placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
                    onChange={(event) => handleYoutubeLinkChange(index, event.target.value)}
                  />
                  {youtubeLinkErrors[index] ? (
                    <span className="youtubeLinkError">{youtubeLinkErrors[index]}</span>
                  ) : null}
                </label>
              ))}

              <button
                type="button"
                className="youtubeAddLinkButton"
                onClick={handleAddYoutubeField}
                disabled={youtubeLinks.length >= remainingSlots}
              >
                <SpriteIcon name="plus_outline" className="youtubeAddLinkIcon" />
                Add New Link
              </button>
            </div>

            <footer className="youtubeModalFooter">
              <button type="button" className="youtubeCancelButton" onClick={closeYoutubeModal}>
                Cancel
              </button>

              <button
                type="button"
                className="youtubeSubmitButton"
                onClick={handleAddYoutubeVideos}
                disabled={nonEmptyYoutubeLinks === 0}
              >
                {addYoutubeButtonCount === 1
                  ? 'Add Video'
                  : `Add ${addYoutubeButtonCount} Videos`}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </main>
  );
}
