import { z } from 'zod'

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const ASSIGNEE_ROLES = ['responsible', 'member'] as const
export type AssigneeRole = (typeof ASSIGNEE_ROLES)[number]

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で指定する')

/**
 * PostgreSQL の uuid 型（8-4-4-4-12 の十六進）を受け入れる。
 * Zod の `.uuid()` は RFC 版ビット（version/variant）を厳密に見るため、
 * 開発用シードの `bb000001-0000-0000-0000-000000000001` のような合法な PG uuid を拒否する。
 * DB 由来の ID はこのスキーマを使う。
 */
export const dbUuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'IDの形式が不正です')

export const createObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: dateStringSchema.optional(),
})
export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>

export const updateObjectiveSchema = z.object({
  objectiveId: dbUuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: dateStringSchema.optional(),
})
export type UpdateObjectiveInput = z.infer<typeof updateObjectiveSchema>

export const createMilestoneSchema = z.object({
  objectiveId: dbUuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: dateStringSchema.optional(),
})
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>

export const createTaskGroupSchema = z.object({
  milestoneId: dbUuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  goalSummary: z.string().max(200).optional(),
})
export type CreateTaskGroupInput = z.infer<typeof createTaskGroupSchema>

export const createSimpleTaskSchema = z.object({
  taskGroupId: dbUuidSchema,
  title: z.string().min(1).max(200),
  goalSummary: z.string().max(200).optional(),
  dueDate: dateStringSchema.optional(),
  priority: z.enum(TASK_PRIORITIES).default('normal'),
  responsibleEmployeeId: dbUuidSchema,
})
export type CreateSimpleTaskInput = z.infer<typeof createSimpleTaskSchema>

export const updateTaskStatusSchema = z.object({
  taskId: dbUuidSchema,
  status: z.enum(TASK_STATUSES),
})
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>

export const updateTaskProgressSchema = z.object({
  taskId: dbUuidSchema,
  progressPercent: z.number().int().min(0).max(100),
})
export type UpdateTaskProgressInput = z.infer<typeof updateTaskProgressSchema>

export const updateTaskBasicInfoSchema = z.object({
  taskId: dbUuidSchema,
  title: z.string().min(1).max(200),
  goalSummary: z.string().max(200).optional(),
  dueDate: dateStringSchema.optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
})
export type UpdateTaskBasicInfoInput = z.infer<typeof updateTaskBasicInfoSchema>

export const addTaskAssigneeSchema = z.object({
  taskId: dbUuidSchema,
  employeeId: dbUuidSchema,
  role: z.enum(ASSIGNEE_ROLES).default('member'),
})
export type AddTaskAssigneeInput = z.infer<typeof addTaskAssigneeSchema>

export const removeTaskAssigneeSchema = z.object({
  taskId: dbUuidSchema,
  employeeId: dbUuidSchema,
})
export type RemoveTaskAssigneeInput = z.infer<typeof removeTaskAssigneeSchema>

export const deleteTaskSchema = z.object({ taskId: dbUuidSchema })
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>

export const deleteObjectiveSchema = z.object({ objectiveId: dbUuidSchema })
export type DeleteObjectiveInput = z.infer<typeof deleteObjectiveSchema>

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
  goalSummary: string | null
  status: TaskLifecycleStatus
  sortOrder: number
}

export interface Task {
  id: string
  tenantId: string
  taskGroupId: string
  title: string
  description: string | null
  goalSummary: string | null
  createdByEmployeeId: string
  assigneeEmployeeIds: string[]
  responsibleEmployeeId: string | null
  memberEmployeeIds: string[]
  status: TaskStatus
  progressPercent: number
  priority: TaskPriority
  dueDate: string | null
  sortOrder: number
}

export const COMMENT_TYPES = ['report', 'advice', 'general', 'suggestion'] as const
export type CommentType = (typeof COMMENT_TYPES)[number]

export const createCommentSchema = z
  .object({
    taskId: dbUuidSchema.optional(),
    taskGroupId: dbUuidSchema.optional(),
    parentCommentId: dbUuidSchema.optional(),
    commentType: z.enum(COMMENT_TYPES),
    targetEmployeeId: dbUuidSchema.optional(),
    body: z.string().min(1).max(2000),
  })
  .refine(data => (data.taskId ? 1 : 0) + (data.taskGroupId ? 1 : 0) === 1, {
    message: 'taskId と taskGroupId はどちらか一方のみ指定する',
  })
  .refine(
    data =>
      !(['advice', 'suggestion', 'report', 'general'] as const).includes(
        data.commentType as 'advice' | 'suggestion' | 'report' | 'general'
      ) || Boolean(data.targetEmployeeId),
    { message: 'advice/suggestion/report/general には targetEmployeeId が必須' }
  )
export type CreateCommentInput = z.infer<typeof createCommentSchema>

export const updateCommentSchema = z.object({
  commentId: dbUuidSchema,
  body: z.string().min(1).max(2000),
})
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

export const deleteCommentSchema = z.object({
  commentId: dbUuidSchema,
})
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>

export const getTaskCommentsTargetSchema = z.union([
  z.object({ taskId: dbUuidSchema }),
  z.object({ taskGroupId: dbUuidSchema }),
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
  /** アドバイスの宛先従業員ID（comment_type='advice'のときのみ非null） */
  targetEmployeeId: string | null
  /** アドバイスの宛先氏名（employees.name が null の場合のフォールバック済み） */
  targetEmployeeName: string | null
  body: string
  createdAt: string
  updatedAt: string
}

export const createWorkLogSchema = z.object({
  taskId: dbUuidSchema,
  workDate: dateStringSchema,
  hours: z.number().positive().max(24),
  note: z.string().max(1000).optional(),
})
export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>

export const updateWorkLogSchema = z.object({
  workLogId: dbUuidSchema,
  workDate: dateStringSchema,
  hours: z.number().positive().max(24),
  note: z.string().max(1000).optional(),
})
export type UpdateWorkLogInput = z.infer<typeof updateWorkLogSchema>

export const deleteWorkLogSchema = z.object({
  workLogId: dbUuidSchema,
})
export type DeleteWorkLogInput = z.infer<typeof deleteWorkLogSchema>

export const getTaskWorkLogsTargetSchema = z.object({
  taskId: dbUuidSchema,
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
