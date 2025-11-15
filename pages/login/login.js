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

  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    // 先尝试从本地存储获取
    let userInfo = null
    let hasLogin = false
    
    try {
      const storedUserInfo = wx.getStorageSync('userInfo')
      if (storedUserInfo && storedUserInfo.nickName) {
        userInfo = storedUserInfo
        hasLogin = true
        // 同步到全局
        app.globalData.userInfo = userInfo
        app.globalData.hasLogin = true
      }
    } catch (error) {
      console.error('读取本地存储失败:', error)
    }
    
    // 如果本地没有，使用全局数据
    if (!hasLogin) {
      hasLogin = app.globalData.hasLogin
      userInfo = app.globalData.userInfo || app.globalData.mockUser
    }
    
    this.setData({
      hasLogin: hasLogin,
      userInfo: userInfo || {}
    })
  },

  // 处理登录按钮点击 - 使用 wx.login + 可选获取用户信息
  handleLoginClick(e) {
    console.log('登录按钮被点击', e)
    
    // 显示加载提示
    wx.showLoading({
      title: '正在登录...',
      mask: true
    })
    
    // 先调用 wx.login 获取 code
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          console.log('wx.login 成功，code:', loginRes.code)
          
          // 尝试获取用户信息（可选，如果失败也不影响登录）
          this.tryGetUserProfile(loginRes.code)
        } else {
          wx.hideLoading()
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none',
            duration: 2000
          })
        }
      },
      fail: (err) => {
        console.error('wx.login 失败', err)
        wx.hideLoading()
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 尝试获取用户信息（可选）
  tryGetUserProfile(code) {
    // 尝试使用 getUserProfile（如果可用）
    wx.getUserProfile({
      desc: '完善用户资料', // 缩短 desc 长度，确保不超过 30 字符
      success: (res) => {
        console.log('getUserProfile 成功', res)
        this.processLogin(res.userInfo, code)
      },
      fail: (err) => {
        console.log('getUserProfile 失败，使用默认用户信息', err)
        // 如果获取用户信息失败，使用默认信息继续登录
        const defaultUserInfo = {
          nickName: '音乐爱好者',
          avatarUrl: ''
        }
        this.processLogin(defaultUserInfo, code)
      }
    })
  },

  // 处理登录成功后的逻辑
  processLogin(userInfo, code) {
    // 确保有用户信息（如果没有则使用默认值）
    const finalUserInfo = userInfo || {
      nickName: '音乐爱好者',
      avatarUrl: ''
    }
    
    // TODO: 这里可以发送 code 到后端换取 openid
    // 目前先保存用户信息
    
    // 保存用户信息到全局和本地存储
    app.globalData.userInfo = finalUserInfo
    app.globalData.hasLogin = true
    
    // 保存 code（用于后续换取 openid）
    if (code) {
      app.globalData.loginCode = code
    }
    
    // 保存到本地存储
    try {
      wx.setStorageSync('userInfo', finalUserInfo)
      if (code) {
        wx.setStorageSync('loginCode', code)
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
    }
    
    // 更新页面数据
    this.setData({
      hasLogin: true,
      userInfo: finalUserInfo
    })

    wx.hideLoading()
    
    // 显示登录成功提示
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500
    })

    // 延迟跳转到首页
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }, 1500)
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

