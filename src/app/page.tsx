'use client';

import type { ChangeEvent, CSSProperties, DragEvent, PointerEvent as ReactPointerEvent } from 'react';
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
type DropdownAction = 'set-cover' | 'move-top' | 'rotate' | 'edit' | 'delete';

type SidebarStep = {
  icon: SpriteIconNames;
  label: string;
  state: StepState;
};

type PhotoCard = {
  categories: string[];
  id: string;
  name: string;
  rotation: number;
  src: string;
};

type CategoryDefinition = {
  id: string;
  imageSrc: string;
  label: string;
};

type CategorySeed = {
  count?: number;
  coverSrc?: string;
  gallery?: GalleryPhoto[];
};

type GalleryPhoto = {
  id: string;
  name: string;
  src: string;
};

type SelectionBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type MarqueeSelectionMode = 'replace' | 'add' | 'toggle' | 'remove';

type DropdownItem =
  | {
      action: DropdownAction;
      destructive?: boolean;
      icon: SpriteIconNames;
      label: string;
      type: 'action';
    }
  | {
      type: 'divider';
    };

const sidebarSteps: SidebarStep[] = [
  { icon: 'ship_solid', label: 'General Info', state: 'done' },
  { icon: 'flash_solid', label: 'Power', state: 'done' },
  { icon: 'stars_solid', label: 'Vessel Features', state: 'done' },
  { icon: 'bed_solid', label: 'Accommodation', state: 'done' },
  { icon: 'camera', label: 'Upload Photos', state: 'active' },
  { icon: 'video', label: 'Videos', state: 'disabled' },
  { icon: 'd_tour_stroke', label: '3D Tour & Brochure', state: 'disabled' },
  { icon: 'list_solid', label: 'Listing Summary', state: 'disabled' },
];

const dropdownItems: DropdownItem[] = [
  { type: 'action', action: 'set-cover', icon: 'image_outline', label: 'Set as a Cover' },
  { type: 'action', action: 'move-top', icon: 'arrow_up', label: 'Move to top' },
  { type: 'divider' },
  {
    type: 'action',
    action: 'rotate',
    icon: 'arrows_clockwise_outline',
    label: 'Rotate Image',
  },
  { type: 'action', action: 'edit', icon: 'pen_outline', label: 'Edit Image' },
  { type: 'divider' },
  {
    type: 'action',
    action: 'delete',
    destructive: true,
    icon: 'trash_outline',
    label: 'Delete',
  },
];

const categoryDefinitions: CategoryDefinition[] = [
  {
    id: 'owners-cabin',
    label: "Owner's Cabin",
    imageSrc: 'https://www.figma.com/api/mcp/asset/3194475c-bacc-4bb3-b905-85ec1d15ffe0',
  },
  {
    id: 'engine-room',
    label: 'Engine Room',
    imageSrc: 'https://www.figma.com/api/mcp/asset/2cf607a7-d8c2-494a-920f-28663ffad664',
  },
  {
    id: 'guest-cabin',
    label: 'Guest Cabin',
    imageSrc: 'https://www.figma.com/api/mcp/asset/f4dbf05e-dae2-45b0-ab72-949ee1f3bbf1',
  },
  {
    id: 'main-salon',
    label: 'Main Salon',
    imageSrc: 'https://www.figma.com/api/mcp/asset/da05abcc-465e-49b4-9e82-f1b97dba18c7',
  },
  {
    id: 'galley',
    label: 'Galley',
    imageSrc: 'https://www.figma.com/api/mcp/asset/8d08aebc-0d17-4f3f-9fd1-96f16670ee93',
  },
  {
    id: 'crew-quarters',
    label: 'Crew Quarters',
    imageSrc: 'https://www.figma.com/api/mcp/asset/f3495e3d-ddcf-450a-ba56-b44cafe9c39a',
  },
  {
    id: 'guest-cabin-2',
    label: 'Guest Cabin',
    imageSrc: 'https://www.figma.com/api/mcp/asset/f4dbf05e-dae2-45b0-ab72-949ee1f3bbf1',
  },
  {
    id: 'bow',
    label: 'Bow',
    imageSrc: 'https://www.figma.com/api/mcp/asset/f8bc4cf4-ae77-4996-9a72-dca327cb5d2a',
  },
  {
    id: 'stern',
    label: 'Stern',
    imageSrc: 'https://www.figma.com/api/mcp/asset/40e62b5f-0117-4ee2-849d-8df1327addc2',
  },
  {
    id: 'flybridge',
    label: 'Flybridge',
    imageSrc: 'https://www.figma.com/api/mcp/asset/579463fe-9a99-44d7-8adb-88372c0e3baa',
  },
  {
    id: 'aft-deck',
    label: 'Aft Deck',
    imageSrc: 'https://www.figma.com/api/mcp/asset/d125dc91-8fd6-4e28-adc9-ccfb870f79c9',
  },
  {
    id: 'side-profile',
    label: 'Side Profile',
    imageSrc: 'https://www.figma.com/api/mcp/asset/f391aa9c-a434-44dd-b93c-80699b6f9c0d',
  },
];

