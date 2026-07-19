// services/ai.service.js - 完整版

const { client, DEFAULT_MODEL } = require('../config/ai');
const { safeStringify } = require('../utils/json');

// MiniMax API 配置
const MINIMAX_API_KEY = 'sk-cp-Uii14ftLIHZqKbAoquh-32pHqJpDLcWXBQiGBNhSVFGExDdEn2AZ5GJC9lC7rsf2MfkqahR2Sb_JZKl40sE7Wxu07bm7vEripjloPH-rgmSuV1RAibdkFdo';
const MINIMAX_API_URL = 'https://api.minimaxi.com/anthropic/v1/messages';
const MINIMAX_MODEL = 'minimaxi-plus';

// 本地题库（降级方案）
const LOCAL_QUESTION_BANK = {
  '计算机组成原理': [
    { question: 'CPU中的ALU主要功能是？', options: ['存储数据', '执行算术和逻辑运算', '控制指令流', '管理内存'], answer: '执行算术和逻辑运算' },
    { question: '在冯·诺依曼体系结构中，指令和数据都以什么形式存储？', options: ['十进制', '二进制', '八进制', '十六进制'], answer: '二进制' },
    { question: '下列关于Cache的叙述中，正确的是？', options: ['Cache容量越大速度越快', 'Cache利用程序局部性原理', 'Cache可以替代主存', 'Cache只能用SRAM实现'], answer: 'Cache利用程序局部性原理' }
  ],
  '操作系统': [
    { question: '进程和线程的主要区别是？', options: ['进程是资源分配单位，线程是调度单位', '线程拥有独立地址空间', '进程切换开销比线程小', '一个进程只能有一个线程'], answer: '进程是资源分配单位，线程是调度单位' },
    { question: '产生死锁的四个必要条件中，不包括？', options: ['互斥', '请求和保持', '抢占', '循环等待'], answer: '抢占' },
    { question: '虚拟内存技术的核心思想是？', options: ['扩大物理内存', '用磁盘空间扩展逻辑地址空间', '加快内存访问速度', '减少内存碎片'], answer: '用磁盘空间扩展逻辑地址空间' }
  ],
  '进程管理': [
    { question: '进程的三种基本状态不包括？', options: ['就绪态', '执行态', '阻塞态', '挂起态'], answer: '挂起态' },
    { question: '下列哪种进程调度算法可能导致"饥饿"现象？', options: ['先来先服务', '短作业优先', '时间片轮转', '多级反馈队列'], answer: '短作业优先' }
  ],
  '内存管理': [
    { question: 'LRU页面置换算法淘汰的页面是？', options: ['最近最久未使用的页面', '最先进入内存的页面', '最近最少访问的页面', '最不经常使用的页面'], answer: '最近最久未使用的页面' },
    { question: '虚拟地址到物理地址的转换由什么完成？', options: ['编译器', '链接器', 'MMU', 'DMA控制器'], answer: 'MMU' }
  ]
};

