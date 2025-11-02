// utils/util.js
// 工具函数

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 格式化日期
const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

// 获取评分等级
const getScoreLevel = (score) => {
  if (score >= 90) return { level: '优秀', color: '#4CAF50' }
  if (score >= 80) return { level: '良好', color: '#8BC34A' }
  if (score >= 70) return { level: '中等', color: '#FFC107' }
  if (score >= 60) return { level: '及格', color: '#FF9800' }
  return { level: '需改进', color: '#F44336' }
}

// 获取评测建议
const getEvaluationAdvice = (metrics) => {
  const advice = []
  
  if (metrics.pitch < 70) {
    advice.push('音准需要加强，建议多练习音阶和音程练习')
  }
  if (metrics.rhythm < 70) {
    advice.push('节奏感有待提高，可以跟着节拍器练习')
  }
  if (metrics.volume < 70) {
    advice.push('音量控制需要改善，注意气息的运用')
  }
  if (metrics.timbre < 70) {
    advice.push('音色可以更加圆润，建议练习共鸣技巧')
  }
  
  if (advice.length === 0) {
    advice.push('表现很棒！继续保持，可以挑战更高难度的歌曲')
  }
  
  return advice
}

// 模拟音频分析算法
const analyzeAudio = (audioData) => {
  // 这里是模拟的音频分析结果
  // 实际项目中需要调用真实的音频分析API
  
  const baseScore = Math.random() * 30 + 60 // 60-90分的基础分
  
  return {
    score: Math.round(baseScore),
    pitch: Math.round(baseScore + (Math.random() - 0.5) * 20),
    rhythm: Math.round(baseScore + (Math.random() - 0.5) * 20),
    volume: Math.round(baseScore + (Math.random() - 0.5) * 20),
    timbre: Math.round(baseScore + (Math.random() - 0.5) * 20),
    duration: audioData.duration || 30,
    analysis: {
      pitchAccuracy: Math.random() * 20 + 80,
      rhythmStability: Math.random() * 20 + 80,
      volumeConsistency: Math.random() * 20 + 80,
      timbreQuality: Math.random() * 20 + 80
    }
  }
}

// 获取推荐歌曲
const getRecommendedSongs = (level, score) => {
  const songs = {
    beginner: [
      { name: '小星星', artist: '儿歌', difficulty: '简单', difficultyClass: 'easy', preview: '/audio/xiaoxingxing.mp3' },
      { name: '茉莉花', artist: '民歌', difficulty: '简单', difficultyClass: 'easy', preview: '/audio/molihua.mp3' },
      { name: '月亮代表我的心', artist: '邓丽君', difficulty: '简单', difficultyClass: 'easy', preview: '/audio/yueliang.mp3' }
    ],
    intermediate: [
      { name: '青花瓷', artist: '周杰伦', difficulty: '中等', difficultyClass: 'medium', preview: '/audio/qinghuaci.mp3' },
      { name: '童话', artist: '光良', difficulty: '中等', difficultyClass: 'medium', preview: '/audio/tonghua.mp3' },
      { name: '演员', artist: '薛之谦', difficulty: '中等', difficultyClass: 'medium', preview: '/audio/yanyuan.mp3' }
    ],
    advanced: [
      { name: '海阔天空', artist: 'Beyond', difficulty: '困难', difficultyClass: 'hard', preview: '/audio/haikuotiankong.mp3' },
      { name: '青藏高原', artist: '李娜', difficulty: '困难', difficultyClass: 'hard', preview: '/audio/qingzang.mp3' },
      { name: '我的祖国', artist: '郭兰英', difficulty: '困难', difficultyClass: 'hard', preview: '/audio/wodezuguo.mp3' }
    ]
  }
  
  let levelKey = 'beginner'
  if (score >= 80) levelKey = 'advanced'
  else if (score >= 70) levelKey = 'intermediate'
  
  return songs[levelKey] || songs.beginner
}

// 获取练习建议
const getPracticePlan = (metrics) => {
  const plans = []
  
  if (metrics.pitch < 80) {
    plans.push({
      type: '音准练习',
      description: '每天练习15分钟音阶和音程',
      duration: '15分钟',
      frequency: '每日'
    })
  }
  
  if (metrics.rhythm < 80) {
    plans.push({
      type: '节奏练习',
      description: '跟着节拍器练习不同拍号',
      duration: '20分钟',
      frequency: '每日'
    })
  }
  
  if (metrics.volume < 80) {
    plans.push({
      type: '气息练习',
      description: '练习腹式呼吸和气息控制',
      duration: '10分钟',
      frequency: '每日'
    })
  }
  
  if (metrics.timbre < 80) {
    plans.push({
      type: '共鸣练习',
      description: '练习头腔、胸腔共鸣',
      duration: '15分钟',
      frequency: '每日'
    })
  }
  
  if (plans.length === 0) {
    plans.push({
      type: '综合练习',
      description: '保持现有水平，挑战高难度歌曲',
      duration: '30分钟',
      frequency: '每日'
    })
  }
  
  return plans
}

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 节流函数
const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

module.exports = {
  formatTime,
  formatDate,
  getScoreLevel,
  getEvaluationAdvice,
  analyzeAudio,
  getRecommendedSongs,
  getPracticePlan,
  debounce,
  throttle
}
