import React, { useCallback, MouseEvent, useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useHotkeys } from 'react-hotkeys-hook';
import { create } from 'zustand';

import ReactFlow, {
  Node as FlowNode,
  Background,
  BackgroundVariant,
  XYPosition,
  ReactFlowProps,
  ReactFlowInstance,
} from 'reactflow';

import { NodeType, GraphDataType } from '@shaderfrog/core/graph';
import { EngineNodeType } from '@shaderfrog/core/engine';

import ConnectionLine from './ConnectionLine';
import FlowEdgeComponent from './FlowEdge';
import {
  DataNodeComponent,
  FlowNodeData,
  SourceNodeComponent,
} from './FlowNode';
import { FlowEventHack } from '../../flowEventHack';

import ContextMenu, { MenuItem } from '../ContextMenu';
import { FlowEditorContext } from '@editor/editor/flowEditorContext';
import { isMacintosh } from '@editor/util/platform';

import styles from './floweditor.module.css';

/**
 * This file is an attempt to break up Editor.tsx by abstracting out the view
 * implementaiton of FlowEditor. Any visual / non-graph functionality inside
 * the graph editor is meant to go in here.
 *
 * The menu and the mouse position need input from the parent component. Right
 * now I pass the mouse as a mutable object and the menu position with zustand.
 * Maybe instead put both in zustand or pull it all up into the parent? I don't
 * want to cause a re-render on every mouse move which is why it's an object
 */

interface EditorStore {
  menu: ContextMenu | undefined;
  isTextureBrowserOpen: boolean;
  setMenu: (menu: ContextMenuType, position: XYPosition) => void;
  hideMenu: () => void;
  openTextureBrowser: () => void;
  closeTextureBrowser: () => void;
}

export enum ContextMenuType {
  CONTEXT,
  NODE_CONTEXT,
}

export type ContextMenu = { menu: ContextMenuType; position: XYPosition };

export const useEditorStore = create<EditorStore>((set) => ({
  menu: undefined,
  isTextureBrowserOpen: false,
  setMenu: (menu, position) => set(() => ({ menu: { menu, position } })),
  hideMenu: () => set(() => ({ menu: undefined })),
  openTextureBrowser: () => set(() => ({ isTextureBrowserOpen: true })),
  closeTextureBrowser: () => set(() => ({ isTextureBrowserOpen: false })),
}));

// Terrible hack to make the flow graph full height minus the tab height - I
// need better layoutting of the tabs + graph
const flowStyles = { background: '#111' };

const flowKey = 'example-flow';

const nodeTypes: Record<NodeType | GraphDataType | EngineNodeType, any> = {
  toon: SourceNodeComponent,
  phong: SourceNodeComponent,
  physical: SourceNodeComponent,
  shader: SourceNodeComponent,
  output: SourceNodeComponent,
  binary: SourceNodeComponent,
  source: SourceNodeComponent,
  vector2: DataNodeComponent,
  vector3: DataNodeComponent,
  vector4: DataNodeComponent,
  rgb: DataNodeComponent,
  rgba: DataNodeComponent,
  mat2: DataNodeComponent,
  mat3: DataNodeComponent,
  mat4: DataNodeComponent,
  mat2x2: DataNodeComponent,
  mat2x3: DataNodeComponent,
  mat2x4: DataNodeComponent,
  mat3x2: DataNodeComponent,
  mat3x3: DataNodeComponent,
  mat3x4: DataNodeComponent,
  mat4x2: DataNodeComponent,
  mat4x3: DataNodeComponent,
  mat4x4: DataNodeComponent,
  texture: DataNodeComponent,
  samplerCube: DataNodeComponent,
  number: DataNodeComponent,
  array: DataNodeComponent,
};

export const SHADERFROG_FLOW_EDGE_TYPE = 'special';

const edgeTypes: Record<typeof SHADERFROG_FLOW_EDGE_TYPE, any> = {
  [SHADERFROG_FLOW_EDGE_TYPE]: FlowEdgeComponent,
};

export type MouseData = {
  real: XYPosition;
  viewport: XYPosition;
  projected: XYPosition;
};

