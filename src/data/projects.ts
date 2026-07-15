export interface ProjectTask {
  id: string
  emoji: string
  title: string
  description?: string[]
}

export interface ProjectSection {
  title: string
  tasks: ProjectTask[]
}

export interface Project {
  slug: string
  label: string
  emoji: string
  sections: ProjectSection[]
}

export function projectTaskCount(project: Project) {
  return project.sections.reduce((sum, section) => sum + section.tasks.length, 0)
}

export const projects: Project[] = [

]
