// pages/recommend/recommend.js
const app = getApp()
const { getRecommendedSongs, getPracticePlan } = require('../../utils/util.js')

Page({
  data: {
    userLevel: '初级',
    levelProgress: 65,
    practicePlans: [],
    recommendedSongs: [],
    vocalTips: [],
    dailyChallenge: {},
    challengeProgress: 30,
    practiceData: null, // 从结果页面传递的评测数据
    hasPracticeData: false // 是否有传递的评测数据
  },

  onLoad(options) {
    // 接收从结果页面传递的评测数据
    if (options.data) {
      try {
        const practiceData = JSON.parse(decodeURIComponent(options.data))
        this.setData({
          practiceData: practiceData,
          hasPracticeData: true
        })
      } catch (error) {
        console.error('解析练习数据失败:', error)
        this.setData({
          hasPracticeData: false
        })
      }
    } else {
      this.setData({
        hasPracticeData: false
      })
    }
    
    this.loadRecommendData()
  },

  onShow() {
    // 每次显示页面时刷新数据（但保留传递的练习数据）
    this.loadRecommendData()
  },

  // 加载推荐数据
  loadRecommendData() {
    this.loadUserLevel()
    this.loadPracticePlans()
    this.loadRecommendedSongs()
    this.loadVocalTips()
    this.loadDailyChallenge()
  },

  // 加载用户水平
  loadUserLevel() {
    const user = app.globalData.mockUser
    const history = app.globalData.mockHistory || []
    
    let level = '初级'
    let progress = 0
    
    if (history.length > 0) {
      const latestScore = history[0].score
      if (latestScore >= 90) {
        level = '高级'
        progress = 100
      } else if (latestScore >= 80) {
        level = '中级'
        progress = 80
      } else if (latestScore >= 70) {
        level = '初级'
        progress = 70
      } else {
        level = '入门'
        progress = 50
      }
    }
    
    this.setData({
      userLevel: level,
      levelProgress: progress
    })
  },

  // 加载练习计划（优先显示针对低分板块的练习）
  loadPracticePlans() {
    let metrics = { pitch: 70, rhythm: 70, volume: 70, timbre: 70 }
    let weakAreas = []
    
    // 优先使用从结果页面传递的数据
    if (this.data.hasPracticeData && this.data.practiceData) {
      const practiceData = this.data.practiceData
      metrics = practiceData.metrics || metrics
      weakAreas = practiceData.weakAreas || []
    } else {
      // 如果没有传递数据，从历史记录获取
      const history = app.globalData.mockHistory || []
      if (history.length > 0) {
        const latest = history[0]
        metrics = {
          pitch: latest.pitch,
          rhythm: latest.rhythm,
          volume: latest.volume,
          timbre: latest.timbre
        }
        
        // 找出低分板块
        const metricsList = [
          { name: '音准', score: latest.pitch, icon: '🎵' },
          { name: '节奏', score: latest.rhythm, icon: '🎼' },
          { name: '音量', score: latest.volume, icon: '🔊' },
          { name: '音色', score: latest.timbre, icon: '🎤' }
        ]
        weakAreas = metricsList
          .filter(item => item.score < 70)
          .sort((a, b) => a.score - b.score)
      }
    }
    
    const plans = getPracticePlan(metrics)
    
    // 如果有需要重点练习的板块，优先显示这些板块的练习
    let practicePlans = plans.map((plan, index) => {
      const icons = ['🎵', '🎼', '🔊', '🎤', '💪']
      return {
        ...plan,
        icon: icons[index] || '🎵',
        priority: false
      }
    })
    
    // 如果有低分板块，将相关练习提到前面
    if (weakAreas.length > 0) {
      const areaNameMap = {
        '音准': '音准',
        '节奏': '节奏',
        '音量': '气息',
        '音色': '共鸣'
      }
      
      // 找出需要优先显示的练习
      const priorityPlans = []
      const normalPlans = []
      
      practicePlans.forEach(plan => {
        const isPriority = weakAreas.some(area => {
          const areaName = areaNameMap[area.name] || area.name
          return plan.type.includes(areaName) || plan.description.includes(areaName)
        })
        
        if (isPriority) {
          priorityPlans.push({
            ...plan,
            priority: true,
            weakArea: weakAreas.find(area => {
              const areaName = areaNameMap[area.name] || area.name
              return plan.type.includes(areaName) || plan.description.includes(areaName)
            })
          })
        } else {
          normalPlans.push(plan)
        }
      })
      
      // 将优先练习放在前面
      practicePlans = [...priorityPlans, ...normalPlans]
    }
    
    this.setData({
      practicePlans: practicePlans,
      weakAreas: weakAreas // 保存低分板块信息，供页面显示使用
    })
  },

  // 加载推荐歌曲
  loadRecommendedSongs() {
    const history = app.globalData.mockHistory || []
    const latestScore = history.length > 0 ? history[0].score : 70
    const userLevel = this.data.userLevel
    
    const songs = getRecommendedSongs(userLevel, latestScore)
    this.setData({
      recommendedSongs: songs
    })
  },

  // 加载声乐技巧
  loadVocalTips() {
    const tips = [
      {
        icon: '🎵',
        title: '音准练习技巧',
        content: '使用调音器辅助练习，从简单的音阶开始，逐步提高难度。注意听音辨音，培养音感。',
        hasVideo: true
      },
      {
        icon: '🎼',
        title: '节奏感训练',
        content: '跟着节拍器练习，从简单的4/4拍开始，逐步学习复杂的节拍型。可以用手打拍子辅助。',
        hasVideo: true
      },
      {
        icon: '🔊',
        title: '气息控制方法',
        content: '练习腹式呼吸，保持气息稳定。可以通过吹蜡烛、数数字等方式练习气息控制。',
        hasVideo: false
      },
      {
        icon: '🎤',
        title: '共鸣技巧',
        content: '学会运用头腔、胸腔共鸣，让声音更加圆润饱满。可以通过哼鸣练习找到共鸣点。',
        hasVideo: true
      }
    ]
    
    this.setData({
      vocalTips: tips
    })
  },

  // 加载每日挑战
  loadDailyChallenge() {
    const challenges = [
      {
        name: '音准挑战',
        description: '连续唱准10个音阶',
        reward: 50
      },
      {
        name: '节奏挑战',
        description: '跟着节拍器唱完一首歌',
        reward: 40
      },
      {
        name: '气息挑战',
        description: '一口气唱完30秒',
        reward: 60
      }
    ]
    
    // 随机选择一个挑战
    const randomIndex = Math.floor(Math.random() * challenges.length)
    const challenge = challenges[randomIndex]
    
    this.setData({
      dailyChallenge: challenge
    })
  },

  // 开始练习
  startPractice(e) {
    const type = e.currentTarget.dataset.type
    wx.showModal({
      title: '开始练习',
      content: `确定要开始${type}吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '练习功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 设置提醒
  setReminder(e) {
    const type = e.currentTarget.dataset.type
    wx.showModal({
      title: '设置提醒',
      content: `为${type}设置每日练习提醒？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '提醒设置成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 试听歌曲
  previewSong(e) {
    const song = e.currentTarget.dataset.song
    wx.showModal({
      title: '试听歌曲',
      content: `试听《${song.name}》- ${song.artist}`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '试听功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 选择歌曲
  selectSong(e) {
    const song = e.currentTarget.dataset.song
    wx.showModal({
      title: '选择歌曲',
      content: `选择《${song.name}》进行评测？`,
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: `/pages/record/record?song=${encodeURIComponent(JSON.stringify(song))}`
          })
        }
      }
    })
  },

  // 观看视频
  watchVideo(e) {
    const tip = e.currentTarget.dataset.tip
    wx.showModal({
      title: '观看视频',
      content: `观看《${tip.title}》教学视频？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '视频功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 开始挑战
  startChallenge() {
    const challenge = this.data.dailyChallenge
    wx.showModal({
      title: '开始挑战',
      content: `确定要开始"${challenge.name}"吗？\n${challenge.description}`,
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/record/record?challenge=true'
          })
        }
      }
    })
  },

  // 预约试听一对一声乐课
  bookTutorClass() {
    const wechatId = 'chaojichangjiang'
    
    wx.showModal({
      title: '预约试听',
      content: '是否预约免费试听一对一声乐课？专业老师将根据您的评测结果提供个性化指导。',
      confirmText: '立即预约',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          // 复制微信号并提示
          wx.setClipboardData({
            data: wechatId,
            success: () => {
              wx.showModal({
                title: '微信号已复制',
                content: `客服微信号：${wechatId}\n\n✅ 微信号已复制到剪贴板\n\n📱 添加步骤：\n1. 返回微信主界面\n2. 点击右上角"+"号\n3. 选择"添加朋友"\n4. 点击"微信号/手机号"\n5. 粘贴并搜索\n6. 添加好友并发送"预约试听"\n\n🎁 试听课程完全免费！`,
                confirmText: '知道了',
                cancelText: '再次复制',
                success: (modalRes) => {
                  if (modalRes.cancel) {
                    // 再次复制
                    wx.setClipboardData({
                      data: wechatId,
                      success: () => {
                        wx.showToast({
                          title: '微信号已复制',
                          icon: 'success',
                          duration: 2000
                        })
                      },
                      fail: () => {
                        wx.showToast({
                          title: '复制失败，请手动输入',
                          icon: 'none',
                          duration: 2000
                        })
                      }
                    })
                  }
                }
              })
            },
            fail: () => {
              // 如果复制失败，显示微信号让用户手动复制
              wx.showModal({
                title: '预约试听',
                content: `客服微信号：${wechatId}\n\n请长按复制微信号，然后：\n1. 返回微信主界面\n2. 点击右上角"+"号\n3. 选择"添加朋友"\n4. 点击"微信号/手机号"\n5. 粘贴并搜索\n6. 添加好友并发送"预约试听"\n\n🎁 试听课程完全免费！`,
                confirmText: '知道了',
                cancelText: '复制微信号',
                success: (modalRes) => {
                  if (modalRes.cancel) {
                    // 尝试再次复制
                    wx.setClipboardData({
                      data: wechatId,
                      success: () => {
                        wx.showToast({
                          title: '微信号已复制',
                          icon: 'success',
                          duration: 2000
                        })
                      },
                      fail: () => {
                        wx.showToast({
                          title: '复制失败，请手动输入',
                          icon: 'none',
                          duration: 2000
                        })
                      }
                    })
                  }
                }
              })
            }
          })
        }
      }
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的个性化声乐练习计划',
      path: '/pages/recommend/recommend',
      imageUrl: '/images/share-recommend.png'
    }
  }
})
