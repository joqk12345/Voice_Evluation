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
    challengeProgress: 30
  },

  onLoad() {
    this.loadRecommendData()
  },

  onShow() {
    // 每次显示页面时刷新数据
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

  // 加载练习计划
  loadPracticePlans() {
    const history = app.globalData.mockHistory || []
    let metrics = { pitch: 70, rhythm: 70, volume: 70, timbre: 70 }
    
    if (history.length > 0) {
      const latest = history[0]
      metrics = {
        pitch: latest.pitch,
        rhythm: latest.rhythm,
        volume: latest.volume,
        timbre: latest.timbre
      }
    }
    
    const plans = getPracticePlan(metrics)
    const practicePlans = plans.map((plan, index) => {
      const icons = ['🎵', '🎼', '🔊', '🎤', '💪']
      return {
        ...plan,
        icon: icons[index] || '🎵'
      }
    })
    
    this.setData({
      practicePlans: practicePlans
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
    console.log('预约试听一对一声乐课')
    wx.showModal({
      title: '预约试听',
      content: '是否预约免费试听一对一声乐课？专业老师将根据您的评测结果提供个性化指导。',
      confirmText: '立即预约',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          // 这里可以跳转到预约页面或联系客服
          wx.showModal({
            title: '预约成功',
            content: '我们的客服将在24小时内联系您，安排试听时间。\n\n客服微信：VoiceTutor2024\n\n试听课程完全免费，让您体验专业声乐指导的魅力！',
            showCancel: false,
            confirmText: '我知道了'
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