const categorySeeds: Record<string, CategorySeed> = {
  'crew-quarters': {
    count: 5,
    coverSrc: 'https://www.figma.com/api/mcp/asset/f3495e3d-ddcf-450a-ba56-b44cafe9c39a',
    gallery: [
      { id: 'seed-crew-1', name: 'Crew Quarters 1', src: 'https://www.figma.com/api/mcp/asset/e1ff5ac9-c604-47bc-a013-f8c5fc27f57b' },
      { id: 'seed-crew-2', name: 'Crew Quarters 2', src: 'https://www.figma.com/api/mcp/asset/66ee3cf2-c28e-436e-a6ea-82f725d2fb93' },
      { id: 'seed-crew-3', name: 'Crew Quarters 3', src: 'https://www.figma.com/api/mcp/asset/c77f7d94-1787-47dc-b092-52f1908b966c' },
      { id: 'seed-crew-4', name: 'Crew Quarters 4', src: 'https://www.figma.com/api/mcp/asset/5e83f250-6f3f-41e1-a26e-ffe73681e02b' },
      { id: 'seed-crew-5', name: 'Crew Quarters 5', src: 'https://www.figma.com/api/mcp/asset/8e038d5d-4360-437b-96af-2945abccada4' },
    ],
  },
  'aft-deck': {
    count: 5,
    coverSrc: 'https://www.figma.com/api/mcp/asset/d125dc91-8fd6-4e28-adc9-ccfb870f79c9',
    gallery: [
      { id: 'seed-aft-1', name: 'Aft Deck 1', src: 'https://www.figma.com/api/mcp/asset/e1ff5ac9-c604-47bc-a013-f8c5fc27f57b' },
      { id: 'seed-aft-2', name: 'Aft Deck 2', src: 'https://www.figma.com/api/mcp/asset/66ee3cf2-c28e-436e-a6ea-82f725d2fb93' },
      { id: 'seed-aft-3', name: 'Aft Deck 3', src: 'https://www.figma.com/api/mcp/asset/c77f7d94-1787-47dc-b092-52f1908b966c' },
      { id: 'seed-aft-4', name: 'Aft Deck 4', src: 'https://www.figma.com/api/mcp/asset/78e0f345-4bae-40e8-85c8-53bda3ec3f10' },
      { id: 'seed-aft-5', name: 'Aft Deck 5', src: 'https://www.figma.com/api/mcp/asset/edec554c-43f1-43a2-83e1-b0c1dcdbca1c' },
    ],
  },
};

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

const MAX_PHOTOS = 120;
const ACCEPT_FILE_TYPES = '.jpg,.jpeg,.png,.svg,.heif,.heic,image/*';
let nextPhotoId = 0;

const createPhotoId = () => {
  nextPhotoId += 1;
  return `photo-${Date.now()}-${nextPhotoId}`;
};

