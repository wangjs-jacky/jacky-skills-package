/**
 * 工作流方案管理
 */
import type { WorkflowScheme, WorkflowType } from './types.js'

/**
 * 预定义工作流方案
 */
const WORKFLOW_SCHEMES: WorkflowScheme[] = [
  {
    id: 'superpowers',
    name: 'Superpowers',
    description: 'Vercel 官方工作流，包含 brainstorming、TDD、code review 等',
    plugins: [
      {
        packageId: 'superpowers@superpowers-marketplace',
        required: true,
      },
    ],
    bundledSkills: [
      'brainstorming',
      'test-driven-development',
      'systematic-debugging',
      'writing-plans',
      'executing-plans',
      'code-review',
    ],
    conflictsWith: ['openspec'],
  },
  {
    id: 'openspec',
    name: 'OpenSpec',
    description: '实验性工作流，基于 artifact 的变更管理',
    plugins: [],
    bundledSkills: [
      'openspec-explore',
      'openspec-new-change',
      'openspec-apply-change',
      'openspec-verify-change',
    ],
    conflictsWith: ['superpowers'],
  },
  {
    id: 'spiderkit',
    name: 'SpiderKit',
    description: '爬虫工具集',
    plugins: [],
    bundledSkills: [],
    conflictsWith: [],
  },
  {
    id: 'native',
    name: 'Claude Code Native',
    description: 'Claude Code 原生模式，不使用额外工作流',
    plugins: [],
    bundledSkills: [],
    conflictsWith: [],
  },
]

/**
 * 获取所有工作流方案
 */
export function listWorkflows(): WorkflowScheme[] {
  return [...WORKFLOW_SCHEMES]
}

/**
 * 获取工作流方案
 */
export function getWorkflow(id: WorkflowType): WorkflowScheme | undefined {
  return WORKFLOW_SCHEMES.find((scheme) => scheme.id === id)
}

/**
 * 检查工作流是否可用
 */
export function isWorkflowAvailable(id: WorkflowType): boolean {
  return WORKFLOW_SCHEMES.some((scheme) => scheme.id === id)
}

/**
 * 获取与指定工作流冲突的方案
 */
export function getConflictingWorkflows(id: WorkflowType): WorkflowType[] {
  const workflow = getWorkflow(id)
  if (!workflow) {
    return []
  }
  return workflow.conflictsWith ?? []
}

/**
 * 检查两个工作流是否冲突
 */
export function areWorkflowsConflicting(
  id1: WorkflowType,
  id2: WorkflowType
): boolean {
  const conflicts1 = getConflictingWorkflows(id1)
  const conflicts2 = getConflictingWorkflows(id2)

  // 双向检查：id1 冲突列表中包含 id2，或 id2 冲突列表中包含 id1
  return conflicts1.includes(id2) || conflicts2.includes(id1)
}

/**
 * 获取工作流的绑定 skills
 */
export function getWorkflowBundledSkills(id: WorkflowType): string[] {
  const workflow = getWorkflow(id)
  if (!workflow) {
    return []
  }
  return workflow.bundledSkills ?? []
}

/**
 * 获取工作流需要的插件
 */
export function getWorkflowRequiredPlugins(id: WorkflowType): string[] {
  const workflow = getWorkflow(id)
  if (!workflow) {
    return []
  }
  return workflow.plugins
    .filter((plugin) => plugin.required)
    .map((plugin) => plugin.packageId)
}
