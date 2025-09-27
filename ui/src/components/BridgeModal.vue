<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click="handleBackdropClick"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
      
      <!-- Modal -->
      <div class="flex min-h-screen items-center justify-center p-4">
        <div
          ref="modalRef"
          class="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          @click.stop
        >
          <!-- Close button -->
          <button
            @click="close"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <X class="w-5 h-5" />
          </button>
          
          <!-- Bridge Interface -->
          <div class="p-6">
            <BridgeInterface />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import BridgeInterface from './BridgeInterface.vue'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const modalRef = ref<HTMLElement>()

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close()
  }
}

const close = () => {
  emit('close')
}

const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey)
})
</script>