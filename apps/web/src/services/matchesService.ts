import api from './api'
import type { MatchesResponse, CreateMatchRequest, UpdateMatchRequest } from '../types/match'

// 查詢參數介面
interface GetMatchesParams {
  seasonCode?: string
  myDeckMain?: string
  oppDeckMain?: string
  result?: 'W' | 'L'
  playOrder?: '先攻' | '後攻'
  dateFrom?: string
  dateTo?: string
}

// Matches API Service
export const matchesService = {
  // 查詢對局列表
  async getMatches(params?: GetMatchesParams): Promise<MatchesResponse> {
    const response = await api.get<MatchesResponse>('/matches', { params })
    return response.data
  },

  // 新增對局
  async createMatch(data: CreateMatchRequest): Promise<{ id: string; message: string }> {
    const response = await api.post('/matches', data)
    return response.data
  },

  // 更新對局
  async updateMatch(id: string, data: UpdateMatchRequest): Promise<{ message: string }> {
    const response = await api.patch(`/matches/${id}`, data)
    return response.data
  },

  // 刪除對局
  async deleteMatch(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/matches/${id}`)
    return response.data
  },
}