// 🔧 阶段测试本地题库
const STAGE_QUESTION_BANK = {
  '基础入门': [
    { question: '在冯·诺依曼体系结构中，指令和数据都以什么形式存储？', options: ['十进制', '二进制', '八进制', '十六进制'], answer: 'B' },
    { question: 'CPU中的ALU主要功能是？', options: ['存储数据', '执行算术和逻辑运算', '控制指令流', '管理内存'], answer: 'B' },
    { question: '下列关于Cache的叙述中，正确的是？', options: ['Cache容量越大速度越快', 'Cache利用程序局部性原理', 'Cache可以替代主存', 'Cache只能用SRAM实现'], answer: 'B' },
    { question: '计算机中总线的基本功能是？', options: ['存储数据', '连接各功能部件并传输信息', '执行指令', '控制中断'], answer: 'B' },
    { question: '指令周期是指？', options: ['CPU从主存取出一条指令并执行的时间', 'CPU执行一条指令的时间', 'CPU从主存取出一条指令的时间', 'CPU完成一次运算的时间'], answer: 'A' },
    { question: '在计算机系统中，以下哪个不是输入设备？', options: ['键盘', '鼠标', '显示器', '扫描仪'], answer: 'C' },
    { question: '计算机中存储器的基本单位是？', options: ['位（bit）', '字节（Byte）', '字（Word）', '千字节（KB）'], answer: 'B' },
    { question: '以下哪种进制是计算机内部使用的？', options: ['十进制', '二进制', '八进制', '十六进制'], answer: 'B' }
  ],
  '操作系统': [
    { question: '进程和线程的主要区别是？', options: ['进程是资源分配单位，线程是调度单位', '线程拥有独立地址空间', '进程切换开销比线程小', '一个进程只能有一个线程'], answer: 'A' },
    { question: '产生死锁的四个必要条件中，不包括？', options: ['互斥', '请求和保持', '抢占', '循环等待'], answer: 'C' },
    { question: '虚拟内存技术的核心思想是？', options: ['扩大物理内存', '用磁盘空间扩展逻辑地址空间', '加快内存访问速度', '减少内存碎片'], answer: 'B' },
    { question: '下列哪种进程调度算法可能导致"饥饿"现象？', options: ['先来先服务', '短作业优先', '时间片轮转', '多级反馈队列'], answer: 'B' },
    { question: '文件系统中，索引分配方式的优点是？', options: ['无需额外空间', '支持随机访问', '不会产生外部碎片', '实现最简单'], answer: 'B' },
    { question: '进程间通信（IPC）的方式不包括？', options: ['共享内存', '管道', '信号量', '虚拟内存'], answer: 'D' },
    { question: '操作系统中，临界区是指？', options: ['访问共享资源的代码段', '操作系统内核代码', '用户程序代码', 'I/O处理代码'], answer: 'A' }
  ],
  '体系结构': [
    { question: '流水线中出现数据冒险（Data Hazard）的原因是？', options: ['指令之间无依赖', '后续指令需要前面指令的结果', '分支预测失败', '内存访问冲突'], answer: 'B' },
    { question: 'RISC和CISC的主要区别是？', options: ['RISC指令数量更多', 'RISC指令格式更简单、执行更快', 'CISC不使用流水线', 'RISC不能实现复杂功能'], answer: 'B' },
    { question: 'MESI协议中，"M"状态表示？', options: ['共享', '无效', '修改', '独占'], answer: 'C' },
    { question: '多核处理器中，SMP是指？', options: ['单处理器多线程', '对称多处理器', '非一致性存储访问', '向量处理器'], answer: 'B' },
    { question: 'Cache映射方式中，全相联映射的优点是？', options: ['硬件实现简单', '冲突率最低', '查找速度快', '适合大容量Cache'], answer: 'B' }
  ],
  '系统实战': [
    { question: 'Linux中，fork()系统调用的返回值是？', options: ['子进程中返回0，父进程中返回子进程PID', '都返回0', '都返回子进程PID', '都返回-1'], answer: 'A' },
    { question: '嵌入式系统中，中断处理的主要流程是？', options: ['保存现场→处理中断→恢复现场', '直接处理中断', '关闭中断→处理→开中断', '切换到用户态处理'], answer: 'A' },
    { question: '设备驱动程序运行在什么特权级？', options: ['用户态', '内核态', '虚拟8086模式', '实模式'], answer: 'B' },
    { question: 'DMA方式传输数据的特点是？', options: ['需要CPU参与每次传输', '不经CPU直接在I/O设备与内存间传输', '只能传输少量数据', '不占用总线'], answer: 'B' }
  ]
};

