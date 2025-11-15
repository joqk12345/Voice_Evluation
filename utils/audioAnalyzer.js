// utils/audioAnalyzer.js
// 音频分析工具 - 基于 PCM 数据的专业音频分析

/**
 * 快速傅里叶变换 (FFT) 实现 - 迭代版本，性能更优
 * @param {Float32Array} samples - 音频采样数据
 * @param {number} sampleRate - 采样率
 * @returns {Object} - { magnitude: Float32Array, phase: Float32Array, frequencies: Float32Array }
 */
function fft(samples, sampleRate) {
  let N = samples.length
  
  // 确保 N 是 2 的幂，如果不是则填充零或截断
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(N)))
  const fftSize = Math.min(nextPowerOfTwo, 2048) // 限制最大 FFT 大小以提高性能
  
  const real = new Float32Array(fftSize)
  const imag = new Float32Array(fftSize)
  
  // 复制数据并填充零
  for (let i = 0; i < fftSize; i++) {
    real[i] = i < N ? samples[i] : 0
    imag[i] = 0
  }
  
  // 位反转置换
  let j = 0
  for (let i = 1; i < fftSize; i++) {
    let bit = fftSize >> 1
    for (; j & bit; bit >>= 1) {
      j ^= bit
    }
    j ^= bit
    
    if (i < j) {
      // 交换
      const tempReal = real[i]
      const tempImag = imag[i]
      real[i] = real[j]
      imag[i] = imag[j]
      real[j] = tempReal
      imag[j] = tempImag
    }
  }
  
  // 迭代 FFT
  for (let len = 2; len <= fftSize; len <<= 1) {
    const angle = -2 * Math.PI / len
    const wlenReal = Math.cos(angle)
    const wlenImag = Math.sin(angle)
    
    for (let i = 0; i < fftSize; i += len) {
      let wReal = 1
      let wImag = 0
      
      for (let j = 0; j < len / 2; j++) {
        const uReal = real[i + j]
        const uImag = imag[i + j]
        const vReal = real[i + j + len / 2] * wReal - imag[i + j + len / 2] * wImag
        const vImag = real[i + j + len / 2] * wImag + imag[i + j + len / 2] * wReal
        
        real[i + j] = uReal + vReal
        imag[i + j] = uImag + vImag
        real[i + j + len / 2] = uReal - vReal
        imag[i + j + len / 2] = uImag - vImag
        
        const nextWReal = wReal * wlenReal - wImag * wlenImag
        const nextWImag = wReal * wlenImag + wImag * wlenReal
        wReal = nextWReal
        wImag = nextWImag
      }
    }
  }
  
  // 计算幅度和相位（只计算前半部分，因为后半部分是对称的）
  const outputSize = fftSize / 2
  const magnitude = new Float32Array(outputSize)
  const phase = new Float32Array(outputSize)
  
  for (let i = 0; i < outputSize; i++) {
    magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i])
    phase[i] = Math.atan2(imag[i], real[i])
  }
  
  // 计算频率数组
  const frequencies = new Float32Array(outputSize)
  const freqResolution = sampleRate / fftSize
  for (let i = 0; i < outputSize; i++) {
    frequencies[i] = i * freqResolution
  }
  
  return { magnitude, phase, frequencies }
}

/**
 * 计算 RMS (Root Mean Square) - 均方根，用于音量评估
 * @param {Float32Array} samples - 音频采样数据
 * @returns {number} - RMS 值 (0-1)
 */
function calculateRMS(samples) {
  if (samples.length === 0) return 0
  
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  
  return Math.sqrt(sum / samples.length)
}

/**
 * 计算 ZCR (Zero Crossing Rate) - 过零率，用于音色评估
 * @param {Float32Array} samples - 音频采样数据
 * @returns {number} - ZCR 值 (0-1)
 */
function calculateZCR(samples) {
  if (samples.length < 2) return 0
  
  let crossings = 0
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] >= 0 && samples[i] < 0) || 
        (samples[i - 1] < 0 && samples[i] >= 0)) {
      crossings++
    }
  }
  
  return crossings / (samples.length - 1)
}

/**
 * 计算能量谱 (Power Spectrum) - 用于音准和音色分析
 * @param {Object} fftResult - FFT 结果
 * @returns {Float32Array} - 能量谱
 */
function calculatePowerSpectrum(fftResult) {
  const { magnitude } = fftResult
  const power = new Float32Array(magnitude.length)
  
  for (let i = 0; i < magnitude.length; i++) {
    power[i] = magnitude[i] * magnitude[i]
  }
  
  return power
}

/**
 * 检测基音频率 (Pitch Detection) - 用于音准评估
 * @param {Float32Array} powerSpectrum - 能量谱
 * @param {Float32Array} frequencies - 频率数组
 * @param {number} sampleRate - 采样率
 * @returns {number} - 基音频率 (Hz)
 */
