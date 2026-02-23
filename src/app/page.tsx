'use client';

import type { ChangeEvent, CSSProperties, DragEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
type CategoryTab = 'interior' | 'exterior';

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
  emptyHint: string;
  icon: SpriteIconNames;
  id: string;
  label: string;
  tab: CategoryTab;
};

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
    id: 'master-cabin',
    tab: 'interior',
    label: 'Master Cabin',
    icon: 'bed_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'engine-room',
    tab: 'interior',
    label: 'Engine Room',
    icon: 'engine_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'guest-cabin',
    tab: 'interior',
    label: 'Guest Cabin',
    icon: 'bed_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'galley',
    tab: 'interior',
    label: 'Galley',
    icon: 'appliances_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'main-salon',
    tab: 'interior',
    label: 'Main Salon',
    icon: 'interior_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'crew-quarters',
    tab: 'interior',
    label: 'Crew Quarters',
    icon: 'crew_cabin_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'bow',
    tab: 'exterior',
    label: 'Bow',
    icon: 'anchor_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'stern',
    tab: 'exterior',
    label: 'Stern',
    icon: 'deck_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'flybridge',
    tab: 'exterior',
    label: 'Flybridge',
    icon: 'dashboard_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'aft-deck',
    tab: 'exterior',
    label: 'Aft Deck',
    icon: 'deck_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'side-profile',
    tab: 'exterior',
    label: 'Side Profile',
    icon: 'boat_side_outline',
    emptyHint: 'No photos uploaded yet',
  },
  {
    id: 'swim-platform',
    tab: 'exterior',
    label: 'Swim Platform',
    icon: 'fresh_water_outline',
    emptyHint: 'No photos uploaded yet',
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

export default function Page() {
  const [photos, setPhotos] = useState<PhotoCard[]>([]);
  const [isDropActive, setIsDropActive] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [menuPhotoId, setMenuPhotoId] = useState<string | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<CategoryTab>('interior');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryDetailId, setCategoryDetailId] = useState<string | null>(null);
  const [categoryTargetPhotoIds, setCategoryTargetPhotoIds] = useState<string[]>([]);
  const [isBulkStickyPinned, setIsBulkStickyPinned] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const mainSectionRef = useRef<HTMLElement>(null);
  const bulkStickyRef = useRef<HTMLDivElement>(null);
  const suppressCardClickRef = useRef(false);

  const categoryById = useMemo(() => {
    return new Map(categoryDefinitions.map((category) => [category.id, category]));
  }, []);

  const categoriesByTab = useMemo(
    () => ({
      interior: categoryDefinitions.filter((category) => category.tab === 'interior'),
      exterior: categoryDefinitions.filter((category) => category.tab === 'exterior'),
    }),
    [],
  );

  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; coverSrc: string | null }>();

    categoryDefinitions.forEach((category) => {
      map.set(category.id, { count: 0, coverSrc: null });
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
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.photoMenu') || target.closest('.photoMenuButton')) {
        return;
      }

      setMenuPhotoId(null);
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
        setIsCategoryModalOpen(false);
        setCategoryDetailId(null);
        setSelectedCategoryId(null);
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
  const detailCategory = categoryDetailId ? categoryById.get(categoryDetailId) ?? null : null;

  const detailCategoryPhotos = useMemo(() => {
    if (!categoryDetailId) {
      return [];
    }

    return photos.filter((photo) => photo.categories.includes(categoryDetailId));
  }, [categoryDetailId, photos]);

  const detailPreviewPhotos = useMemo(() => {
    if (!categoryDetailId) {
      return [];
    }

    const map = new Map<string, PhotoCard>();

    detailCategoryPhotos.forEach((photo) => {
      map.set(photo.id, photo);
    });

    photos
      .filter((photo) => categoryTargetPhotoIds.includes(photo.id))
      .forEach((photo) => {
        map.set(photo.id, photo);
      });

    return Array.from(map.values());
  }, [categoryDetailId, categoryTargetPhotoIds, detailCategoryPhotos, photos]);

  useEffect(() => {
    const root = mainSectionRef.current;
    if (!root) {
      return;
    }

    const syncPinnedState = () => {
      if (selectedPhotoIds.size === 0 || !bulkStickyRef.current) {
        setIsBulkStickyPinned(false);
        return;
      }

      const stickyStart = Math.max(0, bulkStickyRef.current.offsetTop - 12);
      setIsBulkStickyPinned(root.scrollTop > stickyStart);
    };

    syncPinnedState();
    root.addEventListener('scroll', syncPinnedState, { passive: true });
    window.addEventListener('resize', syncPinnedState);

    return () => {
      root.removeEventListener('scroll', syncPinnedState);
      window.removeEventListener('resize', syncPinnedState);
    };
  }, [selectedPhotoIds.size, photos.length]);

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
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', photoId);
    setDraggedPhotoId(photoId);
    setMenuPhotoId(null);
  };

  const handleCardDragOver = (event: DragEvent<HTMLElement>, photoId: string) => {
    if (!draggedPhotoId || draggedPhotoId === photoId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleCardDrop = (event: DragEvent<HTMLElement>, targetPhotoId: string) => {
    event.preventDefault();

    const sourcePhotoId = draggedPhotoId || event.dataTransfer.getData('text/plain');
    if (!sourcePhotoId || sourcePhotoId === targetPhotoId) {
      return;
    }

    setPhotos((prev) => {
      const sourceIndex = prev.findIndex((photo) => photo.id === sourcePhotoId);
      const targetIndex = prev.findIndex((photo) => photo.id === targetPhotoId);

      return reorderItems(prev, sourceIndex, targetIndex);
    });

    setDraggedPhotoId(null);
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
    setCategoryDetailId(null);
    setSelectedCategoryId(null);
    setCategoryTargetPhotoIds([]);
  };

  const openCategoryModal = (targetPhotoIds: string[], initialCategoryId?: string) => {
    if (targetPhotoIds.length === 0) {
      return;
    }

    setIsCategoryModalOpen(true);
    setCategoryTargetPhotoIds(targetPhotoIds);
    setCategoryDetailId(null);

    if (initialCategoryId && categoryById.has(initialCategoryId)) {
      const initialCategory = categoryById.get(initialCategoryId);
      setActiveCategoryTab(initialCategory?.tab ?? 'interior');
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

      if (action === 'rotate') {
        const next = [...prev];
        next[index] = {
          ...next[index],
          rotation: (next[index].rotation + 90) % 360,
        };

        return next;
      }

      return prev;
    });
  };

  return (
    <main className="uploadPage" style={pageStyle} data-node-id="4452:111907">
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

      <section className="mainSection" data-node-id="4452:111909" ref={mainSectionRef}>
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
                className={`bulkActionsSticky ${isBulkStickyPinned ? 'isPinned' : ''}`}
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
                  </div>
                </div>
              </div>
            ) : null}

            {photos.length > 0 ? (
              <div className="photoGrid" data-node-id="4452:111255">
                {photos.map((photo, index) => {
                  const isSelected = selectedPhotoIds.has(photo.id);
                  const assignedCategories = photo.categories
                    .map((categoryId) => categoryById.get(categoryId))
                    .filter((category): category is CategoryDefinition => Boolean(category));
                  const primaryCategory = assignedCategories[0] ?? null;

                  return (
                    <article
                      key={photo.id}
                      className={`photoCardFrame ${draggedPhotoId === photo.id ? 'isDragging' : ''} ${isSelected ? 'isSelected' : ''}`}
                      draggable
                      onDragStart={(event) => handleCardDragStart(event, photo.id)}
                      onDragOver={(event) => handleCardDragOver(event, photo.id)}
                      onDrop={(event) => handleCardDrop(event, photo.id)}
                      onDragEnd={() => {
                        setDraggedPhotoId(null);
                        requestAnimationFrame(() => {
                          suppressCardClickRef.current = false;
                        });
                      }}
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (suppressCardClickRef.current) {
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
                          {dropdownItems.map((item, itemIndex) => {
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
            <button
              type="button"
              className="previewCloseButton photoInteractive"
              onClick={() => setPreviewPhotoId(null)}
              aria-label="Close preview"
            >
              <SpriteIcon name="cross_outline" className="previewCloseIcon" />
            </button>

            {photos.length > 1 ? (
              <button
                type="button"
                className="previewNavButton previewNavPrev photoInteractive"
                onClick={() => openAdjacentPreview(-1)}
                aria-label="Previous image"
              >
                <SpriteIcon name="chevron_left" className="previewNavIcon" />
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
              <figcaption className="previewCaption">
                <span className="previewName">{previewPhoto.name}</span>
                <span className="previewCount">
                  {previewPhotoIndex + 1}/{photos.length}
                </span>
              </figcaption>
            </figure>

            {photos.length > 1 ? (
              <button
                type="button"
                className="previewNavButton previewNavNext photoInteractive"
                onClick={() => openAdjacentPreview(1)}
                aria-label="Next image"
              >
                <SpriteIcon name="chevron_right" className="previewNavIcon" />
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
                {categoryDetailId ? <p className="categoryModalEyebrow">Category</p> : null}
                <h2 className="categoryModalTitle">
                  {categoryDetailId ? detailCategory?.label ?? 'Category' : 'Select Category'}
                </h2>
                <p className="categoryModalSubline">
                  {categoryDetailId
                    ? `${detailCategoryPhotos.length} photos in this category. You're assigning ${categoryTargetPhotoIds.length} selected images`
                    : `Select a Category for ${categoryTargetPhotoIds.length} selected images`}
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

            {!categoryDetailId ? (
              <div className="categoryTabs" role="tablist" aria-label="Category tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryTab === 'interior'}
                  className={`categoryTab ${activeCategoryTab === 'interior' ? 'isActive' : ''}`}
                  onClick={() => {
                    setActiveCategoryTab('interior');
                    setCategoryDetailId(null);
                  }}
                >
                  <SpriteIcon name="interior_outline" className="categoryTabIcon" />
                  Interior
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryTab === 'exterior'}
                  className={`categoryTab ${activeCategoryTab === 'exterior' ? 'isActive' : ''}`}
                  onClick={() => {
                    setActiveCategoryTab('exterior');
                    setCategoryDetailId(null);
                  }}
                >
                  <SpriteIcon name="deck_outline" className="categoryTabIcon" />
                  Exterior
                </button>
              </div>
            ) : null}

            {!categoryDetailId ? (
              <div className="categoryGrid" data-node-id="4452:115415">
                {categoriesByTab[activeCategoryTab].map((category) => {
                  const categoryStat = categoryStats.get(category.id) ?? { count: 0, coverSrc: null };
                  const hasPhotos = categoryStat.count > 0;
                  const isSelected = selectedCategoryId === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`categoryCard ${isSelected ? 'isSelected' : ''}`}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <span className="categoryCardMain">
                        <span className="categoryCardMedia">
                          {hasPhotos ? (
                            <img
                              src={categoryStat.coverSrc ?? ''}
                              alt=""
                              className="categoryCardPreview"
                              draggable={false}
                            />
                          ) : (
                            <span className="categoryCardIconWrap" aria-hidden="true">
                              <SpriteIcon name={category.icon} className="categoryCardIcon" />
                            </span>
                          )}

                          {hasPhotos ? (
                            <span
                              className="categoryCardEye photoInteractive"
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setCategoryDetailId(category.id);
                                setSelectedCategoryId(category.id);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setCategoryDetailId(category.id);
                                  setSelectedCategoryId(category.id);
                                }
                              }}
                              aria-label={`Open ${category.label}`}
                            >
                              <SpriteIcon name="eye_outline" className="categoryCardEyeIcon" />
                            </span>
                          ) : null}
                        </span>

                        <span className="categoryCardText">
                          <span className="categoryCardTitle">{category.label}</span>
                          <span className="categoryCardSubtitle">
                            {hasPhotos ? `${categoryStat.count} images` : 'Add Images'}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
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

            <footer className="categoryModalActions">
              <button
                type="button"
                className="categoryBackButton"
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
