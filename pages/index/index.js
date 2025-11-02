// pages/index/index.js
const app = getApp()

Page({
  data: {
    recentResult: {
      score: 85,
      date: '2024-01-15',
      song: '小星星'
    },
    challengeProgress: 2,
    challengeProgressPercent: 40,
    achievementStats: {
      unlockedCount: 8,
      totalCount: 20,
      completionRate: 40
    },
    recentBadges: [
      { id: 1, emoji: '🎵', unlocked: true },
      { id: 4, emoji: '🥁', unlocked: true },
      { id: 6, emoji: '🎤', unlocked: true },
      { id: 8, emoji: '💝', unlocked: true },
      { id: 9, emoji: '🎯', unlocked: true },
      { id: 13, emoji: '📤', unlocked: true },
      { id: 17, emoji: '🎪', unlocked: true },
      { id: 2, emoji: '🎯', unlocked: false },
      { id: 3, emoji: '👑', unlocked: false },
      { id: 5, emoji: '⚡', unlocked: false }
    ]
  },

  onLoad() {
    console.log('首页加载')
    this.loadRecentResult()
    this.loadChallengeProgress()
    this.loadAchievementStats()
  },

  onShow() {
    console.log('首页显示')
    // 每次显示页面时刷新数据
    this.loadRecentResult()
    this.loadChallengeProgress()
    this.loadAchievementStats()
  },

  // 加载最近评测结果
  loadRecentResult() {
    try {
      const history = app.globalData.mockHistory || []
      if (history && history.length > 0) {
        const recent = history[0] // 最新的评测结果
        this.setData({
          recentResult: {
            score: recent.score,
            date: recent.date,
            song: recent.song
          }
        })
        console.log('最近评测结果加载成功:', recent)
      } else {
        // 如果没有历史记录，设置默认值
        this.setData({
          recentResult: {
            score: 85,
            date: '2024-01-15',
            song: '小星星'
          }
        })
      }
    } catch (error) {
      console.error('加载最近评测结果失败:', error)
    }
  },

  // 加载挑战进度
  loadChallengeProgress() {
    try {
      // 模拟从本地存储或服务器获取挑战进度
      const challengeData = wx.getStorageSync('challengeProgress') || {
        todayProgress: 2,
        todayTotal: 5
      }
      
      const progressPercent = Math.round((challengeData.todayProgress / challengeData.todayTotal) * 100)
      
      this.setData({
        challengeProgress: challengeData.todayProgress,
        challengeProgressPercent: progressPercent
      })
      
      console.log('挑战进度加载成功:', challengeData)
    } catch (error) {
      console.error('加载挑战进度失败:', error)
      // 设置默认值
      this.setData({
        challengeProgress: 2,
        challengeProgressPercent: 40
      })
    }
  },

  // 开始完整评测
  startEvaluation() {
    console.log('开始完整评测')
    wx.navigateTo({
      url: '/pages/record/record'
    })
  },

  // 开始快速评测
  startQuickTest(e) {
    const type = e.currentTarget.dataset.type
    console.log('开始快速评测:', type)
    wx.navigateTo({
      url: `/pages/record/record?type=${type}`
    })
  },

  // 开始专业评测
  startProEvaluation() {
    console.log('开始专业评测')
    wx.showModal({
      title: '专业深度评测',
      content: '专业评测包含：\n• AI+专家双重分析\n• 音域详细分析\n• 个性化技巧指导\n• 完整改进方案\n\n价格：¥29（原价¥59）',
      confirmText: '立即购买',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          this.payForProEvaluation()
        }
      }
    })
  },

  // 支付专业评测
  payForProEvaluation() {
    // 跳转到支付页面
    wx.navigateTo({
      url: '/pages/payment/payment?service=pro_evaluation&price=29'
    })
  },

  // 查看历史记录
  viewHistory() {
    wx.switchTab({
      url: '/pages/history/history'
    })
  },

  // 查看推荐
  viewRecommend() {
    wx.navigateTo({
      url: '/pages/recommend/recommend'
    })
  },

  // 查看个人中心
  viewProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  // 分享最近评测结果
  shareRecentResult() {
    if (!this.data.recentResult) {
      wx.showToast({
        title: '暂无评测结果',
        icon: 'none'
      })
      return
    }

    // 构建评测结果数据
    const resultData = {
      score: this.data.recentResult.score,
      pitch: this.data.recentResult.pitch || 85,
      rhythm: this.data.recentResult.rhythm || 82,
      timbre: this.data.recentResult.timbre || 80,
      volume: this.data.recentResult.volume || 88,
      summary: this.data.recentResult.summary || '你的声音表现很不错！'
    }

    // 保存到全局数据
    app.globalData.currentEvaluationResult = resultData

    // 跳转到分享页面
    wx.navigateTo({
      url: '/pages/share/share'
    })
  },

  // 预约试听一对一声乐课
  bookTutorClass() {
    console.log('预约试听一对一声乐课')
    wx.showModal({
      title: '预约试听',
      content: '是否预约免费试听一对一声乐课？专业老师将为您提供个性化指导。',
      confirmText: '立即预约',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          // 这里可以跳转到预约页面或联系客服
          wx.showModal({
            title: '预约成功',
            content: '我们的客服将在24小时内联系您，安排试听时间。\n\n客服微信：VoiceTutor2024',
            showCancel: false,
            confirmText: '我知道了'
          })
        }
      }
    })
  },

  // 加载成就统计
  loadAchievementStats() {
    try {
      // 从本地存储加载成就数据
      const achievements = wx.getStorageSync('achievements') || []
      const unlockedCount = achievements.filter(a => a.unlocked).length
      const totalCount = achievements.length || 20
      const completionRate = Math.round((unlockedCount / totalCount) * 100)
      
      this.setData({
        achievementStats: {
          unlockedCount,
          totalCount,
          completionRate
        }
      })
      
      console.log('成就统计加载成功:', this.data.achievementStats)
    } catch (error) {
      console.error('加载成就统计失败:', error)
    }
  },

  // 查看每日挑战
  viewChallenge() {
    wx.navigateTo({
      url: '/pages/challenge/challenge'
    })
  },

  // 查看成就徽章
  viewAchievements() {
    wx.navigateTo({
      url: '/pages/achievements/achievements'
    })
  },

  // 查看设置
  viewSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '声乐评测 - 发现你的声音之美',
      path: '/pages/index/index'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '声乐评测 - 发现你的声音之美'
    }
  }
})