type FlowEditorProps =
  | {
      menuItems: MenuItem[];
      mouse: React.MutableRefObject<MouseData>;
      onNodeValueChange: (id: string, value: any) => void;
      onMenuAdd: (type: string) => void;
      onMenuClose: () => void;
      onNodeContextSelect: (nodeId: string, type: string) => void;
      onNodeContextHover: (nodeId: string, type: string) => void;
    } & Pick<
      ReactFlowProps,
      | 'nodes'
      | 'edges'
      | 'onConnect'
      | 'onEdgeUpdate'
      | 'onEdgesChange'
      | 'onNodesChange'
      | 'onNodesDelete'
      | 'onNodeDoubleClick'
      | 'onSelectionChange'
      | 'onEdgesDelete'
      | 'onConnectStart'
      | 'onEdgeUpdateStart'
      | 'onEdgeUpdateEnd'
      | 'onNodeDragStop'
      | 'onConnectEnd'
    >;

export enum NodeContextActions {
  EDIT_SOURCE = '1',
  DELETE_NODE_AND_DEPENDENCIES = '2',
  DELETE_NODE_ONLY = '3',
  DELETE_FULL_NODE_TREE = '4',
}
const nodeContextMenuItems = (node?: FlowNode<FlowNodeData>): MenuItem[] => {
  if (!node) {
    return [];
  }
  const isData = 'value' in node.data;
  return isData
    ? [
        {
          display: 'Edit Node Config',
          value: NodeContextActions.EDIT_SOURCE,
          key: 'Double Click',
        },
        {
          display: 'Delete Node',
          value: NodeContextActions.DELETE_NODE_ONLY,
          key: isMacintosh() ? 'Delete' : 'Backspace',
        },
      ]
    : [
        {
          display: 'Edit Source',
          value: NodeContextActions.EDIT_SOURCE,
          key: 'Double Click',
        },
        {
          display: 'Delete Node & Data',
          value: NodeContextActions.DELETE_NODE_AND_DEPENDENCIES,
          key: isMacintosh() ? 'Delete' : 'Backspace',
        },
        {
          display: 'Delete Node Only',
          value: NodeContextActions.DELETE_NODE_ONLY,
          key: isMacintosh() ? 'Option-Delete' : 'Ctrl-Backspace',
        },
        {
          display: 'Delete Node Tree',
          value: NodeContextActions.DELETE_FULL_NODE_TREE,
        },
      ];
};

