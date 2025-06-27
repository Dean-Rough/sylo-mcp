import { makeAPICall } from '@/lib/nango/client'

export interface AsanaTask {
  gid: string
  name: string
  completed: boolean
  due_date?: string
  assignee?: {
    gid: string
    name: string
  }
  projects: Array<{
    gid: string
    name: string
  }>
  tags: Array<{
    gid: string
    name: string
  }>
  created_at: string
  modified_at: string
}

export interface AsanaProject {
  gid: string
  name: string
  color: string
  completed: boolean
  current_status?: {
    color: string
    text: string
    title: string
  }
  due_date?: string
  team?: {
    gid: string
    name: string
  }
}

export class AsanaService {
  private connectionId: string

  constructor(connectionId: string) {
    this.connectionId = connectionId
  }

  async getTasks(limit = 20): Promise<AsanaTask[]> {
    try {
      const response = await makeAPICall(
        'asana',
        this.connectionId,
        `/api/1.0/tasks?limit=${limit}&completed_since=now&opt_fields=name,completed,due_date,assignee.name,projects.name,tags.name,created_at,modified_at`,
        'GET'
      )

      return response.data || []
    } catch (error) {
      console.error('Failed to fetch Asana tasks:', error)
      throw new Error('Failed to fetch tasks from Asana')
    }
  }

  async getMyTasks(): Promise<AsanaTask[]> {
    try {
      // Get current user first
      const userResponse = await makeAPICall('asana', this.connectionId, '/api/1.0/users/me', 'GET')

      const userId = userResponse.data.gid

      const response = await makeAPICall(
        'asana',
        this.connectionId,
        `/api/1.0/tasks?assignee=${userId}&completed_since=now&opt_fields=name,completed,due_date,projects.name,tags.name,created_at,modified_at`,
        'GET'
      )

      return response.data || []
    } catch (error) {
      console.error('Failed to fetch my Asana tasks:', error)
      return []
    }
  }

  async getProjects(limit = 20): Promise<AsanaProject[]> {
    try {
      const response = await makeAPICall(
        'asana',
        this.connectionId,
        `/api/1.0/projects?limit=${limit}&opt_fields=name,color,completed,current_status,due_date,team.name`,
        'GET'
      )

      return response.data || []
    } catch (error) {
      console.error('Failed to fetch Asana projects:', error)
      throw new Error('Failed to fetch projects from Asana')
    }
  }

  async getUpcomingTasks(): Promise<AsanaTask[]> {
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 7) // Next 7 days
      const dateString = tomorrow.toISOString().split('T')[0]

      const response = await makeAPICall(
        'asana',
        this.connectionId,
        `/api/1.0/tasks?due_date.before=${dateString}&completed_since=now&opt_fields=name,completed,due_date,assignee.name,projects.name,tags.name`,
        'GET'
      )

      return response.data || []
    } catch (error) {
      console.error('Failed to fetch upcoming Asana tasks:', error)
      return []
    }
  }

  async getTaskStats(): Promise<{
    total: number
    completed: number
    overdue: number
    dueToday: number
    upcoming: number
  }> {
    try {
      const [myTasks, upcomingTasks] = await Promise.all([
        this.getMyTasks(),
        this.getUpcomingTasks(),
      ])

      const today = new Date().toISOString().split('T')[0]
      const now = new Date()

      const completed = myTasks.filter(task => task.completed).length
      const overdue = myTasks.filter(
        task => task.due_date && task.due_date < today && !task.completed
      ).length
      const dueToday = myTasks.filter(task => task.due_date === today && !task.completed).length

      return {
        total: myTasks.length,
        completed,
        overdue,
        dueToday,
        upcoming: upcomingTasks.length,
      }
    } catch (error) {
      console.error('Failed to get Asana task stats:', error)
      return {
        total: 0,
        completed: 0,
        overdue: 0,
        dueToday: 0,
        upcoming: 0,
      }
    }
  }

  async createTask(
    name: string,
    projectGid?: string,
    dueDate?: string,
    notes?: string
  ): Promise<AsanaTask | null> {
    try {
      const taskData: any = {
        name,
        notes,
      }

      if (projectGid) {
        taskData.projects = [projectGid]
      }

      if (dueDate) {
        taskData.due_date = dueDate
      }

      const response = await makeAPICall('asana', this.connectionId, '/api/1.0/tasks', 'POST', {
        data: taskData,
      })

      return response.data
    } catch (error) {
      console.error('Failed to create Asana task:', error)
      return null
    }
  }
}