function detectPitch(powerSpectrum, frequencies, sampleRate) {
  // 人声频率范围：80Hz - 1000Hz
  const minFreq = 80
  const maxFreq = 1000
  
  let maxPower = 0
  let pitchFreq = 0
  
  for (let i = 0; i < frequencies.length; i++) {
    const freq = frequencies[i]
    if (freq >= minFreq && freq <= maxFreq) {
      if (powerSpectrum[i] > maxPower) {
        maxPower = powerSpectrum[i]
        pitchFreq = freq
      }
    }
  }
  
  // 使用谐波峰值检测提高准确性
  if (pitchFreq > 0) {
    // 检查谐波（2倍频、3倍频等）
    let harmonicScore = 0
    for (let h = 2; h <= 5; h++) {
      const harmonicFreq = pitchFreq * h
      const harmonicIndex = Math.round(harmonicFreq / (sampleRate / (powerSpectrum.length * 2)))
      if (harmonicIndex < powerSpectrum.length && powerSpectrum[harmonicIndex] > maxPower * 0.3) {
        harmonicScore += 0.2
      }
    }
    
    // 如果谐波明显，提高基音频率的置信度
    if (harmonicScore > 0.4) {
      return pitchFreq
    }
  }
  
  return pitchFreq || 0
}

/**
 * 评估音准 (Pitch Accuracy)
 * @param {Array<number>} pitchHistory - 基音频率历史记录
 * @param {number} targetPitch - 目标音高（如果知道的话，可选）
 * @returns {number} - 音准得分 (0-100)
 */
function evaluatePitchAccuracy(pitchHistory, targetPitch = null) {
  if (pitchHistory.length === 0) {
    // 数据不足时，给予中等偏低分数，而不是固定的50分
    return 45
  }
  
  // 计算基音频率的稳定性
  const mean = pitchHistory.reduce((a, b) => a + b, 0) / pitchHistory.length
  
  // 计算方差
  let variance = 0
  for (let i = 0; i < pitchHistory.length; i++) {
    variance += Math.pow(pitchHistory[i] - mean, 2)
  }
  variance = variance / pitchHistory.length
  
  // 计算标准差（相对于平均频率）
  const stdDev = Math.sqrt(variance)
  const relativeStdDev = mean > 0 ? (stdDev / mean) : 1
  
  // 如果有目标音高，计算偏差
  let pitchDeviation = 0
  if (targetPitch && mean > 0) {
    pitchDeviation = Math.abs(mean - targetPitch) / targetPitch
  }
  
  // 音准得分：稳定性越高，偏差越小，得分越高
  // 稳定性占60%，准确性占40%（如果有目标音高）
  const stabilityScore = Math.max(0, 100 - relativeStdDev * 200) // 相对标准差越小越好
  const accuracyScore = targetPitch ? Math.max(0, 100 - pitchDeviation * 300) : 80
  
  // 根据音高范围给予基础分（人声范围80-1000Hz）
  let rangeScore = 70
  if (mean >= 80 && mean <= 1000) {
    // 在人声范围内，根据音高位置给予不同分数
    // 男声：80-300Hz，女声：200-600Hz，儿童：300-1000Hz
    if (mean >= 200 && mean <= 600) {
      rangeScore = 85 // 最佳人声范围
    } else if (mean >= 80 && mean < 200) {
      rangeScore = 75 // 低音
    } else if (mean > 600 && mean <= 1000) {
      rangeScore = 80 // 高音
    }
  } else {
    rangeScore = 50 // 不在人声范围
  }
  
  const finalScore = targetPitch 
    ? stabilityScore * 0.5 + accuracyScore * 0.3 + rangeScore * 0.2
    : stabilityScore * 0.7 + rangeScore * 0.3
  
  return Math.min(100, Math.max(0, Math.round(finalScore)))
}

/**
 * 评估节奏 (Rhythm)
 * @param {Array<number>} volumeHistory - 音量历史记录（RMS值）
 * @param {number} sampleRate - 采样率
 * @param {number} duration - 录音时长（秒）
 * @returns {number} - 节奏得分 (0-100)
 */
function evaluateRhythm(volumeHistory, sampleRate, duration) {
  if (volumeHistory.length < 10) {
    // 数据不足时，根据时长给予基础分
    if (duration >= 10 && duration <= 120) {
      return 55 + Math.min(15, duration / 10) // 55-70分
    }
    return 50
  }
  
  // 检测节拍点（音量峰值）
  const threshold = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length * 0.7
  const beats = []
  
  for (let i = 1; i < volumeHistory.length - 1; i++) {
    if (volumeHistory[i] > threshold && 
        volumeHistory[i] > volumeHistory[i - 1] && 
        volumeHistory[i] > volumeHistory[i + 1]) {
      beats.push(i)
    }
  }
  
  if (beats.length < 2) {
    // 节拍点不足，根据音量变化给予基础分
    const volumeVariation = Math.max(...volumeHistory) - Math.min(...volumeHistory)
    const avgVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length
    if (volumeVariation > 0.1 && avgVolume > 0.05) {
      return 60 // 有音量变化，给予中等分数
    }
    return 50
  }
  
  // 计算节拍间隔的规律性
  const intervals = []
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i] - beats[i - 1])
  }
  
  // 计算间隔的标准差（相对于平均值）
  const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  let variance = 0
  for (let i = 0; i < intervals.length; i++) {
    variance += Math.pow(intervals[i] - meanInterval, 2)
  }
  variance = variance / intervals.length
  const relativeStdDev = meanInterval > 0 ? Math.sqrt(variance) / meanInterval : 1
  
  // 节奏稳定性得分
  const stabilityScore = Math.max(0, 100 - relativeStdDev * 150)
  
  // 根据节拍密度给予额外分数（节拍越多，节奏越明显）
  const beatDensity = beats.length / duration
  const densityScore = Math.min(20, beatDensity * 10) // 最多加20分
  
  const rhythmScore = Math.min(100, stabilityScore + densityScore)
  
  return Math.min(100, Math.max(0, Math.round(rhythmScore)))
}

