// 设置页面逻辑
Page({
  data: {
    // 应用版本
    appVersion: '1.0.0',
    
    // 评测设置
    durationOptions: [
      { label: '30秒', value: 30 },
      { label: '60秒', value: 60 },
      { label: '90秒', value: 90 },
      { label: '120秒', value: 120 }
    ],
    selectedDurationIndex: 1, // 默认60秒
    
    volumeThreshold: 70, // 音量阈值
    
    precisionOptions: [
      { label: '标准', value: 'standard' },
      { label: '精确', value: 'precise' },
      { label: '专业', value: 'professional' }
    ],
    selectedPrecisionIndex: 1, // 默认精确
    
    evaluationReminder: true, // 评测提醒
    
    // 通知设置
    pushNotification: true, // 推送通知
    practiceReminder: true, // 练习提醒
    reminderTime: '20:00', // 提醒时间
    achievementNotification: true, // 成就通知
    
    // 隐私设置
    dataAnalytics: true, // 数据统计
    
    // 应用设置
    darkMode: false, // 深色模式
    
    fontSizeOptions: [
      { label: '小', value: 'small' },
      { label: '标准', value: 'normal' },
      { label: '大', value: 'large' },
      { label: '超大', value: 'xlarge' }
    ],
    selectedFontSizeIndex: 1, // 默认标准
    
    languageOptions: [
      { label: '简体中文', value: 'zh-CN' },
      { label: 'English', value: 'en-US' }
    ],
    selectedLanguageIndex: 0, // 默认中文
    
    // 时间选择器
    showTimePicker: false,
    tempReminderTime: '20:00'
  },

  onLoad() {
    this.loadSettings();
  },

  onShow() {
    this.loadSettings();
  },

  // 加载设置
  loadSettings() {
    try {
      const settings = wx.getStorageSync('appSettings') || {};
      
      this.setData({
        selectedDurationIndex: settings.selectedDurationIndex || 1,
        volumeThreshold: settings.volumeThreshold || 70,
        selectedPrecisionIndex: settings.selectedPrecisionIndex || 1,
        evaluationReminder: settings.evaluationReminder !== false,
        pushNotification: settings.pushNotification !== false,
        practiceReminder: settings.practiceReminder !== false,
        reminderTime: settings.reminderTime || '20:00',
        achievementNotification: settings.achievementNotification !== false,
        dataAnalytics: settings.dataAnalytics !== false,
        darkMode: settings.darkMode || false,
        selectedFontSizeIndex: settings.selectedFontSizeIndex || 1,
        selectedLanguageIndex: settings.selectedLanguageIndex || 0
      });
      
      console.log('设置加载成功');
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  // 保存设置
  saveSettings() {
    try {
      const settings = {
        selectedDurationIndex: this.data.selectedDurationIndex,
        volumeThreshold: this.data.volumeThreshold,
        selectedPrecisionIndex: this.data.selectedPrecisionIndex,
        evaluationReminder: this.data.evaluationReminder,
        pushNotification: this.data.pushNotification,
        practiceReminder: this.data.practiceReminder,
        reminderTime: this.data.reminderTime,
        achievementNotification: this.data.achievementNotification,
        dataAnalytics: this.data.dataAnalytics,
        darkMode: this.data.darkMode,
        selectedFontSizeIndex: this.data.selectedFontSizeIndex,
        selectedLanguageIndex: this.data.selectedLanguageIndex
      };
      
      wx.setStorageSync('appSettings', settings);
      console.log('设置保存成功');
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  },

  // 编辑个人资料
  editProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  // 编辑偏好设置
  editPreferences() {
    wx.showModal({
      title: '偏好设置',
      content: '偏好设置功能开发中，敬请期待！',
      showCancel: false
    });
  },

  // 评测时长变化
  onDurationChange(e) {
    const index = e.detail.value;
    this.setData({
      selectedDurationIndex: index
    });
    this.saveSettings();
    
    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });
  },

  // 音量阈值变化
  onVolumeThresholdChange(e) {
    const value = e.detail.value;
    this.setData({
      volumeThreshold: value
    });
    this.saveSettings();
  },

  // 评测精度变化
  onPrecisionChange(e) {
    const index = e.detail.value;
    this.setData({
      selectedPrecisionIndex: index
    });
    this.saveSettings();
    
    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });
  },

  // 评测提醒变化
  onEvaluationReminderChange(e) {
    const value = e.detail.value;
    this.setData({
      evaluationReminder: value
    });
    this.saveSettings();
    
    wx.showToast({
      title: value ? '已开启评测提醒' : '已关闭评测提醒',
      icon: 'success'
    });
  },

  // 推送通知变化
  onPushNotificationChange(e) {
    const value = e.detail.value;
    this.setData({
      pushNotification: value
    });
    this.saveSettings();
    
    if (value) {
      // 请求通知权限
      wx.requestSubscribeMessage({
        tmplIds: ['notification_tmpl_id'],
        success: (res) => {
          console.log('通知权限请求结果:', res);
        },
        fail: (err) => {
          console.error('通知权限请求失败:', err);
        }
      });
    }
    
    wx.showToast({
      title: value ? '已开启推送通知' : '已关闭推送通知',
      icon: 'success'
    });
  },

  // 练习提醒变化
  onPracticeReminderChange(e) {
    const value = e.detail.value;
    this.setData({
      practiceReminder: value
    });
    this.saveSettings();
    
    if (value) {
      // 设置提醒
      this.setupReminder();
    } else {
      // 取消提醒
      this.cancelReminder();
    }
    
    wx.showToast({
      title: value ? '已开启练习提醒' : '已关闭练习提醒',
      icon: 'success'
    });
  },

  // 设置提醒
  setupReminder() {
    // 这里可以调用微信的提醒API
    console.log('设置练习提醒:', this.data.reminderTime);
  },

  // 取消提醒
  cancelReminder() {
    console.log('取消练习提醒');
  },

  // 设置提醒时间
  setReminderTime() {
    this.setData({
      showTimePicker: true,
      tempReminderTime: this.data.reminderTime
    });
  },

  // 关闭时间选择器
  closeTimePicker() {
    this.setData({
      showTimePicker: false
    });
  },

  // 时间变化
  onTimeChange(e) {
    this.setData({
      tempReminderTime: e.detail.value
    });
  },

  // 确认时间
  confirmTime() {
    this.setData({
      reminderTime: this.data.tempReminderTime,
      showTimePicker: false
    });
    this.saveSettings();
    this.setupReminder();
    
    wx.showToast({
      title: '提醒时间已设置',
      icon: 'success'
    });
  },

  // 成就通知变化
  onAchievementNotificationChange(e) {
    const value = e.detail.value;
    this.setData({
      achievementNotification: value
    });
    this.saveSettings();
    
    wx.showToast({
      title: value ? '已开启成就通知' : '已关闭成就通知',
      icon: 'success'
    });
  },

  // 数据统计变化
  onDataAnalyticsChange(e) {
    const value = e.detail.value;
    this.setData({
      dataAnalytics: value
    });
    this.saveSettings();
    
    wx.showToast({
      title: value ? '已开启数据统计' : '已关闭数据统计',
      icon: 'success'
    });
  },

  // 深色模式变化
  onDarkModeChange(e) {
    const value = e.detail.value;
    this.setData({
      darkMode: value
    });
    this.saveSettings();
    
    // 这里可以应用深色模式主题
    if (value) {
      wx.showToast({
        title: '深色模式已开启',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '深色模式已关闭',
        icon: 'success'
      });
    }
  },

  // 字体大小变化
  onFontSizeChange(e) {
    const index = e.detail.value;
    this.setData({
      selectedFontSizeIndex: index
    });
    this.saveSettings();
    
    // 这里可以应用字体大小设置
    wx.showToast({
      title: '字体大小已调整',
      icon: 'success'
    });
  },

  // 语言变化
  onLanguageChange(e) {
    const index = e.detail.value;
    this.setData({
      selectedLanguageIndex: index
    });
    this.saveSettings();
    
    wx.showToast({
      title: '语言设置已保存',
      icon: 'success'
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除应用缓存吗？这将删除临时文件，但不会影响你的评测记录。',
      confirmText: '清除',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '清除中...'
          });
          
          // 模拟清除缓存
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '缓存清除成功',
              icon: 'success'
            });
          }, 1500);
        }
      }
    });
  },

  // 查看关于我们
  viewAbout() {
    wx.showModal({
      title: '关于声乐评测',
      content: '声乐评测是一款专业的声乐学习应用，通过AI技术为用户提供准确的声乐评测和个性化指导。\n\n版本：v1.0.0\n开发者：声乐评测团队',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 查看帮助
  viewHelp() {
    wx.showModal({
      title: '帮助中心',
      content: '帮助中心功能开发中，敬请期待！\n\n如有问题，请联系客服。',
      showCancel: false
    });
  },

  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '客服微信：VoiceEval2024\n客服邮箱：support@voiceeval.com\n工作时间：9:00-18:00',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({
      title: '检查中...'
    });
    
    // 模拟检查更新
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '检查更新',
        content: '当前已是最新版本 v1.0.0',
        showCancel: false,
        confirmText: '我知道了'
      });
    }, 1500);
  },

  // 导出数据
  exportData() {
    wx.showModal({
      title: '导出数据',
      content: '确定要导出个人数据吗？包括评测记录、成就等。',
      confirmText: '导出',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '导出中...'
          });
          
          // 模拟导出数据
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '数据导出成功',
              icon: 'success'
            });
          }, 2000);
        }
      }
    });
  },

  // 重置设置
  resetSettings() {
    wx.showModal({
      title: '重置设置',
      content: '确定要重置所有设置为默认值吗？此操作不可撤销。',
      confirmText: '重置',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          // 重置为默认值
          this.setData({
            selectedDurationIndex: 1,
            volumeThreshold: 70,
            selectedPrecisionIndex: 1,
            evaluationReminder: true,
            pushNotification: true,
            practiceReminder: true,
            reminderTime: '20:00',
            achievementNotification: true,
            dataAnalytics: true,
            darkMode: false,
            selectedFontSizeIndex: 1,
            selectedLanguageIndex: 0
          });
          
          this.saveSettings();
          
          wx.showToast({
            title: '设置已重置',
            icon: 'success'
          });
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账户吗？',
      confirmText: '退出',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          // 清除用户数据
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          
          // 跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login'
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '声乐评测 - 专业声乐学习应用',
      path: '/pages/index/index',
      imageUrl: '/images/share-settings.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '声乐评测 - 专业声乐学习应用',
      imageUrl: '/images/share-settings.png'
    };
  }
});

