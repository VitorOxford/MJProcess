<template>
  <v-container fluid class="pa-md-6 pa-2 fill-height">
    <div class="projects-container">
      <div class="projects-sidebar">
        <div class="sidebar-header">
          <h2 class="text-h6">Meus Projetos</h2>
          <v-btn icon="mdi-plus" variant="text" @click="openProjectModal()"></v-btn>
        </div>
        <v-list nav class="project-list">
          <v-list-item
            v-for="project in projects"
            :key="project.id"
            :active="activeProject?.id === project.id"
            @click="selectProject(project)"
            rounded="lg"
            class="mb-1"
          >
            <v-list-item-title class="font-weight-bold">{{ project.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </div>

      <div class="board-main-content">
        <div v-if="!activeProject && !loading" class="text-center d-flex flex-column align-center justify-center fill-height text-medium-emphasis">
          <v-icon size="64" class="mb-4">mdi-view-dashboard-outline</v-icon>
          <p class="text-h6">Selecione um projeto ou crie um novo para começar.</p>
        </div>
        <div v-else-if="loading" class="text-center d-flex align-center justify-center fill-height">
          <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
        </div>
        <div v-else-if="activeProject" class="board-view">
          <v-toolbar color="transparent">
            <v-toolbar-title class="text-h5 font-weight-bold">{{ activeProject.name }}</v-toolbar-title>
             <v-spacer></v-spacer>
            <v-btn variant="text" @click="addColumn">Adicionar Coluna</v-btn>
            <v-btn variant="text" @click="openProjectModal(activeProject)">Editar Projeto</v-btn>
          </v-toolbar>
          <div class="kanban-board">
            <draggable
                v-model="columns"
                group="columns"
                item-key="id"
                class="d-flex"
                @end="onColumnDragEnd"
              >
              <template #item="{ element: column }">
                <div class="kanban-column">
                  <div class="column-header">
                    <v-text-field
                      v-model="column.name"
                      @blur="updateColumnName(column)"
                      hide-details
                      variant="plain"
                      class="font-weight-bold"
                    ></v-text-field>
                    <v-btn icon="mdi-plus" variant="text" size="small" @click="openTaskModal(null, column.id)"></v-btn>
                  </div>
                  <draggable
                    v-model="column.tasks"
                    group="tasks"
                    item-key="id"
                    class="column-content"
                    @end="onTaskDragEnd($event, column.id)"
                  >
                    <template #item="{ element: task }">
                      <TaskCard :task="task" @edit="openTaskModal(task)" />
                    </template>
                  </draggable>
                </div>
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </div>

    <ProjectFormModal :show="showProjectModal" :project-data="selectedProject" @close="showProjectModal=false" @save="handleProjectSave"/>
    <TaskFormModal :show="showTaskModal" :task-data="selectedTask" :users="allUsers" @close="showTaskModal=false" @save="handleTaskSave"/>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import draggable from 'vuedraggable';
import TaskCard from '@/components/tasks/TaskCard.vue';
import TaskFormModal from '@/components/tasks/TaskFormModal.vue';
import ProjectFormModal from '@/components/projects/ProjectFormModal.vue'; // NOVO

// Types
type Profile = { id: string; full_name: string; avatar_url: string; };
type Task = { id: string; title: string; [key: string]: any; };
type Column = { id: string; name: string; position: number; tasks: Task[] };
type Project = { id: string; name: string; description: string | null; };

const userStore = useUserStore();
const projects = ref<Project[]>([]);
const activeProject = ref<Project | null>(null);
const columns = ref<Column[]>([]);
const allUsers = ref<Profile[]>([]);
const loading = ref(false);

const showProjectModal = ref(false);
const selectedProject = ref<Project | null>(null);
const showTaskModal = ref(false);
const selectedTask = ref<Task | null>(null);

// Methods
const fetchProjects = async () => {
  const { data } = await supabase.from('projects').select('*').order('created_at');
  projects.value = data || [];
  if (projects.value.length > 0) {
    await selectProject(projects.value[0]);
  }
};

const selectProject = async (project: Project) => {
  loading.value = true;
  activeProject.value = project;
  // Fetch columns for the project
  const { data: colsData } = await supabase.from('project_columns').select('*').eq('project_id', project.id).order('position');
  const projectColumns = colsData || [];
  // Fetch all tasks for the project
  const { data: tasksData } = await supabase.from('tasks').select('*, profiles:user_id(id, full_name, avatar_url)').eq('project_id', project.id);
  const projectTasks = tasksData || [];

  // Map tasks to their columns
  columns.value = projectColumns.map(col => ({
    ...col,
    tasks: projectTasks.filter(t => t.column_id === col.id).sort((a,b) => a.position - b.position)
  }));
  loading.value = false;
};

const onColumnDragEnd = async () => {
  columns.value.forEach(async (col, index) => {
    await supabase.from('project_columns').update({ position: index }).eq('id', col.id);
  });
};

const onTaskDragEnd = async (event: any, newColumnId: string) => {
    const { item, newIndex } = event;
    const taskId = item.dataset.id;
    // Update task's column and position
    await supabase.from('tasks').update({ column_id: newColumnId, position: newIndex }).eq('id', taskId);
    // Refresh the board to reflect order changes
    if (activeProject.value) await selectProject(activeProject.value);
};

const addColumn = async () => {
    if (!activeProject.value) return;
    const { data } = await supabase.from('project_columns').insert({
        project_id: activeProject.value.id,
        name: "Nova Coluna",
        position: columns.value.length
    }).select().single();
    if(data) columns.value.push({ ...data, tasks: [] });
};

const updateColumnName = async (column: Column) => {
    await supabase.from('project_columns').update({ name: column.name }).eq('id', column.id);
};

// Modal Handlers
const openProjectModal = (project: Project | null = null) => {
  selectedProject.value = project;
  showProjectModal.value = true;
};
const handleProjectSave = (project: Project) => {
    const index = projects.value.findIndex(p => p.id === project.id);
    if(index !== -1) projects.value[index] = project;
    else projects.value.push(project);
    selectProject(project);
    showProjectModal.value = false;
};

const openTaskModal = (task: Task | null = null, columnId: string | null = null) => {
  selectedTask.value = task ? { ...task, column_id: columnId || task.column_id } : { column_id: columnId };
  showTaskModal.value = true;
};
const handleTaskSave = async () => {
    if (activeProject.value) {
        await selectProject(activeProject.value);
    }
    showTaskModal.value = false;
};

onMounted(async () => {
  await fetchProjects();
  const { data: usersData } = await supabase.from('profiles').select('id, full_name, avatar_url');
  allUsers.value = usersData || [];
});
</script>

<style scoped lang="scss">
.projects-container {
  display: flex;
  height: calc(100vh - 120px); // Adjust based on your layout padding
  background-color: rgba(20, 20, 25, 0.75);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.125);
  backdrop-filter: blur(20px);
}

.projects-sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    flex-shrink: 0;
  }
  .project-list {
    overflow-y: auto;
    flex-grow: 1;
  }
}

.board-main-content {
  flex-grow: 1;
  overflow: hidden;
  .board-view {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.kanban-board {
  display: flex; gap: 16px; overflow-x: auto; flex-grow: 1; padding: 0 16px 16px 16px;
}
.kanban-column {
  min-width: 320px; width: 320px;
  background-color: rgba(35, 35, 40, 0.7);
  border-radius: 12px;
  display: flex; flex-direction: column; height: 100%;
}
.column-header {
  padding: 8px 8px 8px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex; align-items: center;
}
.column-content {
  padding: 8px; flex-grow: 1; overflow-y: auto;
}
</style>
