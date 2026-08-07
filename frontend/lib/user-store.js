"use client"

// User store for managing user profile data
const USER_STORAGE_KEY = "opti_agent_user"

export function saveUser(userData) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
  }
}

export function getUser() {
  if (typeof window !== "undefined") {
    try {
      const userData = localStorage.getItem(USER_STORAGE_KEY)
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      console.error("Error getting user data:", error)
      return null
    }
  }
  return null
}

export function updateUser(updates) {
  if (typeof window !== "undefined") {
    const currentUser = getUser()
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates }
      saveUser(updatedUser)
      return updatedUser
    }
  }
  return null
}

export function clearUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_STORAGE_KEY)
  }
} 