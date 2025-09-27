import { ref, readonly } from 'vue'

const isModalOpen = ref(false)

// Check localStorage on initialization
const getStoredModalState = () => {
  try {
    return localStorage.getItem('bridgeModalOpen') === 'true'
  } catch {
    return false
  }
}

// Store modal state in localStorage  
const setStoredModalState = (isOpen: boolean) => {
  try {
    localStorage.setItem('bridgeModalOpen', String(isOpen))
  } catch {
    // Handle localStorage errors gracefully
  }
}

export function useBridgeModal() {
  // Initialize modal state from localStorage on first use
  const initializeModal = () => {
    isModalOpen.value = getStoredModalState()
    if (isModalOpen.value) {
      document.body.style.overflow = 'hidden'
    }
  }

  const openModal = () => {
    isModalOpen.value = true
    setStoredModalState(true)
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
  }

  const closeModal = () => {
    isModalOpen.value = false
    setStoredModalState(false)
    // Restore body scroll when modal is closed
    document.body.style.overflow = ''
  }

  const toggleModal = () => {
    if (isModalOpen.value) {
      closeModal()
    } else {
      openModal()
    }
  }

  return {
    isModalOpen: readonly(isModalOpen),
    openModal,
    closeModal,
    toggleModal,
    initializeModal
  }
}