/**
 * 评估音量 (Volume)
 * @param {Array<number>} rmsHistory - RMS 历史记录
 * @returns {number} - 音量得分 (0-100)
 */
function evaluateVolume(rmsHistory) {
  if (rmsHistory.length === 0) {
    return 50
  }
  
  // 计算平均音量
  const meanRMS = rmsHistory.reduce((a, b) => a + b, 0) / rmsHistory.length
  
  // 计算音量变化的一致性
  let variance = 0
  for (let i = 0; i < rmsHistory.length; i++) {
    variance += Math.pow(rmsHistory[i] - meanRMS, 2)
  }
  variance = variance / rmsHistory.length
  const relativeStdDev = meanRMS > 0 ? Math.sqrt(variance) / meanRMS : 1
  
  // 音量得分：音量适中（0.1-0.8之间）且稳定为佳
  let volumeLevelScore
  if (meanRMS < 0.1) {
    // 太小声：线性评分，0.05以下很低分，0.05-0.1逐渐提高
    volumeLevelScore = meanRMS < 0.05 ? meanRMS * 600 : 30 + (meanRMS - 0.05) * 400
  } else if (meanRMS > 0.8) {
    // 太大声：超过0.8开始降分
    volumeLevelScore = Math.max(0, 100 - (meanRMS - 0.8) * 500)
  } else {
    // 适中音量：0.2-0.6为最佳范围
    if (meanRMS >= 0.2 && meanRMS <= 0.6) {
      volumeLevelScore = 85 + (0.4 - Math.abs(meanRMS - 0.4)) * 15 // 85-100分
    } else if (meanRMS >= 0.1 && meanRMS < 0.2) {
      volumeLevelScore = 70 + (meanRMS - 0.1) * 150 // 70-85分
    } else {
      volumeLevelScore = 85 - (meanRMS - 0.6) * 150 // 85-70分
    }
  }
  
  const stabilityScore = Math.max(0, 100 - relativeStdDev * 200)
  
  // 音量动态范围得分（有变化是好事，但不要太大）
  const dynamicRange = Math.max(...rmsHistory) - Math.min(...rmsHistory)
  const dynamicScore = dynamicRange < 0.1 ? 60 : // 变化太小
                       dynamicRange > 0.7 ? 70 : // 变化太大
                       85 // 适中的动态范围
  
  const finalScore = volumeLevelScore * 0.5 + stabilityScore * 0.3 + dynamicScore * 0.2
  
  return Math.min(100, Math.max(0, Math.round(finalScore)))
}

/**
 * 评估音色 (Timbre)
 * @param {Array<number>} zcrHistory - ZCR 历史记录
 * @param {Array<Object>} spectrumHistory - 能量谱历史记录
 * @returns {number} - 音色得分 (0-100)
 */
function evaluateTimbre(zcrHistory, spectrumHistory) {
  if (zcrHistory.length === 0 || spectrumHistory.length === 0) {
    return 50
  }
  
  // ZCR 分析：人声的 ZCR 通常在 0.05-0.15 之间
  const meanZCR = zcrHistory.reduce((a, b) => a + b, 0) / zcrHistory.length
  let zcrScore
  
  // 放宽 ZCR 范围，避免过于严格导致分数过低
  if (meanZCR >= 0.03 && meanZCR <= 0.25) {
    // 最佳范围（0.08-0.12）
    if (meanZCR >= 0.08 && meanZCR <= 0.12) {
      zcrScore = 100 // 最佳
    } else if (meanZCR >= 0.05 && meanZCR <= 0.15) {
      zcrScore = 90 // 良好
    } else if (meanZCR >= 0.03 && meanZCR < 0.05) {
      zcrScore = 75 // 偏低但可接受
    } else if (meanZCR > 0.15 && meanZCR <= 0.25) {
      zcrScore = 75 // 偏高但可接受
    } else {
      zcrScore = 65 // 在范围内但偏离较远
    }
  } else {
    // 偏离范围，但不要降分太多，至少给基础分
    const deviation = meanZCR < 0.03 ? (0.03 - meanZCR) : (meanZCR - 0.25)
    // 降低降分幅度：原来 deviation * 2000 可能导致分数为0，现在改为更温和的降分
    zcrScore = Math.max(50, 100 - deviation * 500) // 至少50分
  }
  
  // 频谱分析：人声应该有一定的谐波结构
  let harmonicScore = 0
  let validSpectrumCount = 0
  
  for (let i = 0; i < Math.min(10, spectrumHistory.length); i++) {
    const spectrum = spectrumHistory[i]
    if (!spectrum || !spectrum.power) continue
    
    validSpectrumCount++
    
    // 检测是否有明显的基频和谐波
    const maxPower = Math.max(...spectrum.power)
    const maxPowerIndex = spectrum.power.indexOf(maxPower)
    const fundamentalFreq = spectrum.frequencies ? spectrum.frequencies[maxPowerIndex] : 0
    
    if (fundamentalFreq >= 80 && fundamentalFreq <= 1000) {
      // 检查谐波
      let harmonics = 0
      for (let h = 2; h <= 5; h++) {
        const harmonicFreq = fundamentalFreq * h
        const freqResolution = spectrum.sampleRate / (spectrum.power.length * 2)
        const harmonicIndex = Math.round(harmonicFreq / freqResolution)
        if (harmonicIndex < spectrum.power.length && 
            spectrum.power[harmonicIndex] > maxPower * 0.3) {
          harmonics++
        }
      }
      // 每个谐波加15分，最多4个谐波
      harmonicScore += Math.min(60, harmonics * 15)
    } else {
      // 即使不在理想频率范围，也给予基础分
      harmonicScore += 40
    }
  }
  
  if (validSpectrumCount > 0) {
    harmonicScore = harmonicScore / validSpectrumCount
  } else {
    // 如果没有有效频谱，给予基础分而不是0分
    harmonicScore = 50
  }
  
  // 确保谐波得分至少为50分
  harmonicScore = Math.max(50, harmonicScore)
  
  // 频谱丰富度得分（能量分布）
  let richnessScore = 50
  if (spectrumHistory.length > 0) {
    const avgSpectrum = spectrumHistory[0]
    if (avgSpectrum && avgSpectrum.power) {
      // 计算有效频率成分数量
      const threshold = Math.max(...avgSpectrum.power) * 0.1
      const activeFreqs = avgSpectrum.power.filter(p => p > threshold).length
      // 提高丰富度得分：即使频率成分较少，也给予基础分
      if (activeFreqs > 0) {
        richnessScore = Math.min(100, Math.max(50, activeFreqs * 2)) // 至少50分
      } else {
        richnessScore = 50 // 基础分
      }
    }
  }
  
  // 音色得分：ZCR、谐波和丰富度的综合
  let finalScore = zcrScore * 0.4 + harmonicScore * 0.4 + richnessScore * 0.2
  
  // 确保音色得分至少为50分（真唱的最低保障）
  // 如果各项指标都在合理范围内，给予额外加分
  if (finalScore < 50) {
    // 如果分数过低，至少给50分
    finalScore = 50
  } else if (finalScore >= 50 && finalScore < 70) {
    // 中等水平，给予小幅加分
    finalScore = finalScore + 5
  } else if (finalScore >= 70 && finalScore < 85) {
    // 良好水平，给予小幅加分
    finalScore = finalScore + 3
  }
  
  return Math.min(100, Math.max(50, Math.round(finalScore)))
}

