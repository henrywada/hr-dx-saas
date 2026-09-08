'use client'

import { useMemo } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { OrgTreeNodeCard } from './OrgTreeNodeCard'
import type { PositionedOrgTreeNode, OrgTreeEdge } from '../org-tree'

interface OrgTreeCanvasProps {
  nodes: PositionedOrgTreeNode[]
  edges: OrgTreeEdge[]
}

const nodeTypes = { orgTreeNode: OrgTreeNodeCard }

/**
 * 組織ツリーの読み取り専用ビューアー本体。
 * `@xyflow/react`を直接利用するため、`OrgTreeSection`から`next/dynamic`（`ssr: false`）で
 * このモジュール単位で動的import・遅延読み込みされる。
 */
export function OrgTreeCanvas({ nodes, edges }: OrgTreeCanvasProps) {
  const flowNodes = useMemo<Node[]>(
    () =>
      nodes.map(node => ({
        id: node.id,
        type: 'orgTreeNode',
        position: { x: node.x, y: node.y },
        data: {
          label: node.label,
          role: node.role,
          taskCount: node.taskCount,
          progressPercent: node.progressPercent,
        },
      })),
    [nodes]
  )

  const flowEdges = useMemo<Edge[]>(
    () => edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target })),
    [edges]
  )

  return (
    <div className="h-[420px] w-full rounded-lg border border-slate-200">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
