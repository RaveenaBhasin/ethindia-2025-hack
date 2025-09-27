<script setup lang="ts">
interface Props {
  class?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="['rounded-lg border border-gray-200 bg-white shadow-sm', props.class]">
    <slot />
  </div>
</template>