/**
 * 检测录音时长是否合适
 * @param {number} duration - 录音时长（秒）
 * @returns {Object} - { isValid: boolean, penalty: number, reason: string }
 */
function checkDuration(duration) {
  // 理想时长：10-120秒
  const minDuration = 10 // 最短10秒（边界值，不降分）
  const maxDuration = 120 // 最长120秒（边界值，不降分）
  const optimalMin = 15 // 最佳最短15秒（边界值，不降分）
  const optimalMax = 90 // 最佳最长90秒（边界值，不降分）
  
  // 确保 duration 是数字
  duration = Number(duration) || 0
  
  let penalty = 0 // 降分比例（0-1）
  let reason = ''
  
  if (duration <= 0) {
    penalty = 0.5
    reason = '录音时长为0或无效'
  } else if (duration < minDuration) {
    // 过短：严重降分（<10秒）
    // 如果只有5秒，降约25%
    // 如果只有8秒，降约10%
    penalty = Math.min(0.5, (minDuration - duration) / minDuration * 0.5)
    reason = `录音时长过短（${Math.round(duration)}秒），建议至少${minDuration}秒`
  } else if (duration === minDuration) {
    // 正好10秒，不降分（边界值）
    penalty = 0
    reason = '录音时长合适'
  } else if (duration < optimalMin) {
    // 略短：轻微降分（10-15秒之间，不包括10和15）
    // 10秒不降分，15秒不降分，中间线性降分，最多降20%
    // 例如：12秒时，降分 = (15-12)/(15-10) * 0.2 = 0.12 = 12%
    penalty = (optimalMin - duration) / (optimalMin - minDuration) * 0.2
    reason = `录音时长略短（${Math.round(duration)}秒），建议${optimalMin}秒以上`
  } else if (duration >= optimalMin && duration <= optimalMax) {
    // 理想时长（15-90秒之间，包括边界值）
    penalty = 0
    reason = '录音时长合适'
  } else if (duration > optimalMax && duration < maxDuration) {
    // 略长：轻微降分（90-120秒之间，不包括90和120）
    // 90秒不降分，120秒不降分，中间线性降分，最多降20%
    // 例如：100秒时，降分 = (100-90)/(120-90) * 0.2 = 0.067 = 6.7%
    penalty = (duration - optimalMax) / (maxDuration - optimalMax) * 0.2
    reason = `录音时长略长（${Math.round(duration)}秒），建议${optimalMax}秒以内`
  } else if (duration === maxDuration) {
    // 正好120秒，不降分（边界值）
    penalty = 0
    reason = '录音时长合适'
  } else {
    // 过长：适度降分（>120秒）
    // 超过120秒，每多60秒降10%，最多降30%
    penalty = Math.min(0.3, (duration - maxDuration) / 60 * 0.1)
    reason = `录音时长过长（${Math.round(duration)}秒），建议不超过${maxDuration}秒`
  }
  
  // 确保 penalty 在 0-1 范围内
  penalty = Math.max(0, Math.min(1, penalty))
  
  console.log(`📏 时长检测: ${Math.round(duration)}秒, 降分: ${(penalty * 100).toFixed(1)}%, 原因: ${reason}`)
  
  return {
    isValid: penalty < 0.5, // 如果降分超过50%，认为时长不合适
    penalty: penalty,
    reason: reason
  }
}