const isAcceptedImage = (file: File) => {
  if (file.type.startsWith('image/')) {
    return true;
  }

  return /\.(jpe?g|png|svg|heif|heic)$/i.test(file.name);
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

const getDropdownItemsForPhotoIndex = (photoIndex: number): DropdownItem[] => {
  const filtered = dropdownItems.filter((item) => {
    if (item.type === 'divider') {
      return true;
    }

    if (photoIndex === 0 && item.action === 'set-cover') {
      return false;
    }

    if (photoIndex <= 1 && item.action === 'move-top') {
      return false;
    }

    return true;
  });

  const normalized: DropdownItem[] = [];
  filtered.forEach((item) => {
    if (item.type === 'divider') {
      if (normalized.length === 0) {
        return;
      }

      if (normalized[normalized.length - 1].type === 'divider') {
        return;
      }
    }

    normalized.push(item);
  });

  if (normalized[normalized.length - 1]?.type === 'divider') {
    normalized.pop();
  }

  return normalized;
};

export default function Page() {
  const [photos, setPhotos] = useState<PhotoCard[]>([]);
  const [isDropActive, setIsDropActive] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [menuPhotoId, setMenuPhotoId] = useState<string | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryDetailId, setCategoryDetailId] = useState<string | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryTargetPhotoIds, setCategoryTargetPhotoIds] = useState<string[]>([]);
  const [isBulkStickyPinned, setIsBulkStickyPinned] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const mainSectionRef = useRef<HTMLElement>(null);
  const bulkStickyRef = useRef<HTMLDivElement>(null);
  const photoGridRef = useRef<HTMLDivElement>(null);
  const dragSourcePhotoIdRef = useRef<string | null>(null);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const suppressCardClickRef = useRef(false);
  const isMarqueeSelectingRef = useRef(false);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeArmedRef = useRef(false);
  const marqueeStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeSelectionModeRef = useRef<MarqueeSelectionMode>('replace');
  const marqueeBaselineSelectionRef = useRef<Set<string>>(new Set());

  const categoryById = useMemo(() => {
    return new Map(categoryDefinitions.map((category) => [category.id, category]));
  }, []);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; coverSrc: string | null }>();

    categoryDefinitions.forEach((category) => {
      const seed = categorySeeds[category.id];
      const seededGallery = seed?.gallery ?? [];
      map.set(category.id, {
        count: seededGallery.length > 0 ? seededGallery.length : seed?.count ?? 0,
        coverSrc: seededGallery[0]?.src ?? seed?.coverSrc ?? null,
      });
    });

    photos.forEach((photo) => {
      photo.categories.forEach((categoryId) => {
        const category = map.get(categoryId);
        if (!category) {
          return;
        }

        category.count += 1;
        if (!category.coverSrc) {
          category.coverSrc = photo.src;
        }
      });
    });

    return map;
  }, [photos]);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    selectedIdsRef.current = selectedPhotoIds;
  }, [selectedPhotoIds]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.photoMenu') || target.closest('.photoMenuButton')) {
        return;
      }

      setMenuPhotoId(null);

      if (marqueeArmedRef.current || isMarqueeSelectingRef.current) {
        return;
      }

      const clickedInsidePhotoArea =
        Boolean(target.closest('.photoGridWrap')) ||
        Boolean(target.closest('.photoCardFrame')) ||
        Boolean(target.closest('.bulkActionsSticky')) ||
        Boolean(target.closest('.categoryModal')) ||
        Boolean(target.closest('.previewDialog'));

      if (clickedInsidePhotoArea) {
        return;
      }

      setSelectedPhotoIds((prev) => (prev.size ? new Set() : prev));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (menuPhotoId) {
        setMenuPhotoId(null);
        return;
      }

      if (isCategoryModalOpen) {
        closeCategoryModal();
        return;
      }

      setPreviewPhotoId(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryModalOpen, menuPhotoId]);

  const uploadedCountText = useMemo(
    () => `${photos.length}/${MAX_PHOTOS} photos uploaded`,
    [photos.length],
  );

  const selectedPhotoIdsOrdered = useMemo(
    () => photos.filter((photo) => selectedPhotoIds.has(photo.id)).map((photo) => photo.id),
    [photos, selectedPhotoIds],
  );

  const previewPhotoIndex = useMemo(
    () => (previewPhotoId ? photos.findIndex((photo) => photo.id === previewPhotoId) : -1),
    [photos, previewPhotoId],
  );

  const previewPhoto = previewPhotoIndex >= 0 ? photos[previewPhotoIndex] : null;

  const normalizedCategorySearch = categorySearchQuery.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!normalizedCategorySearch) {
      return categoryDefinitions;
    }

    return categoryDefinitions.filter((category) =>
      category.label.toLowerCase().includes(normalizedCategorySearch),
    );
  }, [normalizedCategorySearch]);
  const detailCategory = categoryDetailId ? categoryById.get(categoryDetailId) ?? null : null;

  const detailCategoryPhotos = useMemo(() => {
    if (!categoryDetailId) {
      return [];
    }

    const seeded = categorySeeds[categoryDetailId]?.gallery ?? [];
    const assigned = photos
      .filter((photo) => photo.categories.includes(categoryDetailId))
      .map((photo) => ({
        id: photo.id,
        name: photo.name,
        src: photo.src,
      }));

    const seen = new Set<string>();
    const combined = [...seeded, ...assigned];

    return combined.filter((photo) => {
      if (seen.has(photo.id)) {
        return false;
      }

      seen.add(photo.id);
      return true;
    });
  }, [categoryDetailId, photos]);

  const detailPreviewPhotos = useMemo(() => {
    if (!categoryDetailId) {
      return [];
    }

    const map = new Map<string, GalleryPhoto>();

    detailCategoryPhotos.forEach((photo) => {
      map.set(photo.id, photo);
    });

    photos
      .filter((photo) => categoryTargetPhotoIds.includes(photo.id))
      .forEach((photo) => {
        map.set(photo.id, {
          id: photo.id,
          name: photo.name,
          src: photo.src,
        });
      });

    return Array.from(map.values());
  }, [categoryDetailId, categoryTargetPhotoIds, detailCategoryPhotos, photos]);

  const updateMarqueeSelection = useCallback((startX: number, startY: number, currentX: number, currentY: number) => {
    const grid = photoGridRef.current;
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
    const cards = grid.querySelectorAll<HTMLElement>('[data-photo-id]');

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

      const photoId = card.dataset.photoId;
      if (photoId) {
        intersectingSelection.add(photoId);
      }
    });

    const baseline = marqueeBaselineSelectionRef.current;
    const selectionMode = marqueeSelectionModeRef.current;

    if (selectionMode === 'add') {
      const nextSelected = new Set(baseline);
      intersectingSelection.forEach((photoId) => {
        nextSelected.add(photoId);
      });
      setSelectedPhotoIds(nextSelected);
      return;
    }

    if (selectionMode === 'toggle') {
      const nextSelected = new Set(baseline);
      intersectingSelection.forEach((photoId) => {
        if (nextSelected.has(photoId)) {
          nextSelected.delete(photoId);
          return;
        }

        nextSelected.add(photoId);
      });
      setSelectedPhotoIds(nextSelected);
      return;
    }

    if (selectionMode === 'remove') {
      const nextSelected = new Set(baseline);
      intersectingSelection.forEach((photoId) => {
        nextSelected.delete(photoId);
      });
      setSelectedPhotoIds(nextSelected);
      return;
    }

    setSelectedPhotoIds(intersectingSelection);
  }, []);

  useEffect(() => {
    const root = mainSectionRef.current;
    if (!root) {
      return;
    }

    const syncPinnedState = () => {
      if (selectedPhotoIds.size === 0) {
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
  }, [selectedPhotoIds.size, photos.length]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isMarqueeSelectingRef.current) {
        // Arm on pointer down; activate only after a small drag so normal clicks still work.
        if (!marqueeArmedRef.current || !marqueeStartPointRef.current) return;

        const dx = event.clientX - marqueeStartPointRef.current.x;
        const dy = event.clientY - marqueeStartPointRef.current.y;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

        suppressCardClickRef.current = true;
        isMarqueeSelectingRef.current = true;

        marqueeStartRef.current = marqueeStartPointRef.current;

        // Baseline depends on mode: replace starts empty, add/remove starts from current selection.
        marqueeBaselineSelectionRef.current =
          marqueeSelectionModeRef.current === "replace"
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
      // If user released before dragging enough, just disarm and let normal click happen.
      if (!isMarqueeSelectingRef.current) {
        marqueeArmedRef.current = false;
        marqueeStartPointRef.current = null;
        return;
      }

      isMarqueeSelectingRef.current = false;
      marqueeStartRef.current = null;
      marqueeArmedRef.current = false;
      marqueeStartPointRef.current = null;
      marqueeSelectionModeRef.current = 'replace';
      marqueeBaselineSelectionRef.current = new Set();
      setSelectionBox(null);

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
  }, [updateMarqueeSelection]);

  const appendFiles = (files: FileList | File[]) => {
    const acceptedFiles = Array.from(files).filter(isAcceptedImage);

    if (acceptedFiles.length === 0) {
      return;
    }

    setPhotos((prev) => {
      const remainingSlots = MAX_PHOTOS - prev.length;
      if (remainingSlots <= 0) {
        return prev;
      }

      const nextItems = acceptedFiles.slice(0, remainingSlots).map((file) => {
        const src = URL.createObjectURL(file);
        objectUrlsRef.current.add(src);

        return {
          categories: [],
          id: createPhotoId(),
          name: file.name,
          rotation: 0,
          src,
        };
      });

      return [...prev, ...nextItems];
    });
  };

  const revokePhotoUrl = (photo: PhotoCard | undefined) => {
    if (!photo || !objectUrlsRef.current.has(photo.src)) {
      return;
    }

    URL.revokeObjectURL(photo.src);
    objectUrlsRef.current.delete(photo.src);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      appendFiles(event.target.files);
    }

    event.currentTarget.value = '';
  };

  const handleDropZoneClick = () => {
    clearPhotoSelection();
    inputRef.current?.click();
  };

  const handleMainSectionPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    if (photos.length === 0 || !photoGridRef.current) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Don't start lasso when user interacts with UI controls
    if (
      target.closest(
        "button, a, input, textarea, select, option, [role='button'], [data-no-marquee='true']"
      )
    ) {
      return;
    }

    // Arm lasso (activation happens on pointer move after a small threshold)
    marqueeArmedRef.current = true;
    marqueeStartPointRef.current = { x: event.clientX, y: event.clientY };

    marqueeSelectionModeRef.current = event.altKey
      ? "remove"
      : event.metaKey || event.ctrlKey
      ? "add"
      : selectedIdsRef.current.size > 0
      ? "add"
      : "replace";

    setSelectionBox(null);
  };

  const handleDropZoneDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    clearPhotoSelection();
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
    clearPhotoSelection();
    dragDepthRef.current = 0;
    setIsDropActive(false);

    if (event.dataTransfer.files.length > 0) {
      appendFiles(event.dataTransfer.files);
    }
  };

  const handleCardDragStart = (event: DragEvent<HTMLElement>, photoId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('.photoInteractive') || target.closest('.photoMenu')) {
      event.preventDefault();
      return;
    }

    clearPhotoSelection();
    suppressCardClickRef.current = true;
    dragSourcePhotoIdRef.current = photoId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', photoId);
    setDraggedPhotoId(photoId);
    setMenuPhotoId(null);
  };

  const handleCardDragOver = (event: DragEvent<HTMLElement>, photoId: string) => {
    const sourcePhotoId = dragSourcePhotoIdRef.current || event.dataTransfer.getData('text/plain');
    if (!sourcePhotoId || sourcePhotoId === photoId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleCardDrop = (event: DragEvent<HTMLElement>, targetPhotoId: string) => {
    event.preventDefault();

    const sourcePhotoId = dragSourcePhotoIdRef.current || draggedPhotoId || event.dataTransfer.getData('text/plain');
    if (!sourcePhotoId || sourcePhotoId === targetPhotoId) {
      return;
    }

    setPhotos((prev) => {
      const sourceIndex = prev.findIndex((photo) => photo.id === sourcePhotoId);
      const targetIndex = prev.findIndex((photo) => photo.id === targetPhotoId);

      return reorderItems(prev, sourceIndex, targetIndex);
    });

    setDraggedPhotoId(null);
    dragSourcePhotoIdRef.current = null;
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);

      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }

      return next;
    });
  };

  const clearPhotoSelection = () => {
    setSelectedPhotoIds((prev) => (prev.size ? new Set() : prev));
  };

  const openPreview = (photoId: string) => {
    clearPhotoSelection();
    setMenuPhotoId(null);
    setPreviewPhotoId(photoId);
  };

  const openAdjacentPreview = (offset: number) => {
    if (photos.length === 0 || previewPhotoIndex === -1) {
      return;
    }

    const nextIndex = (previewPhotoIndex + offset + photos.length) % photos.length;
    setPreviewPhotoId(photos[nextIndex].id);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setSelectedCategoryId(null);
    setCategoryDetailId(null);
    setCategorySearchQuery('');
    setCategoryTargetPhotoIds([]);
  };

  const openCategoryModal = (targetPhotoIds: string[], initialCategoryId?: string) => {
    if (targetPhotoIds.length === 0) {
      return;
    }

    setIsCategoryModalOpen(true);
    setCategoryTargetPhotoIds(targetPhotoIds);
    setCategoryDetailId(null);
    setCategorySearchQuery('');

    if (initialCategoryId && categoryById.has(initialCategoryId)) {
      setSelectedCategoryId(initialCategoryId);
      return;
    }

    setSelectedCategoryId(null);
  };

  const handleAssignCategory = () => {
    if (!selectedCategoryId || categoryTargetPhotoIds.length === 0) {
      return;
    }

    setPhotos((prev) => {
      return prev.map((photo) => {
        if (!categoryTargetPhotoIds.includes(photo.id)) {
          return photo;
        }

        return {
          ...photo,
          categories: [selectedCategoryId],
        };
      });
    });

    clearPhotoSelection();
    closeCategoryModal();
  };

  const handleBulkDeleteSelected = () => {
    if (selectedPhotoIds.size === 0) {
      return;
    }

    const selectedIds = new Set(selectedPhotoIds);

    setPhotos((prev) => {
      prev.forEach((photo) => {
        if (selectedIds.has(photo.id)) {
          revokePhotoUrl(photo);
        }
      });

      return prev.filter((photo) => !selectedIds.has(photo.id));
    });

    setSelectedPhotoIds(new Set());
    setMenuPhotoId(null);
    setPreviewPhotoId((prev) => (prev && selectedIds.has(prev) ? null : prev));
  };

  const rotatePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => {
      const index = prev.findIndex((photo) => photo.id === photoId);
      if (index === -1) {
        return prev;
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        rotation: (next[index].rotation + 90) % 360,
      };
      return next;
    });
  }, []);

  const handleDropdownAction = (action: DropdownAction, photoId: string) => {
    clearPhotoSelection();
    setMenuPhotoId(null);

    if (action === 'edit') {
      openPreview(photoId);
      return;
    }

    if (action === 'delete') {
      setPhotos((prev) => {
        const target = prev.find((photo) => photo.id === photoId);
        revokePhotoUrl(target);
        return prev.filter((photo) => photo.id !== photoId);
      });

      setSelectedPhotoIds((prev) => {
        if (!prev.has(photoId)) {
          return prev;
        }

        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });

      if (previewPhotoId === photoId) {
        setPreviewPhotoId(null);
      }

      return;
    }

    if (action === 'rotate') {
      rotatePhoto(photoId);
      return;
    }

    setPhotos((prev) => {
      const index = prev.findIndex((photo) => photo.id === photoId);
      if (index === -1) {
        return prev;
      }

      if (action === 'set-cover') {
        return reorderItems(prev, index, 0);
      }

      if (action === 'move-top') {
        const topIndex = Math.min(1, prev.length - 1);
        return reorderItems(prev, index, topIndex);
      }

      return prev;
    });
  };

  return (
      <main className="uploadPage" style={pageStyle} data-node-id="4452:111907">
      {selectedPhotoIds.size > 0 && isBulkStickyPinned ? (
        <div className="bulkPinnedBackdrop" aria-hidden="true"></div>
      ) : null}

      <aside className="sidebar" data-node-id="4452:111908">
        <div className="sidebarLogo" data-node-id="I4452:111908;2897:75061">
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

        <ol className="sidebarSteps" data-node-id="I4452:111908;2897:75074">
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
        data-node-id="4452:111909"
        ref={mainSectionRef}
        onPointerDown={handleMainSectionPointerDown}
      >
        <Button
          variant="outlined"
          disableRipple
          className="draftExitButton"
          data-node-id="4452:111957"
        >
          Save to Drafts &amp; Exit
        </Button>

        <div className="mainBlock" data-node-id="4452:111244">
          <section className="contentStack" data-node-id="4452:111245">
            <header className="uploadHeader" data-node-id="4452:111247">
              <h1 className="pageTitle" data-node-id="4452:111248">
                Upload All Photos
              </h1>

              <div className="listingHeat" data-node-id="4452:111249">
                <img src={assets.snowflake} alt="cold" width={32} height={32} draggable={false} />
                <span className="heatLabel">Listing Heat:</span>
                <strong className="heatValue">Freezing</strong>
                <span className="heatHint" aria-hidden="true">
                  <SpriteIcon name="question_outline" className="heatHintIcon" />
                </span>
              </div>
            </header>

            <div className="uploadMeta">
              <p className="uploadCount">{uploadedCountText}</p>
              <p className="uploadHint">Drag images to reorder. Click to select multiple for bulk actions.</p>
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
              data-node-id="5027:50690"
            >
              <SpriteIcon name="images_outline" className="dropIcon" />
              <p className="dropPrimary">Drag &amp; drop files to upload</p>
              <p className="dropSecondary">
                File must be less than 30 MB,
                <br />
                Files accepted: JPEG, JPG, PNG, SVG, HEIF, and HEIC
              </p>
            </div>

            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              accept={ACCEPT_FILE_TYPES}
              onChange={handleFileInputChange}
            />

            {selectedPhotoIds.size > 0 ? (
              <div
                ref={bulkStickyRef}
                className={`bulkActionsSticky`}
                data-node-id="5027:51114"
              >
                <div className="bulkActionsBar">
                  <button
                    type="button"
                    className="bulkSelectedButton photoInteractive"
                    onClick={clearPhotoSelection}
                  >
                    <SpriteIcon name="cross_outline" className="bulkSelectedCloseIcon" />
                    <span>{selectedPhotoIds.size} Selected</span>
                  </button>

                  <div className="bulkActionGroup">
                    <button
                      type="button"
                      className="bulkActionButton photoInteractive"
                      onClick={clearPhotoSelection}
                    >
                      <SpriteIcon name="pen_outline" className="bulkActionIcon" />
                      Edit Images
                    </button>

                    <button
                      type="button"
                      className="bulkActionButton photoInteractive"
                      onClick={() => openCategoryModal(selectedPhotoIdsOrdered)}
                    >
                      <SpriteIcon name="stuck_outline" className="bulkActionIcon" />
                      Assign Category
                    </button>

                    <button
                      type="button"
                      className="bulkActionButton photoInteractive"
                      onClick={handleBulkDeleteSelected}
                    >
                      <SpriteIcon name="trash_outline" className="bulkActionIcon" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {photos.length > 0 ? (
              <div
                ref={photoGridRef}
                className={`photoGridWrap ${selectionBox ? 'isSelecting' : ''}`}
              >
                <div className="photoGrid" data-node-id="4452:111255">
                  {photos.map((photo, index) => {
                    const isSelected = selectedPhotoIds.has(photo.id);
                    const assignedCategories = photo.categories
                      .map((categoryId) => categoryById.get(categoryId))
                      .filter((category): category is CategoryDefinition => Boolean(category));
                    const primaryCategory = assignedCategories[0] ?? null;
                    const cardDropdownItems = getDropdownItemsForPhotoIndex(index);

                    return (
                      <article
                        key={photo.id}
                        data-photo-id={photo.id}
                        className={`photoCardFrame ${draggedPhotoId === photo.id ? 'isDragging' : ''} ${isSelected ? 'isSelected' : ''}`}
                        draggable
                        onDragStart={(event) => handleCardDragStart(event, photo.id)}
                        onDragOver={(event) => handleCardDragOver(event, photo.id)}
                        onDrop={(event) => handleCardDrop(event, photo.id)}
                        onDragEnd={() => {
                          setDraggedPhotoId(null);
                          dragSourcePhotoIdRef.current = null;
                          requestAnimationFrame(() => {
                            suppressCardClickRef.current = false;
                          });
                        }}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (suppressCardClickRef.current || isMarqueeSelectingRef.current || marqueeArmedRef.current) {
                            return;
                          }

                          if (target.closest('.photoInteractive') || target.closest('.photoMenu')) {
                            return;
                          }

                          togglePhotoSelection(photo.id);
                        }}
                      >
                        <div className="photoCard">
                        <header className="photoCardHeader">
                          <button
                            type="button"
                            className={`addCategoryButton photoInteractive ${primaryCategory ? 'hasCategory' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              clearPhotoSelection();
                              openCategoryModal([photo.id], primaryCategory?.id);
                            }}
                          >
                            {primaryCategory ? (
                              <>
                                <span>{primaryCategory.label}</span>
                                <SpriteIcon name="pen_outline" className="assignedCategoryPenIcon" />
                              </>
                            ) : (
                              <>
                                <SpriteIcon name="plus_outline" className="addCategoryIcon" />
                                <span>Add Category</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="photoMenuButton photoInteractive"
                            aria-label="Open photo actions"
                            onClick={(event) => {
                              event.stopPropagation();
                              clearPhotoSelection();
                              setMenuPhotoId((prev) => (prev === photo.id ? null : photo.id));
                            }}
                          >
                            <SpriteIcon name="dots_horizontal_outline" className="menuDotsIcon" />
                          </button>
                        </header>

                        <div className="photoImageWrap">
                          <img
                            src={photo.src}
                            alt={photo.name}
                            className="photoImage"
                            style={{
                              '--photo-rotation': `${photo.rotation}deg`,
                            } as CSSProperties}
                            draggable={false}
                          />

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
                              className="photoHoverActionButton photoInteractive"
                              onClick={(event) => {
                                event.stopPropagation();
                                openPreview(photo.id);
                              }}
                              aria-label="Open full screen preview"
                            >
                              <SpriteIcon name="arrows_out_outline" className="photoHoverActionIcon" />
                            </button>

                            <button
                              type="button"
                              className={`photoHoverCheckButton photoInteractive ${isSelected ? 'isSelected' : ''}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePhotoSelection(photo.id);
                              }}
                              aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                            >
                              <SpriteIcon name="checkmark" className="photoHoverCheckIcon" />
                            </button>
                          </div>
                        </div>
                        </div>

                        {menuPhotoId === photo.id ? (
                          <div className="photoMenu" role="menu" aria-label="Photo actions">
                            {cardDropdownItems.map((item, itemIndex) => {
                              if (item.type === 'divider') {
                                return (
                                  <div key={`divider-${itemIndex}`} className="photoMenuDividerWrap">
                                    <div className="photoMenuDivider" />
                                  </div>
                                );
                              }

                              return (
                                <button
                                  key={item.action}
                                  type="button"
                                  role="menuitem"
                                  className={`photoMenuItem ${item.destructive ? 'isDestructive' : ''}`}
                                  onClick={() => handleDropdownAction(item.action, photo.id)}
                                >
                                  <SpriteIcon name={item.icon} className="photoMenuItemIcon" />
                                  <span>{item.label}</span>
                                </button>
                              );
                            })}
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

          <footer className="navigationRow" data-node-id="4452:111295">
            <button type="button" className="backButton" data-node-id="4452:111296">
              <SpriteIcon name="arrow_left" className="navIcon" />
              Back
            </button>

            <Button
              variant="contained"
              disableElevation
              className="nextButton"
              endIcon={<SpriteIcon name="arrow_right" className="navIcon" />}
              data-node-id="4452:111297"
            >
              Save &amp; Next
            </Button>
          </footer>
        </div>
      </section>

      {previewPhoto ? (
        <div className="previewOverlay" onClick={() => setPreviewPhotoId(null)} data-node-id="5078:31846">
          <div className="previewDialog" onClick={(event) => event.stopPropagation()}>
            <div className="previewTopBar">
              <span className="previewCounter">
                {previewPhotoIndex + 1}/{photos.length}
              </span>

              <div className="previewActions">
                <button
                  type="button"
                  className="previewActionButton isDisabled"
                  disabled
                  aria-disabled="true"
                >
                  <SpriteIcon name="pen_outline" className="previewActionIcon" />
                  Edit Image
                </button>

                <span className="previewActionDivider" aria-hidden="true" />

                <button
                  type="button"
                  className="previewActionButton"
                  onClick={() => rotatePhoto(previewPhoto.id)}
                >
                  <SpriteIcon name="arrows_clockwise_outline" className="previewActionIcon" />
                  Rotate Image
                </button>
              </div>

              <div className="previewTopBarSpacer">
                <button
                  type="button"
                  className="previewCloseButton photoInteractive"
                  onClick={() => setPreviewPhotoId(null)}
                  aria-label="Close preview"
                >
                  <SpriteIcon name="cross_outline" className="previewCloseIcon" />
                </button>
              </div>
            </div>

            {photos.length > 1 ? (
              <button
                type="button"
                className="previewNavButton previewNavPrev photoInteractive"
                onClick={() => openAdjacentPreview(-1)}
                aria-label="Previous image"
              >
                <SpriteIcon name="arrow_left" className="previewNavIcon" />
              </button>
            ) : null}

            <figure className="previewFigure">
              <img
                src={previewPhoto.src}
                alt={previewPhoto.name}
                className="previewImage"
                style={{ transform: `rotate(${previewPhoto.rotation}deg)` }}
                draggable={false}
              />
            </figure>

            {photos.length > 1 ? (
              <button
                type="button"
                className="previewNavButton previewNavNext photoInteractive"
                onClick={() => openAdjacentPreview(1)}
                aria-label="Next image"
              >
                <SpriteIcon name="arrow_right" className="previewNavIcon" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isCategoryModalOpen ? (
        <div className="categoryModalOverlay" onClick={closeCategoryModal} data-node-id="4452:108801">
          <div className="categoryModal" onClick={(event) => event.stopPropagation()}>
            <header className="categoryModalHeader">
              <div>
                <h2 className="categoryModalTitle">
                  {categoryDetailId ? detailCategory?.label ?? 'Category' : 'Select Category'}
                </h2>
                <p className="categoryModalSubline">
                  {categoryDetailId
                    ? (
                      <>
                        <span>{`${detailCategoryPhotos.length} photos in this category. `}</span>
                        <span className="categoryModalSublineStrong">{`You're assigning ${categoryTargetPhotoIds.length} selected images`}</span>
                      </>
                    )
                    : (
                      <>
                        <span>Select a Category for </span>
                        <span className="categoryModalSublineStrong">{`${categoryTargetPhotoIds.length} selected images`}</span>
                      </>
                    )}
                </p>
              </div>

              <button
                type="button"
                className="categoryModalCloseButton photoInteractive"
                onClick={closeCategoryModal}
                aria-label="Close category modal"
              >
                <SpriteIcon name="cross_outline" className="categoryModalCloseIcon" />
              </button>
            </header>

            <div className={`categoryModalBody ${categoryDetailId ? 'isDetail' : ''}`}>
              {!categoryDetailId ? (
                <>
                  <div className="categorySearch">
                    <SpriteIcon name="search_outline" className="categorySearchIcon" />
                    <input
                      type="text"
                      className="categorySearchInput"
                      placeholder="Search for Category"
                      value={categorySearchQuery}
                      onChange={(event) => setCategorySearchQuery(event.target.value)}
                    />

                    {categorySearchQuery ? (
                      <button
                        type="button"
                        className="categorySearchClearButton photoInteractive"
                        onClick={() => setCategorySearchQuery('')}
                        aria-label="Clear category search"
                      >
                        <SpriteIcon name="cross_outline" className="categorySearchClearIcon" />
                      </button>
                    ) : null}
                  </div>

                  {filteredCategories.length > 0 ? (
                    <div className="categoryGrid" data-node-id="4452:115415">
                      {filteredCategories.map((category) => {
                        const categoryStat = categoryStats.get(category.id) ?? { count: 0, coverSrc: null };
                        const hasPhotos = categoryStat.count > 0;
                        const isSelected = selectedCategoryId === category.id;
                        const selectCategory = () => setSelectedCategoryId(category.id);
                        const openCategoryDetails = () => {
                          setCategoryDetailId(category.id);
                          setSelectedCategoryId(category.id);
                        };

                        return (
                          <div
                            key={category.id}
                            className={`categoryCard ${isSelected ? 'isSelected' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={selectCategory}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                selectCategory();
                              }
                            }}
                          >
                            <span className="categoryCardMain">
                              <span className="categoryCardMedia">
                                <img
                                  src={categoryStat.coverSrc ?? category.imageSrc}
                                  alt=""
                                  className="categoryCardPreview"
                                  draggable={false}
                                />

                                {hasPhotos ? (
                                  <button
                                    type="button"
                                    className="categoryCardEye photoInteractive"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openCategoryDetails();
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openCategoryDetails();
                                      }
                                    }}
                                    aria-label={`Open ${category.label}`}
                                  >
                                    <SpriteIcon name="eye_outline" className="categoryCardEyeIcon" />
                                  </button>
                                ) : null}
                              </span>

                              <span className="categoryCardText">
                                <span className="categoryCardTitle">{category.label}</span>
                                <span className="categoryCardSubtitle">
                                  {hasPhotos ? `${categoryStat.count} photos` : 'Add Images'}
                                </span>
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="categoryEmptyState">
                      <p className="categoryEmptyTitle">{`No “${categorySearchQuery.trim()}” categories found`}</p>
                      <p className="categoryEmptySubtitle">Try adjusting your search</p>
                    </div>
                  )}
                </>
              ) : (
                <section className="categoryDetail" data-node-id="5027:51900">
                  {detailPreviewPhotos.length > 0 ? (
                    <div className="categoryDetailGrid">
                      {detailPreviewPhotos.map((photo) => (
                        <div key={`${categoryDetailId}-${photo.id}`} className="categoryDetailPhoto">
                          <img src={photo.src} alt={photo.name} draggable={false} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="categoryDetailEmpty">No photos in this category yet.</p>
                  )}
                </section>
              )}
            </div>

            <footer className="categoryModalActions">
              <button
                type="button"
                className={`categoryBackButton ${categoryDetailId ? 'isDetail' : ''}`}
                onClick={() => {
                  if (categoryDetailId) {
                    setCategoryDetailId(null);
                    return;
                  }

                  closeCategoryModal();
                }}
              >
                {categoryDetailId ? 'Back to Categories' : 'Cancel'}
              </button>

              <button
                type="button"
                className="categoryAssignButton"
                onClick={handleAssignCategory}
                disabled={!selectedCategoryId || categoryTargetPhotoIds.length === 0}
              >
                Assign Category
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </main>
  );
}
