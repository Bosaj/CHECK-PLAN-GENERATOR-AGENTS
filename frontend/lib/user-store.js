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

const USERS_LIST_KEY = "opti_agent_users"

// Login/register both need the *same* userId across sessions for a given email,
// otherwise every previously created agent/execution (filtered by userId) becomes
// invisible the next time that email logs in. Reuses the id from a prior
// registration/login for that email instead of minting a new one each time.
export function findOrCreateUserByEmail(email, extra = {}) {
  if (typeof window === "undefined") return null

  let users = []
  try {
    users = JSON.parse(localStorage.getItem(USERS_LIST_KEY) || "[]")
  } catch (error) {
    console.error("Error reading users list:", error)
  }

  const normalizedEmail = email.trim().toLowerCase()
  const existing = users.find((u) => u.email?.toLowerCase() === normalizedEmail)
  if (existing) {
    const updated = { ...existing, ...extra, email: existing.email }
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users.map((u) => (u === existing ? updated : u))))
    return updated
  }

  const created = { id: "user-" + Date.now(), email: normalizedEmail, ...extra }
  localStorage.setItem(USERS_LIST_KEY, JSON.stringify([...users, created]))
  return created
}