/**
 * 检测旋律（音高变化）
 * @param {Array<number>} pitchHistory - 基音频率历史记录
 * @returns {Object} - { hasMelody: boolean, melodyScore: number, reason: string }
 */
function detectMelody(pitchHistory) {
  if (!pitchHistory || pitchHistory.length < 10) {
    return {
      hasMelody: false,
      melodyScore: 0,
      reason: '音频数据不足，无法检测旋律'
    }
  }
  
  // 过滤掉无效的基音（0或过小的值）
  const validPitches = pitchHistory.filter(p => p > 80 && p < 1000)
  
  if (validPitches.length < 5) {
    return {
      hasMelody: false,
      melodyScore: 0,
      reason: '有效基音数据不足'
    }
  }
  
  // 计算音高的变化幅度
  const pitchChanges = []
  for (let i = 1; i < validPitches.length; i++) {
    const change = Math.abs(validPitches[i] - validPitches[i - 1])
    const relativeChange = change / validPitches[i - 1] // 相对变化
    pitchChanges.push(relativeChange)
  }
  
  // 计算平均变化幅度
  const avgChange = pitchChanges.reduce((a, b) => a + b, 0) / pitchChanges.length
  
  // 计算音高范围（最高音 - 最低音）
  const minPitch = Math.min(...validPitches)
  const maxPitch = Math.max(...validPitches)
  const pitchRange = maxPitch - minPitch
  const relativeRange = pitchRange / minPitch // 相对音高范围
  
  // 计算音高的标准差（变化程度）
  const meanPitch = validPitches.reduce((a, b) => a + b, 0) / validPitches.length
  let variance = 0
  for (let i = 0; i < validPitches.length; i++) {
    variance += Math.pow(validPitches[i] - meanPitch, 2)
  }
  variance = variance / validPitches.length
  const stdDev = Math.sqrt(variance)
  const relativeStdDev = meanPitch > 0 ? stdDev / meanPitch : 0
  
  // 旋律判断标准：
  // 1. 平均变化幅度 > 0.05（5%的变化，说明有音高变化）
  // 2. 相对音高范围 > 0.2（20%的音高范围，说明有旋律起伏）
  // 3. 相对标准差 > 0.1（10%的标准差，说明音高有变化）
  
  // 说话的特征：音高变化小（<5%），音高范围窄（<15%），标准差小（<8%）
  const isSpeaking = avgChange < 0.05 && relativeRange < 0.15 && relativeStdDev < 0.08
  
  // 唱歌的特征：音高变化明显（>5%），音高范围较宽（>15%），标准差较大（>8%）
  const isSinging = avgChange >= 0.05 && relativeRange >= 0.15 && relativeStdDev >= 0.08
  
  // 计算旋律得分（0-100）
  const changeScore = Math.min(100, avgChange * 1000) // 变化幅度得分
  const rangeScore = Math.min(100, relativeRange * 500) // 音高范围得分
  const stdDevScore = Math.min(100, relativeStdDev * 1000) // 变化程度得分
  
  const melodyScore = (changeScore * 0.3 + rangeScore * 0.4 + stdDevScore * 0.3)
  
  let hasMelody = false
  let reason = ''
  
  if (isSpeaking) {
    hasMelody = false
    reason = '检测到说话特征（音高变化小），请尝试唱歌'
  } else if (isSinging) {
    hasMelody = true
    reason = '检测到明显的旋律变化'
  } else {
    // 介于两者之间，根据得分判断
    hasMelody = melodyScore >= 30
    reason = hasMelody ? '检测到一定的旋律变化' : '旋律变化不明显，可能是说话'
  }
  
  return {
    hasMelody: hasMelody,
    melodyScore: melodyScore,
    reason: reason,
    avgChange: avgChange,
    relativeRange: relativeRange,
    relativeStdDev: relativeStdDev
  }
}

/**
 * 检测是否为人声
 * @param {Array<Float32Array>} pcmFrames - PCM 数据帧数组
 * @param {number} sampleRate - 采样率
 * @returns {Object} - { isVoice: boolean, confidence: number, reason: string }
 */
