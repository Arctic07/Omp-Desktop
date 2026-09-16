<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppIcon } from '../components/icons'

import EmptyState from '../components/EmptyState.vue'
import PageHeader from '../components/PageHeader.vue'
import { useAppStore } from '../stores/app'

type PullFilter = 'open' | 'draft' | 'all'
type PullRequestRecord = { id: string; title: string; isDraft: boolean; author: string; branch: string }

const router = useRouter()
const store = useAppStore()
const filter = ref<PullFilter>('open')
const pulls = ref<PullRequestRecord[]>([])
const filterItems: readonly [PullFilter, string][] = [['open', '开放'], ['draft', '草稿'], ['all', '全部']]

const filteredPulls = computed(() => {
  if (filter.value === 'all') return pulls.value
  return pulls.value.filter((pull) => (filter.value === 'draft' ? pull.isDraft : !pull.isDraft))
})
const countFor = (value: PullFilter) => {
  if (value === 'all') return pulls.value.length
  return pulls.value.filter((pull) => (value === 'draft' ? pull.isDraft : !pull.isDraft)).length
}

async function startReview() {
  const projectPath = store.workspace.value?.path
  if (!projectPath) {
    await router.push('/')
    return
  }
  await store.createSession(projectPath)
  store.sendMessage('请检查当前项目的拉取请求与分支状态，并总结需要审查的内容。')
  await router.push('/')
}
</script>

<template>
  <section class="page-frame pulls-page" aria-labelledby="pulls-title">
    <PageHeader
      heading-id="pulls-title"
      title="拉取请求"
      description="集中查看需要审查的代码变更；连接后端数据后会显示当前项目的请求。"
    >
      <button class="btn btn-primary" type="button" @click="void startReview()">
        开始审查
      </button>
    </PageHeader>

    <div class="dest-toolbar">
      <div class="dest-filters" role="tablist" aria-label="拉取请求筛选">
        <button v-for="item in filterItems" :key="item[0]" class="dest-filter" :class="{ active: filter === item[0] }" type="button" role="tab" :aria-selected="filter === item[0]" @click="filter = item[0]">
          {{ item[1] }} <span class="dest-filter-count">{{ countFor(item[0]) }}</span>
        </button>
      </div>
    </div>

    <div v-if="filteredPulls.length === 0" class="page-empty-wrap">
      <EmptyState
        :title="store.workspace.value?.path ? '当前项目暂无拉取请求' : '还没有连接项目'"
        :description="store.workspace.value?.path ? '当前没有可展示的请求，审查会话仍可从工作台启动。' : '先在工作台选择或创建项目，再开始审查当前分支。'"
      >
        <template #icon><AppIcon name="git-pull-request-arrow" :size="20" aria-hidden="true" /></template>
        <template #action>
          <button class="btn btn-primary" type="button" @click="void startReview()">{{ store.workspace.value?.path ? '开始审查会话' : '去工作台' }}</button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="dest-list" role="list">
      <article v-for="pull in filteredPulls" :key="pull.id" class="dest-row" role="listitem">
        <div class="dest-row-icon"><AppIcon name="git-pull-request-arrow" :size="16" aria-hidden="true" /></div>
        <div class="dest-row-body">
          <div class="dest-row-title"><span>{{ pull.title }}</span><span class="dest-badge">{{ pull.isDraft ? '草稿' : '开放' }}</span></div>
          <div class="dest-row-meta">{{ pull.author }} · {{ pull.branch }}</div>
        </div>
        <div class="dest-row-actions"><button class="btn btn-secondary" type="button" @click="void startReview()">审查</button></div>
      </article>
    </div>
  </section>
</template>
