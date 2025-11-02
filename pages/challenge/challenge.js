// 每日挑战页面逻辑
Page({
  data: {
    // 用户统计
    userStats: {
      continuousDays: 7,
      totalChallenges: 23
    },
    
    // 今日日期
    todayDate: '',
    
    // 今日进度
    todayProgress: 2,
    todayTotal: 5,
    progressAngle: 0,
    
    // 今日挑战任务
    todayChallenges: [
      {
        id: 1,
        title: '音准练习',
        description: '完成3次音准评测，保持85分以上',
        icon: '🎵',
        reward: 50,
        current: 2,
        target: 3,
        progress: 67,
        completed: false,
        tips: '保持稳定的呼吸，注意音高的准确性'
      },
      {
        id: 2,
        title: '节奏训练',
        description: '完成2次节奏评测，保持90分以上',
        icon: '🥁',
        reward: 40,
        current: 1,
        target: 2,
        progress: 50,
        completed: false,
        tips: '跟随节拍器练习，保持稳定的节拍感'
      },
      {
        id: 3,
        title: '音色优化',
        description: '完成1次音色评测，保持80分以上',
        icon: '🎤',
        reward: 30,
        current: 0,
        target: 1,
        progress: 0,
        completed: false,
        tips: '注意共鸣腔的运用，保持音色的圆润'
      },
      {
        id: 4,
        title: '情感表达',
        description: '完成1次情感评测，保持75分以上',
        icon: '💝',
        reward: 35,
        current: 1,
        target: 1,
        progress: 100,
        completed: true,
        tips: '深入理解歌曲情感，用声音传达情感'
      },
      {
        id: 5,
        title: '综合评测',
        description: '完成1次综合评测，保持85分以上',
        icon: '⭐',
        reward: 60,
        current: 0,
        target: 1,
        progress: 0,
        completed: false,
        tips: '综合运用所有技巧，展现最佳水平'
      }
    ],
    
    // 最近成就
    recentAchievements: [
      {
        id: 1,
        name: '连续7天',
        description: '连续完成挑战',
        emoji: '🔥',
        unlocked: true
      },
      {
        id: 2,
        name: '音准大师',
        description: '音准评测满分',
        emoji: '🎯',
        unlocked: true
      },
      {
        id: 3,
        name: '节奏达人',
        description: '节奏评测满分',
        emoji: '⚡',
        unlocked: false
      },
      {
        id: 4,
        name: '音色专家',
        description: '音色评测满分',
        emoji: '🎨',
        unlocked: false
      },
      {
        id: 5,
        name: '情感表达者',
        description: '情感评测满分',
        emoji: '💫',
        unlocked: true
      },
      {
        id: 6,
        name: '完美主义者',
        description: '综合评测满分',
        emoji: '👑',
        unlocked: false
      }
    ],
    
    // 排行榜
    leaderboard: [
      {
        rank: 1,
        name: '声乐小王子',
        avatar: '/images/default-avatar.png',
        score: 1250,
        challenges: 8
      },
      {
        rank: 2,
        name: '音乐精灵',
        avatar: '/images/default-avatar.png',
        score: 1180,
        challenges: 7
      },
      {
        rank: 3,
        name: '旋律天使',
        avatar: '/images/default-avatar.png',
        score: 1120,
        challenges: 6
      },
      {
        rank: 4,
        name: '音准达人',
        avatar: '/images/default-avatar.png',
        score: 1080,
        challenges: 6
      },
      {
        rank: 5,
        name: '节奏大师',
        avatar: '/images/default-avatar.png',
        score: 1050,
        challenges: 5
      }
    ],
    
    // 当前月份
    currentMonth: '',
    
    // 日历数据
    calendarDays: [],
    
    // 弹窗状态
    showModal: false,
    selectedTask: {}
  },

  onLoad() {
    this.initPage();
    this.generateCalendar();
  },

  onShow() {
    this.updateProgress();
  },

  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  },

  // 初始化页面
  initPage() {
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
    const monthStr = `${today.getFullYear()}年${today.getMonth() + 1}月`;
    
    this.setData({
      todayDate: dateStr,
      currentMonth: monthStr
    });
    
    this.updateProgress();
  },

  // 更新进度
  updateProgress() {
    const { todayProgress, todayTotal } = this.data;
    const progressAngle = (todayProgress / todayTotal) * 360;
    
    this.setData({
      progressAngle: progressAngle
    });
  },

  // 生成日历
  generateCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    const calendarDays = [];
    
    // 添加空白日期
    for (let i = 0; i < startDay; i++) {
      calendarDays.push({
        day: '',
        date: '',
        hasChallenge: false,
        completed: false
      });
    }
    
    // 添加月份日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasChallenge = Math.random() > 0.3; // 模拟有挑战的日期
      const completed = hasChallenge ? Math.random() > 0.4 : false; // 模拟完成状态
      
      calendarDays.push({
        day: day,
        date: date,
        hasChallenge: hasChallenge,
        completed: completed
      });
    }
    
    this.setData({
      calendarDays: calendarDays
    });
  },

  // 开始挑战
  startChallenge(e) {
    const task = e.currentTarget.dataset.task;
    
    if (task.completed) {
      wx.showToast({
        title: '该挑战已完成',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      selectedTask: task,
      showModal: true
    });
  },

  // 确认挑战
  confirmChallenge() {
    const { selectedTask } = this.data;
    
    this.setData({
      showModal: false
    });
    
    // 跳转到录音页面
    wx.navigateTo({
      url: `/pages/record/record?challengeId=${selectedTask.id}&challengeType=${selectedTask.title}`
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showModal: false,
      selectedTask: {}
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  },

  // 开始今日挑战
  startTodayChallenge() {
    const incompleteTasks = this.data.todayChallenges.filter(task => !task.completed);
    
    if (incompleteTasks.length === 0) {
      wx.showToast({
        title: '今日挑战已完成',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到第一个未完成的挑战
    const firstTask = incompleteTasks[0];
    this.setData({
      selectedTask: firstTask,
      showModal: true
    });
  },

  // 查看建议
  viewRecommendations() {
    wx.navigateTo({
      url: '/pages/recommend/recommend'
    });
  },

  // 查看所有成就
  viewAllAchievements() {
    wx.showModal({
      title: '成就系统',
      content: '成就系统功能开发中，敬请期待！',
      showCancel: false
    });
  },

  // 查看排行榜
  viewLeaderboard() {
    wx.showModal({
      title: '排行榜',
      content: '排行榜功能开发中，敬请期待！',
      showCancel: false
    });
  },

  // 查看历史
  viewHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 查看日期详情
  viewDayDetail(e) {
    const date = e.currentTarget.dataset.date;
    
    if (!date) return;
    
    wx.showModal({
      title: `${date} 挑战记录`,
      content: '该日期的挑战记录功能开发中，敬请期待！',
      showCancel: false
    });
  },

  // 上一个月
  prevMonth() {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth() - 1);
    const monthStr = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
    
    this.setData({
      currentMonth: monthStr
    });
    
    this.generateCalendar();
  },

  // 下一个月
  nextMonth() {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + 1);
    const monthStr = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
    
    this.setData({
      currentMonth: monthStr
    });
    
    this.generateCalendar();
  },

  // 刷新数据
  refreshData() {
    // 模拟数据刷新
    setTimeout(() => {
      this.initPage();
      this.generateCalendar();
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    }, 1000);
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '每日挑战 - 专业声乐训练',
      path: '/pages/challenge/challenge',
      imageUrl: '/images/share-challenge.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '每日挑战 - 专业声乐训练',
      imageUrl: '/images/share-challenge.png'
    };
  }
});