function detectVoice(pcmFrames, sampleRate) {
  if (!pcmFrames || pcmFrames.length === 0) {
    return { isVoice: false, confidence: 0, reason: '无音频数据' }
  }
  
  // 合并所有 PCM 帧进行分析
  const totalSamples = pcmFrames.reduce((sum, frame) => sum + frame.length, 0)
  const allSamples = new Float32Array(totalSamples)
  let offset = 0
  for (let i = 0; i < pcmFrames.length; i++) {
    allSamples.set(pcmFrames[i], offset)
    offset += pcmFrames[i].length
  }
  
  // 分帧处理（每帧约 0.1 秒）
  const frameSize = Math.floor(sampleRate * 0.1)
  const frameCount = Math.floor(allSamples.length / frameSize)
  
  if (frameCount < 5) {
    return { isVoice: false, confidence: 0, reason: '音频时长太短' }
  }
  
  let voiceFrameCount = 0 // 检测到人声的帧数
  let totalPitchCount = 0 // 检测到基音的帧数
  let totalZCR = 0
  let totalRMS = 0
  let harmonicFrameCount = 0 // 有谐波结构的帧数
  
  // 分析每一帧
  for (let i = 0; i < frameCount; i++) {
    const start = i * frameSize
    const end = Math.min(start + frameSize, allSamples.length)
    const frame = allSamples.slice(start, end)
    
    // 计算 RMS（音量）
    const rms = calculateRMS(frame)
    totalRMS += rms
    
    // 如果音量太小，跳过（可能是静音）
    if (rms < 0.01) continue
    
    // 计算 ZCR（过零率）
    const zcr = calculateZCR(frame)
    totalZCR += zcr
    
    // FFT 分析
    const fftResult = fft(frame, sampleRate)
    const powerSpectrum = calculatePowerSpectrum(fftResult)
    
    // 检测基音频率
    const pitch = detectPitch(powerSpectrum, fftResult.frequencies, sampleRate)
    
    // 检查是否在人声频率范围内（80-1000Hz）
    if (pitch >= 80 && pitch <= 1000) {
      totalPitchCount++
      
      // 检查谐波结构（人声特征）
      let hasHarmonics = false
      for (let h = 2; h <= 5; h++) {
        const harmonicFreq = pitch * h
        const harmonicIndex = Math.round(harmonicFreq / (sampleRate / (powerSpectrum.length * 2)))
        if (harmonicIndex < powerSpectrum.length && 
            powerSpectrum[harmonicIndex] > powerSpectrum[Math.round(pitch / (sampleRate / (powerSpectrum.length * 2)))] * 0.3) {
          hasHarmonics = true
          break
        }
      }
      
      if (hasHarmonics) {
        harmonicFrameCount++
      }
      
      // 检查 ZCR 是否在人声范围内（0.05-0.15）
      if (zcr >= 0.05 && zcr <= 0.15) {
        voiceFrameCount++
      }
    }
  }
  
  // 计算平均 ZCR 和 RMS
  const avgZCR = totalZCR / frameCount
  const avgRMS = totalRMS / frameCount
  
  // 计算人声置信度
  const pitchRatio = totalPitchCount / frameCount // 有基音的帧比例
  const voiceFrameRatio = voiceFrameCount / frameCount // 符合人声特征的帧比例
  const harmonicRatio = harmonicFrameCount / frameCount // 有谐波的帧比例
  
  // 人声判断标准：
  // 1. 至少30%的帧检测到基音频率
  // 2. 至少20%的帧符合人声特征（基音+ZCR范围）
  // 3. 平均ZCR在人声范围内
  // 4. 有足够的谐波结构
  const isVoice = pitchRatio >= 0.3 && 
                  voiceFrameRatio >= 0.2 && 
                  avgZCR >= 0.05 && avgZCR <= 0.15 &&
                  harmonicRatio >= 0.15
  
  // 计算置信度（0-1）
  const confidence = Math.min(1, 
    pitchRatio * 0.3 + 
    voiceFrameRatio * 0.3 + 
    harmonicRatio * 0.2 + 
    (avgZCR >= 0.05 && avgZCR <= 0.15 ? 0.2 : 0)
  )
  
  let reason = ''
  if (!isVoice) {
    if (pitchRatio < 0.3) {
      reason = '未检测到人声基音频率'
    } else if (voiceFrameRatio < 0.2) {
      reason = '人声特征不明显'
    } else if (avgZCR < 0.05 || avgZCR > 0.15) {
      reason = '音频特征不符合人声'
    } else if (harmonicRatio < 0.15) {
      reason = '缺少人声谐波结构'
    } else {
      reason = '非人声音频'
    }
  } else {
    reason = '检测到人声'
  }
  
  return { isVoice, confidence, reason }
}

/**
 * 分析音频数据
 * @param {Array<Float32Array>} pcmFrames - PCM 数据帧数组
 * @param {number} sampleRate - 采样率
 * @param {number} duration - 录音时长（秒）
 * @param {boolean} enableVoiceDetection - 是否启用人声检测，默认 false
 * @param {boolean} enableMelodyDetection - 是否启用旋律检测，默认 false
 * @returns {Object} - 分析结果
 */
