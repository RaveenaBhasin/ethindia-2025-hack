<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

interface Option {
  value: any
  label: string
  icon?: string
}

interface Props {
  modelValue?: any
  options: Option[]
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: 'Select an option'
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const isOpen = ref(false)
const selectRef = ref<HTMLElement>()

const selectedOption = computed(() => 
  props.options.find(opt => opt.value === props.modelValue)
)

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="selectRef" class="relative">
    <button
      type="button"
      :disabled="disabled"
      class="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      @click="toggleDropdown"
    >
      <div class="flex items-center gap-2">
        <img 
          v-if="selectedOption?.icon" 
          :src="selectedOption.icon" 
          :alt="selectedOption.label"
          class="w-5 h-5 rounded-full object-cover"
        />
        <span :class="{ 'text-gray-500': !selectedOption }">
          {{ selectedOption?.label || placeholder }}
        </span>
      </div>
      <ChevronDown class="w-4 h-4 text-gray-500" :class="{ 'rotate-180': isOpen }" />
    </button>
    
    <div
      v-if="isOpen"
      class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 text-sm shadow-lg"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
        @click="selectOption(option)"
      >
        <img 
          v-if="option.icon" 
          :src="option.icon" 
          :alt="option.label"
          class="w-5 h-5 rounded-full object-cover"
        />
        <span>{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>
