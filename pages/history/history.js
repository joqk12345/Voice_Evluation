// pages/history/history.js
const app = getApp()
const { formatDate } = require('../../utils/util.js')

Page({
  data: {
    historyList: [],
    totalTests: 0,
    bestScore: 0,
    averageScore: 0,
    improvement: 0,
    trendData: []
  },

  onLoad() {
    this.loadHistoryData()
  },

  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
    // 每次显示页面时刷新数据
    this.loadHistoryData()
  },

  // 加载历史数据
  loadHistoryData() {
    const history = app.globalData.mockHistory || []
    
    this.setData({
      historyList: history
    })
    
    this.calculateStats(history)
    this.generateTrendData(history)
  },

  // 计算统计数据
  calculateStats(history) {
    if (history.length === 0) {
      this.setData({
        totalTests: 0,
        bestScore: 0,
        averageScore: 0,
        improvement: 0
      })
      return
    }

    const totalTests = history.length
    const bestScore = Math.max(...history.map(item => item.score))
    const averageScore = Math.round(history.reduce((sum, item) => sum + item.score, 0) / totalTests)
    
    // 计算进步幅度（最新分数 - 最早分数）
    let improvement = 0
    if (history.length > 1) {
      const latestScore = history[0].score
      const earliestScore = history[history.length - 1].score
      improvement = latestScore - earliestScore
    }

    this.setData({
      totalTests: totalTests,
      bestScore: bestScore,
      averageScore: averageScore,
      improvement: improvement
    })
  },

  // 生成趋势数据
  generateTrendData(history) {
    if (history.length < 2) {
      this.setData({
        trendData: []
      })
      return
    }

    // 取最近10条记录
    const recentHistory = history.slice(0, 10).reverse()
    const maxScore = Math.max(...recentHistory.map(item => item.score))
    
    const trendData = recentHistory.map(item => {
      const height = (item.score / maxScore) * 200 // 最大高度200rpx
      return {
        score: item.score,
        height: Math.max(height, 20), // 最小高度20rpx
        date: item.date.split('-').slice(1).join('/') // 只显示月/日
      }
    })

    this.setData({
      trendData: trendData
    })
  },

  // 查看详情
  viewDetail(e) {
    const item = e.currentTarget.dataset.item
    // 跳转到结果页面，传递数据
    wx.navigateTo({
      url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(item))}`
    })
  },

  // 分享记录
  shareRecord(e) {
    const item = e.currentTarget.dataset.item
    const shareData = {
      title: `我的声乐评测记录 - ${item.date} 得分：${item.score}分`,
      path: '/pages/index/index',
      imageUrl: '/images/share-record.png'
    }
    
    return shareData
  },

  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评测记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteRecordById(id)
        }
      }
    })
  },

  // 根据ID删除记录
  deleteRecordById(id) {
    const history = app.globalData.mockHistory || []
    const index = history.findIndex(item => item.id === id)
    
    if (index !== -1) {
      history.splice(index, 1)
      app.globalData.mockHistory = history
      
      // 重新加载数据
      this.loadHistoryData()
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
    }
  },

  // 开始第一次评测
  startFirstTest() {
    wx.switchTab({
      url: '/pages/record/record'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadHistoryData()
    wx.stopPullDownRefresh()
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的声乐评测历史',
      path: '/pages/history/history',
      imageUrl: '/images/share-history.png'
    }
  }
})