const FlowEditor = ({
  mouse,
  menuItems,
  onMenuAdd,
  onMenuClose,
  onNodeContextSelect,
  onNodeContextHover,
  nodes,
  edges,
  onConnect,
  onEdgeUpdate,
  onEdgesChange,
  onNodesChange,
  onNodesDelete,
  onSelectionChange,
  onNodeDoubleClick,
  onEdgesDelete,
  onConnectStart,
  onEdgeUpdateStart,
  onEdgeUpdateEnd,
  onConnectEnd,
  onNodeDragStop,
  onNodeValueChange,
}: FlowEditorProps) => {
  const { menu, setMenu, hideMenu } = useEditorStore();
  const [contextNodeId, setContextNodeId] = useState<string>();

  useHotkeys('esc', () => hideMenu());
  useHotkeys('shift+a', () =>
    setMenu(ContextMenuType.CONTEXT, mouse.current.viewport)
  );

  const setContextMenu = useCallback(
    (type: ContextMenuType) => {
      setMenu(type, mouse.current.viewport);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setMenu]
  );

  const openNodeContextMenu = useCallback(
    (id: string) => {
      setContextNodeId(id);
      setContextMenu(ContextMenuType.NODE_CONTEXT);
    },
    [setContextMenu]
  );

  const onContextMenu = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      setContextMenu(ContextMenuType.CONTEXT);
    },
    [setContextMenu]
  );

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance>();
  const onMoveEnd = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject().viewport;
      localStorage.setItem(flowKey, JSON.stringify(flow));
    }
  }, [rfInstance]);
  const defaultViewport = useMemo(
    () =>
      JSON.parse(localStorage.getItem(flowKey) || 'null') || {
        x: 200,
        y: 150,
        zoom: 0.5,
      },
    []
  );

  // These are processed in useGraph() for the next time you need to figure this out
  const addNodeMenuItems: MenuItem[] = [
    {
      display: 'Source Code',
      value: 'Source Code',
      children: [
        { display: 'Fragment and Vertex', value: 'fragmentandvertex' },
        { display: 'Fragment', value: 'fragment' },
        { display: 'Vertex', value: 'vertex' },
      ],
    },
    {
      display: 'Data',
      value: 'Data',
      children: [
        { display: 'Number', value: 'number' },
        { display: 'Texture', value: 'texture' },
        { display: 'Sampler Cube', value: 'samplerCube' },
        { display: 'Vector2', value: 'vector2' },
        { display: 'Vector3', value: 'vector3' },
        { display: 'Vector4', value: 'vector4' },
        { display: 'Color (RGB)', value: 'rgb' },
        { display: 'Color (RGBA)', value: 'rgba' },
      ],
    },
    {
      display: 'Math',
      value: 'Math',
      children: [
        { display: 'Add', value: 'add' },
        { display: 'Multiply', value: 'multiply' },
      ],
    },
    ...menuItems,
  ];

  const onContextSelect = useCallback(
    (type: string) => {
      if (contextNodeId) {
        onNodeContextSelect(contextNodeId, type);
      }
    },
    [onNodeContextSelect, contextNodeId]
  );

  const onContextItemHover = useCallback(
    (type: string) => {
      if (contextNodeId) {
        onNodeContextHover(contextNodeId, type);
      }
    },
    [onNodeContextHover, contextNodeId]
  );

  const nodeContextMenu = useMemo(() => {
    return nodeContextMenuItems(
      (nodes || []).find((node) => node.id === contextNodeId)
    );
  }, [nodes, contextNodeId]);

  const { isOver, setNodeRef } = useDroppable({
    id: 'droppable',
  });

  return (
    <FlowEditorContext.Provider value={{ openNodeContextMenu }}>
      <div
        onContextMenu={onContextMenu}
        className={styles.flowContainer}
        ref={setNodeRef}
      >
        {menu?.menu === ContextMenuType.CONTEXT ? (
          <ContextMenu
            menu={addNodeMenuItems}
            position={menu.position}
            onItemHover={onContextItemHover}
            onSelect={onMenuAdd}
            onClose={onMenuClose}
          />
        ) : menu?.menu === ContextMenuType.NODE_CONTEXT ? (
          <ContextMenu
            title="Node Actions"
            menu={nodeContextMenu}
            position={menu.position}
            onItemHover={onContextItemHover}
            onSelect={onContextSelect}
            onClose={onMenuClose}
          />
        ) : null}
        <FlowEventHack onChange={onNodeValueChange}>
          <ReactFlow
            defaultViewport={defaultViewport}
            style={flowStyles}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodes={nodes}
            edges={edges}
            onMoveEnd={onMoveEnd}
            onConnect={onConnect}
            onEdgeUpdate={onEdgeUpdate}
            onEdgesChange={onEdgesChange}
            onNodesChange={onNodesChange}
            onNodesDelete={onNodesDelete}
            onSelectionChange={onSelectionChange}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgesDelete={onEdgesDelete}
            connectionLineComponent={ConnectionLine}
            onConnectStart={onConnectStart}
            onEdgeUpdateStart={onEdgeUpdateStart}
            onEdgeUpdateEnd={onEdgeUpdateEnd}
            onConnectEnd={onConnectEnd}
            onNodeDragStop={onNodeDragStop}
            onInit={setRfInstance}
            minZoom={0.2}
          >
            <Background
              variant={BackgroundVariant.Lines}
              gap={25}
              size={0.5}
              color={isOver ? '#223322' : '#222222'}
            />
          </ReactFlow>
        </FlowEventHack>
      </div>
    </FlowEditorContext.Provider>
  );
};

FlowEditor.displayName = 'FlowEditor';

export default FlowEditor;
