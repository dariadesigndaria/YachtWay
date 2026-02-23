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

type SidebarStep = {
  icon: SpriteIconNames;
  label: string;
  state: StepState;
};

type PhotoCard = {
  id: string;
  name: string;
  rotation: number;
  src: string;
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

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const objectUrlsRef = useRef<Set<string>>(new Set());

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
      if (event.key === 'Escape') {
        setMenuPhotoId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const uploadedCountText = useMemo(
    () => `${photos.length}/${MAX_PHOTOS} photos uploaded`,
    [photos.length],
  );

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
    inputRef.current?.click();
  };

  const handleDropZoneDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
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
    dragDepthRef.current = 0;
    setIsDropActive(false);

    if (event.dataTransfer.files.length > 0) {
      appendFiles(event.dataTransfer.files);
    }
  };

  const handleCardDragStart = (event: DragEvent<HTMLElement>, photoId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('.photoMenuButton') || target.closest('.photoMenu')) {
      event.preventDefault();
      return;
    }

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

  const handleDropdownAction = (action: DropdownAction, photoId: string) => {
    setMenuPhotoId(null);

    if (action === 'edit') {
      return;
    }

    if (action === 'delete') {
      setPhotos((prev) => {
        const target = prev.find((photo) => photo.id === photoId);
        revokePhotoUrl(target);
        return prev.filter((photo) => photo.id !== photoId);
      });
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

      <section className="mainSection" data-node-id="4452:111909">
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
                <img src={assets.snowflake} alt="cold" width={32} height={32} />
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

            {photos.length > 0 ? (
              <div className="photoGrid" data-node-id="4452:111255">
                {photos.map((photo, index) => (
                  <article
                    key={photo.id}
                    className={`photoCardFrame ${draggedPhotoId === photo.id ? 'isDragging' : ''}`}
                    draggable
                    onDragStart={(event) => handleCardDragStart(event, photo.id)}
                    onDragOver={(event) => handleCardDragOver(event, photo.id)}
                    onDrop={(event) => handleCardDrop(event, photo.id)}
                    onDragEnd={() => setDraggedPhotoId(null)}
                  >
                    <div className="photoCard">
                      <header className="photoCardHeader">
                        <button type="button" className="addCategoryButton">
                          <SpriteIcon name="plus_outline" className="addCategoryIcon" />
                          <span>Add Category</span>
                        </button>

                        <button
                          type="button"
                          className="photoMenuButton"
                          aria-label="Open photo actions"
                          onClick={(event) => {
                            event.stopPropagation();
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
                          style={{ transform: `rotate(${photo.rotation}deg)` }}
                        />

                        {index === 0 ? (
                          <div className="coverBadge">
                            <span>Cover</span>
                            <span className="coverBadgeHint" aria-hidden="true">
                              <SpriteIcon name="question_outline" className="coverBadgeIcon" />
                            </span>
                          </div>
                        ) : null}

                        <div className="photoHoverOverlay" aria-hidden="true">
                          <span className="photoHoverAction">
                            <SpriteIcon name="arrows_out_outline" className="photoHoverActionIcon" />
                          </span>
                          <span className="photoHoverCheck">
                            <SpriteIcon name="checkmark" className="photoHoverCheckIcon" />
                          </span>
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
                ))}
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
    </main>
  );
}
