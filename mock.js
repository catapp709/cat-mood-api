/* ============================================================
   mock.js — 唯一数据源（页面只读此处 + localStorage，禁止散落硬编码）
   ============================================================ */
const DB = {
  cat: {
    name: '年糕',
    breed: '英国短毛猫',
    sex: '弟弟',
    age: '2岁4个月',
    avatar: 'assets/avatar.jpg',
    weekCount: 12,
    topMoodKey: 'calm',
    streak: 5
  },
  moods: [
    {
      key: 'calm', name: '放松 · 满足', short: '放松满足',
      color: '#5FA983', icon: 'heart', confRange: [80, 92],
      subs: [['想和你玩', 6, 12], ['有点饿了', 3, 8]],
      replies: [
        '轻轻回应它一声，再挠挠下巴——它现在很有安全感。',
        '它在说"我很舒服"，摸摸头就对了，不用做什么。',
        '保持现在的安静氛围，它可能会在你身边睡成一团。'
      ]
    },
    {
      key: 'play', name: '想和你玩', short: '想和你玩',
      color: '#7C6BE8', icon: 'play', confRange: [76, 88],
      subs: [['放松 · 满足', 8, 14], ['有点饿了', 4, 9]],
      replies: [
        '拿逗猫棒陪它玩 5 分钟，消耗一下精力正合适。',
        '把球抛出去试试，它现在的捕猎欲拉满了。',
        '蹲下拍拍地板逗它过来，玩完记得奖励一口冻干。'
      ]
    },
    {
      key: 'hungry', name: '有点饿了', short: '有点饿了',
      color: '#E0A03E', icon: 'bone', confRange: [72, 85],
      subs: [['求关注', 10, 16], ['放松 · 满足', 5, 10]],
      replies: [
        '看看食盆是不是空了？少量加餐，别一次喂太多哦。',
        '它在催饭了，先给一小把，观察十分钟再决定加不加。',
        '如果刚喂过不久，可能只是嘴馋——用玩具转移注意力。'
      ]
    },
    {
      key: 'tense', name: '紧张 · 警觉', short: '紧张警觉',
      color: '#DE6B6B', icon: 'alert-triangle', confRange: [68, 80],
      subs: [['想躲起来', 12, 18], ['放松 · 满足', 6, 12]],
      replies: [
        '先别急着抱它，蹲下来保持距离，让它自己靠近你。',
        '关掉噪音源，给它一个纸箱或高处，让它自己缓一缓。',
        '别直视它的眼睛，慢慢眨眼，是在告诉它"我没有敌意"。'
      ]
    }
  ],
  history: [
    { id: 'h1', moodKey: 'calm',   conf: 87, reply: '轻轻回应它一声，再挠挠下巴', group: '今天',         time: '08:12' },
    { id: 'h2', moodKey: 'hungry', conf: 79, reply: '看看食盆是不是空了',         group: '今天',         time: '07:05' },
    { id: 'h3', moodKey: 'play',   conf: 82, reply: '拿逗猫棒陪它玩 5 分钟',      group: '昨天',         time: '19:47' },
    { id: 'h4', moodKey: 'hungry', conf: 78, reply: '先给一小把，观察十分钟',     group: '昨天',         time: '17:03' },
    { id: 'h5', moodKey: 'calm',   conf: 90, reply: '摸摸头就对了，不用做什么',   group: '昨天',         time: '11:20' },
    { id: 'h6', moodKey: 'tense',  conf: 74, reply: '保持距离，让它自己靠近你',   group: '10月16日 周四', time: '21:26' },
    { id: 'h7', moodKey: 'play',   conf: 85, reply: '把球抛出去试试',             group: '10月16日 周四', time: '18:52' },
    { id: 'h8', moodKey: 'calm',   conf: 83, reply: '保持安静氛围，它快睡着了',   group: '10月15日 周三', time: '22:10' },
    { id: 'h9', moodKey: 'tense',  conf: 71, reply: '慢慢眨眼，告诉它没敌意',     group: '10月15日 周三', time: '09:36' }
  ],
  weekly: [
    { day: '一', moodKey: 'calm',   value: 52 },
    { day: '二', moodKey: 'calm',   value: 78 },
    { day: '三', moodKey: 'hungry', value: 38 },
    { day: '四', moodKey: 'play',   value: 64 },
    { day: '五', moodKey: 'tense',  value: 30 },
    { day: '六', moodKey: 'calm',   value: 86 },
    { day: '日', moodKey: 'play',   value: 58 }
  ]
};
const GROUP_ORDER = ['今天', '昨天', '10月16日 周四', '10月15日 周三'];
