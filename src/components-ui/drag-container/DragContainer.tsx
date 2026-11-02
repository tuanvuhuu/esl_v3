'use client';

import clsx from 'clsx';
import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import styles from './drag-container.module.css';

interface IDraggingId {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IDragElementData {
  node: HTMLDivElement;
}

interface IDragContainerContext {
  onStart: (
    e: React.PointerEvent<HTMLDivElement>,
    elementData: IDragElementData,
    data: unknown,
    id?: string,
  ) => void;
  onDrag: (
    e: React.PointerEvent<HTMLDivElement>,
    elementData: IDragElementData,
    data: unknown,
  ) => void;
  onStop: (
    e: React.PointerEvent<HTMLDivElement>,
    elementData: IDragElementData,
    data: unknown,
  ) => void;
  dropElementRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  hoverKey?: string;
  draggingId?: IDraggingId;
}

const DragContainerContext = createContext<IDragContainerContext>({
  onStart: () => undefined,
  onDrag: () => undefined,
  onStop: () => undefined,
  dropElementRef: { current: {} },
});

export interface IDragContainerProps<TData = unknown>
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onDropped: (data: TData, key: string) => void;
}

export interface IDragContainerDraggableProps<TData = unknown> {
  id: string;
  data: TData;
  children: React.ReactNode;
  dragRender?: () => React.ReactNode;
}

export interface IDragContainerDropableProps<TData = unknown>
  extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  data: TData;
}

const DragContainerDraggable = <TData = unknown,>(
  props: IDragContainerDraggableProps<TData>,
): React.JSX.Element => {
  const { onDrag, onStart, onStop, draggingId } = useContext(DragContainerContext);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const pointerStateRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
  });
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isDragging = useMemo(
    () => Boolean(draggingId && props.id === draggingId.id),
    [props.id, draggingId],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const node = nodeRef.current;
    if (!node || e.button !== 0) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
    };
    setOffset({ x: 0, y: 0 });
    onStart(e, { node }, props.data, props.id);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    const node = nodeRef.current;
    if (!state.active || state.pointerId !== e.pointerId || !node) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    setOffset({ x: dx, y: dy });
    onDrag(e, { node }, props.data);
  };

  const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    const node = nodeRef.current;
    if (!state.active || state.pointerId !== e.pointerId || !node) return;

    pointerStateRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onStop(e, { node }, props.data);
    node.style.transform = 'translate3d(0px, 0px, 0)';
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={nodeRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      style={{
        touchAction: 'none',
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        position: isDragging ? 'relative' : undefined,
        zIndex: isDragging ? 1000 : undefined,
      }}
    >
      {isDragging && props.dragRender ? props.dragRender() : props.children}
    </div>
  );
};

const DragContainerDropable = <TData = unknown,>(
  props: IDragContainerDropableProps<TData>,
): React.JSX.Element => {
  const { dropElementRef, hoverKey } = useContext(DragContainerContext);
  const { id, data: _unusedData, className, ...divProps } = props;
  void _unusedData;

  return (
    <div
      {...divProps}
      ref={(el) => {
        dropElementRef.current[id] = el;
      }}
      className={clsx(
        'rounded-2',
        id === hoverKey && hoverKey && styles.dragContainerDropable_box_idHoverKey,
        className,
      )}
    />
  );
};

const findTargetDropKey = (
  dropMap: Record<string, HTMLDivElement | null>,
  centerX: number,
  centerY: number,
  preferNonZeroSubKey: boolean,
): string | undefined => {
  const keys = Object.keys(dropMap);
  const hitTest = (key: string): boolean => {
    const el = dropMap[key];
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      centerX >= rect.left &&
      centerX <= rect.right &&
      centerY >= rect.top &&
      centerY <= rect.bottom
    );
  };

  if (preferNonZeroSubKey) {
    const filtered = keys.filter((x) => x.split('_')[2] !== '0');
    const primary = filtered.find(hitTest);
    if (primary) return primary;
  }
  return keys.find(hitTest);
};

const DragContainerBase = <TData = unknown,>(
  props: IDragContainerProps<TData>,
): React.JSX.Element => {
  const { children, onDropped, ...divProps } = props;
  const [hoverKey, setHoverKey] = useState<string>();
  const [draggingId, setDraggingId] = useState<IDraggingId | undefined>(undefined);
  const dropElementRef = useRef<Record<string, HTMLDivElement | null>>({});

  const handleStart = (
    _e: React.PointerEvent<HTMLDivElement>,
    elementData: IDragElementData,
    _data: unknown,
    id?: string,
  ) => {
    const r = elementData.node.getBoundingClientRect();
    setDraggingId({
      id: id ?? '',
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
    });
  };

  const handleDrag = (
    _e: React.PointerEvent<HTMLDivElement>,
    elementData: IDragElementData,
  ) => {
    const r = elementData.node.getBoundingClientRect();
    const centerX = r.left + elementData.node.offsetWidth / 2;
    const centerY = r.top + elementData.node.offsetHeight / 2;
    const targetKey = findTargetDropKey(dropElementRef.current, centerX, centerY, true);
    setHoverKey(targetKey);
  };

  const handleStop = (
    _e: React.PointerEvent<HTMLDivElement>,
    elementData: IDragElementData,
    data: unknown,
  ) => {
    setDraggingId(undefined);
    const r = elementData.node.getBoundingClientRect();
    const centerX = r.left + elementData.node.offsetWidth / 2;
    const centerY = r.top + elementData.node.offsetHeight / 2;
    const targetKey = findTargetDropKey(dropElementRef.current, centerX, centerY, false);
    if (targetKey) {
      onDropped(data as TData, targetKey);
    }
    setHoverKey(undefined);
  };

  const contextValue: IDragContainerContext = {
    onDrag: handleDrag,
    onStart: handleStart,
    onStop: handleStop,
    dropElementRef,
    hoverKey,
    draggingId,
  };

  return (
    <DragContainerContext.Provider value={contextValue}>
      <div {...divProps}>{children}</div>
    </DragContainerContext.Provider>
  );
};

const DragContainer = Object.assign(DragContainerBase, {
  Draggable: DragContainerDraggable,
  Dropable: DragContainerDropable,
});

export default DragContainer;
