import axios from 'axios'

// 建立 axios 實例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 請求攔截器（可以加入 token 等）
api.interceptors.request.use(
  (config) => {
    // 未來可以在這裡加入 auth token
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 回應攔截器（統一處理錯誤）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
