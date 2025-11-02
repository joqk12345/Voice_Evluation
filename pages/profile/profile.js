// pages/profile/profile.js
const app = getApp()
const { formatDate } = require('../../utils/util.js')

Page({
  data: {
    userInfo: {},
    achievements: []
  },

  onLoad() {
    this.loadUserInfo()
    this.loadAchievements()
  },

  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3
      })
    }
    // 每次显示页面时刷新数据
    this.loadUserInfo()
    this.loadAchievements()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.mockUser
    this.setData({
      userInfo: userInfo
    })
  },

  // 加载成就数据
  loadAchievements() {
    const history = app.globalData.mockHistory || []
    const achievements = []
    
    // 根据评测记录生成成就
    if (history.length >= 1) {
      achievements.push({
        icon: '🎤',
        name: '初次评测',
        description: '完成第一次声乐评测',
        date: '2024-01-15'
      })
    }
    
    if (history.length >= 5) {
      achievements.push({
        icon: '📈',
        name: '坚持不懈',
        description: '完成5次评测',
        date: '2024-01-20'
      })
    }
    
    if (history.length >= 10) {
      achievements.push({
        icon: '🏆',
        name: '评测达人',
        description: '完成10次评测',
        date: '2024-01-25'
      })
    }
    
    // 检查最高分成就
    const bestScore = Math.max(...history.map(item => item.score), 0)
    if (bestScore >= 90) {
      achievements.push({
        icon: '⭐',
        name: '声乐大师',
        description: '获得90分以上高分',
        date: formatDate(new Date())
      })
    } else if (bestScore >= 80) {
      achievements.push({
        icon: '🌟',
        name: '声乐高手',
        description: '获得80分以上高分',
        date: formatDate(new Date())
      })
    }
    
    // 检查连续评测成就
    if (history.length >= 3) {
      achievements.push({
        icon: '🔥',
        name: '连续评测',
        description: '连续完成多次评测',
        date: formatDate(new Date())
      })
    }
    
    this.setData({
      achievements: achievements.slice(0, 3) // 只显示最近3个成就
    })
  },

  // 编辑资料
  editProfile() {
    wx.showModal({
      title: '编辑资料',
      content: '完善您的个人信息',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '编辑功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 查看历史
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

  // 查看成就
  viewAchievements() {
    wx.showModal({
      title: '成就徽章',
      content: '查看您的所有成就徽章',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '成就功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 查看设置
  viewSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  // 查看帮助
  viewHelp() {
    wx.showModal({
      title: '帮助与反馈',
      content: '获取使用帮助或提交反馈',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '帮助功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 查看关于
  viewAbout() {
    wx.showModal({
      title: '关于我们',
      content: '声乐评测小程序 v1.0\n\n帮助您发现声音之美，提升声乐水平。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          app.globalData.hasLogin = false
          app.globalData.userInfo = null
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 2000
          })
          
          // 跳转到登录页面
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            })
          }, 2000)
        }
      }
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '声乐评测 - 发现你的声音之美',
      path: '/pages/index/index',
      imageUrl: '/images/share-profile.png'
    }
  }
})
