import { z } from 'zod'

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で指定する')

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
  assigneeEmployeeIds: z.array(z.string().uuid()).max(20).optional().default([]),
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

export const addTaskAssigneeSchema = z.object({
  taskId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type AddTaskAssigneeInput = z.infer<typeof addTaskAssigneeSchema>

export const removeTaskAssigneeSchema = z.object({
  taskId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type RemoveTaskAssigneeInput = z.infer<typeof removeTaskAssigneeSchema>

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
  assigneeEmployeeIds: string[]
  status: TaskStatus
  progressPercent: number
  priority: TaskPriority
  dueDate: string | null
  sortOrder: number
}

export const COMMENT_TYPES = ['report', 'advice', 'suggestion', 'general'] as const
export type CommentType = (typeof COMMENT_TYPES)[number]

export const createCommentSchema = z
  .object({
    taskId: z.string().uuid().optional(),
    taskGroupId: z.string().uuid().optional(),
    parentCommentId: z.string().uuid().optional(),
    commentType: z.enum(COMMENT_TYPES),
    body: z.string().min(1).max(2000),
  })
  .refine(data => (data.taskId ? 1 : 0) + (data.taskGroupId ? 1 : 0) === 1, {
    message: 'taskId と taskGroupId はどちらか一方のみ指定する',
  })
export type CreateCommentInput = z.infer<typeof createCommentSchema>

export const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().min(1).max(2000),
})
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

export const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
})
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>

export const getTaskCommentsTargetSchema = z.union([
  z.object({ taskId: z.string().uuid() }),
  z.object({ taskGroupId: z.string().uuid() }),
])
export type GetTaskCommentsTarget = z.infer<typeof getTaskCommentsTargetSchema>

export interface TaskComment {
  id: string
  tenantId: string
  taskId: string | null
  taskGroupId: string | null
  employeeId: string
  /** 投稿者の氏名（employees.name が null の場合のフォールバック済み） */
  employeeName: string
  parentCommentId: string | null
  commentType: CommentType
  body: string
  createdAt: string
  updatedAt: string
}

export const createWorkLogSchema = z.object({
  taskId: z.string().uuid(),
  workDate: dateStringSchema,
  hours: z.number().positive().max(24),
  note: z.string().max(1000).optional(),
})
export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>

export const updateWorkLogSchema = z.object({
  workLogId: z.string().uuid(),
  workDate: dateStringSchema,
  hours: z.number().positive().max(24),
  note: z.string().max(1000).optional(),
})
export type UpdateWorkLogInput = z.infer<typeof updateWorkLogSchema>

export const deleteWorkLogSchema = z.object({
  workLogId: z.string().uuid(),
})
export type DeleteWorkLogInput = z.infer<typeof deleteWorkLogSchema>

export const getTaskWorkLogsTargetSchema = z.object({
  taskId: z.string().uuid(),
})
export type GetTaskWorkLogsTarget = z.infer<typeof getTaskWorkLogsTargetSchema>

export interface TaskWorkLog {
  id: string
  tenantId: string
  taskId: string
  employeeId: string
  /** 記録者の氏名（employees.name が null の場合のフォールバック済み） */
  employeeName: string
  workDate: string
  hours: number
  note: string | null
  createdAt: string
  updatedAt: string
}
