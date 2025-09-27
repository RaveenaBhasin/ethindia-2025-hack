<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from './components/ui'
import BridgeModal from './components/BridgeModal.vue'
import { useBridgeModal } from './composables/useBridgeModal'

const { isModalOpen, openModal, closeModal, initializeModal } = useBridgeModal()

onMounted(() => {
  initializeModal()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-8 text-gray-900">
        Across Protocol Bridge
      </h1>
      <p class="text-gray-600 mb-8 max-w-md mx-auto">
        Bridge your assets across different test networks with ease.
      </p>
      <Button 
        variant="primary" 
        size="lg"
        @click="openModal"
        class="px-8 py-4 text-lg"
      >
        Open Bridge
      </Button>
    </div>

    <!-- Bridge Modal -->
    <BridgeModal 
      :is-open="isModalOpen" 
      @close="closeModal" 
    />
  </div> 
</template>