function analyzeAudioFeatures(pcmFrames, sampleRate, duration, enableVoiceDetection = false, enableMelodyDetection = false) {
  // 确保 enableVoiceDetection 是布尔值
  enableVoiceDetection = enableVoiceDetection === true
  enableMelodyDetection = enableMelodyDetection === true
  console.log('📊 analyzeAudioFeatures 接收到的 enableVoiceDetection:', enableVoiceDetection, 'enableMelodyDetection:', enableMelodyDetection)
  
  if (!pcmFrames || pcmFrames.length === 0) {
    return {
      score: 0,
      pitch: 0,
      rhythm: 0,
      volume: 0,
      timbre: 0,
      analysis: {},
      isVoice: false,
      voiceReason: '无音频数据'
    }
  }
  
  // 1. 首先检测录音时长
  const durationCheck = checkDuration(duration)
  // checkDuration 函数内部已经有日志输出
  
  // 2. 检测是否为人声（如果启用了人声检测）
  let voiceDetection = { isVoice: true, confidence: 1, reason: '人声检测已禁用' }
  
  if (enableVoiceDetection === true) {
    console.log('🎤 人声检测已启用，开始检测...')
    voiceDetection = detectVoice(pcmFrames, sampleRate)
    console.log('🎤 人声检测结果:', voiceDetection.reason, '置信度:', voiceDetection.confidence)
  } else {
    console.log('🎤 人声检测已禁用，跳过人声检测')
  }
  
  // 如果启用了人声检测且检测到非人声，返回低分
  if (enableVoiceDetection && !voiceDetection.isVoice) {
    console.warn('⚠️ 检测到非人声音频:', voiceDetection.reason)
    
    // 根据置信度给分（0-30分）
    const lowScore = Math.round(voiceDetection.confidence * 30)
    
    // 应用时长降分
    const finalLowScore = Math.round(lowScore * (1 - durationCheck.penalty))
    
    return {
      score: finalLowScore,
      pitch: Math.round(finalLowScore * 0.8),
      rhythm: Math.round(finalLowScore * 0.9),
      volume: Math.round(finalLowScore * 0.7),
      timbre: Math.round(finalLowScore * 0.6),
      duration: duration,
      analysis: {
        pitchAccuracy: finalLowScore * 0.8,
        rhythmStability: finalLowScore * 0.9,
        volumeConsistency: finalLowScore * 0.7,
        timbreQuality: finalLowScore * 0.6
      },
      isVoice: false,
      voiceReason: voiceDetection.reason,
      voiceConfidence: voiceDetection.confidence,
      durationCheck: durationCheck,
      melodyCheck: { hasMelody: false, melodyScore: 0, reason: '未检测到人声' }
    }
  }
  
  // 只有当人声检测启用时才显示此日志
  if (enableVoiceDetection) {
    console.log('✅ 检测到人声，置信度:', voiceDetection.confidence)
  }
  
  // 合并所有 PCM 帧
  const totalSamples = pcmFrames.reduce((sum, frame) => sum + frame.length, 0)
  const allSamples = new Float32Array(totalSamples)
  let offset = 0
  for (let i = 0; i < pcmFrames.length; i++) {
    allSamples.set(pcmFrames[i], offset)
    offset += pcmFrames[i].length
  }
  
  // 分帧处理（每帧约 0.1 秒）
  const frameSize = Math.floor(sampleRate * 0.1) // 0.1 秒一帧
  const frameCount = Math.floor(allSamples.length / frameSize)
  
  const rmsHistory = []
  const zcrHistory = []
  const pitchHistory = []
  const volumeHistory = []
  const spectrumHistory = []
  
  // 处理每一帧
  for (let i = 0; i < frameCount; i++) {
    const start = i * frameSize
    const end = Math.min(start + frameSize, allSamples.length)
    const frame = allSamples.slice(start, end)
    
    // 计算 RMS
    const rms = calculateRMS(frame)
    rmsHistory.push(rms)
    volumeHistory.push(rms)
    
    // 计算 ZCR
    const zcr = calculateZCR(frame)
    zcrHistory.push(zcr)
    
    // FFT 分析
    const fftResult = fft(frame, sampleRate)
    const powerSpectrum = calculatePowerSpectrum(fftResult)
    
    // 检测基音频率
    const pitch = detectPitch(powerSpectrum, fftResult.frequencies, sampleRate)
    if (pitch > 0) {
      pitchHistory.push(pitch)
    }
    
    // 保存频谱数据
    spectrumHistory.push({
      power: Array.from(powerSpectrum),
      frequencies: Array.from(fftResult.frequencies),
      sampleRate: sampleRate
    })
  }
  
  // 3. 检测旋律（音高变化）- 根据开关决定是否检测
  let melodyCheck
  if (enableMelodyDetection) {
    melodyCheck = detectMelody(pitchHistory)
    console.log('🎵 旋律检测:', melodyCheck.reason, '旋律得分:', melodyCheck.melodyScore)
  } else {
    melodyCheck = { 
      hasMelody: true, 
      melodyScore: 50, 
      reason: '旋律检测已禁用' 
    }
    console.log('🎵 旋律检测已禁用，跳过检测')
  }
  
  // 评估各项指标
  const pitchScore = evaluatePitchAccuracy(pitchHistory)
  const rhythmScore = evaluateRhythm(volumeHistory, sampleRate, duration)
  const volumeScore = evaluateVolume(rmsHistory)
  const timbreScore = evaluateTimbre(zcrHistory, spectrumHistory)
  
  // 计算基础总分（加权平均）
  // 提高基础分：确保真唱能获得合理分数（至少70分以上，入门模式）
  // 如果各项指标都在合理范围内，给予基础加分
  const avgScore = (pitchScore + rhythmScore + volumeScore + timbreScore) / 4
  let baseScore = Math.round(
    pitchScore * 0.3 + 
    rhythmScore * 0.25 + 
    volumeScore * 0.25 + 
    timbreScore * 0.2
  )
  
  // 优化基础分计算：在入门模式（未开启高级配置）时，给予更宽松的评分
  // 如果平均分在合理范围内（50-100），给予基础加分
  // 确保真唱至少能获得70分以上的基础分（入门模式）
  if (avgScore >= 50 && avgScore < 70) {
    // 中等水平，给予15-20分的基础加分（提高）
    baseScore = Math.round(baseScore + 18)
  } else if (avgScore >= 70 && avgScore < 85) {
    // 良好水平，给予8-12分的基础加分（提高）
    baseScore = Math.round(baseScore + 10)
  } else if (avgScore >= 85) {
    // 优秀水平，保持原分或小幅加分
    baseScore = Math.round(baseScore + 5)
  } else if (avgScore >= 40 && avgScore < 50) {
    // 较低水平，给予更多基础分提升（至少保证有基础分）
    baseScore = Math.round(baseScore + 15)
  } else {
    // 极低水平，也给予基础分提升
    baseScore = Math.round(baseScore + 12)
  }
  
  // 确保基础分至少为70分（真唱的最低保障，入门模式）
  // 如果平均分>=45，至少给70分
  if (baseScore < 70 && avgScore >= 45) {
    baseScore = 70
  } else if (baseScore < 65 && avgScore >= 40) {
    // 如果平均分>=40，至少给65分
    baseScore = 65
  }
  
  console.log(`📊 基础评分: ${baseScore}分 (音准:${pitchScore}, 节奏:${rhythmScore}, 音量:${volumeScore}, 音色:${timbreScore}, 平均:${avgScore.toFixed(1)})`)
  
  // 应用各种降分因素
  let finalScore = baseScore
  let penaltyReasons = []
  
  // 1. 人声置信度降分（仅当人声检测启用时）
  if (enableVoiceDetection && voiceDetection.confidence < 0.7) {
    const confidencePenalty = 1 - (0.5 + voiceDetection.confidence * 0.5)
    finalScore = Math.round(finalScore * (1 - confidencePenalty))
    penaltyReasons.push('人声置信度较低')
    console.warn('⚠️ 人声置信度较低，已降低评分')
  }
  
  // 2. 时长降分（进一步降低降分幅度，避免分数过低）
  if (durationCheck.penalty > 0) {
    const scoreBeforePenalty = finalScore
    // 进一步降低降分幅度：最多降15%（入门模式更宽松）
    // 如果时长只是略短或略长，降分更少
    const adjustedPenalty = Math.min(0.15, durationCheck.penalty * 0.4)
    finalScore = Math.round(finalScore * (1 - adjustedPenalty))
    const scoreReduction = scoreBeforePenalty - finalScore
    penaltyReasons.push(durationCheck.reason)
    console.warn(`⚠️ 时长不合适，降分: ${(adjustedPenalty * 100).toFixed(1)}%`)
    console.warn(`   降分前: ${scoreBeforePenalty}分, 降分后: ${finalScore}分, 减少: ${scoreReduction}分`)
  } else {
    console.log('✅ 时长合适，不降分')
  }
  
  // 3. 旋律降分（仅在启用旋律检测时应用，降低降分幅度）
  if (enableMelodyDetection) {
    if (!melodyCheck.hasMelody) {
      // 根据旋律得分降分（降低降分幅度：最多降15%，入门模式更宽松）
      const melodyPenalty = Math.min(0.15, (30 - melodyCheck.melodyScore) / 30 * 0.15) // 最多降15%
      finalScore = Math.round(finalScore * (1 - melodyPenalty))
      penaltyReasons.push(melodyCheck.reason)
      console.warn('⚠️ 旋律不明显，降分:', melodyPenalty * 100 + '%')
    } else if (melodyCheck.melodyScore < 50) {
      // 旋律得分较低，轻微降分（最多降5%，入门模式更宽松）
      const melodyPenalty = (50 - melodyCheck.melodyScore) / 50 * 0.05 // 最多降5%
      finalScore = Math.round(finalScore * (1 - melodyPenalty))
      console.warn('⚠️ 旋律得分较低，轻微降分:', melodyPenalty * 100 + '%')
    }
  }
  
  // 确保分数在合理范围内
  // 在入门模式（未开启高级配置）时，确保最低分不低于60分（真唱保障）
  if (!enableVoiceDetection && !enableMelodyDetection) {
    // 入门模式：确保最低分不低于60分
    finalScore = Math.max(60, Math.min(100, finalScore))
  } else {
    finalScore = Math.max(0, Math.min(100, finalScore))
  }
  
  return {
    score: finalScore,
    pitch: Math.round(pitchScore),
    rhythm: Math.round(rhythmScore),
    volume: Math.round(volumeScore),
    timbre: Math.round(timbreScore),
    duration: duration,
    analysis: {
      pitchAccuracy: pitchScore,
      rhythmStability: rhythmScore,
      volumeConsistency: volumeScore,
      timbreQuality: timbreScore,
      averagePitch: pitchHistory.length > 0 ? 
        pitchHistory.reduce((a, b) => a + b, 0) / pitchHistory.length : 0,
      pitchHistory: pitchHistory.slice(0, 100), // 只保留前100个点
      rmsHistory: rmsHistory.slice(0, 100),
      zcrHistory: zcrHistory.slice(0, 100)
    },
    isVoice: true,
    voiceReason: voiceDetection.reason,
    voiceConfidence: voiceDetection.confidence,
    durationCheck: durationCheck,
    melodyCheck: melodyCheck,
    penaltyReasons: penaltyReasons
  }
}

module.exports = {
  fft,
  calculateRMS,
  calculateZCR,
  calculatePowerSpectrum,
  detectPitch,
  evaluatePitchAccuracy,
  evaluateRhythm,
  evaluateVolume,
  evaluateTimbre,
  checkDuration,
  detectMelody,
  detectVoice,
  analyzeAudioFeatures
}