module.exports = {
  /**
   * 生成题目（使用 MiniMax AI）
   */
  async generateQuestions(topic, count = 5, difficulty = '中等') {
    const prompt = `请生成${count}道关于"${topic}"的${difficulty}难度选择题。
请以JSON数组格式返回，每道题包含：
- question: 题目文本
- options: 4个选项的数组
- answer: 正确答案的完整文本

要求：
1. 每道题4个选项
2. 答案要正确合理
3. 适合考研408或计算机专业学生
4. 只返回JSON数组，不要其他解释

返回格式示例：
[
  {"question": "题目", "options": ["A选项", "B选项", "C选项", "D选项"], "answer": "正确答案"}
]`;

    try {
      const response = await fetch(MINIMAX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MINIMAX_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MINIMAX_MODEL,
          max_tokens: 2048,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const result = await response.json();
      console.log('[MiniMax API 响应]', result);

      if (result.content && result.content[0]?.text) {
        const content = result.content[0].text;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0]);
          return Array.isArray(questions) ? questions : [];
        }
      }
      return this._getLocalQuestions(topic, count);
    } catch (error) {
      console.error('❌ MiniMax AI 生成题目失败:', error.message);
      return this._getLocalQuestions(topic, count);
    }
  },

  /**
   * 🔧 新增：生成阶段小测试（使用 MiniMax AI）
   */
  async generateStageQuiz(topic, difficulty, count = 5, weakPoints = []) {
    // 根据薄弱点调整题目重点
    const focusHint = weakPoints.length > 0
      ? `重点关注这些薄弱知识点：${weakPoints.slice(0, 3).join('、')}。请针对这些知识点出题。`
      : '';

    const prompt = `请生成${count}道关于"${topic}"的${difficulty}难度选择题，用于阶段学习测试。

${focusHint}

要求：
1. 每道题4个选项
2. 包含正确答案（用字母A-D表示）
3. 题目要有针对性，考察核心概念理解
4. 适合计算机专业学生

请以JSON数组格式返回：
[
  {
    "question": "题目文本",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "answer": "A"
  }
]

只返回JSON数组，不要其他解释。`;

    try {
      const response = await fetch(MINIMAX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MINIMAX_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MINIMAX_MODEL,
          max_tokens: 2048,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const result = await response.json();

      if (result.content && result.content[0]?.text) {
        const content = result.content[0].text;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0]);
          return Array.isArray(questions) ? questions : this._getLocalStageQuestions(topic, count);
        }
      }
      return this._getLocalStageQuestions(topic, count);
    } catch (error) {
      console.error('❌ MiniMax AI 生成阶段测试失败:', error.message);
      return this._getLocalStageQuestions(topic, count);
    }
  },

  /**
   * 生成思维导图（使用 MiniMax AI）
   */
  async generateMindmap(topic, questions) {
    const prompt = `你是一位数据结构与算法的教学专家。请根据以下练习题目，生成一个简洁的思维导图结构。

相关主题：${topic}
练习题目：
${questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

请以JSON格式返回思维导图数据：
{
  "topic": "中心主题名称",
  "branches": [
    {
      "label": "分支主题",
      "color": "#颜色代码",
      "children": ["子节点1", "子节点2", "子节点3"]
    }
  ]
}

要求：
1. 分支数量 3-5 个
2. 每个分支 2-4 个子节点
3. 颜色使用柔和的色调：#22C55E(绿)、#3B82F6(蓝)、#F59E0B(黄)、#EF4444(红)、#8B5CF6(紫)
4. 子节点内容要简洁，概括核心知识点
5. 只返回 JSON，不要其他解释

返回格式示例：
{
  "topic": "排序算法",
  "branches": [
    {"label": "比较类排序", "color": "#22C55E", "children": ["冒泡O(n²)", "选择O(n²)", "插入O(n²)"]},
    {"label": "高效排序", "color": "#3B82F6", "children": ["快排O(nlogn)", "归并O(nlogn)", "堆排O(nlogn)"]}
  ]
}`;

    try {
      const response = await fetch(MINIMAX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MINIMAX_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MINIMAX_MODEL,
          max_tokens: 2048,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const result = await response.json();
      console.log('[MiniMax 思维导图 API 响应]', result);

      if (result.content && result.content[0]?.text) {
        const content = result.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const mindmapData = JSON.parse(jsonMatch[0]);
          return mindmapData;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ MiniMax AI 生成思维导图失败:', error.message);
      return null;
    }
  },

  /**
   * 生成学习计划（基于用户画像）
   */
  async generateLearningPlan(userId, profile, weakPoints, dailyMinutes = 120) {
    if (!process.env.ZHIPU_API_KEY) {
      console.warn('⚠️ 未配置 ZHIPU_API_KEY，使用本地计划生成');
      return this._getLocalLearningPlan(profile, weakPoints, dailyMinutes);
    }

    const score = profile?.total_score || 0;
    const level = profile?.level_name || '入门级';
    const weakStr = weakPoints.length > 0 ? weakPoints.slice(0, 5).join('、') : '未检测到薄弱点';

    const prompt = `你是一位考研408学习规划专家。请根据以下学生信息生成一份学习计划：

【学生信息】
- 综合得分：${score}分
- 当前水平：${level}
- 薄弱知识点：${weakStr}
- 每日可学习时间：${dailyMinutes}分钟

【要求】
1. 针对薄弱知识点制定计划
2. 分4周阶段，每周有明确目标
3. 每日任务具体可执行
4. 包含学习、练习、复习三种类型

【输出格式】
请严格按照以下JSON格式返回，不要添加任何其他文字：
{
  "goal": "总目标（一句话）",
  "stages": [
    { "week": 1, "focus": "第1周重点内容", "tasks": ["任务1", "任务2", "任务3"] },
    { "week": 2, "focus": "第2周重点内容", "tasks": ["任务1", "任务2", "任务3"] },
    { "week": 3, "focus": "第3周重点内容", "tasks": ["任务1", "任务2", "任务3"] },
    { "week": 4, "focus": "第4周重点内容", "tasks": ["任务1", "任务2", "任务3"] }
  ],
  "dailyTasks": [
    { "time": "09:00-10:00", "task": "学习任务", "type": "learning" },
    { "time": "10:30-11:30", "task": "练习任务", "type": "practice" },
    { "time": "14:00-15:00", "task": "复习任务", "type": "review" },
    { "time": "19:00-20:00", "task": "综合任务", "type": "review" }
  ]
}`;

    try {
      const response = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this._getLocalLearningPlan(profile, weakPoints, dailyMinutes);
    } catch (error) {
      console.error('❌ AI 生成学习计划失败:', error.message);
      return this._getLocalLearningPlan(profile, weakPoints, dailyMinutes);
    }
  },

  /**
   * 生成变式训练题
   */
  async generateVariantQuestions(wrongQuestion, count = 2) {
    if (!process.env.ZHIPU_API_KEY) {
      return this._getLocalVariants(wrongQuestion);
    }

    const prompt = `请根据以下错题生成${count}道变式训练题：

【原题】
${wrongQuestion.question}

【正确答案】
${wrongQuestion.correct}

【错误分析】
${wrongQuestion.analysis || '需要加强理解和练习'}

【要求】
1. 变式题要考察相同知识点
2. 从不同角度出题
3. 难度适中

【输出格式】
请严格按照以下JSON数组格式返回：
[
  {
    "question": "变式题1文本",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "answer": "正确答案"
  }
]`;

    try {
      const response = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8
      });

      const content = response.choices[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this._getLocalVariants(wrongQuestion);
    } catch (error) {
      console.error('❌ AI 生成变式题失败:', error.message);
      return this._getLocalVariants(wrongQuestion);
    }
  },

  /**
   * 生成学习建议
   */
  async generateAdvice(weakPoints, testScore) {
    if (!process.env.ZHIPU_API_KEY) {
      const level = testScore >= 80 ? '进阶级' : testScore >= 60 ? '中级' : '入门级';
      return `根据你的测评结果，当前处于${level}水平。建议重点加强 ${weakPoints.slice(0, 3).join('、')} 的学习，每天坚持练习相关题目。`;
    }

    const prompt = `用户测试得分${testScore}分，薄弱知识点包括：${weakPoints.join('、')}。
请生成一段简洁的学习建议（100字以内），帮助用户提升。

要求：
1. 语气友好专业
2. 给出具体可执行的建议
3. 只返回建议文本，不要其他内容`;

    try {
      const response = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8
      });

      return response.choices[0]?.message?.content || `建议重点加强 ${weakPoints.slice(0, 3).join('、')} 的学习，每日练习3道以上相关题目。`;
    } catch (error) {
      console.error('❌ AI 生成建议失败:', error.message);
      return `建议重点加强 ${weakPoints.slice(0, 3).join('、')} 的学习，每日练习3道以上相关题目。`;
    }
  },

  /**
   * 通用对话
   */
  async chat(messages) {
    const MINIMAX_API_KEY = 'sk-cp-Uii14ftLIHZqKbAoquh-32pHqJpDLcWXBQiGBNhSVFGExDdEn2AZ5GJC9lC7rsf2MfkqahR2Sb_JZKl40sE7Wxu07bm7vEripjloPH-rgmSuV1RAibdkFdo';

    try {
      const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MINIMAX_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'minimaxi-plus',
          max_tokens: 512,
          messages: messages
        })
      });
      const data = await response.json();
      return data.content?.[0]?.text || '抱歉，我没有理解你的意思。';
    } catch (error) {
      console.error('❌ AI 对话失败:', error.message);
      const lastMsg = messages[messages.length - 1]?.content || '';
      return this._generateLocalReply(lastMsg);
    }
  },

  // ========== 本地降级方法 ==========

  _getLocalQuestions(topic, count) {
    let questions = [];
    for (const [key, qs] of Object.entries(LOCAL_QUESTION_BANK)) {
      if (topic.includes(key) || key.includes(topic)) {
        questions = qs;
        break;
      }
    }
    if (questions.length === 0) {
      questions = [
        { question: '以下哪种结构是先进后出（LIFO）的？', options: ['栈', '队列', '数组', '链表'], answer: '栈' },
        { question: '以下哪种排序算法是稳定的？', options: ['归并排序', '快速排序', '堆排序', '选择排序'], answer: '归并排序' }
      ];
    }
    return questions.slice(0, Math.min(count, questions.length));
  },

  /**
   * 🔧 新增：获取本地阶段测试题目
   */
  _getLocalStageQuestions(stageName, count = 5) {
    // 查找匹配的阶段题库
    let questions = [];
    for (const [key, qs] of Object.entries(STAGE_QUESTION_BANK)) {
      if (stageName.includes(key) || key.includes(stageName)) {
        questions = qs;
        break;
      }
    }
    
    // 如果没有匹配，使用默认题库
    if (questions.length === 0) {
      questions = [
        { question: '计算机系统中，CPU的主要功能是？', options: ['存储数据', '执行指令', '管理内存', '输入输出'], answer: 'B' },
        { question: '以下哪个是操作系统的基本功能？', options: ['进程管理', '数据库管理', '网络管理', '图像处理'], answer: 'A' },
        { question: '计算机体系结构中，流水线技术的主要目的是？', options: ['提高CPU频率', '提高指令吞吐率', '减少功耗', '简化设计'], answer: 'B' },
        { question: 'Cache的主要作用是？', options: ['扩大内存容量', '提高CPU访问速度', '减少磁盘空间', '提高网络速度'], answer: 'B' },
        { question: '进程调度中，时间片轮转算法属于？', options: ['抢占式调度', '非抢占式调度', '优先级调度', '多级队列调度'], answer: 'A' }
      ];
    }

    // 随机打乱并截取
    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  },

  _getLocalLearningPlan(profile, weakPoints, dailyMinutes) {
    const focus = weakPoints.length > 0 ? weakPoints[0] : '数据结构';
    return {
      goal: `掌握${focus}核心知识，提升综合能力`,
      stages: [
        { week: 1, focus: `${focus}基础概念`, tasks: [`学习${focus}基本概念`, `完成${focus}章节练习`, '整理学习笔记'] },
        { week: 2, focus: `${focus}进阶应用`, tasks: [`${focus}典型例题分析`, `${focus}解题技巧训练`, '错题整理'] },
        { week: 3, focus: `${focus}综合练习`, tasks: [`${focus}综合题训练`, '模拟测试', '查漏补缺'] },
        { week: 4, focus: '全面复习', tasks: ['错题回顾', '知识点总结', '模拟考试'] }
      ],
      dailyTasks: [
        { time: '09:00-10:00', task: `${focus}学习`, type: 'learning' },
        { time: '10:30-11:30', task: `${focus}练习`, type: 'practice' },
        { time: '14:00-15:00', task: '错题复习', type: 'review' },
        { time: '19:00-20:00', task: '综合复习', type: 'review' }
      ]
    };
  },

  _getLocalVariants(wrongQuestion) {
    const topic = wrongQuestion.topic || '该知识点';
    return [
      { 
        question: `变式1：关于${topic}，下列说法正确的是？`, 
        options: ['只能在特定场景使用', '有多种实现方式', '不需要系统学习', '已经被淘汰'], 
        answer: '有多种实现方式' 
      },
      { 
        question: `变式2：${topic}在实际应用中的主要挑战是？`, 
        options: ['性能优化', '代码复杂度', '学习曲线陡峭', '以上都是'], 
        answer: '以上都是' 
      }
    ];
  },

  _generateLocalReply(userMessage) {
    const msg = userMessage.toLowerCase();
    if (msg.includes('链表') || msg.includes('线性表')) {
      return '链表是基础数据结构，包括单链表、双链表、循环链表。建议先掌握指针操作，再学习栈和队列的应用。';
    }
    if (msg.includes('树') || msg.includes('二叉')) {
      return '二叉树是重要考点，包括遍历（前/中/后序）、BST、AVL树等。理解递归思想对学习树结构很有帮助。';
    }
    if (msg.includes('排序') || msg.includes('快排')) {
      return '排序算法中，快排、归并、堆排是重点。需要理解它们的时间复杂度、空间复杂度和稳定性。';
    }
    return '好的，让我帮你分析。你有具体的问题吗？';
  }
};