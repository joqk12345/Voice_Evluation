// 成就徽章页面逻辑
Page({
  data: {
    // 用户统计
    userStats: {
      unlockedCount: 8,
      totalCount: 20,
      completionRate: 40
    },
    
    // 当前分类
    currentCategory: 'all',
    
    // 所有成就数据
    allAchievements: [
      // 技能类成就
      {
        id: 1,
        name: '音准新手',
        description: '完成第一次音准评测',
        emoji: '🎵',
        category: 'skill',
        categoryName: '技能类',
        reward: 50,
        unlocked: true,
        unlockTime: '2024-01-10',
        level: 1,
        rare: false,
        tips: '保持稳定的呼吸，注意音高的准确性'
      },
      {
        id: 2,
        name: '音准达人',
        description: '音准评测连续5次达到90分以上',
        emoji: '🎯',
        category: 'skill',
        categoryName: '技能类',
        reward: 100,
        current: 3,
        target: 5,
        progress: 60,
        unlocked: false,
        level: 2,
        rare: false,
        unlockCondition: '音准评测连续5次达到90分以上',
        tips: '每天坚持音准练习，使用节拍器辅助'
      },
      {
        id: 3,
        name: '音准大师',
        description: '音准评测连续10次达到95分以上',
        emoji: '👑',
        category: 'skill',
        categoryName: '技能类',
        reward: 200,
        current: 0,
        target: 10,
        progress: 0,
        unlocked: false,
        level: 3,
        rare: true,
        unlockCondition: '音准评测连续10次达到95分以上',
        tips: '掌握正确的发声技巧，保持稳定的音高'
      },
      {
        id: 4,
        name: '节奏新手',
        description: '完成第一次节奏评测',
        emoji: '🥁',
        category: 'skill',
        categoryName: '技能类',
        reward: 50,
        unlocked: true,
        unlockTime: '2024-01-12',
        level: 1,
        rare: false,
        tips: '跟随节拍器练习，保持稳定的节拍感'
      },
      {
        id: 5,
        name: '节奏达人',
        description: '节奏评测连续5次达到90分以上',
        emoji: '⚡',
        category: 'skill',
        categoryName: '技能类',
        reward: 100,
        current: 2,
        target: 5,
        progress: 40,
        unlocked: false,
        level: 2,
        rare: false,
        unlockCondition: '节奏评测连续5次达到90分以上',
        tips: '多听节拍器，培养内在节拍感'
      },
      {
        id: 6,
        name: '音色新手',
        description: '完成第一次音色评测',
        emoji: '🎤',
        category: 'skill',
        categoryName: '技能类',
        reward: 50,
        unlocked: true,
        unlockTime: '2024-01-15',
        level: 1,
        rare: false,
        tips: '注意共鸣腔的运用，保持音色的圆润'
      },
      {
        id: 7,
        name: '音色专家',
        description: '音色评测连续5次达到85分以上',
        emoji: '🎨',
        category: 'skill',
        categoryName: '技能类',
        reward: 100,
        current: 1,
        target: 5,
        progress: 20,
        unlocked: false,
        level: 2,
        rare: false,
        unlockCondition: '音色评测连续5次达到85分以上',
        tips: '练习不同的共鸣位置，改善音色质量'
      },
      {
        id: 8,
        name: '情感表达者',
        description: '完成第一次情感评测',
        emoji: '💝',
        category: 'skill',
        categoryName: '技能类',
        reward: 50,
        unlocked: true,
        unlockTime: '2024-01-18',
        level: 1,
        rare: false,
        tips: '深入理解歌曲情感，用声音传达情感'
      },
      
      // 挑战类成就
      {
        id: 9,
        name: '挑战新手',
        description: '完成第一次每日挑战',
        emoji: '🎯',
        category: 'challenge',
        categoryName: '挑战类',
        reward: 100,
        unlocked: true,
        unlockTime: '2024-01-20',
        level: 1,
        rare: false,
        tips: '坚持每日练习，逐步提升技能'
      },
      {
        id: 10,
        name: '连续挑战者',
        description: '连续完成7天每日挑战',
        emoji: '🔥',
        category: 'challenge',
        categoryName: '挑战类',
        reward: 200,
        current: 5,
        target: 7,
        progress: 71,
        unlocked: false,
        level: 2,
        rare: false,
        unlockCondition: '连续完成7天每日挑战',
        tips: '建立良好的练习习惯，不要中断'
      },
      {
        id: 11,
        name: '挑战大师',
        description: '连续完成30天每日挑战',
        emoji: '🏆',
        category: 'challenge',
        categoryName: '挑战类',
        reward: 500,
        current: 5,
        target: 30,
        progress: 17,
        unlocked: false,
        level: 3,
        rare: true,
        unlockCondition: '连续完成30天每日挑战',
        tips: '长期坚持是成为大师的关键'
      },
      {
        id: 12,
        name: '完美主义者',
        description: '单日完成所有挑战任务',
        emoji: '⭐',
        category: 'challenge',
        categoryName: '挑战类',
        reward: 150,
        current: 0,
        target: 1,
        progress: 0,
        unlocked: false,
        level: 2,
        rare: false,
        unlockCondition: '单日完成所有挑战任务',
        tips: '合理规划时间，逐一完成所有任务'
      },
      
      // 社交类成就
      {
        id: 13,
        name: '分享达人',
        description: '分享评测结果到社交平台',
        emoji: '📤',
        category: 'social',
        categoryName: '社交类',
        reward: 50,
        unlocked: true,
        unlockTime: '2024-01-22',
        level: 1,
        rare: false,
        tips: '分享你的进步，激励更多人'
      },
      {
        id: 14,
        name: '社交之星',
        description: '分享评测结果10次',
        emoji: '🌟',
        category: 'social',
        categoryName: '社交类',
        reward: 100,
        current: 3,
        target: 10,
        progress: 30,
        unlocked: false,
        level: 2,
        rare: false,
        unlockCondition: '分享评测结果10次',
        tips: '积极分享，展示你的声乐进步'
      },
      {
        id: 15,
        name: '影响力者',
        description: '分享评测结果50次',
        emoji: '💫',
        category: 'social',
        categoryName: '社交类',
        reward: 300,
        current: 3,
        target: 50,
        progress: 6,
        unlocked: false,
        level: 3,
        rare: true,
        unlockCondition: '分享评测结果50次',
        tips: '成为声乐学习的榜样，影响更多人'
      },
      {
        id: 16,
        name: '排行榜冠军',
        description: '在周排行榜中获得第一名',
        emoji: '🥇',
        category: 'social',
        categoryName: '社交类',
        reward: 200,
        current: 0,
        target: 1,
        progress: 0,
        unlocked: false,
        level: 2,
        rare: true,
        unlockCondition: '在周排行榜中获得第一名',
        tips: '努力练习，争取在排行榜中登顶'
      },
      
      // 特殊成就
      {
        id: 17,
        name: '初学者',
        description: '完成第一次综合评测',
        emoji: '🎪',
        category: 'skill',
        categoryName: '技能类',
        reward: 100,
        unlocked: true,
        unlockTime: '2024-01-25',
        level: 1,
        rare: false,
        tips: '综合运用所有技巧，展现最佳水平'
      },
      {
        id: 18,
        name: '进步之星',
        description: '评测分数比上次提升20分以上',
        emoji: '📈',
        category: 'skill',
        categoryName: '技能类',
        reward: 80,
        current: 0,
        target: 1,
        progress: 0,
        unlocked: false,
        level: 2,
        rare: false,
        unlockCondition: '评测分数比上次提升20分以上',
        tips: '持续练习，每次都要有所进步'
      },
      {
        id: 19,
        name: '坚持不懈',
        description: '连续使用应用30天',
        emoji: '💪',
        category: 'challenge',
        categoryName: '挑战类',
        reward: 150,
        current: 15,
        target: 30,
        progress: 50,
        unlocked: false,
        level: 2,
        rare: false,
        unlockCondition: '连续使用应用30天',
        tips: '坚持每天使用应用，养成良好习惯'
      },
      {
        id: 20,
        name: '声乐爱好者',
        description: '累计评测次数达到100次',
        emoji: '🎭',
        category: 'skill',
        categoryName: '技能类',
        reward: 300,
        current: 23,
        target: 100,
        progress: 23,
        unlocked: false,
        level: 3,
        rare: true,
        unlockCondition: '累计评测次数达到100次',
        tips: '热爱声乐，持续练习，终将成为大师'
      }
    ],
    
    // 过滤后的成就
    filteredAchievements: [],
    
    // 分类统计
    categoryStats: {
      skill: { unlocked: 5, total: 10 },
      challenge: { unlocked: 1, total: 4 },
      social: { unlocked: 1, total: 4 },
      rare: { unlocked: 0, total: 6 }
    },
    
    // 最近解锁的成就
    recentUnlocks: [
      {
        id: 8,
        name: '情感表达者',
        emoji: '💝',
        reward: 50,
        unlockTime: '2024-01-18'
      },
      {
        id: 9,
        name: '挑战新手',
        emoji: '🎯',
        reward: 100,
        unlockTime: '2024-01-20'
      },
      {
        id: 13,
        name: '分享达人',
        emoji: '📤',
        reward: 50,
        unlockTime: '2024-01-22'
      }
    ],
    
    // 弹窗状态
    showModal: false,
    selectedAchievement: {},
    
    // 通知状态
    showNotification: false,
    newUnlock: null
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.loadAchievements();
  },

  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  },

  // 初始化页面
  initPage() {
    this.filterAchievements();
    this.calculateStats();
  },

  // 加载成就数据
  loadAchievements() {
    try {
      // 从本地存储加载成就数据
      const savedAchievements = wx.getStorageSync('achievements') || this.data.allAchievements;
      const savedStats = wx.getStorageSync('achievementStats') || this.data.userStats;
      
      this.setData({
        allAchievements: savedAchievements,
        userStats: savedStats
      });
      
      this.filterAchievements();
      this.calculateStats();
      
      console.log('成就数据加载成功');
    } catch (error) {
      console.error('加载成就数据失败:', error);
    }
  },

  // 保存成就数据
  saveAchievements() {
    try {
      wx.setStorageSync('achievements', this.data.allAchievements);
      wx.setStorageSync('achievementStats', this.data.userStats);
      console.log('成就数据保存成功');
    } catch (error) {
      console.error('保存成就数据失败:', error);
    }
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category
    });
    this.filterAchievements();
  },

  // 过滤成就
  filterAchievements() {
    const { allAchievements, currentCategory } = this.data;
    let filtered = allAchievements;
    
    if (currentCategory !== 'all') {
      filtered = allAchievements.filter(achievement => achievement.category === currentCategory);
    }
    
    this.setData({
      filteredAchievements: filtered
    });
  },

  // 计算统计信息
  calculateStats() {
    const { allAchievements } = this.data;
    
    const unlockedCount = allAchievements.filter(a => a.unlocked).length;
    const totalCount = allAchievements.length;
    const completionRate = Math.round((unlockedCount / totalCount) * 100);
    
    // 计算分类统计
    const categoryStats = {
      skill: { unlocked: 0, total: 0 },
      challenge: { unlocked: 0, total: 0 },
      social: { unlocked: 0, total: 0 },
      rare: { unlocked: 0, total: 0 }
    };
    
    allAchievements.forEach(achievement => {
      categoryStats[achievement.category].total++;
      if (achievement.unlocked) {
        categoryStats[achievement.category].unlocked++;
      }
      if (achievement.rare) {
        categoryStats.rare.total++;
        if (achievement.unlocked) {
          categoryStats.rare.unlocked++;
        }
      }
    });
    
    this.setData({
      userStats: {
        unlockedCount,
        totalCount,
        completionRate
      },
      categoryStats
    });
  },

  // 查看成就详情
  viewAchievementDetail(e) {
    const achievement = e.currentTarget.dataset.achievement;
    this.setData({
      selectedAchievement: achievement,
      showModal: true
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showModal: false,
      selectedAchievement: {}
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  },

  // 分享成就
  shareAchievement() {
    const { selectedAchievement } = this.data;
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  // 分享所有成就
  shareAchievements() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  // 查看排行榜
  viewLeaderboard() {
    wx.navigateTo({
      url: '/pages/challenge/challenge'
    });
  },

  // 查看所有解锁
  viewAllUnlocks() {
    wx.showModal({
      title: '解锁历史',
      content: '解锁历史功能开发中，敬请期待！',
      showCancel: false
    });
  },

  // 刷新数据
  refreshData() {
    this.loadAchievements();
    
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  },

  // 解锁成就
  unlockAchievement(achievementId) {
    const { allAchievements } = this.data;
    const achievement = allAchievements.find(a => a.id === achievementId);
    
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockTime = new Date().toISOString().split('T')[0];
      
      this.setData({
        allAchievements,
        newUnlock: achievement
      });
      
      this.calculateStats();
      this.saveAchievements();
      this.showUnlockNotification();
      
      console.log('成就解锁成功:', achievement.name);
    }
  },

  // 显示解锁通知
  showUnlockNotification() {
    this.setData({
      showNotification: true
    });
    
    // 3秒后自动关闭通知
    setTimeout(() => {
      this.setData({
        showNotification: false,
        newUnlock: null
      });
    }, 3000);
  },

  // 关闭通知
  closeNotification() {
    this.setData({
      showNotification: false,
      newUnlock: null
    });
  },

  // 更新成就进度
  updateAchievementProgress(achievementId, progress) {
    const { allAchievements } = this.data;
    const achievement = allAchievements.find(a => a.id === achievementId);
    
    if (achievement && !achievement.unlocked) {
      achievement.current = Math.min(achievement.current + progress, achievement.target);
      achievement.progress = Math.round((achievement.current / achievement.target) * 100);
      
      // 检查是否解锁
      if (achievement.current >= achievement.target) {
        this.unlockAchievement(achievementId);
      } else {
        this.setData({
          allAchievements
        });
        this.saveAchievements();
      }
    }
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的声乐成就 - 专业声乐评测',
      path: '/pages/achievements/achievements',
      imageUrl: '/images/share-achievements.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '我的声乐成就 - 专业声乐评测',
      imageUrl: '/images/share-achievements.png'
    };
  }
});