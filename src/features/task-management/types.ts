import { z } from 'zod'

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で指定する')

export const createObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: dateStringSchema.optional(),
})
export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>

export const createMilestoneSchema = z.object({
  objectiveId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: dateStringSchema.optional(),
})
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>

export const createTaskGroupSchema = z.object({
  milestoneId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
})
export type CreateTaskGroupInput = z.infer<typeof createTaskGroupSchema>

export const assignManagerSchema = z.object({
  taskGroupId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type AssignManagerInput = z.infer<typeof assignManagerSchema>

export const assignMemberSchema = z.object({
  taskGroupId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type AssignMemberInput = z.infer<typeof assignMemberSchema>

export const removeMemberSchema = z.object({
  taskGroupId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>

export const createTaskSchema = z.object({
  taskGroupId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeEmployeeId: z.string().uuid().optional(),
  priority: z.enum(TASK_PRIORITIES).default('normal'),
  dueDate: dateStringSchema.optional(),
})
export type CreateTaskInput = z.infer<typeof createTaskSchema>

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(TASK_STATUSES),
})
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>

export const updateTaskProgressSchema = z.object({
  taskId: z.string().uuid(),
  progressPercent: z.number().int().min(0).max(100),
})
export type UpdateTaskProgressInput = z.infer<typeof updateTaskProgressSchema>

export type TaskLifecycleStatus = 'active' | 'completed' | 'archived'

export interface TaskObjective {
  id: string
  tenantId: string
  ownerEmployeeId: string
  title: string
  description: string | null
  status: TaskLifecycleStatus
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskMilestone {
  id: string
  tenantId: string
  objectiveId: string
  title: string
  description: string | null
  dueDate: string | null
  status: TaskLifecycleStatus
  sortOrder: number
}

export interface TaskGroup {
  id: string
  tenantId: string
  milestoneId: string
  name: string
  description: string | null
  status: TaskLifecycleStatus
  sortOrder: number
}

export interface Task {
  id: string
  tenantId: string
  taskGroupId: string
  title: string
  description: string | null
  assigneeEmployeeId: string | null
  status: TaskStatus
  progressPercent: number
  priority: TaskPriority
  dueDate: string | null
  sortOrder: number
}
