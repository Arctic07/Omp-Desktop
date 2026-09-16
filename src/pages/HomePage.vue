<script setup lang="ts">
import { Card, Empty, Space, Tag } from '@arco-design/web-vue'
</script>

<template>
  <section class="page-shell home-page" aria-labelledby="welcome-title">
    <Card class="welcome-card" :bordered="false">
      <Space direction="vertical" :size="18">
        <div>
          <Tag color="green">基础工作台已就绪</Tag>
          <h1 id="welcome-title" class="page-title">欢迎使用 OMP Desktop</h1>
          <p class="page-description">
            当前已完成桌面应用基础布局，核心功能将在后续接入。
          </p>
        </div>
        <Empty description="暂无可展示内容" />
      </Space>
    </Card>
  </section>
</template>
