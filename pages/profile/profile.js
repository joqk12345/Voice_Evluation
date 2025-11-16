// pages/profile/profile.js
const app = getApp()
const { formatDate } = require('../../utils/util.js')

Page({
  data: {
    userInfo: {},
    achievements: [],
    isEditingNickname: false
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
    // 优先从本地存储获取
    let userInfo = null
    try {
      const storedUserInfo = wx.getStorageSync('userInfo')
      if (storedUserInfo && storedUserInfo.nickName) {
        userInfo = storedUserInfo
      }
    } catch (error) {
      console.error('读取用户信息失败:', error)
    }
    
    // 如果本地没有，使用全局数据或模拟数据
    if (!userInfo) {
      userInfo = app.globalData.userInfo || app.globalData.mockUser
    }
    
    // 确保有必要的字段
    if (!userInfo) {
      userInfo = {
        nickName: '音乐爱好者',
        avatarUrl: '',
        level: '初级',
        totalTests: 0,
        bestScore: 0
      }
    }
    
    this.setData({
      userInfo: userInfo
    })
    
    // 同步到全局
    app.globalData.userInfo = userInfo
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

  // 头像按钮点击（降级方案：如果 chooseAvatar 不支持，使用传统方式）
  onAvatarButtonTap(e) {
    console.log('头像按钮被点击', e)
    // 注意：如果 open-type="chooseAvatar" 不支持，这个事件会触发
    // 但通常 chooseAvatar 会先触发，所以这里主要是作为备用
  },

  // 选择图片作为头像（降级方案）
  chooseImageAsAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        console.log('选择图片成功:', tempFilePath)
        
        // 更新头像
        const userInfo = {
          ...this.data.userInfo,
          avatarUrl: tempFilePath
        }
        
        this.saveUserInfo(userInfo)
        
        wx.showToast({
          title: '头像已更新',
          icon: 'success',
          duration: 1500
        })
      },
      fail: (err) => {
        console.error('选择图片失败:', err)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

  // 选择头像 - 使用微信头像昵称填写能力
  onChooseAvatar(e) {
    console.log('选择头像回调', e)
    
    if (!e || !e.detail) {
      console.error('选择头像回调数据异常:', e)
      // 如果 chooseAvatar 失败，使用降级方案
      this.chooseImageAsAvatar()
      return
    }
    
    const { avatarUrl } = e.detail
    
    if (!avatarUrl) {
      console.warn('未获取到头像URL')
      // 如果未获取到头像，使用降级方案
      this.chooseImageAsAvatar()
      return
    }
    
    console.log('获取到头像URL:', avatarUrl)
    
    // 更新头像
    const userInfo = {
      ...this.data.userInfo,
      avatarUrl: avatarUrl
    }
    
    this.saveUserInfo(userInfo)
    
    wx.showToast({
      title: '头像已更新',
      icon: 'success',
      duration: 1500
    })
  },

  // 昵称输入框获得焦点
  onNicknameFocus(e) {
    this.setData({
      isEditingNickname: true
    })
  },

  // 昵称输入框失焦
  onNicknameBlur(e) {
    this.setData({
      isEditingNickname: false
    })
    
    const nickName = e.detail.value.trim()
    if (nickName && nickName !== this.data.userInfo.nickName) {
      this.updateNickname(nickName)
    }
  },

  // 昵称输入框确认
  onNicknameConfirm(e) {
    const nickName = e.detail.value.trim()
    if (nickName && nickName !== this.data.userInfo.nickName) {
      this.updateNickname(nickName)
    }
  },

  // 更新昵称
  updateNickname(nickName) {
    if (!nickName || nickName.length === 0) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      })
      return
    }
    
    if (nickName.length > 20) {
      wx.showToast({
        title: '昵称不能超过20个字符',
        icon: 'none'
      })
      return
    }
    
    const userInfo = {
      ...this.data.userInfo,
      nickName: nickName
    }
    
    this.saveUserInfo(userInfo)
    
    wx.showToast({
      title: '昵称已更新',
      icon: 'success',
      duration: 1500
    })
  },

  // 保存用户信息
  saveUserInfo(userInfo) {
    // 更新页面数据
    this.setData({
      userInfo: userInfo
    })
    
    // 保存到全局
    app.globalData.userInfo = userInfo
    
    // 保存到本地存储
    try {
      wx.setStorageSync('userInfo', userInfo)
    } catch (error) {
      console.error('保存用户信息失败:', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    }
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

  // 复制微信号
  copyWechatId() {
    const wechatId = 'chaojichangjiang'
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
          title: '复制失败，请手动复制',
          icon: 'none'
        })
      }
    })
  },

  // 添加微信联系人
  addWechatContact() {
    const wechatId = 'chaojichangjiang'
    
    // 先复制到剪贴板
    wx.setClipboardData({
      data: wechatId,
      success: () => {
        wx.showModal({
          title: '微信号已复制',
          content: `客服微信号：${wechatId}\n\n✅ 微信号已复制到剪贴板\n\n📱 添加步骤：\n1. 返回微信主界面\n2. 点击右上角"+"号\n3. 选择"添加朋友"\n4. 点击"微信号/手机号"\n5. 粘贴并搜索\n6. 添加好友\n\n💬 添加后发送消息即可联系客服`,
          confirmText: '知道了',
          cancelText: '再次复制',
          success: (res) => {
            if (res.cancel) {
              // 再次复制
              wx.setClipboardData({
                data: wechatId,
                success: () => {
                  wx.showToast({
                    title: '微信号已复制',
                    icon: 'success',
                    duration: 2000
                  })
                }
              })
            }
          }
        })
      },
      fail: () => {
        wx.showModal({
          title: '添加客服微信',
          content: `客服微信号：${wechatId}\n\n请长按复制微信号，然后：\n1. 返回微信主界面\n2. 点击右上角"+"号\n3. 选择"添加朋友"\n4. 点击"微信号/手机号"\n5. 粘贴并搜索\n6. 添加好友\n\n💬 添加后发送消息即可联系客服`,
          confirmText: '知道了',
          cancelText: '复制微信号',
          success: (res) => {
            if (res.cancel) {
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
