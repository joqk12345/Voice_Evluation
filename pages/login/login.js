// pages/login/login.js
const app = getApp()

Page({
  data: {
    hasLogin: false,
    userInfo: {}
  },

  onLoad() {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const hasLogin = app.globalData.hasLogin
    const userInfo = app.globalData.userInfo || app.globalData.mockUser
    
    this.setData({
      hasLogin: hasLogin,
      userInfo: userInfo
    })
  },

  // 获取用户信息
  getUserProfile(e) {
    if (e.detail.userInfo) {
      // 用户同意授权
      const userInfo = e.detail.userInfo
      
      // 保存用户信息到全局
      app.globalData.userInfo = userInfo
      app.globalData.hasLogin = true
      
      // 更新本地数据
      this.setData({
        hasLogin: true,
        userInfo: userInfo
      })

      // 显示登录成功提示
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 2000
      })

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 2000)
    } else {
      // 用户拒绝授权
      wx.showToast({
        title: '需要授权才能使用',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 完善资料
  completeProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 显示隐私政策
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私保护，所有录音数据仅用于个人评测，不会外泄。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示用户协议
  showTerms() {
    wx.showModal({
      title: '用户协议',
      content: '使用本小程序即表示您同意相关服务条款。',
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})

