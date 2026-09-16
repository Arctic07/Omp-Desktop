<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppIcon } from '../components/icons'

import EmptyState from '../components/EmptyState.vue'
import PageHeader from '../components/PageHeader.vue'
import { useAppStore } from '../stores/app'

type Cadence = 'manual' | 'hourly' | 'daily' | 'weekly'
type ScheduledTask = { id: string; title: string; prompt: string; cadence: Cadence; enabled: boolean; lastRunAt: string | null }

const router = useRouter()
const store = useAppStore()
const tasks = ref<ScheduledTask[]>([])
const title = ref('')
const prompt = ref('')
const cadence = ref<Cadence>('manual')
const canCreate = computed(() => prompt.value.trim().length > 0)
const cadenceLabel: Record<Cadence, string> = { manual: '手动', hourly: '每小时', daily: '每天', weekly: '每周' }

function createTask() {
  const taskPrompt = prompt.value.trim()
  if (!taskPrompt) return
  tasks.value = [
    ...tasks.value,
    {
      id: `local-${Date.now()}`,
      title: title.value.trim() || '未命名任务',
      prompt: taskPrompt,
      cadence: cadence.value,
      enabled: true,
      lastRunAt: null,
    },
  ]
  title.value = ''
  prompt.value = ''
  cadence.value = 'manual'
}

function toggleTask(id: string) {
  tasks.value = tasks.value.map((task) => (task.id === id ? { ...task, enabled: !task.enabled } : task))
}

function deleteTask(id: string) {
  tasks.value = tasks.value.filter((task) => task.id !== id)
}

async function runTask(task: ScheduledTask) {
  if (!task.enabled) return
  await store.createSession(store.workspace.value?.path)
  store.sendMessage(task.prompt)
  tasks.value = tasks.value.map((item) => (item.id === task.id ? { ...item, lastRunAt: new Date().toISOString() } : item))
  await router.push('/')
}
</script>

<template>
  <section class="page-frame scheduled-page" aria-labelledby="scheduled-title">
    <PageHeader heading-id="scheduled-title" title="计划任务" description="保存可重复运行的工作提示，并在需要时立即启动会话。" />

    <form class="dest-create" aria-labelledby="scheduled-create-title" @submit.prevent="createTask">
      <h2 id="scheduled-create-title" class="dest-create-title">创建计划任务</h2>
      <label class="field-label" for="scheduled-title">任务名称</label>
      <input id="scheduled-title" v-model="title" class="field-input" type="text" placeholder="例如：整理本周变更" />
      <label class="field-label" for="scheduled-prompt">任务提示</label>
      <textarea id="scheduled-prompt" v-model="prompt" class="field-textarea" rows="3" placeholder="描述会话启动时要完成的工作" />
      <div class="dest-create-controls">
        <label class="field-label" for="scheduled-cadence">运行频率</label>
        <select id="scheduled-cadence" v-model="cadence" class="field-select">
          <option value="manual">手动</option><option value="hourly">每小时</option><option value="daily">每天</option><option value="weekly">每周</option>
        </select>
        <button class="btn btn-primary" type="submit" :disabled="!canCreate"><AppIcon name="plus" :size="16" aria-hidden="true" />创建任务</button>
      </div>
    </form>

    <h2 class="dest-section-label">我的计划任务</h2>
    <EmptyState v-if="tasks.length === 0" title="还没有计划任务" description="填写上面的提示并创建任务，任务会保存在当前窗口中。">
      <template #icon><AppIcon name="clock" :size="20" aria-hidden="true" /></template>
    </EmptyState>
    <div v-else class="dest-list" role="list">
      <article v-for="task in tasks" :key="task.id" class="dest-row" role="listitem">
        <div class="dest-row-icon"><AppIcon name="clock" :size="16" aria-hidden="true" /></div>
        <div class="dest-row-body">
          <div class="dest-row-title"><span>{{ task.title }}</span><span class="dest-badge" :class="{ muted: !task.enabled }">{{ task.enabled ? '已启用' : '已停用' }}</span><span class="dest-badge">{{ cadenceLabel[task.cadence] }}</span></div>
          <div class="dest-row-meta">{{ task.prompt }}</div>
          <div class="dest-row-meta">上次运行：{{ task.lastRunAt ? new Date(task.lastRunAt).toLocaleString('zh-CN') : '尚未运行' }}</div>
        </div>
        <div class="dest-row-actions">
          <button class="btn btn-primary" type="button" :disabled="!task.enabled" @click="void runTask(task)"><AppIcon name="play" :size="16" aria-hidden="true" />运行</button>
          <button class="btn btn-secondary" type="button" @click="toggleTask(task.id)">{{ task.enabled ? '停用' : '启用' }}</button>
          <button class="icon-btn" type="button" aria-label="删除任务" title="删除任务" @click="deleteTask(task.id)"><AppIcon name="trash-2" :size="16" aria-hidden="true" /></button>
        </div>
      </article>
    </div>
  </section>
</template>
