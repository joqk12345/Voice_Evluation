// pages/index/index.js - 简化版，聚焦核心需求
const app = getApp()

Page({
  data: {
    recentResult: null,
    encourageMessage: ''
  },

  onLoad() {
    this.loadRecentResult()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadRecentResult()
  },

  // 加载最近评测结果
  loadRecentResult() {
    try {
      const history = app.globalData.mockHistory || []
      if (history && history.length > 0) {
        const recent = history[0] // 最新的评测结果
        const score = recent.score || 0
        let encourageMessage = ''
        if (score >= 80) {
          encourageMessage = '很棒！继续加油 💪'
        } else if (score >= 60) {
          encourageMessage = '不错，还有进步空间 🌱'
        } else {
          encourageMessage = '多练习，会越来越好的 ✨'
        }
        
        this.setData({
          recentResult: {
            score: score,
            date: recent.date,
            song: recent.song || '未知歌曲'
          },
          encourageMessage: encourageMessage
        })
      } else {
        // 如果没有历史记录，不显示结果
        this.setData({
          recentResult: null,
          encourageMessage: ''
        })
      }
    } catch (error) {
      console.error('加载最近评测结果失败:', error)
      this.setData({
        recentResult: null,
        encourageMessage: ''
      })
    }
  },

  // 开始评测 - 核心功能
  startEvaluation() {
    console.log('点击开始评测按钮')
    // record 页面在 tabBar 中，需要使用 switchTab
    wx.switchTab({
      url: '/pages/record/record',
      success: () => {
        console.log('跳转成功')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 查看历史记录
  viewHistory() {
    wx.switchTab({
      url: '/pages/history/history'
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '想知道自己唱得怎么样？来试试声乐评测',
      path: '/pages/index/index'
    }
  }
})